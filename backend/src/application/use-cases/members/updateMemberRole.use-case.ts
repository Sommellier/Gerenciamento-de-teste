import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import type { Role } from '@prisma/client'

type MemberRecord = Awaited<ReturnType<typeof prisma.userOnProject.update>>

export type UpdateMemberRoleInput = {
  projectId: number
  requesterId: number
  targetUserId: number
  newRole: Role
}

function assertPositiveInt(n: unknown, field: string) {
  if (!Number.isInteger(n) || (n as number) <= 0) {
    throw new AppError(`${field} inválido`, 400)
  }
}

export async function updateMemberRole({
  projectId,
  requesterId,
  targetUserId,
  newRole
}: UpdateMemberRoleInput): Promise<MemberRecord> {
  assertPositiveInt(projectId, 'projectId')
  assertPositiveInt(requesterId, 'requesterId')
  assertPositiveInt(targetUserId, 'targetUserId')

  // 1) projeto existe?
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

  // 3) target precisa ser membro
  const target = await prisma.userOnProject.findUnique({
    where: { userId_projectId: { userId: targetUserId, projectId } },
    select: { userId: true, role: true }
  })
  if (!target) throw new AppError('Membro não encontrado', 404)

  // 4) Regras de autorização
  // O dono pode alterar qualquer role
  if (isOwner) {
    // Dono pode alterar qualquer role, mas não pode rebaixar o último OWNER
    // (isso é verificado no passo 5)
  } else if (requester && requester.role === 'MANAGER') {
    // manager não altera OWNER/MANAGER
    if (target.role === 'OWNER' || target.role === 'MANAGER') {
      throw new AppError('MANAGER não pode alterar OWNER/MANAGER', 403)
    }
    // manager não promove para OWNER/MANAGER
    if (newRole === 'OWNER' || newRole === 'MANAGER') {
      throw new AppError('MANAGER não pode promover para OWNER/MANAGER', 403)
    }
  } else {
    // Apenas dono ou gerente podem alterar roles
    throw new AppError('Apenas o dono ou gerente podem alterar roles', 403)
  }

  // 5) Regra de último OWNER (vale inclusive para auto-rebaixamento)
  if (target.role === 'OWNER' && newRole !== 'OWNER') {
    const owners = await prisma.userOnProject.count({
      where: { projectId, role: 'OWNER' }
    })
    if (owners <= 1) {
      throw new AppError('Transfira a propriedade antes de rebaixar o último OWNER', 409)
    }
  }

  // 6) Idempotência
  if (target.role === newRole) {
    // Retorna o registro atual (sem update)
    return {
      projectId,
      userId: targetUserId,
      role: target.role
    } as unknown as MemberRecord
  }

  // 7) Atualiza papel
  const updated = await prisma.userOnProject.update({
    where: { userId_projectId: { userId: targetUserId, projectId } },
    data: { role: newRole }
  })

  return updated
}
