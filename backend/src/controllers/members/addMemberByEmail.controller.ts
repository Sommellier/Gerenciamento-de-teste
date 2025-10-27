import type { Request, Response, NextFunction } from 'express'
import type { Role } from '@prisma/client'
import { AppError } from '../../utils/AppError'
import { addMemberByEmail } from '../../application/use-cases/members/addMemberByEmail.use-case'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

function isRole(v: unknown): v is Role {
  return typeof v === 'string' && ['OWNER','MANAGER','TESTER','APPROVER'].includes(v)
}

export async function addMemberByEmailController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError('Não autenticado', 401)

    const projectId = Number(req.params.projectId)
    const { email, role } = req.body ?? {}

    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new AppError('projectId inválido', 400)
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      throw new AppError('E-mail inválido', 400)
    }
    if (!isRole(role)) {
      throw new AppError('Role inválida', 400)
    }

    const result = await addMemberByEmail({
      projectId,
      requesterId: req.user.id,
      email,
      role
    })

    if (result.kind === 'member') {
      const { member } = result
      return res.status(201).json({
        projectId: member.projectId,
        userId: member.userId,
        role: member.role
      })
    } else {
      const { invite } = result
      // não expor token
      return res.status(201).json({
        invited: true,
        id: invite.id,
        projectId: invite.projectId,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        invitedById: invite.invitedById,
        expiresAt: invite.expiresAt,
        acceptedAt: invite.acceptedAt,
        declinedAt: invite.declinedAt,
        createdAt: invite.createdAt
      })
    }
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message })
    }
    next(err)
  }
}
