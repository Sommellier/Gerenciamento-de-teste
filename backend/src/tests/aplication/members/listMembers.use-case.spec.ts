import 'dotenv/config'
import { beforeEach, afterAll, describe, expect, it } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { listMembers } from '../../../application/use-cases/members/listMembers.use-case'
import type { Role } from '@prisma/client'

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

async function seedProjectWithMembers() {
  // cria usuários com nomes/emails pensados p/ teste de ordenação e busca
  const owner = await prisma.user.create({
    data: { name: 'Zelda Owner', email: unique('owner') + '@example.com', password: 'secret' }
  })
  const manager = await prisma.user.create({
    data: { name: 'Ana Manager', email: 'ana.manager+' + unique('m') + '@mail.com', password: 'secret' }
  })
  const tester1 = await prisma.user.create({
    data: { name: 'Bob Tester', email: 'bob.tester+' + unique('t1') + '@mail.com', password: 'secret' }
  })
  const tester2 = await prisma.user.create({
    data: { name: 'carl tester', email: 'carl.tester+' + unique('t2') + '@mail.com', password: 'secret' }
  })
  const approver1 = await prisma.user.create({
    data: { name: 'Diana Approver', email: 'diana.app+' + unique('a1') + '@mail.com', password: 'secret' }
  })
  const approver2 = await prisma.user.create({
    data: { name: 'Eve Approver', email: 'eve.app+' + unique('a2') + '@mail.com', password: 'secret' }
  })
  const outsider = await prisma.user.create({
    data: { name: 'Oscar Outside', email: unique('out') + '@example.com', password: 'secret' }
  })

  const project = await prisma.project.create({
    data: { ownerId: owner.id, name: unique('Projeto'), description: null }
  })

  // membros do projeto (incluir owner como membro OWNER)
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: owner.id, role: 'OWNER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: manager.id, role: 'MANAGER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: tester1.id, role: 'TESTER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: tester2.id, role: 'TESTER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: approver1.id, role: 'APPROVER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: approver2.id, role: 'APPROVER' } })

  return { project, owner, manager, tester1, tester2, approver1, approver2, outsider }
}

