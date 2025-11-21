import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

type InviteEntity = Awaited<ReturnType<typeof prisma.projectInvite.create>>

export type AcceptInviteInput = {
  token: string
  userId: number
}

function assertPositiveInt(n: unknown, field: string) {
  if (!Number.isInteger(n) || (n as number) <= 0) {
    throw new AppError(`${field} inválido`, 400)
  }
}

export async function acceptInvite({
  token,
  userId
}: AcceptInviteInput): Promise<InviteEntity> {
  if (typeof token !== 'string' || token.trim() === '') {
    throw new AppError('Token inválido', 400)
  }
  assertPositiveInt(userId, 'userId')

  const now = new Date()

  const invite = await prisma.projectInvite.findUnique({
    where: { token },
  })
  if (!invite) {
    throw new AppError('Convite inválido', 404)
  }

  if (invite.status !== 'PENDING') {
    if (invite.status === 'ACCEPTED') {
      const membership = await prisma.userOnProject.findUnique({
        where: { userId_projectId: { userId, projectId: invite.projectId } },
      })
      if (membership) {
        return invite as InviteEntity
      }
      throw new AppError('Convite já utilizado', 409)
    }
    if (invite.status === 'DECLINED') {
      throw new AppError('Convite já foi recusado', 409)
    }
    throw new AppError('Convite expirado', 410)
  }

  if (invite.expiresAt <= now) {
    await prisma.projectInvite.update({
      where: { id: invite.id },
      data: { status: 'EXPIRED' },
    })
    throw new AppError('Convite expirado', 410)
  }

  // Validar que não pode haver múltiplos OWNERs
  if (invite.role === 'OWNER') {
    const existingOwner = await prisma.userOnProject.findFirst({
      where: { projectId: invite.projectId, role: 'OWNER' }
    })
    if (existingOwner) {
      throw new AppError('Já existe um dono do projeto. Apenas um dono é permitido por projeto.', 409)
    }
  }

  const accepted = await prisma.$transaction(async (tx) => {
    await tx.userOnProject.upsert({
      where: {
        userId_projectId: { userId, projectId: invite.projectId },
      },
      create: {
        userId,
        projectId: invite.projectId,
        role: invite.role, 
      },
      update: {
        role: invite.role,
      },
    })

    const updated = await tx.projectInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', acceptedAt: now },
    })

    return updated
  })

  return accepted
}
