import { prisma } from '../../infrastructure/prisma'

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

  const where = {
    OR: [
      { ownerId: requesterId, ...whereByName },
      {
        userOnProject: { some: { userId: requesterId } },
        ...whereByName,
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
