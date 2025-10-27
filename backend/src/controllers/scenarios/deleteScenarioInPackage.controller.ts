import type { Request, Response, NextFunction } from 'express'
import { deleteScenarioInPackage } from '../../application/use-cases/scenarios/deleteScenarioInPackage.use-case'
import { AppError } from '../../utils/AppError'

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

    // Validação dos IDs
    const parsedScenarioId = Number(scenarioId)
    const parsedPackageId = Number(packageId)
    const parsedProjectId = Number(projectId)
    
    if (isNaN(parsedScenarioId) || isNaN(parsedPackageId) || isNaN(parsedProjectId)) {
      throw new AppError('IDs inválidos', 400)
    }

    const result = await deleteScenarioInPackage({
      scenarioId: parsedScenarioId,
      packageId: parsedPackageId,
      projectId: parsedProjectId
    })

    res.json(result)
  } catch (err: any) {
    next(err)
  }
}
