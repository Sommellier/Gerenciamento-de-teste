import type { Request, Response, NextFunction } from 'express'
import { getPackageScenarios } from '../../application/use-cases/scenarios/getPackageScenarios.use-case'
import { AppError } from '../../utils/AppError'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export const getPackageScenariosController = async (
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

    const scenarios = await getPackageScenarios({
      packageId: parsedPackageId,
      projectId: parsedProjectId
    })

    res.json({
      message: 'Cenários do pacote recuperados com sucesso',
      scenarios
    })
  } catch (err: any) {
    next(err)
  }
}
