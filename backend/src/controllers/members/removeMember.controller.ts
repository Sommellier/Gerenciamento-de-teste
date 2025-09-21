import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { removeMember } from '../../application/use-cases/members/removeMember.use-case'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function removeMemberController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError('Não autenticado', 401)

    const projectId = Number(req.params.projectId)
    const targetUserId = Number(req.params.userId)

    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new AppError('projectId inválido', 400)
    }
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new AppError('userId inválido', 400)
    }

    const deleted = await removeMember({
      projectId,
      requesterId: req.user.id,
      targetUserId
    })

    // resposta enxuta
    return res.status(200).json({
      projectId: deleted.projectId,
      userId: deleted.userId,
      role: deleted.role
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message })
    }
    next(err)
  }
}
