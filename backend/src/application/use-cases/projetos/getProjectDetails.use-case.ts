import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { getProjectMetrics } from '../scenarios/getProjectMetrics.use-case'
import { getProjectReleases } from '../scenarios/getProjectReleases.use-case'

interface GetProjectDetailsInput {
  projectId: number
  release?: string
}

export async function getProjectDetails({ projectId, release }: GetProjectDetailsInput) {
  // Verificar se o projeto existe
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true
        }
      }
    }
  })

  if (!project) {
    throw new AppError('Projeto não encontrado', 404)
  }

  // Buscar membros do projeto
  const members = await prisma.userOnProject.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true
        }
      }
    }
  })

  // Buscar métricas
  const metrics = await getProjectMetrics({ projectId, release })

  // Buscar releases disponíveis
  const availableReleases = await getProjectReleases({ projectId })

  // Buscar pacotes de teste (opcional, para listagem)
  const testPackages = await prisma.testPackage.findMany({
    where: {
      projectId,
      ...(release && { release })
    },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10 // Limitar a 10 pacotes mais recentes
  })

  // Formatar membros
  const formattedMembers = members.map(member => ({
    id: member.user.id,
    name: member.user.name,
    email: member.user.email,
    avatar: member.user.avatar,
    role: member.role
  }))

  // Adicionar o owner aos membros se não estiver presente
  const ownerInMembers = formattedMembers.find(m => m.id === project.ownerId)
  if (!ownerInMembers) {
    formattedMembers.unshift({
      id: project.owner.id,
      name: project.owner.name,
      email: project.owner.email,
      avatar: project.owner.avatar,
      role: 'OWNER' as any
    })
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    ownerId: project.ownerId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    members: formattedMembers,
    metrics,
    availableReleases,
    testPackages
  }
}
