import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { removeMember } from '../../application/use-cases/members/removeMember.use-case'
import { validateId } from '../../utils/validation'

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
