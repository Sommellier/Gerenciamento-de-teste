import type { Request, Response, NextFunction } from 'express'
import { deletePackage } from '../../application/use-cases/packages/deletePackage.use-case'
import { AppError } from '../../utils/AppError'
import { validateId } from '../../utils/validation'

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
    const parsedProjectId = validateId(projectId, 'ID do projeto')
    const parsedPackageId = validateId(packageId, 'ID do pacote')

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