describe('listMembers.use-case', () => {
  it('400 quando projectId ou requesterId inválidos', async () => {
    await expect(listMembers({ projectId: 0, requesterId: 1 })).rejects.toMatchObject({ statusCode: 400 })
    await expect(listMembers({ projectId: -1, requesterId: 1 })).rejects.toMatchObject({ statusCode: 400 })
    await expect(listMembers({ projectId: 1, requesterId: 0 })).rejects.toMatchObject({ statusCode: 400 })
    await expect(listMembers({ projectId: 1, requesterId: -5 })).rejects.toMatchObject({ statusCode: 400 })
  })

  it('404 quando projeto não existe', async () => {
    await expect(listMembers({ projectId: 999_999, requesterId: 1 })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('403 quando requester não é membro do projeto', async () => {
    const { project, outsider } = await seedProjectWithMembers()
    await expect(listMembers({ projectId: project.id, requesterId: outsider.id }))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  it('retorna todos (default ordenar por name asc) quando requester é membro', async () => {
    const { project, owner } = await seedProjectWithMembers()
    const res = await listMembers({ projectId: project.id, requesterId: owner.id })
    expect(res.total).toBe(6) // OWNER + MANAGER + 2x TESTER + 2x APPROVER
    expect(res.items).toHaveLength(6)
    // default: orderBy name asc
    const names = res.items.map(i => i.user.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(sorted)
    // shape
    expect(res.items[0]).toHaveProperty('user.email')
    expect(res.items[0]).toHaveProperty('role')
  })

  it('filtra por roles (TESTER/APPROVER) e busca por q (por nome ou e-mail, case-insensitive)', async () => {
    const { project, owner } = await seedProjectWithMembers()

    // q por nome (case-insensitive): "bOb" bate "Bob Tester"
    let res = await listMembers({
      projectId: project.id,
      requesterId: owner.id,
      roles: ['TESTER', 'APPROVER'],
      q: 'bOb'
    })
    expect(res.items.every(i => i.role === 'TESTER' || i.role === 'APPROVER')).toBe(true)
    expect(res.items.some(i => i.user.name.includes('Bob'))).toBe(true)

    // q por e-mail (trecho comum "eve.app")
    res = await listMembers({
      projectId: project.id,
      requesterId: owner.id,
      roles: ['APPROVER'],
      q: 'EVE.APP'
    })
    expect(res.items).toHaveLength(1)
    expect(res.items[0].user.name).toContain('Eve')
  })

  it('ignora q com espaços apenas (normalizeQuery → undefined) e devolve todos', async () => {
    const { project, owner } = await seedProjectWithMembers()
    const res = await listMembers({
      projectId: project.id,
      requesterId: owner.id,
      q: '    '
    })
    expect(res.total).toBe(6)
    expect(res.items).toHaveLength(6)
  })

  it('ordena por email desc', async () => {
    const { project, owner } = await seedProjectWithMembers()
    const res = await listMembers({
      projectId: project.id,
      requesterId: owner.id,
      orderBy: 'email',
      sort: 'desc'
    })
    const emails = res.items.map(i => i.user.email)
    const sorted = [...emails].sort((a, b) => b.localeCompare(a))
    expect(emails).toEqual(sorted)
  })

 it('ordena por role asc (ordem do enum no schema)', async () => {
  const { project, owner } = await seedProjectWithMembers()
  const res = await listMembers({
    projectId: project.id,
    requesterId: owner.id,
    orderBy: 'role'
    // sort indefinido → asc
  })
  const roles = res.items.map(i => i.role)

  // ordem do enum no Prisma/SQLite:
  const enumOrder = ['APPROVER', 'MANAGER', 'OWNER', 'TESTER'] as const
  const sortedByEnum = [...roles].sort(
    (a, b) => enumOrder.indexOf(a as typeof enumOrder[number]) - enumOrder.indexOf(b as typeof enumOrder[number])
  )

  expect(roles).toEqual(sortedByEnum)
})

  it('pagina corretamente e aplica clamp em page/pageSize', async () => {
    const { project, owner } = await seedProjectWithMembers()
    // temos 6 membros. page=0→1; pageSize=1000→100
    const res = await listMembers({
      projectId: project.id,
      requesterId: owner.id,
      page: 0,
      pageSize: 1000
    })
    expect(res.page).toBe(1)
    expect(res.pageSize).toBe(100)
    expect(res.total).toBe(6)
    expect(res.hasNextPage).toBe(false)

    // pagina real com tamanho 2
    const p1 = await listMembers({
      projectId: project.id,
      requesterId: owner.id,
      page: 1,
      pageSize: 2,
      orderBy: 'name',
      sort: 'asc'
    })
    const p2 = await listMembers({
      projectId: project.id,
      requesterId: owner.id,
      page: 2,
      pageSize: 2,
      orderBy: 'name',
      sort: 'asc'
    })
    const p3 = await listMembers({
      projectId: project.id,
      requesterId: owner.id,
      page: 3,
      pageSize: 2,
      orderBy: 'name',
      sort: 'asc'
    })

    expect(p1.items).toHaveLength(2)
    expect(p1.hasNextPage).toBe(true)
    expect(p2.items).toHaveLength(2)
    expect(p2.hasNextPage).toBe(true)
    expect(p3.items).toHaveLength(2)
    expect(p3.hasNextPage).toBe(false)

    // concatenação mantém ordenação total por name asc
    const allNames = [...p1.items, ...p2.items, ...p3.items].map(i => i.user.name)
    const sorted = [...allNames].sort((a, b) => a.localeCompare(b))
    expect(allNames).toEqual(sorted)
  })
})
