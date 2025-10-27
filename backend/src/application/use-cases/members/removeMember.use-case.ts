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
    select: { id: true }
  })
  if (!project) throw new AppError('Projeto não encontrado', 404)

  // 2) Requester precisa ser membro
  const requester = await prisma.userOnProject.findUnique({
    where: { userId_projectId: { userId: requesterId, projectId } },
    select: { role: true }
  })
  if (!requester) throw new AppError('Acesso negado ao projeto', 403)

  // 3) Target precisa ser membro
  const target = await prisma.userOnProject.findUnique({
    where: { userId_projectId: { userId: targetUserId, projectId } },
    select: { userId: true, role: true }
  })
  if (!target) throw new AppError('Membro não encontrado', 404)

  // 4) Regras de autorização
  // - Somente OWNER/ MANAGER removem membros
  // - MANAGER só remove TESTER/APPROVER (não remove OWNER/MANAGER)
  if (requester.role === 'MANAGER') {
    if (target.role === 'OWNER' || target.role === 'MANAGER') {
      throw new AppError('MANAGER não pode remover OWNER/MANAGER', 403)
    }
  }

  // 5) Proteção: não remover o último OWNER
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

  // 6) Remoção simples (não-OWNER)
  const deleted = await prisma.userOnProject.delete({
    where: { userId_projectId: { userId: targetUserId, projectId } }
  })
  return deleted
}
