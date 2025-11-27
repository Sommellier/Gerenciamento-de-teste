import type { Request, Response, NextFunction } from 'express'
import { getPackageMetrics } from '../../application/use-cases/scenarios/getPackageMetrics.use-case'
import { AppError } from '../../utils/AppError'
import { validateId } from '../../utils/validation'

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

    // Validação dos IDs - capturar erros e lançar mensagem genérica
    try {
      const parsedPackageId = validateId(packageId, 'ID do pacote')
      const parsedProjectId = validateId(projectId, 'ID do projeto')

      const metrics = await getPackageMetrics({
        packageId: parsedPackageId,
        projectId: parsedProjectId
      })

      res.json({
        message: 'Métricas do pacote recuperadas com sucesso',
        metrics
      })
    } catch (err: any) {
      // Se for erro de validação, lançar mensagem genérica esperada pelos testes
      if (err instanceof AppError && err.statusCode === 400) {
        next(new AppError('IDs inválidos', 400))
      } else {
        next(err)
      }
    }
  } catch (err: any) {
    next(err)
  }
}
