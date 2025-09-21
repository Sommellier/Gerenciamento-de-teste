import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

export async function getProfile(userId: number) {
  if (!userId || !Number.isInteger(userId)) {
    throw new AppError('ID do usuário inválido', 400)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  }) as any

  if (!user) {
    throw new AppError('Usuário não encontrado', 404)
  }

  // Buscar contagens separadamente
  const counts = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      _count: {
        select: {
          projectsOwned: true,
          userProjects: true,
          executions: true
        }
      }
    }
  })

  return {
    ...user,
    stats: {
      projectsOwned: counts?._count?.projectsOwned || 0,
      projectsParticipating: counts?._count?.userProjects || 0,
      testExecutions: counts?._count?.executions || 0
    }
  }
}
