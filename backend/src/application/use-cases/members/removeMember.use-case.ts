import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

type MemberRecord = Awaited<ReturnType<typeof prisma.userOnProject.delete>>

export type RemoveMemberInput = {
  projectId: number
  requesterId: number
  targetUserId: number
}

function assertPositiveInt(n: unknown, field: string) {
  if (!Number.isInteger(n) || (n as number) <= 0) {
    throw new AppError(`${field} inválido`, 400)
  }
}

export async function removeMember({
  projectId,
  requesterId,
  targetUserId
}: RemoveMemberInput): Promise<MemberRecord> {
  assertPositiveInt(projectId, 'projectId')
  assertPositiveInt(requesterId, 'requesterId')
  assertPositiveInt(targetUserId, 'targetUserId')

  // 1) Projeto existe?
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true }
  })
  if (!project) throw new AppError('Projeto não encontrado', 404)

  // 2) Verificar se requester é dono do projeto
  const isOwner = project.ownerId === requesterId

  // 3) Requester precisa ser membro OU ser o dono
  const requester = await prisma.userOnProject.findUnique({
    where: { userId_projectId: { userId: requesterId, projectId } },
    select: { role: true }
  })
  
  // Se não é dono e não é membro, negar acesso
  if (!isOwner && !requester) {
    throw new AppError('Acesso negado ao projeto', 403)
  }

  // 4) Target precisa ser membro
  const target = await prisma.userOnProject.findUnique({
    where: { userId_projectId: { userId: targetUserId, projectId } },
    select: { userId: true, role: true }
  })
  if (!target) throw new AppError('Membro não encontrado', 404)

  // 5) Regras de autorização
  // - O dono pode remover todos (exceto ele mesmo se for o último dono)
  // - MANAGER só remove TESTER/APPROVER (não remove OWNER/MANAGER)
  if (isOwner) {
    // Dono pode remover todos, mas não pode remover a si mesmo se for o último dono
    if (targetUserId === requesterId && target.role === 'OWNER') {
      const owners = await prisma.userOnProject.count({
        where: { projectId, role: 'OWNER' }
      })
      if (owners <= 1) {
        throw new AppError('Não é possível remover o último dono do projeto', 409)
      }
    }
  } else if (requester && requester.role === 'MANAGER') {
    // Gerente não pode remover dono ou outros gerentes
    if (target.role === 'OWNER' || target.role === 'MANAGER') {
      throw new AppError('MANAGER não pode remover OWNER/MANAGER', 403)
    }
  } else {
    // Apenas dono ou gerente podem remover membros
    throw new AppError('Apenas o dono ou gerente podem remover membros', 403)
  }

  // 6) Proteção: não remover o último OWNER
  if (target.role === 'OWNER') {
    // garante consistência com transação (contagem + remoção)
    return await prisma.$transaction(async (tx) => {
      const owners = await tx.userOnProject.count({
        where: { projectId, role: 'OWNER' }
      })
      if (owners <= 1) {
        throw new AppError('Transfira a propriedade antes de remover o último OWNER', 409)
      }

      const deleted = await tx.userOnProject.delete({
        where: { userId_projectId: { userId: targetUserId, projectId } }
      })
      return deleted
    })
  }

  // 7) Remoção simples (não-OWNER)
  const deleted = await prisma.userOnProject.delete({
    where: { userId_projectId: { userId: targetUserId, projectId } }
  })
  return deleted
}
