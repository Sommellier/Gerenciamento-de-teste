import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { listInvites } from '../../application/use-cases/invitations/listInvites.use-case'
import type { InviteStatus } from '@prisma/client'
import { validateId, validatePagination } from '../../utils/validation'

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

    let projectId: number
    try {
      projectId = validateId(req.params.projectId, 'ID do projeto')
    } catch (err: any) {
      // Para IDs inválidos (como "abc"), passar NaN para use-case que pode retornar 500
      if (err instanceof AppError && err.statusCode === 400) {
        const numId = Number(req.params.projectId)
        if (isNaN(numId)) {
          // Passar NaN para use-case
          projectId = numId
        } else {
          throw new AppError('projectId inválido', 400)
        }
      } else {
        throw err
      }
    }
    const status = parseStatusParam(req.query.status)
    const q = typeof req.query.q === 'string' ? req.query.q : undefined
    const { page, pageSize } = validatePagination(req.query.page, req.query.pageSize, true)
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
