import 'dotenv/config'
import { beforeEach, afterAll, describe, expect, it, jest } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { updateMemberRole } from '../../../application/use-cases/members/updateMemberRole.use-case'

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

  jest.restoreAllMocks()
  jest.clearAllMocks()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function seedBase() {
  // usuários
  const owner1 = await prisma.user.create({
    data: { name: 'Owner 1', email: unique('own1') + '@example.com', password: 'secret' }
  })
  const owner2 = await prisma.user.create({
    data: { name: 'Owner 2', email: unique('own2') + '@example.com', password: 'secret' }
  })
  const manager = await prisma.user.create({
    data: { name: 'Manager', email: unique('mgr') + '@example.com', password: 'secret' }
  })
  const tester = await prisma.user.create({
    data: { name: 'Tester', email: unique('tst') + '@example.com', password: 'secret' }
  })
  const approver = await prisma.user.create({
    data: { name: 'Approver', email: unique('appr') + '@example.com', password: 'secret' }
  })
  const outsider = await prisma.user.create({
    data: { name: 'Out', email: unique('out') + '@example.com', password: 'secret' }
  })

  // projeto
  const project = await prisma.project.create({
    data: { ownerId: owner1.id, name: unique('Projeto'), description: null }
  })

  // memberships
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: owner1.id, role: 'OWNER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: manager.id, role: 'MANAGER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: tester.id, role: 'TESTER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: approver.id, role: 'APPROVER' } })
  // owner2 entra quando necessário em testes

  return { project, owner1, owner2, manager, tester, approver, outsider }
}

