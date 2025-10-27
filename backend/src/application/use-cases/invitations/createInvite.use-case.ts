  import { prisma } from '../../../infrastructure/prisma'
  import { AppError } from '../../../utils/AppError'
  import { Role, ProjectInvite } from '@prisma/client'
  import { randomBytes } from 'crypto'
  import { sendProjectInviteEmail } from '../invitations/email.service'

  // Tipo inferido a partir do prisma (não depende de @prisma/client exportar ProjectInvite)
  type InviteRecord = Awaited<ReturnType<typeof prisma.projectInvite.create>>

  export type CreateInviteInput = {
    projectId: number
    email: string
    role: Role
    invitedById: number
    /** se existir convite pendente válido, reenviar o mesmo token em vez de criar outro */
    resendIfPending?: boolean
  }

  function normalizeEmail(email: string) {
    return email.trim().toLowerCase()
  }

  function getTtlDays() {
    const n = Number(process.env.INVITE_TTL_DAYS ?? 7)
    return Number.isFinite(n) && n > 0 ? n : 7
  }

  // Sem date-fns: adiciona dias na unha
  function addDaysToDate(base: Date, days: number) {
    return new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
  }

  export async function createInvite({
    projectId,
    email,
    role,
    invitedById,
    resendIfPending = true
  }: CreateInviteInput): Promise<InviteRecord> {
    const now = new Date()
    const emailNorm = normalizeEmail(email)

    // 1) Projeto existe?
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true }
    })
    if (!project) throw new AppError('Projeto não encontrado', 404)

    // 2) Permissão: somente OWNER ou MANAGER do projeto
    const inviter = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: invitedById, projectId } },
      select: { role: true }
    })
    if (!inviter) throw new AppError('Acesso negado ao projeto', 403)

    if (inviter.role === 'MANAGER' && (role === 'OWNER' || role === 'MANAGER')) {
      throw new AppError('MANAGER não pode convidar para OWNER/MANAGER', 403)
    }

    // 3) Se já é membro, bloquear
    const existingUser = await prisma.user.findUnique({
      where: { email: emailNorm },
      select: { id: true }
    })
    if (existingUser) {
      const alreadyMember = await prisma.userOnProject.findUnique({
        where: {
          userId_projectId: { userId: existingUser.id, projectId }
        }
      })
      if (alreadyMember) throw new AppError('Usuário já faz parte do projeto', 409)
    }

    // 4) Convite pendente válido? (reutiliza e reenvia)
    const pending = await prisma.projectInvite.findFirst({
      where: {
        projectId,
        email: emailNorm,
        status: 'PENDING',
        expiresAt: { gt: now }
      }
    })
    if (pending) {
      if (resendIfPending) {
        await sendProjectInviteEmail({
          to: emailNorm,
          projectName: project.name,
          role,
          token: pending.token
        })
        return pending as InviteRecord
      }
      throw new AppError('Já existe um convite pendente para esse e-mail', 409)
    }

    // 5) Criar o convite
    const token = randomBytes(32).toString('hex')
    const invite = await prisma.projectInvite.create({
      data: {
        projectId,
        email: emailNorm,
        role,
        token,
        invitedById,
        expiresAt: addDaysToDate(now, getTtlDays())
      }
    })

    // 6) Enviar o e-mail
    await sendProjectInviteEmail({
      to: emailNorm,
      projectName: project.name,
      role,
      token
    })

    return invite
  }
