import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

export async function deleteUser(userId: string): Promise<boolean> {
  const numericUserId = Number(userId)

  if (isNaN(numericUserId)) {
    throw new AppError('Invalid user ID', 400)
  }

  const user = await prisma.user.findUnique({ where: { id: numericUserId } })

  if (!user) {
    throw new AppError('User not found', 404)
  }

  // Deletar registros que têm onDelete: Restrict antes de deletar o usuário
  // 1. Deletar execuções criadas pelo usuário
  await prisma.execution.deleteMany({
    where: { userId: numericUserId }
  })

  // 2. Deletar convites enviados pelo usuário (todos os status)
  // Isso é necessário porque ProjectInvite.invitedBy tem onDelete: Restrict
  await prisma.projectInvite.deleteMany({
    where: { invitedById: numericUserId }
  })

  // Agora podemos deletar o usuário
  // O cascade vai deletar automaticamente:
  // - Projetos do usuário (projectsOwned)
  // - Membros de projetos (userProjects)
  // - Tokens de reset de senha (passwordResetTokens)
  // - Cenários como testador/aprovador (scenariosAsTester, scenariosAsApprover)
  // - Comentários, anexos, histórico, bugs, etc.
  await prisma.user.delete({ where: { id: numericUserId } })

  return true
}
