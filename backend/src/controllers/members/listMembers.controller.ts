import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { listMembers } from '../../application/use-cases/members/listMembers.use-case'
import type { Role } from '@prisma/client'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

function parseRolesParam(input: unknown): Role[] | undefined {
  if (!input) return undefined
  const raw = Array.isArray(input) ? input.join(',') : String(input)
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  const allowed: Role[] = ['OWNER', 'MANAGER', 'TESTER', 'APPROVER']
  const result = parts.filter(p => (allowed as string[]).includes(p)) as Role[]
  return result.length ? result : undefined
}

export async function listMembersController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('listMembersController called with projectId:', req.params.projectId)
    console.log('User:', req.user)
    
    if (!req.user?.id) throw new AppError('Não autenticado', 401)

    const projectId = Number(req.params.projectId)
    const roles = parseRolesParam(req.query.roles)
    const q = typeof req.query.q === 'string' ? req.query.q : undefined
    const page = req.query.page ? Number(req.query.page) : undefined
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined

    const orderByParam = String(req.query.orderBy ?? '')
    const orderBy =
      orderByParam === 'email' || orderByParam === 'role' || orderByParam === 'name'
        ? (orderByParam as 'email' | 'role' | 'name')
        : undefined

    const sortParam = String(req.query.sort ?? '').toLowerCase()
    const sort = sortParam === 'desc' ? 'desc' : sortParam === 'asc' ? 'asc' : undefined

    console.log('Calling listMembers with projectId:', projectId, 'requesterId:', req.user.id)
    const result = await listMembers({
      projectId,
      requesterId: req.user.id,
      roles,
      q,
      page,
      pageSize,
      orderBy,
      sort,
    })

    console.log('Members found:', result.items?.length || 0)
    return res.status(200).json(result)
  } catch (err) {
    console.error('Error in listMembersController:', err)
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message })
    }
    next(err)
  }
}
