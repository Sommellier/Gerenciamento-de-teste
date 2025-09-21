import type { Request, Response, NextFunction } from 'express'
import { getProjectReleases } from '../../application/use-cases/scenarios/getProjectReleases.use-case'
import { AppError } from '../../utils/AppError'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function getProjectReleasesController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('getProjectReleasesController called with projectId:', req.params.projectId)
    console.log('User:', req.user)
    
    const { projectId } = req.params

    if (!req.user?.id) {
      console.log('User not authenticated')
      throw new AppError('Não autenticado', 401)
    }

    console.log('Calling getProjectReleases with projectId:', Number(projectId))
    const releases = await getProjectReleases({
      projectId: Number(projectId)
    })

    console.log('Releases found:', releases)
    res.status(200).json(releases)
  } catch (err) {
    console.error('Error in getProjectReleasesController:', err)
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message })
    } else {
      next(err)
    }
  }
}
