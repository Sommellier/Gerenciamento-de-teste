import type { Request, Response, NextFunction } from 'express'
import { getProfile } from '../../application/use-cases/profile/getProfile.use-case'
import { AppError } from '../../utils/AppError'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function getProfileController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw new AppError('Não autenticado', 401)
    }

    const profile = await getProfile(req.user.id)
    res.status(200).json(profile)
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message })
    } else {
      next(err)
    }
  }
}
