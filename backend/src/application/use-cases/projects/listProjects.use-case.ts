import { prisma } from '../../../infrastructure/prisma'

type Input = {
  requesterId: number
  q?: string | null
  page?: number
  pageSize?: number
}

export async function listProjectsQuery({ requesterId, q, page = 1, pageSize = 10 }: Input) {
  const whereByName =
    q?.trim()
      ? { name: { contains: q.trim(), mode: 'insensitive' as const } }
      : {}

  const memberships = await prisma.userOnProject.findMany({
    where: { userId: requesterId },
    select: { projectId: true },
  })

  const memberProjectIds = memberships.map((m: { projectId: number }) => m.projectId)

  const where = {
    AND: [
      { OR: [
          { ownerId: requesterId },
          memberProjectIds.length ? { id: { in: memberProjectIds } } : { id: { in: [] as number[] } },
        ],
      },
      whereByName,
    ],
  }

  const effectivePageSize = Math.max(1, Number.isFinite(pageSize) ? pageSize! : 10)
  const effectivePage = Number.isFinite(page) ? page! : 1
  const skip = Math.max(0, (effectivePage - 1) * effectivePageSize)

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { id: 'desc' },
      skip,
      take: effectivePageSize,
    }),
    prisma.project.count({ where }),
  ])

  return {
    items,
    total,
    page,         
    pageSize,     
    totalPages: Math.max(1, Math.ceil(total / effectivePageSize)),
  }
}
