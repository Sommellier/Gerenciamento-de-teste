import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { getPackageDetails } from '../../application/use-cases/packages/getPackageDetails.use-case'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function getPackageDetailsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError('Não autenticado', 401)

    const { projectId, packageId } = req.params

    if (!projectId || !packageId) {
      throw new AppError('Parâmetros obrigatórios: projectId e packageId', 400)
    }

    const packageDetails = await getPackageDetails({
      projectId: Number(projectId),
      packageId: Number(packageId)
    })

    res.status(200).json(packageDetails)
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message })
    } else {
      next(err)
    }
  }
}
