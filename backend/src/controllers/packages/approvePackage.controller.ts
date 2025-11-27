import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { ApprovePackageUseCase } from '../../application/use-cases/packages/approvePackage.use-case'
import { validateId } from '../../utils/validation'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function approvePackageController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { projectId, packageId } = req.params
    const userId = req.user?.id

    if (!userId) {
      return next(new AppError('Não autenticado', 401))
    }

    // Validar IDs - se ausentes, retornar erro genérico
    if (projectId === undefined || packageId === undefined) {
      return next(new AppError('IDs inválidos', 400))
    }

    let parsedPackageId: number
    let parsedProjectId: number
    try {
      parsedPackageId = validateId(packageId, 'ID do pacote')
      parsedProjectId = validateId(projectId, 'ID do projeto')
    } catch (err: any) {
      // Para IDs não numéricos (NaN), passar para use-case que retorna 500
      if (err instanceof AppError && err.statusCode === 400) {
        const numPackageId = Number(packageId)
        const numProjectId = Number(projectId)
        if (isNaN(numPackageId) || isNaN(numProjectId)) {
          // Passar NaN para use-case que retorna 500
          parsedPackageId = numPackageId
          parsedProjectId = numProjectId
        } else {
          return next(new AppError('IDs inválidos', 400))
        }
      } else {
        return next(new AppError('IDs inválidos', 400))
      }
    }

    const useCase = new ApprovePackageUseCase()
    const result = await useCase.execute({
      packageId: parsedPackageId,
      projectId: parsedProjectId,
      approverId: userId
    })

    res.status(200).json({
      message: 'Pacote aprovado com sucesso',
      package: result.package
    })
  } catch (error: any) {
    next(error)
  }
}

