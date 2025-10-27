import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { listInvites } from '../../application/use-cases/invitations/listInvites.use-case'
import type { InviteStatus } from '@prisma/client'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

function parseStatusParam(input: unknown): InviteStatus[] | undefined {
  if (!input) return undefined
  const raw = Array.isArray(input) ? input.join(',') : String(input)
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  const allowed: InviteStatus[] = ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED']
  const result = parts.filter(p => (allowed as string[]).includes(p)) as InviteStatus[]
  return result.length ? result : undefined
}

export async function listInvitesController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError('Não autenticado', 401)

    const projectId = Number(req.params.projectId)
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

    const result = await listInvites({
      projectId,
      requesterId: req.user.id,
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
