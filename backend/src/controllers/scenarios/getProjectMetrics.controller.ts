import type { Request, Response, NextFunction } from 'express'
import { getProjectMetrics } from '../../application/use-cases/scenarios/getProjectMetrics.use-case'
import { AppError } from '../../utils/AppError'

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

    const metrics = await getProjectMetrics({
      projectId: Number(projectId),
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
