// src/controllers/project/listProjects.controller.ts
import { RequestHandler } from 'express'
import { prisma } from '../../infrastructure/prisma'

type Input = {
  requesterId: number
  q?: string | null
  page?: number
  pageSize?: number
}

/** Use case robusto: não depende do nome do campo relacional dentro de Project */
export async function listProjectsQuery({ requesterId, q, page = 1, pageSize = 10 }: Input) {
  const whereByName =
    q?.trim()
      ? { name: { contains: q.trim(), mode: 'insensitive' as const } }
      : {}

  // 1) Buscar IDs de projetos onde o usuário é membro
  const memberships = await prisma.userOnProject.findMany({
    where: { userId: requesterId },
    select: { projectId: true },
  })
  const memberProjectIds = memberships.map(m => m.projectId)

  // 2) Montar where combinando owner OU membership por id
  //    AND com possível filtro por nome
  const baseOr = [
    { ownerId: requesterId },
    memberProjectIds.length ? { id: { in: memberProjectIds } } : { id: { in: [] as number[] } },
  ]

  const where = {
    AND: [
      { OR: baseOr },
      whereByName,
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

/** Controller Express inalterado */
export const listProjects: RequestHandler = async (req, res, next) => {
  try {
    const requesterId = (req as any).user?.id
    if (!requesterId) {
      res.status(401).json({ message: 'Não autenticado' })
      return
    }

    const q = typeof req.query.q === 'string' ? req.query.q : undefined
    const page = req.query.page ? Number(req.query.page) : 1
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 10

    const result = await listProjectsQuery({ requesterId, q, page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    next(err as any)
  }
}
