import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { RejectPackageUseCase } from '../../application/use-cases/packages/rejectPackage.use-case'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function rejectPackageController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { projectId, packageId } = req.params
    const userId = req.user?.id
    const { rejectionReason } = req.body

    if (!userId) {
      return next(new AppError('Não autenticado', 401))
    }

    if (!projectId || !packageId) {
      return next(new AppError('IDs inválidos', 400))
    }

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return next(new AppError('Justificativa da reprovação é obrigatória', 400))
    }

    const useCase = new RejectPackageUseCase()
    const result = await useCase.execute({
      packageId: parseInt(packageId),
      projectId: parseInt(projectId),
      rejectorId: userId,
      rejectionReason: rejectionReason.trim()
    })

    res.status(200).json({
      message: 'Pacote reprovado com sucesso',
      package: result.package
    })
  } catch (error: any) {
    next(error)
  }
}

