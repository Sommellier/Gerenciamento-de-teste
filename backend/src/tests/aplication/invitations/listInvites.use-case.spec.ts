import 'dotenv/config'
import { beforeEach, afterAll, afterEach, describe, expect, it } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { listInvites } from '../../../application/use-cases/invitations/listInvites.use-case'
import type { InviteStatus, Role } from '@prisma/client'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

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

afterEach(() => {
  // nada extra — manter simetria com outras suítes
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function seedProjectWithMembers() {
  const owner = await prisma.user.create({
    data: { name: 'Owner', email: unique('owner') + '@example.com', password: 'secret' },
  })
  const manager = await prisma.user.create({
    data: { name: 'Manager', email: unique('manager') + '@example.com', password: 'secret' },
  })
  const tester = await prisma.user.create({
    data: { name: 'Tester', email: unique('tester') + '@example.com', password: 'secret' },
  })
  const outsider = await prisma.user.create({
    data: { name: 'Out', email: unique('out') + '@example.com', password: 'secret' },
  })

  const project = await prisma.project.create({
    data: { ownerId: owner.id, name: unique('Projeto'), description: null },
  })

  await prisma.userOnProject.create({ data: { projectId: project.id, userId: owner.id, role: 'OWNER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: manager.id, role: 'MANAGER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: tester.id, role: 'TESTER' } })

  return { owner, manager, tester, outsider, project }
}

async function createInvite(opts: {
  projectId: number
  email: string
  role: Role
  status: InviteStatus
  offsetDays?: number // para mexer no expiresAt
}) {
  const { projectId, email, role, status, offsetDays = 7 } = opts
  const now = Date.now()
  const expiresAt = new Date(now + offsetDays * 24 * 60 * 60 * 1000)

  return prisma.projectInvite.create({
    data: {
      projectId,
      email,
      role,
      status,
      token: unique('tok'),
      invitedById: (await prisma.user.findFirst({ select: { id: true } }))!.id,
      expiresAt,
      acceptedAt: status === 'ACCEPTED' ? new Date() : null,
      declinedAt: status === 'DECLINED' ? new Date() : null,
    },
  })
}

describe('listInvites.use-case', () => {
  it('400 quando projectId inválido', async () => {
    await expect(
      listInvites({ projectId: 0, requesterId: 1 })
    ).rejects.toMatchObject({ statusCode: 400 })

    await expect(
      listInvites({ projectId: -1, requesterId: 1 })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('400 quando requesterId inválido', async () => {
    await expect(
      listInvites({ projectId: 1, requesterId: 0 })
    ).rejects.toMatchObject({ statusCode: 400 })

    await expect(
      listInvites({ projectId: 1, requesterId: -5 })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('404 quando projeto não existe', async () => {
    await expect(
      listInvites({ projectId: 999_999, requesterId: 1 })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('403 quando requester não é membro', async () => {
    const { project, outsider } = await seedProjectWithMembers()
    await expect(
      listInvites({ projectId: project.id, requesterId: outsider.id })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('403 quando requester é membro mas não OWNER/MANAGER (ex.: TESTER)', async () => {
    const { project, tester } = await seedProjectWithMembers()
    await expect(
      listInvites({ projectId: project.id, requesterId: tester.id })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('retorna vazio quando não há convites', async () => {
    const { project, owner } = await seedProjectWithMembers()
    const res = await listInvites({ projectId: project.id, requesterId: owner.id })
    expect(res.items).toHaveLength(0)
    expect(res.total).toBe(0)
    expect(res.page).toBe(1)
    expect(res.pageSize).toBe(20)
    expect(res.hasNextPage).toBe(false)
  })

  it('filtra por status (PENDING/ACCEPTED) e busca por e-mail (case-insensitive)', async () => {
    const { project, owner } = await seedProjectWithMembers()

    await createInvite({ projectId: project.id, email: 'alice@example.com', role: 'TESTER', status: 'PENDING' })
    await createInvite({ projectId: project.id, email: 'bob@example.com', role: 'APPROVER', status: 'ACCEPTED' })
    await createInvite({ projectId: project.id, email: 'carol@example.com', role: 'MANAGER', status: 'DECLINED' })
    await createInvite({ projectId: project.id, email: 'dan@example.com', role: 'TESTER', status: 'EXPIRED' })

    const res = await listInvites({
      projectId: project.id,
      requesterId: owner.id,
      status: ['PENDING', 'ACCEPTED'],
      q: 'BoB', // case-insensitive bate em "bob@example.com"
      page: 1,
      pageSize: 50,
      orderBy: 'createdAt',
      sort: 'desc',
    })

    expect(res.total).toBe(1)
    expect(res.items).toHaveLength(1)
    expect(res.items[0].email).toBe('bob@example.com')
    expect(res.items[0]).not.toHaveProperty('token') // segurança: token não vem
    expect(res.items[0].invitedBy).toBeTruthy()
  })

  it('ordena por expiresAt asc e pagina corretamente (hasNextPage true/false)', async () => {
    const { project, owner } = await seedProjectWithMembers()

    // expirações em ordem crescente: 1,2,3,4 dias
    const emails = ['a@e.com', 'b@e.com', 'c@e.com', 'd@e.com']
    await createInvite({ projectId: project.id, email: emails[0], role: 'TESTER', status: 'PENDING',  offsetDays: 1 })
    await createInvite({ projectId: project.id, email: emails[1], role: 'TESTER', status: 'PENDING',  offsetDays: 2 })
    await createInvite({ projectId: project.id, email: emails[2], role: 'TESTER', status: 'PENDING',  offsetDays: 3 })
    await createInvite({ projectId: project.id, email: emails[3], role: 'TESTER', status: 'PENDING',  offsetDays: 4 })

    const page1 = await listInvites({
      projectId: project.id,
      requesterId: owner.id,
      page: 1,
      pageSize: 2,
      orderBy: 'expiresAt',
      sort: 'asc',
    })
    expect(page1.items.map(i => i.email)).toEqual(['a@e.com', 'b@e.com'])
    expect(page1.total).toBe(4)
    expect(page1.hasNextPage).toBe(true)

    const page2 = await listInvites({
      projectId: project.id,
      requesterId: owner.id,
      page: 2,
      pageSize: 2,
      orderBy: 'expiresAt',
      sort: 'asc',
    })
    expect(page2.items.map(i => i.email)).toEqual(['c@e.com', 'd@e.com'])
    expect(page2.total).toBe(4)
    expect(page2.hasNextPage).toBe(false)
  })

  it('ordena por status (branch de orderBy=status) e ignora q vazio', async () => {
    const { project, owner } = await seedProjectWithMembers()
    await createInvite({ projectId: project.id, email: 'x1@example.com', role: 'TESTER', status: 'DECLINED' })
    await createInvite({ projectId: project.id, email: 'x2@example.com', role: 'TESTER', status: 'PENDING' })
    await createInvite({ projectId: project.id, email: 'x3@example.com', role: 'TESTER', status: 'EXPIRED' })

    const res = await listInvites({
      projectId: project.id,
      requesterId: owner.id,
      q: '   ', // vira undefined e não filtra
      orderBy: 'status',
      sort: 'desc',
    })

    expect(res.total).toBe(3)
    expect(res.items).toHaveLength(3)
  })

  it('fallbacks: orderBy inválido cai para createdAt; sort inválido cai para desc', async () => {
    const { project, owner } = await seedProjectWithMembers()

    // cria em sequência para termos createdAt diferentes
    const i1 = await createInvite({ projectId: project.id, email: 'o1@e.com', role: 'TESTER', status: 'PENDING' })
    await new Promise(r => setTimeout(r, 5))
    const i2 = await createInvite({ projectId: project.id, email: 'o2@e.com', role: 'TESTER', status: 'PENDING' })

    const res = await listInvites({
      projectId: project.id,
      requesterId: owner.id,
      orderBy: 'anything' as any, // força fallback
      sort: 'anything' as any,    // força fallback (desc)
    })

    expect(res.items[0].createdAt.getTime()).toBeGreaterThanOrEqual(i2.createdAt.getTime())
    expect(res.items[res.items.length - 1].id).toBe(i1.id)
  })

  it('clampa page/pageSize (page<=0 vira 1; pageSize>100 vira 100)', async () => {
    const { project, owner } = await seedProjectWithMembers()
    for (let i = 0; i < 3; i++) {
      await createInvite({ projectId: project.id, email: `${unique('p')}.${i}@e.com`, role: 'TESTER', status: 'PENDING' })
    }

    const res = await listInvites({
      projectId: project.id,
      requesterId: owner.id,
      page: 0,         // vira 1
      pageSize: 1000,  // vira 100
    })

    expect(res.page).toBe(1)
    expect(res.pageSize).toBe(100)
    expect(res.total).toBe(3)
  })
})
