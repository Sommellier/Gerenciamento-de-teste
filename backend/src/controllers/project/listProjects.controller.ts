import { RequestHandler } from 'express'
import { prisma } from '../../infrastructure/prisma'

type Input = {
  requesterId: number
  q?: string | null
  page?: number
  pageSize?: number
}

export async function listProjectsQuery({ requesterId, q, page = 1, pageSize = 10 }: Input) {
  console.log('listProjectsQuery called with:', { requesterId, q, page, pageSize })
  
  const whereByName =
    q?.trim()
      ? { name: { contains: q.trim(), mode: 'insensitive' as const } }
      : {}

  console.log('whereByName:', whereByName)

  const memberships = await prisma.userOnProject.findMany({
    where: { userId: requesterId },
    select: { projectId: true },
  })
  const memberProjectIds = memberships.map((m: { projectId: number }) => m.projectId)
  
  console.log('memberships:', memberships)
  console.log('memberProjectIds:', memberProjectIds)

  const baseOr = [
    { ownerId: requesterId },
    memberProjectIds.length ? { id: { in: memberProjectIds } } : { id: { in: [] as number[] } },
  ]

  const where = {
    AND: [{ OR: baseOr }, whereByName],
  }

  console.log('where clause:', JSON.stringify(where, null, 2))

  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1
  const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 10

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.project.count({ where }),
  ])

  console.log('Database query results:', { itemsCount: items.length, total })

  return {
    items,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  }
}

export const listProjects: RequestHandler = async (req, res, next) => {
  try {
    console.log('listProjects called')
    const requesterId = (req as any).user?.id
    console.log('requesterId:', requesterId)
    
    if (!requesterId) {
      console.log('User not authenticated')
      res.status(401).json({ message: 'Não autenticado' })
      return
    }

    const q = typeof req.query.q === 'string' ? req.query.q : undefined
    const page = req.query.page ? Number(req.query.page) : 1
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 10

    console.log('Query params:', { q, page, pageSize })

    const result = await listProjectsQuery({ requesterId, q, page, pageSize })
    console.log('Query result:', result)
    
    res.status(200).json(result)
  } catch (err) {
    console.error('Error in listProjects:', err)
    next(err as any)
  }
}
