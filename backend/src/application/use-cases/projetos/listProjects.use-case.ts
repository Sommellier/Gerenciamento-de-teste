import { prisma } from '../../../infrastructure/prisma'

type Input = {
  requesterId: number
  q?: string | null
  page?: number
  pageSize?: number
}

export async function listProjects({ requesterId, q, page = 1, pageSize = 10 }: Input) {
  const whereByName =
    q?.trim()
      ? { name: { contains: q.trim(), mode: 'insensitive' as const } }
      : {}

  const memberships = await prisma.userOnProject.findMany({
    where: { userId: requesterId },
    select: { projectId: true },
  })
  const memberProjectIds = memberships.map(m => m.projectId)

  const where = {
    AND: [
      whereByName,
      {
        OR: [
          { ownerId: requesterId },
          memberProjectIds.length ? { id: { in: memberProjectIds } } : { id: { in: [] as number[] } },
        ],
      },
    ],
  }

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.project.count({ where }),
  ])

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}
