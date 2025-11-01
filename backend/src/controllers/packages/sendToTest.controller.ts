import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { SendPackageToTestUseCase } from '../../application/use-cases/packages/sendPackageToTest.use-case'

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

    if (!projectId || !packageId) {
      return next(new AppError('IDs inválidos', 400))
    }

    const useCase = new SendPackageToTestUseCase()
    const result = await useCase.execute({
      packageId: parseInt(packageId),
      projectId: parseInt(projectId),
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

