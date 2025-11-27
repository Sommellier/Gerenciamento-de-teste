import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { leaveProject } from '../../application/use-cases/members/leaveProject.use-case'
import { validateId } from '../../utils/validation'

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

    let projectId: number
    try {
      projectId = validateId(req.params.projectId, 'ID do projeto')
    } catch (err: any) {
      // Testes esperam mensagem específica
      if (err instanceof AppError && err.statusCode === 400) {
        throw new AppError('projectId inválido', 400)
      }
      throw err
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

