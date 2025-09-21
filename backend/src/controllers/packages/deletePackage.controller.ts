import type { Request, Response, NextFunction } from 'express'
import { deletePackage } from '../../application/use-cases/packages/deletePackage.use-case'
import { AppError } from '../../utils/AppError'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function deletePackageController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { projectId, packageId } = req.params

    if (!req.user?.id) {
      throw new AppError('Não autenticado', 401)
    }

    // Validação dos IDs
    const parsedProjectId = Number(projectId)
    const parsedPackageId = Number(packageId)
    if (isNaN(parsedProjectId)) {
      throw new AppError('ID do projeto inválido', 400)
    }
    if (isNaN(parsedPackageId)) {
      throw new AppError('ID do pacote inválido', 400)
    }

    const result = await deletePackage({
      packageId: parsedPackageId,
      projectId: parsedProjectId
    })

    res.status(200).json(result)
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message })
    } else {
      next(err)
    }
  }
}
