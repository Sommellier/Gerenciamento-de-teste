import type { Request, Response, NextFunction } from 'express'
import { updatePackage } from '../../application/use-cases/packages/updatePackage.use-case'
import { AppError } from '../../utils/AppError'
import { validateId } from '../../utils/validation'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function updatePackageController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { projectId, packageId } = req.params
    const {
      title,
      description,
      type,
      priority,
      tags,
      steps,
      assigneeId,
      assigneeEmail,
      environment,
      release,
      status
    } = req.body

    if (!req.user?.id) {
      throw new AppError('Não autenticado', 401)
    }

    // Validação dos IDs
    const parsedProjectId = validateId(projectId, 'ID do projeto')
    const parsedPackageId = validateId(packageId, 'ID do pacote')

    const testPackage = await updatePackage({
      packageId: parsedPackageId,
      projectId: parsedProjectId,
      title,
      description,
      type,
      priority,
      tags,
      steps,
      assigneeId,
      assigneeEmail,
      environment,
      release,
      status
    })

    res.status(200).json({
      message: 'Pacote atualizado com sucesso',
      testPackage
    })
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message })
    } else {
      next(err)
    }
  }
}
