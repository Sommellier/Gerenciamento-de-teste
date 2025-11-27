import type { Request, Response, NextFunction } from 'express'
import { deleteScenarioInPackage } from '../../application/use-cases/scenarios/deleteScenarioInPackage.use-case'
import { AppError } from '../../utils/AppError'
import { validateId } from '../../utils/validation'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export const deleteScenarioInPackageController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { scenarioId, packageId, projectId } = req.params

    if (!req.user?.id) {
      throw new AppError('Não autenticado', 401)
    }

    // Validação dos IDs - capturar erros e lançar mensagem genérica
    try {
      const parsedScenarioId = validateId(scenarioId, 'ID do cenário')
      const parsedPackageId = validateId(packageId, 'ID do pacote')
      const parsedProjectId = validateId(projectId, 'ID do projeto')

      const result = await deleteScenarioInPackage({
        scenarioId: parsedScenarioId,
        packageId: parsedPackageId,
        projectId: parsedProjectId
      })

      res.json(result)
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
