import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

type Input = {
  projectId: number
  requesterId: number
}

export async function deleteProject({ projectId, requesterId }: Input): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  })

  if (!project) throw new AppError('Projeto não encontrado', 404)
  if (project.ownerId !== requesterId) throw new AppError('Você não tem permissão para excluir este projeto', 403)

  await prisma.$transaction([
    prisma.execution.deleteMany({ where: { testCase: { projectId } } }),
    prisma.testCase.deleteMany({ where: { projectId } }),
    prisma.userOnProject.deleteMany({ where: { projectId } }),
    prisma.project.delete({ where: { id: projectId } }),
  ])
}
