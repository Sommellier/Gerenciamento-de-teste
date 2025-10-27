import type { Request, Response, NextFunction } from 'express'
import { getProjectPackages } from '../../application/use-cases/packages/getProjectPackages.use-case'
import { AppError } from '../../utils/AppError'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function getProjectPackagesController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { projectId } = req.params
    const { release } = req.query

    if (!req.user?.id) {
      throw new AppError('Não autenticado', 401)
    }

    // Validação do projectId
    const parsedProjectId = Number(projectId)
    if (isNaN(parsedProjectId)) {
      throw new AppError('ID do projeto inválido', 400)
    }

    const testPackages = await getProjectPackages({
      projectId: parsedProjectId,
      release: release as string
    })

    res.status(200).json({ packages: testPackages })
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message })
    } else {
      next(err)
    }
  }
}
