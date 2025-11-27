import type { Request, Response, NextFunction } from 'express'
import { getProjectMetrics } from '../../application/use-cases/scenarios/getProjectMetrics.use-case'
import { AppError } from '../../utils/AppError'
import { validateId } from '../../utils/validation'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function getProjectMetricsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { projectId } = req.params
    const { release } = req.query

    if (!req.user?.id) {
      throw new AppError('Não autenticado', 401)
    }

    // Para IDs inválidos (como "invalid"), passar NaN para use-case que retorna 404
    let parsedProjectId: number
    try {
      parsedProjectId = validateId(projectId, 'ID do projeto')
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 400) {
        const numId = Number(projectId)
        parsedProjectId = isNaN(numId) ? numId : 0 // Passar NaN para use-case retornar 404
      } else {
        throw err
      }
    }

    const metrics = await getProjectMetrics({
      projectId: parsedProjectId,
      release: release as string
    })

    res.status(200).json(metrics)
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message })
    } else {
      next(err)
    }
  }
}
