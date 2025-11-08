import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { leaveProject } from '../../application/use-cases/members/leaveProject.use-case'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function leaveProjectController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError('Não autenticado', 401)

    const projectId = Number(req.params.projectId)

    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new AppError('projectId inválido', 400)
    }

    const deleted = await leaveProject({
      projectId,
      userId: req.user.id
    })

    // resposta enxuta
    return res.status(200).json({
      projectId: deleted.projectId,
      userId: deleted.userId,
      role: deleted.role,
      message: 'Você saiu do projeto com sucesso'
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message })
    }
    next(err)
  }
}

