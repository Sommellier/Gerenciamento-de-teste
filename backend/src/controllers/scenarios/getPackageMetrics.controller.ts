import type { Request, Response, NextFunction } from 'express'
import { getPackageMetrics } from '../../application/use-cases/scenarios/getPackageMetrics.use-case'
import { AppError } from '../../utils/AppError'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export const getPackageMetricsController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { packageId, projectId } = req.params

    if (!req.user?.id) {
      throw new AppError('Não autenticado', 401)
    }

    // Validação dos IDs
    const parsedPackageId = Number(packageId)
    const parsedProjectId = Number(projectId)
    
    if (isNaN(parsedPackageId) || isNaN(parsedProjectId)) {
      throw new AppError('IDs inválidos', 400)
    }

    const metrics = await getPackageMetrics({
      packageId: parsedPackageId,
      projectId: parsedProjectId
    })

    res.json({
      message: 'Métricas do pacote recuperadas com sucesso',
      metrics
    })
  } catch (err: any) {
    next(err)
  }
}
