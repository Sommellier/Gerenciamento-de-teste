import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { ApprovePackageUseCase } from '../../application/use-cases/packages/approvePackage.use-case'

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

    if (!projectId || !packageId) {
      return next(new AppError('IDs inválidos', 400))
    }

    const useCase = new ApprovePackageUseCase()
    const result = await useCase.execute({
      packageId: parseInt(packageId),
      projectId: parseInt(projectId),
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

