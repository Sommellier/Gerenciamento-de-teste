import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { getProjectScenarioMetrics } from '../scenarios/getProjectScenarioMetrics.use-case'
import { logger } from '../../../utils/logger'

interface GetProjectDetailsInput {
  projectId: number
  release?: string
  requesterId?: number
}

export async function getProjectDetails({ projectId, release, requesterId }: GetProjectDetailsInput) {
  try {
    logger.debug('getProjectDetails chamado com:', { projectId, release, requesterId })
    
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
      logger.debug('Projeto não encontrado:', projectId)
      throw new AppError('Projeto não encontrado', 404)
    }

    // Verificar permissões de acesso ao projeto (se requesterId foi fornecido)
    if (requesterId !== undefined) {
      const isOwner = project.ownerId === requesterId

      if (!isOwner) {
        const userOnProject = await prisma.userOnProject.findFirst({
          where: {
            userId: requesterId,
            projectId: projectId
          }
        })

        if (!userOnProject) {
          throw new AppError('Acesso negado ao projeto', 403)
        }
      }
    }

    logger.debug('Projeto encontrado:', project.name)

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

    // Buscar métricas dos pacotes de teste por status
    const packagesByStatus = await prisma.testPackage.groupBy({
      by: ['status'],
      where: {
        projectId,
        ...(release && { release })
      },
      _count: {
        status: true
      }
    })

    // Inicializar contadores
    const metrics = {
      created: 0,
      executed: 0,
      passed: 0,
      failed: 0
    }

    // Mapear resultados por status
    packagesByStatus.forEach(stat => {
      const count = stat._count.status
      switch (stat.status) {
        case 'CREATED':
          metrics.created = count
          break
        case 'EXECUTED':
          metrics.executed = count
          break
        case 'PASSED':
          metrics.passed = count
          break
        case 'FAILED':
          metrics.failed = count
          break
        case 'EM_TESTE':
          metrics.executed += count
          break
        case 'CONCLUIDO':
          metrics.passed += count
          break
        case 'APROVADO':
          metrics.passed += count
          break
        case 'REPROVADO':
          metrics.failed += count
          break
      }
    })

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

    // Buscar métricas reais dos cenários do projeto
    const scenarioMetrics = await getProjectScenarioMetrics({
      projectId,
      release
    })

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
      scenarioMetrics
    }
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      logger.error('Erro no getProjectDetails:', error)
    }
    throw error
  }
}
