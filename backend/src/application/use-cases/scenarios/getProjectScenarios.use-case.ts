import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface GetProjectScenariosInput {
  projectId: number
  release?: string
}

export async function getProjectScenarios({ projectId, release }: GetProjectScenariosInput) {
  // Verificar se o projeto existe
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  })

  if (!project) {
    throw new AppError('Projeto não encontrado', 404)
  }

  // Construir filtros
  const where: any = { projectId }
  if (release) {
    where.release = release
  }

  // Buscar cenários
  const scenarios = await prisma.testScenario.findMany({
    where,
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return scenarios
}
