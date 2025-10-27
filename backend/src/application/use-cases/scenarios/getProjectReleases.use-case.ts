import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface GetProjectReleasesInput {
  projectId: number
}

export async function getProjectReleases({ projectId }: GetProjectReleasesInput) {
  // Verificar se o projeto existe
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  })

  if (!project) {
    throw new AppError('Projeto não encontrado', 404)
  }

  // Buscar releases únicas do projeto
  const releases = await prisma.testPackage.findMany({
    where: { projectId },
    select: { release: true },
    distinct: ['release'],
    orderBy: { release: 'desc' }
  })

  return releases.map(r => r.release)
}
