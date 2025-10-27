import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { declineInvite } from '../../application/use-cases/invitations/declineInvite.use-case'

export async function declineInviteController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // token pode vir em :token ou no body
    const tokenRaw = (req.params?.token ?? req.body?.token ?? '') as string
    const token = typeof tokenRaw === 'string' ? tokenRaw.trim() : ''
    if (!token) {
      throw new AppError('Token inválido', 400)
    }

    const invite = await declineInvite({ token })

    // resposta sem expor o token
    return res.status(200).json({
      id: invite.id,
      projectId: invite.projectId,
      email: invite.email,
      role: invite.role,
      status: invite.status,        // DECLINED
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
