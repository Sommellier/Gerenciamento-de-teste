import type { Request, Response, NextFunction } from 'express'
import type { Role } from '@prisma/client'
import { AppError } from '../../utils/AppError'
import { updateMemberRole } from '../../application/use-cases/members/updateMemberRole.use-case'

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

    const projectId = Number(req.params.projectId)
    const targetUserId = Number(req.params.userId)
    const { role } = req.body ?? {}

    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new AppError('projectId inválido', 400)
    }
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new AppError('userId inválido', 400)
    }
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
