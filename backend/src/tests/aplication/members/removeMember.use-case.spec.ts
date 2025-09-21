import 'dotenv/config'
import { beforeEach, afterAll, describe, expect, it } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { removeMember } from '../../../application/use-cases/members/removeMember.use-case'

const unique = (p: string) =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

beforeEach(async () => {
  // limpa base (ordem segura por FKs)
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
  const owner1 = await prisma.user.create({
    data: { name: 'Owner 1', email: unique('own1') + '@example.com', password: 'secret' }
  })
  const owner2 = await prisma.user.create({
    data: { name: 'Owner 2', email: unique('own2') + '@example.com', password: 'secret' }
  })
  const manager1 = await prisma.user.create({
    data: { name: 'Manager 1', email: unique('mgr1') + '@example.com', password: 'secret' }
  })
  const manager2 = await prisma.user.create({
    data: { name: 'Manager 2', email: unique('mgr2') + '@example.com', password: 'secret' }
  })
  const tester = await prisma.user.create({
    data: { name: 'Tester', email: unique('tester') + '@example.com', password: 'secret' }
  })
  const approver = await prisma.user.create({
    data: { name: 'Approver', email: unique('appr') + '@example.com', password: 'secret' }
  })
  const outsider = await prisma.user.create({
    data: { name: 'Outsider', email: unique('out') + '@example.com', password: 'secret' }
  })

  // projeto + memberships
  const project = await prisma.project.create({
    data: { ownerId: owner1.id, name: unique('Projeto'), description: null }
  })

  await prisma.userOnProject.create({ data: { projectId: project.id, userId: owner1.id, role: 'OWNER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: manager1.id, role: 'MANAGER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: tester.id, role: 'TESTER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: approver.id, role: 'APPROVER' } })

  // owner2 e manager2 ficam fora por padrão; crie-os nos testes que precisarem
  return { project, owner1, owner2, manager1, manager2, tester, approver, outsider }
}

describe('removeMember.use-case', () => {
  it('400 para projectId/requesterId/targetUserId inválidos', async () => {
    await expect(removeMember({ projectId: 0, requesterId: 1, targetUserId: 2 }))
      .rejects.toMatchObject({ statusCode: 400 })
    await expect(removeMember({ projectId: 1, requesterId: 0, targetUserId: 2 }))
      .rejects.toMatchObject({ statusCode: 400 })
    await expect(removeMember({ projectId: 1, requesterId: 1, targetUserId: 0 }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('404 quando projeto não existe', async () => {
    await expect(removeMember({ projectId: 999_999, requesterId: 1, targetUserId: 2 }))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('403 quando requester não é membro do projeto', async () => {
    const { project, outsider, tester } = await seedBasic()
    await expect(removeMember({ projectId: project.id, requesterId: outsider.id, targetUserId: tester.id }))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  it('404 quando target não é membro do projeto', async () => {
    const { project, owner1, outsider } = await seedBasic()
    await expect(removeMember({ projectId: project.id, requesterId: owner1.id, targetUserId: outsider.id }))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('403 quando MANAGER tenta remover OWNER', async () => {
    const { project, owner1, manager1 } = await seedBasic()
    await expect(removeMember({ projectId: project.id, requesterId: manager1.id, targetUserId: owner1.id }))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  it('403 quando MANAGER tenta remover outro MANAGER', async () => {
    const { project, owner1, manager1, manager2 } = await seedBasic()
    // adiciona manager2 ao projeto
    await prisma.userOnProject.create({ data: { projectId: project.id, userId: manager2.id, role: 'MANAGER' } })

    await expect(removeMember({ projectId: project.id, requesterId: manager1.id, targetUserId: manager2.id }))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  it('409 ao tentar remover o ÚLTIMO OWNER (proteção com transação)', async () => {
    const { project, owner1 } = await seedBasic()
    // só existe owner1 como OWNER
    await expect(removeMember({ projectId: project.id, requesterId: owner1.id, targetUserId: owner1.id }))
      .rejects.toMatchObject({ statusCode: 409 })

    // continua existindo como membro
    const stillThere = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: owner1.id, projectId: project.id } }
    })
    expect(stillThere?.role).toBe('OWNER')
  })

  it('sucesso: OWNER remove outro OWNER quando há 2+ owners (usa ramo transacional)', async () => {
    const { project, owner1, owner2 } = await seedBasic()
    // adiciona segundo owner
    await prisma.userOnProject.create({ data: { projectId: project.id, userId: owner2.id, role: 'OWNER' } })

    const deleted = await removeMember({ projectId: project.id, requesterId: owner1.id, targetUserId: owner2.id })
    expect(deleted.userId).toBe(owner2.id)
    expect(deleted.projectId).toBe(project.id)

    // ficou apenas 1 owner
    const countOwners = await prisma.userOnProject.count({
      where: { projectId: project.id, role: 'OWNER' }
    })
    expect(countOwners).toBe(1)
  })

  it('sucesso: MANAGER remove TESTER (remoção simples)', async () => {
    const { project, manager1, tester } = await seedBasic()

    const deleted = await removeMember({ projectId: project.id, requesterId: manager1.id, targetUserId: tester.id })
    expect(deleted.userId).toBe(tester.id)
    expect(deleted.projectId).toBe(project.id)

    const exists = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: tester.id, projectId: project.id } }
    })
    expect(exists).toBeNull()
  })

  it('sucesso: OWNER remove APPROVER (remoção simples)', async () => {
    const { project, owner1, approver } = await seedBasic()

    const deleted = await removeMember({ projectId: project.id, requesterId: owner1.id, targetUserId: approver.id })
    expect(deleted.userId).toBe(approver.id)

    const still = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: approver.id, projectId: project.id } }
    })
    expect(still).toBeNull()
  })
})
