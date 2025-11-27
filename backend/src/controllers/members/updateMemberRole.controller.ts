import type { Request, Response, NextFunction } from 'express'
import type { Role } from '@prisma/client'
import { AppError } from '../../utils/AppError'
import { updateMemberRole } from '../../application/use-cases/members/updateMemberRole.use-case'
import { validateId } from '../../utils/validation'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

function isRole(v: unknown): v is Role {
  return typeof v === 'string' && ['OWNER','MANAGER','TESTER','APPROVER'].includes(v)
}

export async function updateMemberRoleController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError('Não autenticado', 401)

    let projectId: number
    let targetUserId: number
    try {
      projectId = validateId(req.params.projectId, 'ID do projeto')
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 400) {
        throw new AppError('projectId inválido', 400)
      }
      throw err
    }
    try {
      targetUserId = validateId(req.params.userId, 'ID do usuário')
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 400) {
        throw new AppError('userId inválido', 400)
      }
      throw err
    }
    const { role } = req.body ?? {}
    if (!isRole(role)) {
      throw new AppError('Role inválida', 400)
    }

    const member = await updateMemberRole({
      projectId,
      requesterId: req.user.id,
      targetUserId,
      newRole: role
    })

    return res.status(200).json({
      projectId: member.projectId,
      userId: member.userId,
      role: member.role
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message })
    }
    next(err)
  }
}
