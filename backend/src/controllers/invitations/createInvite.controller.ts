import type { Request, Response, NextFunction } from 'express'
import { Role } from '@prisma/client'
import { AppError } from '../../utils/AppError'
import { createInvite } from '../../application/use-cases/invitations/createInvite.use-case'
import { validateId } from '../../utils/validation'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

function isValidEmail(v: unknown): v is string {
  return typeof v === 'string' && v.includes('@')
}

function isValidRole(v: unknown): v is Role {
  return typeof v === 'string' && ['OWNER','MANAGER','TESTER','APPROVER'].includes(v)
}

export async function createInviteController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // auth obrigatória
    if (!req.user?.id) {
      throw new AppError('Não autenticado', 401)
    }

    // validação dos params
    let projectId: number
    try {
      projectId = validateId(req.params.projectId, 'ID do projeto')
    } catch (err: any) {
      // Testes esperam mensagem específica
      if (err instanceof AppError && err.statusCode === 400) {
        throw new AppError('projectId inválido', 400)
      }
      throw err
    }

    // validação do body (sem depender de libs)
    const { email, role } = req.body ?? {}
    if (!isValidEmail(email)) {
      throw new AppError('E-mail inválido', 400)
    }
    if (!isValidRole(role)) {
      throw new AppError('Role inválida', 400)
    }

    const invite = await createInvite({
      projectId,
      email,
      role: role as Role,
      invitedById: req.user.id,
      resendIfPending: true
    })

    // não expomos o token por segurança
    return res.status(201).json({
      id: invite.id,
      projectId: invite.projectId,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt
    })
  } catch (err: any) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message })
    }
    // fallback para erros conhecidos (ex.: unique email+project, etc.)
    if (err?.code === 'P2002') {
      return res.status(409).json({ message: 'Já existe um convite para esse e-mail' })
    }
    next(err)
  }
}
