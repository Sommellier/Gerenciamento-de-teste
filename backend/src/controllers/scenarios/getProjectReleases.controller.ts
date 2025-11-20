import { Request, Response, NextFunction } from 'express'
import { getProjectReleases } from '../../application/use-cases/scenarios/getProjectReleases.use-case'
import { logger } from '../../utils/logger'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export const getProjectReleasesController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params
    
    // Temporariamente removido para teste
    // if (!req.user?.id) {
    //   res.status(401).json({ message: 'Não autenticado' })
    //   return
    // }

    const releases = await getProjectReleases({ projectId: Number(projectId) })
    res.json(releases)
  } catch (err: any) {
    logger.error('Erro no getProjectReleasesController:', err)
    next(err)
  }
}