import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

type MemberRecord = Awaited<ReturnType<typeof prisma.userOnProject.delete>>

export type LeaveProjectInput = {
  projectId: number
  userId: number
}

function assertPositiveInt(n: unknown, field: string) {
  if (!Number.isInteger(n) || (n as number) <= 0) {
    throw new AppError(`${field} inválido`, 400)
  }
}

export async function leaveProject({
  projectId,
  userId
}: LeaveProjectInput): Promise<MemberRecord> {
  assertPositiveInt(projectId, 'projectId')
  assertPositiveInt(userId, 'userId')

  // 1) Projeto existe?
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true }
  })
  if (!project) throw new AppError('Projeto não encontrado', 404)

  // 2) Verificar se o usuário é o dono do projeto
  if (project.ownerId === userId) {
    throw new AppError('O dono do projeto não pode sair. Transfira a propriedade primeiro.', 403)
  }

  // 3) Verificar se o usuário é membro do projeto
  const membership = await prisma.userOnProject.findUnique({
    where: { userId_projectId: { userId, projectId } },
    select: { userId: true, role: true }
  })
  if (!membership) {
    throw new AppError('Você não é membro deste projeto', 404)
  }

  // 4) Remover o membro do projeto
  const deleted = await prisma.userOnProject.delete({
    where: { userId_projectId: { userId, projectId } }
  })

  return deleted
}

