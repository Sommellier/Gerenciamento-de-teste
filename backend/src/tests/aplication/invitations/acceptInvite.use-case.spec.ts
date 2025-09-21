import 'dotenv/config'
import { beforeEach, afterAll, describe, expect, it, jest } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { acceptInvite } from '../../../application/use-cases/invitations/acceptInvite.use-case'
import type { Role } from '@prisma/client'

jest.setTimeout(15000)

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

beforeEach(async () => {
  // limpa tudo (ordem segura pelas FKs)
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

async function seedBasic() {
  // usuários
  const owner = await prisma.user.create({
    data: { name: 'Owner', email: unique('owner') + '@example.com', password: 'secret' }
  })
  const userA = await prisma.user.create({
    data: { name: 'User A', email: unique('userA') + '@example.com', password: 'secret' }
  })
  const userB = await prisma.user.create({
    data: { name: 'User B', email: unique('userB') + '@example.com', password: 'secret' }
  })

  // projeto
  const project = await prisma.project.create({
    data: { ownerId: owner.id, name: unique('Projeto'), description: null }
  })

  // owner como membro
  await prisma.userOnProject.create({
    data: { projectId: project.id, userId: owner.id, role: 'OWNER' }
  })

  return { owner, userA, userB, project }
}

describe('acceptInvite.use-case', () => {
  it('400 quando token inválido (string vazia)', async () => {
    await expect(acceptInvite({ token: '   ', userId: 1 }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('400 quando userId inválido', async () => {
    await expect(acceptInvite({ token: 'tok', userId: 0 }))
      .rejects.toMatchObject({ statusCode: 400 })
    await expect(acceptInvite({ token: 'tok', userId: -1 }))
      .rejects.toMatchObject({ statusCode: 400 })
    await expect(acceptInvite({ token: 'tok', userId: 1.1 }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('404 quando convite não existe', async () => {
    await expect(acceptInvite({ token: 'inexistente', userId: 123 }))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('idempotente quando status=ACCEPTED e o mesmo usuário já é membro (retorna o convite)', async () => {
    const { owner, userA, project } = await seedBasic()

    // membership prévio do userA
    await prisma.userOnProject.create({
      data: { projectId: project.id, userId: userA.id, role: 'TESTER' }
    })

    const invite = await prisma.projectInvite.create({
      data: {
        projectId: project.id,
        email: userA.email,
        role: 'TESTER',
        token: unique('tok'),
        status: 'ACCEPTED',
        invitedById: owner.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(),
      }
    })

    const res = await acceptInvite({ token: invite.token, userId: userA.id })
    expect(res.id).toBe(invite.id)
    expect(res.status).toBe('ACCEPTED')

    const mem = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: userA.id, projectId: project.id } }
    })
    expect(mem).toBeTruthy()
  })

  it('409 quando status=ACCEPTED mas o usuário atual não é membro (convite já utilizado)', async () => {
    const { owner, userA, userB, project } = await seedBasic()

    const invite = await prisma.projectInvite.create({
      data: {
        projectId: project.id,
        email: userA.email,
        role: 'TESTER',
        token: unique('tok'),
        status: 'ACCEPTED',
        invitedById: owner.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(),
      }
    })

    await expect(acceptInvite({ token: invite.token, userId: userB.id }))
      .rejects.toMatchObject({ statusCode: 409 })
  })

  it('409 quando status=DECLINED', async () => {
    const { owner, project } = await seedBasic()

    const invite = await prisma.projectInvite.create({
      data: {
        projectId: project.id,
        email: unique('declined') + '@example.com',
        role: 'APPROVER',
        token: unique('tok'),
        status: 'DECLINED',
        invitedById: owner.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        declinedAt: new Date()
      }
    })

    await expect(acceptInvite({ token: invite.token, userId: 999 }))
      .rejects.toMatchObject({ statusCode: 409 })
  })

  it('410 quando status=EXPIRED', async () => {
    const { owner, project } = await seedBasic()

    const invite = await prisma.projectInvite.create({
      data: {
        projectId: project.id,
        email: unique('expired') + '@example.com',
        role: 'TESTER',
        token: unique('tok'),
        status: 'EXPIRED',
        invitedById: owner.id,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    })

    await expect(acceptInvite({ token: invite.token, userId: 1 }))
      .rejects.toMatchObject({ statusCode: 410 })
  })

  it('PENDING mas já expirado agora → marca como EXPIRED e retorna 410', async () => {
    const { owner, project } = await seedBasic()

    const invite = await prisma.projectInvite.create({
      data: {
        projectId: project.id,
        email: unique('pending-exp') + '@example.com',
        role: 'TESTER',
        token: unique('tok'),
        status: 'PENDING',
        invitedById: owner.id,
        expiresAt: new Date(Date.now() - 1) // já expirado
      }
    })

    await expect(acceptInvite({ token: invite.token, userId: 1 }))
      .rejects.toMatchObject({ statusCode: 410 })

    const updated = await prisma.projectInvite.findUnique({ where: { id: invite.id } })
    expect(updated?.status).toBe('EXPIRED')
    expect(updated?.acceptedAt).toBeNull()
  })

  it('sucesso: cria membership e aceita convite (PENDING com validade futura)', async () => {
    const { owner, userA, project } = await seedBasic()

    const invite = await prisma.projectInvite.create({
      data: {
        projectId: project.id,
        email: userA.email,
        role: 'APPROVER',
        token: unique('tok'),
        status: 'PENDING',
        invitedById: owner.id,
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      }
    })

    const res = await acceptInvite({ token: invite.token, userId: userA.id })
    expect(res.status).toBe('ACCEPTED')
    expect(res.acceptedAt).toBeTruthy()

    const membership = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: userA.id, projectId: project.id } }
    })
    expect(membership?.role).toBe('APPROVER')
  })

  it('sucesso: atualiza papel se membership já existia (upsert→update)', async () => {
    const { owner, userA, project } = await seedBasic()

    // membership existente como TESTER
    await prisma.userOnProject.create({
      data: { projectId: project.id, userId: userA.id, role: 'TESTER' }
    })

    const invite = await prisma.projectInvite.create({
      data: {
        projectId: project.id,
        email: userA.email,
        role: 'MANAGER' as Role, // novo papel
        token: unique('tok'),
        status: 'PENDING',
        invitedById: owner.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })

    const res = await acceptInvite({ token: invite.token, userId: userA.id })
    expect(res.status).toBe('ACCEPTED')

    const membership = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: userA.id, projectId: project.id } }
    })
    expect(membership?.role).toBe('MANAGER')
  })
})