describe('updateMemberRole.use-case', () => {
  it('400 para projectId/requesterId/targetUserId inválidos', async () => {
    await expect(updateMemberRole({ projectId: 0, requesterId: 1, targetUserId: 2, newRole: 'TESTER' }))
      .rejects.toMatchObject({ statusCode: 400 })
    await expect(updateMemberRole({ projectId: 1, requesterId: 0, targetUserId: 2, newRole: 'TESTER' }))
      .rejects.toMatchObject({ statusCode: 400 })
    await expect(updateMemberRole({ projectId: 1, requesterId: 1, targetUserId: 0, newRole: 'TESTER' }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('404 quando projeto não existe', async () => {
    await expect(updateMemberRole({ projectId: 999_999, requesterId: 1, targetUserId: 2, newRole: 'TESTER' }))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('403 quando requester não é membro', async () => {
    const { project, outsider, tester } = await seedBase()
    await expect(updateMemberRole({
      projectId: project.id, requesterId: outsider.id, targetUserId: tester.id, newRole: 'APPROVER'
    })).rejects.toMatchObject({ statusCode: 403 })
  })

  it('404 quando target não é membro', async () => {
    const { project, owner1, outsider } = await seedBase()
    await expect(updateMemberRole({
      projectId: project.id, requesterId: owner1.id, targetUserId: outsider.id, newRole: 'APPROVER'
    })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('403: MANAGER não pode alterar OWNER/MANAGER (mesmo para rebaixar)', async () => {
    const { project, owner1, owner2, manager } = await seedBase()
    // adiciona segundo OWNER e um MANAGER extra para cobrir ambos alvos
    await prisma.userOnProject.create({ data: { projectId: project.id, userId: owner2.id, role: 'OWNER' } })
    const manager2 = await prisma.user.create({
      data: { name: 'Manager 2', email: unique('mgr2') + '@example.com', password: 'secret' }
    })
    await prisma.userOnProject.create({ data: { projectId: project.id, userId: manager2.id, role: 'MANAGER' } })

    await expect(updateMemberRole({
      projectId: project.id, requesterId: manager.id, targetUserId: owner2.id, newRole: 'TESTER'
    })).rejects.toMatchObject({ statusCode: 403 })

    await expect(updateMemberRole({
      projectId: project.id, requesterId: manager.id, targetUserId: manager2.id, newRole: 'TESTER'
    })).rejects.toMatchObject({ statusCode: 403 })
  })

  it('403: MANAGER não pode promover para OWNER/MANAGER', async () => {
    const { project, manager, tester } = await seedBase()

    await expect(updateMemberRole({
      projectId: project.id, requesterId: manager.id, targetUserId: tester.id, newRole: 'MANAGER'
    })).rejects.toMatchObject({ statusCode: 403 })

    await expect(updateMemberRole({
      projectId: project.id, requesterId: manager.id, targetUserId: tester.id, newRole: 'OWNER'
    })).rejects.toMatchObject({ statusCode: 403 })
  })

  it('409: não permite rebaixar o ÚLTIMO OWNER', async () => {
    const { project, owner1 } = await seedBase()
    // só há um OWNER (owner1)
    await expect(updateMemberRole({
      projectId: project.id, requesterId: owner1.id, targetUserId: owner1.id, newRole: 'MANAGER'
    })).rejects.toMatchObject({ statusCode: 409 })

    // continua OWNER
    const still = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: owner1.id, projectId: project.id } }
    })
    expect(still?.role).toBe('OWNER')
  })

  it('idempotente: quando newRole == role atual, não chama update e retorna o registro atual', async () => {
    const { project, owner1, tester } = await seedBase()
    const spyUpdate = jest.spyOn(prisma.userOnProject, 'update')

    const before = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: tester.id, projectId: project.id } }
    })
    expect(before?.role).toBe('TESTER')

    const res = await updateMemberRole({
      projectId: project.id, requesterId: owner1.id, targetUserId: tester.id, newRole: 'TESTER'
    })

    // retorno idempotente tem os campos mínimos (via cast no use-case)
    expect(res.projectId).toBe(project.id)
    expect(res.userId).toBe(tester.id)
    expect(res.role).toBe('TESTER')

    // não houve update no banco
    expect(spyUpdate).not.toHaveBeenCalled()

    const after = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: tester.id, projectId: project.id } }
    })
    expect(after?.role).toBe('TESTER')
  })

  it('sucesso: OWNER rebaixa MANAGER para TESTER', async () => {
    const { project, owner1, manager } = await seedBase()

    const res = await updateMemberRole({
      projectId: project.id, requesterId: owner1.id, targetUserId: manager.id, newRole: 'TESTER'
    })
    expect(res.userId).toBe(manager.id)
    expect(res.role).toBe('TESTER')

    const inDb = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: manager.id, projectId: project.id } }
    })
    expect(inDb?.role).toBe('TESTER')
  })

  it('sucesso: MANAGER altera TESTER para APPROVER', async () => {
    const { project, manager, tester } = await seedBase()

    const res = await updateMemberRole({
      projectId: project.id, requesterId: manager.id, targetUserId: tester.id, newRole: 'APPROVER'
    })
    expect(res.userId).toBe(tester.id)
    expect(res.role).toBe('APPROVER')

    const inDb = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: tester.id, projectId: project.id } }
    })
    expect(inDb?.role).toBe('APPROVER')
  })

  it('sucesso: OWNER rebaixa outro OWNER quando existem 2+ owners', async () => {
    const { project, owner1, owner2 } = await seedBase()
    // adiciona segundo OWNER
    await prisma.userOnProject.create({ data: { projectId: project.id, userId: owner2.id, role: 'OWNER' } })

    const res = await updateMemberRole({
      projectId: project.id, requesterId: owner1.id, targetUserId: owner2.id, newRole: 'MANAGER'
    })
    expect(res.userId).toBe(owner2.id)
    expect(res.role).toBe('MANAGER')

    const ownersCount = await prisma.userOnProject.count({
      where: { projectId: project.id, role: 'OWNER' }
    })
    expect(ownersCount).toBe(1) // restou apenas owner1 como OWNER
  })

  it('sucesso: OWNER promove TESTER para MANAGER', async () => {
    const { project, owner1, tester } = await seedBase()

    const res = await updateMemberRole({
      projectId: project.id, requesterId: owner1.id, targetUserId: tester.id, newRole: 'MANAGER'
    })
    expect(res.userId).toBe(tester.id)
    expect(res.role).toBe('MANAGER')

    const inDb = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: tester.id, projectId: project.id } }
    })
    expect(inDb?.role).toBe('MANAGER')
  })
})
