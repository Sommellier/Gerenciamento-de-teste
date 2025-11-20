import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

type Input = { projectId: number; requesterId: number }

export async function getProjectById({ projectId, requesterId }: Input) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new AppError('Projeto não encontrado', 404)

  const isOwner = project.ownerId === requesterId
  if (!isOwner) {
    const membership = await prisma.userOnProject.findUnique({
      where: { userId_projectId: { userId: requesterId, projectId } },
      select: { role: true },
    })
    if (!membership) throw new AppError('Sem permissão para visualizar este projeto', 403)
  }
  return project
}
