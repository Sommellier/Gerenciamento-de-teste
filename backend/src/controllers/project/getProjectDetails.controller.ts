import type { Request, Response, NextFunction } from 'express'
import { getProjectDetails } from '../../application/use-cases/projects/getProjectDetails.use-case'
import { AppError } from '../../utils/AppError'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function getProjectDetailsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { projectId } = req.params
    const { release } = req.query

    // Temporariamente removido para teste
    // if (!req.user?.id) {
    //   throw new AppError('Não autenticado', 401)
    // }

    const projectDetails = await getProjectDetails({
      projectId: Number(projectId),
      release: release as string
    })

    res.status(200).json(projectDetails)
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message })
    } else {
      next(err)
    }
  }
}
