import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import type { Role } from '@prisma/client'
import { createInvite } from '../invitations/createInvite.use-case'

type MemberRecord = Awaited<ReturnType<typeof prisma.userOnProject.create>>
type InviteRecord = Awaited<ReturnType<typeof prisma.projectInvite.create>>

export type AddMemberByEmailInput = {
  projectId: number
  requesterId: number
  email: string
  role: Role
  /** Se já existir convite pendente para esse e-mail, reenvia ao invés de criar outro */
  resendIfPending?: boolean
}

export type AddMemberByEmailResult =
  | { kind: 'member'; member: MemberRecord }
  | { kind: 'invite'; invite: InviteRecord }

function assertPositiveInt(n: unknown, field: string) {
  if (!Number.isInteger(n) || (n as number) <= 0) throw new AppError(`${field} inválido`, 400)
}
function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function addMemberByEmail({
  projectId,
  requesterId,
  email,
  role,
  resendIfPending = true
}: AddMemberByEmailInput): Promise<AddMemberByEmailResult> {
  assertPositiveInt(projectId, 'projectId')
  assertPositiveInt(requesterId, 'requesterId')
  if (typeof email !== 'string' || !email.includes('@')) throw new AppError('E-mail inválido', 400)

  // 1) Projeto existe?
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
  if (!project) throw new AppError('Projeto não encontrado', 404)

  // 2) Requester é membro?
  const requester = await prisma.userOnProject.findUnique({
    where: { userId_projectId: { userId: requesterId, projectId } },
    select: { role: true }
  })
  if (!requester) throw new AppError('Acesso negado ao projeto', 403)

  // 3) Regras de permissão
  if (requester.role === 'MANAGER' && (role === 'OWNER' || role === 'MANAGER')) {
    throw new AppError('MANAGER não pode adicionar OWNER/MANAGER', 403)
  }

  const emailNorm = normalizeEmail(email)

  // 4) Usuário já existe?
  const user = await prisma.user.findUnique({ where: { email: emailNorm }, select: { id: true } })

  if (!user) {
    // 4a) Sem conta → gera/reenfila convite
    const invite = await createInvite({
      projectId,
      email: emailNorm,
      role,
      invitedById: requesterId,
      resendIfPending
    })
    return { kind: 'invite', invite }
  }

  // 4b) Já tem conta → não pode duplicar associação
  const existing = await prisma.userOnProject.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } },
    select: { userId: true }
  })
  if (existing) throw new AppError('Usuário já faz parte do projeto', 409)

  // 5) Cria associação
  const member = await prisma.userOnProject.create({
    data: { projectId, userId: user.id, role }
  })

  return { kind: 'member', member }
}
