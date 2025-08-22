// src/tests/aplication/projectService/listProjects.controller.spec.ts (unitário do use-case)
import 'dotenv/config'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { listProjects } from '../../../application/use-cases/projetos/listProjects.use-case'

jest.mock('../../../infrastructure/prisma', () => {
  return {
    prisma: {
      userOnProject: { findMany: jest.fn() },
      project: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $disconnect: jest.fn(),
    },
  }
})

import { prisma } from '../../../infrastructure/prisma'

const mockedMembershipFindMany =
  prisma.userOnProject.findMany as jest.MockedFunction<typeof prisma.userOnProject.findMany>

const mockedProjectFindMany =
  prisma.project.findMany as jest.MockedFunction<typeof prisma.project.findMany>

const mockedProjectCount =
  prisma.project.count as jest.MockedFunction<typeof prisma.project.count>

function firstCallFirstArg<T = any>(mockFn: jest.Mock): T {
  expect(mockFn).toHaveBeenCalled()
  const call = mockFn.mock.calls[0]
  expect(call?.length ?? 0).toBeGreaterThan(0)
  return call[0] as T
}

describe('listProjects.use-case (unit)', () => {
  const REQUESTER = 42

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('retorna apenas projetos do owner quando não há memberships', async () => {
    mockedMembershipFindMany.mockResolvedValue([])

    const items = [
      { id: 3, name: 'Gamma', ownerId: REQUESTER, description: null },
      { id: 2, name: 'Beta', ownerId: REQUESTER, description: null },
    ] as any[]

    mockedProjectFindMany.mockResolvedValue(items)
    mockedProjectCount.mockResolvedValue(2)

    const result = await listProjects({ requesterId: REQUESTER, q: undefined })

    expect(result.total).toBe(2)
    expect(result.items).toHaveLength(2)
    expect(result.items.every(p => p.ownerId === REQUESTER)).toBe(true)

    expect(mockedMembershipFindMany).toHaveBeenCalledWith({
      where: { userId: REQUESTER },
      select: { projectId: true },
    })

    const calledArgs = firstCallFirstArg<any>(mockedProjectFindMany as unknown as jest.Mock)
    expect(calledArgs).toEqual(
      expect.objectContaining({
        orderBy: { id: 'desc' },
        skip: 0,
        take: 10,
      }),
    )

    expect(Array.isArray(calledArgs.where.AND)).toBe(true)
    expect(Array.isArray(calledArgs.where.AND[1].OR)).toBe(true)
    expect(calledArgs.where.AND[1].OR).toEqual(
      expect.arrayContaining([
        { ownerId: REQUESTER },
        { id: { in: [] } },
      ]),
    )
  })

  it('retorna projetos onde é owner OU membro quando há memberships', async () => {
    mockedMembershipFindMany.mockResolvedValue([{ projectId: 10 }, { projectId: 11 }] as any)

    const items = [
      { id: 11, name: 'Membro 11', ownerId: 999, description: null },
      { id: 10, name: 'Membro 10', ownerId: 888, description: null },
      { id: 7, name: 'Sou Owner', ownerId: REQUESTER, description: null },
    ] as any[]
    mockedProjectFindMany.mockResolvedValue(items)
    mockedProjectCount.mockResolvedValue(3)

    const result = await listProjects({ requesterId: REQUESTER })

    expect(result.total).toBe(3)
    expect(result.items.map(i => i.id).sort()).toEqual([7, 10, 11].sort())

    const calledArgs = firstCallFirstArg<any>(mockedProjectFindMany as unknown as jest.Mock)
    expect(calledArgs.where.AND[1].OR).toEqual(
      expect.arrayContaining([
        { ownerId: REQUESTER },
        { id: { in: [10, 11] } },
      ]),
    )
  })

  it('aplica filtro "q" (trim + case-insensitive) no nome', async () => {
    mockedMembershipFindMany.mockResolvedValue([])
    mockedProjectFindMany.mockResolvedValue([] as any)
    mockedProjectCount.mockResolvedValue(0)

    const q = '  alp '
    await listProjects({ requesterId: REQUESTER, q })

    const calledArgs = firstCallFirstArg<any>(mockedProjectFindMany as unknown as jest.Mock)
    expect(calledArgs.where.AND[0]).toEqual({
      name: { contains: 'alp', mode: 'insensitive' },
    })
  })

  it('paginacao: calcula skip/take corretamente', async () => {
    mockedMembershipFindMany.mockResolvedValue([])
    mockedProjectFindMany.mockResolvedValue([{ id: 1, name: 'x', ownerId: REQUESTER, description: null }] as any)
    mockedProjectCount.mockResolvedValue(7)

    const page = 2
    const pageSize = 3
    const result = await listProjects({ requesterId: REQUESTER, page, pageSize })

    expect(result.total).toBe(7)
    expect(result.page).toBe(2)
    expect(result.pageSize).toBe(3)
    expect(result.totalPages).toBe(3)

    const calledArgs = firstCallFirstArg<any>(mockedProjectFindMany as unknown as jest.Mock)
    expect(calledArgs.skip).toBe(3) // (2-1)*3
    expect(calledArgs.take).toBe(3)
  })

  it('q vazio/espacos não deve aplicar filtro de nome', async () => {
    mockedMembershipFindMany.mockResolvedValue([])
    mockedProjectFindMany.mockResolvedValue([] as any)
    mockedProjectCount.mockResolvedValue(0)

    await listProjects({ requesterId: REQUESTER, q: '   ' })

    const calledArgs = firstCallFirstArg<any>(mockedProjectFindMany as unknown as jest.Mock)
    expect(calledArgs.where.AND[0]).toEqual({})
  })
})
