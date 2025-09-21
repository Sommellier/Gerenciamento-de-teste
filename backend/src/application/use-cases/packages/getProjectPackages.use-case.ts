import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface GetProjectPackagesInput {
  projectId: number
  release?: string
}

export async function getProjectPackages({ projectId, release }: GetProjectPackagesInput) {
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

  // Buscar pacotes
  const testPackages = await prisma.testPackage.findMany({
    where,
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return testPackages
}
