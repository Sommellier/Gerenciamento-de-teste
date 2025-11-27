import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { SendPackageToTestUseCase } from '../../application/use-cases/packages/sendPackageToTest.use-case'
import { validateId } from '../../utils/validation'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function sendPackageToTestController(
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

    // Validar IDs - se ausentes ou inválidos, retornar erro genérico
    if (!projectId || !packageId) {
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

    const useCase = new SendPackageToTestUseCase()
    const result = await useCase.execute({
      packageId: parsedPackageId,
      projectId: parsedProjectId,
      userId
    })

    res.status(200).json({
      message: 'Pacote reenviado para teste com sucesso',
      package: result.package
    })
  } catch (error: any) {
    next(error)
  }
}

