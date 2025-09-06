// src/tests/application/projectService/listProjects.use-case.spec.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import type { Request, Response, NextFunction } from 'express'

jest.mock('../../../infrastructure/prisma', () => {
  return {
    prisma: {
      userOnProject: { findMany: jest.fn() },
      project: { findMany: jest.fn(), count: jest.fn() },
    },
  }
})

import { prisma } from '../../../infrastructure/prisma'
import { listProjectsQuery } from '../../../application/use-cases/projetos/listProjects.use-case'
import { listProjects } from '../../../controllers/project/listProjects.controller'

const mockedFindMemberships =
  prisma.userOnProject.findMany as jest.MockedFunction<typeof prisma.userOnProject.findMany>
const mockedFindMany =
  prisma.project.findMany as jest.MockedFunction<typeof prisma.project.findMany>
const mockedCount =
  prisma.project.count as jest.MockedFunction<typeof prisma.project.count>


const makeRes = () => {
  const res: Partial<Response> = {}
    ; (res as any).status = jest.fn().mockReturnValue(res)
    ; (res as any).json = jest.fn().mockReturnValue(res)
  return res as Response & { status: jest.Mock; json: jest.Mock }
}

describe('listProjectsQuery (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('filtra por nome quando q (com espaços) é fornecido e há memberships', async () => {
    mockedFindMemberships.mockResolvedValue([{ projectId: 10 }, { projectId: 11 }] as any)
    mockedFindMany.mockResolvedValue([{ id: 11, name: 'Alpha' }] as any)
    mockedCount.mockResolvedValue(1 as any)

    const result = await listProjectsQuery({
      requesterId: 7,
      q: '  Alp  ',
      page: 2,
      pageSize: 5,
    })

    expect(mockedFindMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { OR: [{ ownerId: 7 }, { id: { in: [10, 11] } }] },
          { name: { contains: 'Alp', mode: 'insensitive' } },
        ],
      },
      orderBy: { id: 'desc' },
      skip: 5,
      take: 5,
    })
    expect(mockedCount).toHaveBeenCalledWith({
      where: {
        AND: [
          { OR: [{ ownerId: 7 }, { id: { in: [10, 11] } }] },
          { name: { contains: 'Alp', mode: 'insensitive' } },
        ],
      },
    })
    expect(result).toEqual({
      items: [{ id: 11, name: 'Alpha' }],
      total: 1,
      page: 2,
      pageSize: 5,
      totalPages: 1,
    })
  })

  it('ignora filtro de nome quando q vira string vazia após trim; memberships vazias -> in: []', async () => {
    mockedFindMemberships.mockResolvedValue([] as any)
    mockedFindMany.mockResolvedValue([] as any)
    mockedCount.mockResolvedValue(0 as any)

    const result = await listProjectsQuery({
      requesterId: 42,
      q: '   ',
      page: 1,
      pageSize: 10,
    })

    expect(mockedFindMany).toHaveBeenCalledWith({
      where: {
        AND: [{ OR: [{ ownerId: 42 }, { id: { in: [] } }] }, {}],
      },
      orderBy: { id: 'desc' },
      skip: 0,
      take: 10,
    })
    expect(result.totalPages).toBe(1)
  })

  it('page negativo e pageSize 0 cobrem Math.max -> skip=0 e take=1', async () => {
    mockedFindMemberships.mockResolvedValue([] as any)
    mockedFindMany.mockResolvedValue([] as any)
    mockedCount.mockResolvedValue(0 as any)

    const result = await listProjectsQuery({
      requesterId: 1,
      page: -99,
      pageSize: 0,
    })

    expect(mockedFindMany).toHaveBeenCalledWith({
      where: {
        AND: [{ OR: [{ ownerId: 1 }, { id: { in: [] } }] }, {}],
      },
      orderBy: { id: 'desc' },
      skip: 0,
      take: 1,
    })
    expect(result).toEqual({
      items: [],
      total: 0,
      page: -99,
      pageSize: 0,
      totalPages: 1,
    })
  })
})

