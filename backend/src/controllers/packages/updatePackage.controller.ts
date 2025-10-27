import type { Request, Response, NextFunction } from 'express'
import { updatePackage } from '../../application/use-cases/packages/updatePackage.use-case'
import { AppError } from '../../utils/AppError'

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
    const parsedProjectId = Number(projectId)
    const parsedPackageId = Number(packageId)
    if (isNaN(parsedProjectId)) {
      throw new AppError('ID do projeto inválido', 400)
    }
    if (isNaN(parsedPackageId)) {
      throw new AppError('ID do pacote inválido', 400)
    }

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
