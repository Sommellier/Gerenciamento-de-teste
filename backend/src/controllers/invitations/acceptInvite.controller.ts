import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { acceptInvite } from '../../application/use-cases/invitations/acceptInvite.use-case'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function acceptInviteController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw new AppError('Não autenticado', 401)
    }

    const tokenRaw = (req.params?.token ?? req.body?.token ?? '') as string
    const token = typeof tokenRaw === 'string' ? tokenRaw.trim() : ''
    if (!token) {
      throw new AppError('Token inválido', 400)
    }

    const invite = await acceptInvite({
      token,
      userId: req.user.id
    })

    return res.status(200).json({
      id: invite.id,
      projectId: invite.projectId,
      email: invite.email,
      role: invite.role,
      status: invite.status,        
      invitedById: invite.invitedById,
      acceptedAt: invite.acceptedAt,
      declinedAt: invite.declinedAt,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt
    })
  } catch (err: any) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message })
    }
    next(err)
  }
}