// =============================================================================
// listProjects (controller) (unit)
// =============================================================================
describe('listProjects (controller) (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('401 quando requesterId ausente', async () => {
    const req = { user: undefined, query: {} } as unknown as Request
    const res = makeRes()
    const next = jest.fn() as unknown as NextFunction

    await listProjects(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Não autenticado' })
    expect(next).not.toHaveBeenCalled()
  })

  it('200 quando sucesso; parseia q/page/pageSize e responde com o resultado', async () => {
    mockedFindMemberships.mockResolvedValue([] as any)
    mockedFindMany.mockResolvedValue([{ id: 1, name: 'Beta' }] as any)
    mockedCount.mockResolvedValue(1 as any)

    const req = {
      user: { id: 99 },
      query: { q: '  beta ', page: '3', pageSize: '7' },
    } as unknown as Request
    const res = makeRes()
    const next = jest.fn() as unknown as NextFunction

    await listProjects(req, res, next)

    expect(mockedFindMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { OR: [{ ownerId: 99 }, { id: { in: [] } }] },
          { name: { contains: 'beta', mode: 'insensitive' } },
        ],
      },
      orderBy: { id: 'desc' },
      skip: 14,
      take: 7,
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      items: [{ id: 1, name: 'Beta' }],
      total: 1,
      page: 3,
      pageSize: 7,
      totalPages: 1,
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('q não-string (ex.: array) -> passa como undefined (sem filtro de nome)', async () => {
    mockedFindMemberships.mockResolvedValue([] as any)
    mockedFindMany.mockResolvedValue([] as any)
    mockedCount.mockResolvedValue(0 as any)

    const req = {
      user: { id: 50 },
      query: { q: ['a', 'b'] as any, page: '1', pageSize: '10' },
    } as unknown as Request
    const res = makeRes()
    const next = jest.fn() as unknown as NextFunction

    await listProjects(req, res, next)

    expect(mockedFindMany).toHaveBeenCalledWith({
      where: {
        AND: [{ OR: [{ ownerId: 50 }, { id: { in: [] } }] }, {}],
      },
      orderBy: { id: 'desc' },
      skip: 0,
      take: 10,
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })
  })

  it('erro no try -> next(err)', async () => {
    const req = { user: { id: 5 }, query: {} } as unknown as Request
    const res = makeRes()
    const next = jest.fn() as unknown as NextFunction

    const boom = new Error('falhei!')
    mockedFindMemberships.mockRejectedValue(boom)

    await listProjects(req, res, next)

    expect(next).toHaveBeenCalledWith(boom)
    expect(res.status).not.toHaveBeenCalledWith(200)
  })

  it('page e pageSize NaN → usa fallbacks (effectivePage=1, effectivePageSize=10)', async () => {
    mockedFindMemberships.mockResolvedValue([] as any)
    mockedFindMany.mockResolvedValue([] as any)
    mockedCount.mockResolvedValue(0 as any)

    const result = await listProjectsQuery({
      requesterId: 777,
      // forçam Number.isFinite(...) a ser false
      page: NaN,
      pageSize: NaN,
    })

    expect(mockedFindMany).toHaveBeenCalledWith({
      where: {
        AND: [{ OR: [{ ownerId: 777 }, { id: { in: [] } }] }, {}],
      },
      orderBy: { id: 'desc' },
      skip: 0,
      take: 10,
    })

    expect(Number.isNaN(result.page)).toBe(true)
    expect(Number.isNaN(result.pageSize)).toBe(true)
    expect(result.totalPages).toBe(1)
  })

  it('q undefined → não aplica filtro por nome (whereByName = {})', async () => {
    mockedFindMemberships.mockResolvedValue([{ projectId: 5 }] as any)
    mockedFindMany.mockResolvedValue([{ id: 5, name: 'Zeta' }] as any)
    mockedCount.mockResolvedValue(1 as any)

    const result = await listProjectsQuery({
      requesterId: 9,   
    })

    expect(mockedFindMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { OR: [{ ownerId: 9 }, { id: { in: [5] } }] },
          {},                                  
        ],
      },
      orderBy: { id: 'desc' },
      skip: 0,                                 
      take: 10,                                
    })

    expect(result).toEqual({
      items: [{ id: 5, name: 'Zeta' }],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })
  })
})
