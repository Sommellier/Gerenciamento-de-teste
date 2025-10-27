import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface GetProjectDetailsInput {
  projectId: number
  release?: string
}

export async function getProjectDetails({ projectId, release }: GetProjectDetailsInput) {
  try {
    console.log('getProjectDetails chamado com:', { projectId, release })
    
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
      console.log('Projeto não encontrado:', projectId)
      throw new AppError('Projeto não encontrado', 404)
    }

    console.log('Projeto encontrado:', project.name)

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

    // Buscar releases disponíveis
    const releases = await prisma.testPackage.findMany({
      where: { projectId },
      select: { release: true },
      distinct: ['release'],
      orderBy: { release: 'desc' }
    })

    const availableReleases = releases.map(r => r.release)

    // Buscar métricas dos pacotes de teste
    const testPackagesCount = await prisma.testPackage.count({
      where: {
        projectId,
        ...(release && { release })
      }
    })

    const metrics = {
      created: testPackagesCount,
      executed: 0,
      passed: 0,
      failed: 0
    }

    // Buscar pacotes de teste
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
      take: 10
    })

    // Converter tags de JSON string para array nos pacotes
    const packagesWithParsedTags = testPackages.map(pkg => ({
      ...pkg,
      tags: pkg.tags ? JSON.parse(pkg.tags) : []
    }))

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
      testPackages: packagesWithParsedTags,
      scenarios: packagesWithParsedTags, // Usando os mesmos dados por enquanto
      scenarioMetrics: metrics // Usando as mesmas métricas por enquanto
    }
  } catch (error) {
    console.error('Erro no getProjectDetails:', error)
    throw error
  }
}
