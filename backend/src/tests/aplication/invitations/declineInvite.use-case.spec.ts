import 'dotenv/config'
import { beforeEach, afterAll, describe, expect, it } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { declineInvite } from '../../../application/use-cases/invitations/declineInvite.use-case'

const unique = (p: string) =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

beforeEach(async () => {
  // limpa banco (ordem segura por FKs)
  await prisma.passwordResetToken.deleteMany()
  await prisma.evidence.deleteMany()
  await prisma.execution.deleteMany()
  await prisma.userOnProject.deleteMany()
  await prisma.projectInvite.deleteMany()
  await prisma.testCase.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function seedBase() {
  const owner = await prisma.user.create({
    data: {
      name: 'Owner',
      email: unique('owner') + '@example.com',
      password: 'secret',
    },
  })

  const project = await prisma.project.create({
    data: { ownerId: owner.id, name: unique('Projeto'), description: null },
  })

  // (opcional) owner como membro
  await prisma.userOnProject.create({
    data: { projectId: project.id, userId: owner.id, role: 'OWNER' },
  })

  return { owner, project }
}

describe('declineInvite.use-case', () => {
  it('400 quando token inválido (vazio/whitespace)', async () => {
    await expect(declineInvite({ token: '   ' })).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('404 quando convite não existe', async () => {
    await expect(declineInvite({ token: 'nao-existe' })).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('idempotente quando já está DECLINED (retorna o próprio convite)', async () => {
    const { owner, project } = await seedBase()
    const invite = await prisma.projectInvite.create({
      data: {
        projectId: project.id,
        email: unique('declined') + '@example.com',
        role: 'TESTER',
        token: unique('tok'),
        status: 'DECLINED',
        invitedById: owner.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        declinedAt: new Date(),
      },
    })

    const res = await declineInvite({ token: invite.token })
    expect(res.id).toBe(invite.id)
    expect(res.status).toBe('DECLINED')
  })

  it('409 quando status é ACCEPTED (convite já utilizado)', async () => {
    const { owner, project } = await seedBase()
    const invite = await prisma.projectInvite.create({
      data: {
        projectId: project.id,
        email: unique('accepted') + '@example.com',
        role: 'APPROVER',
        token: unique('tok'),
        status: 'ACCEPTED',
        invitedById: owner.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(),
      },
    })

    await expect(declineInvite({ token: invite.token })).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('410 quando status é EXPIRED', async () => {
    const { owner, project } = await seedBase()
    const invite = await prisma.projectInvite.create({
      data: {
        projectId: project.id,
        email: unique('expired') + '@example.com',
        role: 'TESTER',
        token: unique('tok'),
        status: 'EXPIRED',
        invitedById: owner.id,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    })

    await expect(declineInvite({ token: invite.token })).rejects.toMatchObject({
      statusCode: 410,
    })
  })

  it('PENDING mas já expirado agora → marca como EXPIRED e retorna 410', async () => {
    const { owner, project } = await seedBase()
    const invite = await prisma.projectInvite.create({
      data: {
        projectId: project.id,
        email: unique('pending-exp') + '@example.com',
        role: 'TESTER',
        token: unique('tok'),
        status: 'PENDING',
        invitedById: owner.id,
        expiresAt: new Date(Date.now() - 1), // já expirado
      },
    })

    await expect(declineInvite({ token: invite.token })).rejects.toMatchObject({
      statusCode: 410,
    })

    const updated = await prisma.projectInvite.findUnique({
      where: { id: invite.id },
    })
    expect(updated?.status).toBe('EXPIRED')
    expect(updated?.declinedAt).toBeNull()
  })

  it('sucesso: PENDING válido → marca como DECLINED e preenche declinedAt', async () => {
    const { owner, project } = await seedBase()
    const invite = await prisma.projectInvite.create({
      data: {
        projectId: project.id,
        email: unique('ok') + '@example.com',
        role: 'MANAGER',
        token: unique('tok'),
        status: 'PENDING',
        invitedById: owner.id,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    })

    const res = await declineInvite({ token: invite.token })
    expect(res.status).toBe('DECLINED')
    expect(res.declinedAt).toBeTruthy()

    const stored = await prisma.projectInvite.findUnique({
      where: { id: invite.id },
    })
    expect(stored?.status).toBe('DECLINED')
    expect(stored?.declinedAt).toBeTruthy()
  })
})
