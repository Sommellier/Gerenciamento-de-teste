import 'dotenv/config'
import { beforeEach, afterAll, afterEach, describe, expect, it, jest } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { addMemberByEmail } from '../../../application/use-cases/members/addMemberByEmail.use-case'
import type { Role } from '@prisma/client'
import * as createInviteModule from '../../../application/use-cases/invitations/createInvite.use-case'
import type { SpyInstance } from 'jest-mock'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

let spyCreateInvite: SpyInstance<typeof createInviteModule.createInvite>

beforeEach(async () => {
  jest.restoreAllMocks()
  jest.clearAllMocks()

  // limpa banco (ordem segura por FKs)
  await prisma.passwordResetToken.deleteMany()
  await prisma.evidence.deleteMany()
  await prisma.execution.deleteMany()
  await prisma.userOnProject.deleteMany()
  await prisma.projectInvite.deleteMany()
  await prisma.testCase.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  // por padrão, não mockamos comportamento (só criamos o spy e decidimos em cada teste)
  spyCreateInvite = jest.spyOn(createInviteModule, 'createInvite')
})

afterEach(() => {
  jest.restoreAllMocks()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function seedBase() {
  const owner = await prisma.user.create({
    data: { name: 'Owner', email: unique('owner') + '@example.com', password: 'secret' }
  })
  const manager = await prisma.user.create({
    data: { name: 'Manager', email: unique('manager') + '@example.com', password: 'secret' }
  })
  const outsider = await prisma.user.create({
    data: { name: 'Outsider', email: unique('out') + '@example.com', password: 'secret' }
  })
  const existing = await prisma.user.create({
    data: { name: 'Existing', email: unique('exist') + '@example.com', password: 'secret' }
  })

  const project = await prisma.project.create({
    data: { ownerId: owner.id, name: unique('Projeto'), description: null }
  })

  // memberships
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: owner.id, role: 'OWNER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: manager.id, role: 'MANAGER' } })

  return { owner, manager, outsider, existing, project }
}

describe('addMemberByEmail.use-case', () => {
  it('400 quando projectId/requesterId/email inválidos', async () => {
    await expect(addMemberByEmail({
      projectId: 0, requesterId: 1, email: 'a@b.com', role: 'TESTER'
    })).rejects.toMatchObject({ statusCode: 400 })

    await expect(addMemberByEmail({
      projectId: 1, requesterId: 0, email: 'a@b.com', role: 'TESTER'
    })).rejects.toMatchObject({ statusCode: 400 })

    await expect(addMemberByEmail({
      projectId: 1, requesterId: 1, email: 'invalido', role: 'TESTER'
    })).rejects.toMatchObject({ statusCode: 400 })
  })

  it('404 quando projeto não existe', async () => {
    await expect(addMemberByEmail({
      projectId: 999_999, requesterId: 1, email: 'x@y.com', role: 'TESTER'
    })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('403 quando requester não é membro do projeto', async () => {
    const { project, outsider } = await seedBase()
    await expect(addMemberByEmail({
      projectId: project.id, requesterId: outsider.id, email: 'x@y.com', role: 'TESTER'
    })).rejects.toMatchObject({ statusCode: 403 })
  })

  it('403 quando MANAGER tenta adicionar OWNER/MANAGER', async () => {
    const { project, manager } = await seedBase()

    await expect(addMemberByEmail({
      projectId: project.id, requesterId: manager.id, email: 'x@y.com', role: 'OWNER'
    })).rejects.toMatchObject({ statusCode: 403 })

    await expect(addMemberByEmail({
      projectId: project.id, requesterId: manager.id, email: 'y@z.com', role: 'MANAGER'
    })).rejects.toMatchObject({ statusCode: 403 })
  })

  it('409 quando usuário já é membro do projeto', async () => {
    const { owner, existing, project } = await seedBase()

    await prisma.userOnProject.create({
      data: { projectId: project.id, userId: existing.id, role: 'TESTER' }
    })

    await expect(addMemberByEmail({
      projectId: project.id, requesterId: owner.id, email: existing.email, role: 'APPROVER'
    })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('sucesso (usuário EXISTE e ainda não é membro): cria membership e NÃO chama createInvite', async () => {
    const { owner, existing, project } = await seedBase()

    const res = await addMemberByEmail({
      projectId: project.id, requesterId: owner.id, email: existing.email, role: 'TESTER'
    })

    expect(res.kind).toBe('member')
    if (res.kind === 'member') {
      expect(res.member.projectId).toBe(project.id)
      expect(res.member.userId).toBe(existing.id)
      expect(res.member.role).toBe('TESTER')
    }

    // não passou pelo fluxo de convite
    expect(spyCreateInvite).not.toHaveBeenCalled()

    // membership realmente persistido
    const stored = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: existing.id, projectId: project.id } }
    })
    expect(stored?.role).toBe('TESTER')
  })

  it('sucesso (usuário NÃO existe): chama createInvite com e-mail normalizado e retorna kind=invite', async () => {
    const { owner, project } = await seedBase()

    const rawEmail = '  NewUser@Email.com '
    const normalized = 'newuser@email.com'

    const fakeInvite = {
      id: 123,
      projectId: project.id,
      email: normalized,
      role: 'APPROVER' as Role,
      token: 'tok-xyz',
      status: 'PENDING' as const,
      invitedById: owner.id,
      expiresAt: new Date(Date.now() + 7 * 864e5),
      acceptedAt: null,
      declinedAt: null,
      createdAt: new Date()
    }

    spyCreateInvite.mockResolvedValue(fakeInvite as any)

    const res = await addMemberByEmail({
      projectId: project.id,
      requesterId: owner.id,
      email: rawEmail,
      role: 'APPROVER'
    })

    expect(spyCreateInvite).toHaveBeenCalledTimes(1)
    const args = spyCreateInvite.mock.calls[0][0]
    expect(args).toMatchObject({
      projectId: project.id,
      invitedById: owner.id,
      role: 'APPROVER',
      email: normalized,        // ← normalizado (trim + lower)
      resendIfPending: true     // ← default
    })

    expect(res.kind).toBe('invite')
    if (res.kind === 'invite') {
      expect(res.invite).toMatchObject({
        id: fakeInvite.id,
        projectId: project.id,
        email: normalized,
        role: 'APPROVER',
        status: 'PENDING'
      })
    }

    // não criou membership
    const membership = await prisma.userOnProject.findMany({
      where: { projectId: project.id, role: 'APPROVER' }
    })
    expect(membership.length).toBe(0)
  })

  it('propaga resendIfPending=false para createInvite', async () => {
    const { owner, project } = await seedBase()

    const target = `${unique('new')}@example.com`
    const fakeInvite = {
      id: 999,
      projectId: project.id,
      email: target,
      role: 'TESTER' as Role,
      token: 'tok-abc',
      status: 'PENDING' as const,
      invitedById: owner.id,
      expiresAt: new Date(Date.now() + 2 * 864e5),
      acceptedAt: null,
      declinedAt: null,
      createdAt: new Date()
    }
    spyCreateInvite.mockResolvedValue(fakeInvite as any)

    await addMemberByEmail({
      projectId: project.id,
      requesterId: owner.id,
      email: target,
      role: 'TESTER',
      resendIfPending: false
    })

    expect(spyCreateInvite).toHaveBeenCalledTimes(1)
    expect(spyCreateInvite.mock.calls[0][0]).toMatchObject({
      resendIfPending: false
    })
  })
})
