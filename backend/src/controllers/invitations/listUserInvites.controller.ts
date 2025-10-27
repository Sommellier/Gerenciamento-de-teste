import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { prisma } from '../../infrastructure/prisma'
import type { InviteStatus } from '@prisma/client'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export type ListUserInvitesInput = {
  userId: number
  status?: InviteStatus[]
  q?: string
  page?: number
  pageSize?: number
  orderBy?: 'createdAt' | 'expiresAt' | 'status'
  sort?: 'asc' | 'desc'
}

type UserInviteRow = {
  id: number
  projectId: number
  email: string
  role: string
  status: InviteStatus
  token: string
  createdAt: Date
  expiresAt: Date
  acceptedAt: Date | null
  declinedAt: Date | null
  project: {
    id: number
    name: string
  }
  invitedBy: {
    id: number
    name: string
    email: string
  }
}

type ListUserInvitesResult = {
  items: UserInviteRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function normalizeEmailQuery(q?: string): string | undefined {
  if (!q || typeof q !== 'string') return undefined
  const trimmed = q.trim()
  return trimmed.length > 0 ? trimmed.toLowerCase() : undefined
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

export async function listUserInvites({
  userId,
  status,
  q,
  page = 1,
  pageSize = 20,
  orderBy = 'createdAt',
  sort = 'desc'
}: ListUserInvitesInput): Promise<ListUserInvitesResult> {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError('userId inválido', 400)
  }

  // Buscar o usuário para pegar o email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  })
  if (!user) throw new AppError('Usuário não encontrado', 404)

  // Primeiro, marcar convites expirados automaticamente
  const now = new Date()
  await prisma.projectInvite.updateMany({
    where: {
      email: user.email,
      status: 'PENDING',
      expiresAt: { lt: now }
    },
    data: { status: 'EXPIRED' }
  })

  // Filtros
  const where: any = { email: user.email }
  if (status && status.length) where.status = { in: status }

  // Paginação
  const safePage = Math.max(1, Math.floor(page))
  const safeSize = clamp(Math.floor(pageSize), 1, 100)
  const skip = (safePage - 1) * safeSize
  const take = safeSize

  // Ordenação
  const order = ['createdAt', 'expiresAt', 'status'].includes(orderBy) ? orderBy : 'createdAt'
  const direction = sort === 'asc' ? 'asc' : 'desc'

  const [items, total] = await prisma.$transaction([
    prisma.projectInvite.findMany({
      where,
      skip,
      take,
      orderBy: { [order]: direction },
      select: {
        id: true,
        projectId: true,
        email: true,
        role: true,
        status: true,
        token: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
        declinedAt: true,
        project: {
          select: {
            id: true,
            name: true
          }
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.projectInvite.count({ where })
  ])

  return {
    items: items as UserInviteRow[],
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages: Math.ceil(total / safeSize)
  }
}

function parseStatusParam(input: unknown): InviteStatus[] | undefined {
  if (!input) return undefined
  if (typeof input === 'string') {
    const parts = input.split(',').map(s => s.trim().toUpperCase())
    const validStatuses: InviteStatus[] = ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED']
    const result = parts.filter(s => validStatuses.includes(s as InviteStatus)) as InviteStatus[]
    return result.length ? result : undefined
  }
  return undefined
}

export async function listUserInvitesController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError('Não autenticado', 401)

    const status = parseStatusParam(req.query.status)
    const q = typeof req.query.q === 'string' ? req.query.q : undefined
    const page = req.query.page ? Number(req.query.page) : undefined
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined
    const orderBy =
      req.query.orderBy === 'createdAt' ||
      req.query.orderBy === 'expiresAt' ||
      req.query.orderBy === 'status'
        ? (req.query.orderBy as 'createdAt' | 'expiresAt' | 'status')
        : undefined
    const sort = req.query.sort === 'asc' ? 'asc' : req.query.sort === 'desc' ? 'desc' : undefined

    const result = await listUserInvites({
      userId: req.user.id,
      status,
      q,
      page,
      pageSize,
      orderBy,
      sort
    })

    return res.status(200).json(result)
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message })
    }
    next(err)
  }
}
