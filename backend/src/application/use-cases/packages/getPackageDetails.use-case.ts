import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface GetPackageDetailsInput {
  packageId: number
  projectId: number
}

export async function getPackageDetails({ packageId, projectId }: GetPackageDetailsInput) {
  try {
    // Buscar o pacote com dados básicos
    const testPackage = await prisma.testPackage.findFirst({
      where: {
        id: packageId,
        projectId: projectId
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            ownerId: true
          }
        },
        approvedBy: {
          select: { id: true, name: true, email: true }
        },
        rejectedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!testPackage) {
      throw new AppError('Pacote não encontrado', 404)
    }

    // Buscar cenários do pacote separadamente - primeiro sem os relacionamentos
    let packageScenarios: any[] = []
    
    try {
      packageScenarios = await (prisma.testScenario as any).findMany({
        where: {
          packageId: packageId,
          projectId: projectId
        },
        include: {
          testador: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          aprovador: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          steps: {
            orderBy: { stepOrder: 'asc' }
          }
        }
      })
    } catch (scenarioError) {
      // Se falhar, buscar sem os campos testador e aprovador
      packageScenarios = await (prisma.testScenario as any).findMany({
        where: {
          packageId: packageId,
          projectId: projectId
        },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' }
          }
        }
      })
    }

    // Processar cenários com tags convertidas
    const scenarios = packageScenarios.map((scenario: any) => {
      let parsedTags: string[] = []
      try {
        if (scenario.tags) {
          if (typeof scenario.tags === 'string') {
            parsedTags = JSON.parse(scenario.tags)
          } else if (Array.isArray(scenario.tags)) {
            parsedTags = scenario.tags
          }
        }
      } catch (error) {
        console.warn('Erro ao fazer parse das tags do cenário:', error)
        parsedTags = []
      }
      
      return {
        ...scenario,
        tags: parsedTags
      }
    })

    // Converter tags de JSON string para array
    let parsedPackageTags: string[] = []
    try {
      if (testPackage.tags) {
        if (typeof testPackage.tags === 'string') {
          parsedPackageTags = JSON.parse(testPackage.tags)
        } else if (Array.isArray(testPackage.tags)) {
          parsedPackageTags = testPackage.tags
        }
      }
    } catch (error) {
      console.warn('Erro ao fazer parse das tags do pacote:', error)
      parsedPackageTags = []
    }

    const packageWithParsedTags = {
      ...testPackage,
      tags: parsedPackageTags
    }

    // Calcular métricas baseadas nos cenários reais
    const totalScenarios = scenarios.length
    const totalSteps = scenarios.reduce((acc: number, scenario: any) => acc + (scenario.steps?.length || 0), 0)
    const packageSteps = testPackage.steps?.length || 0

    // Agrupar cenários por tipo
    const scenariosByType = scenarios.reduce((acc: Record<string, number>, scenario: any) => {
      acc[scenario.type] = (acc[scenario.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Agrupar cenários por prioridade
    const scenariosByPriority = scenarios.reduce((acc: Record<string, number>, scenario: any) => {
      acc[scenario.priority] = (acc[scenario.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Agrupar cenários por status
    const scenariosByStatus = scenarios.reduce((acc: Record<string, number>, scenario: any) => {
      acc[scenario.status] = (acc[scenario.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Buscar histórico de execuções do pacote (agrupadas por mês)
    const scenarioIds = scenarios.map((s: any) => s.id)
    const executionHistory = await prisma.scenarioExecutionHistory.findMany({
      where: {
        scenarioId: { in: scenarioIds }
      },
      select: {
        createdAt: true,
        action: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Agrupar execuções por mês
    const executionsByMonth: Record<string, number> = {}
    executionHistory.forEach(execution => {
      const date = new Date(execution.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      executionsByMonth[monthKey] = (executionsByMonth[monthKey] || 0) + 1
    })

    // Calcular taxa de execução
    const executedScenarios = scenarios.filter((s: any) => s.status !== 'CREATED').length
    const executionRate = totalScenarios > 0 ? (executedScenarios / totalScenarios) * 100 : 0
    
    // Taxa de sucesso: cenários PASSED / cenários executados (EXECUTED, PASSED, FAILED)
    const passedScenarios = scenarios.filter((s: any) => s.status === 'PASSED').length
    const successRate = executedScenarios > 0 ? (passedScenarios / executedScenarios) * 100 : 0

    return {
      ...packageWithParsedTags,
      scenarios: scenarios,
      metrics: {
        totalScenarios,
        totalSteps,
        packageSteps,
        scenariosByType,
        scenariosByPriority,
        scenariosByStatus,
        executionsByMonth, // Adicionar execuções por mês
        executionRate: Math.round(executionRate * 100) / 100,
        successRate: Math.round(successRate * 100) / 100
      }
    }
  } catch (error) {
    console.error('Error in getPackageDetails:', error)
    if (error instanceof Error) {
      throw new AppError(`Erro ao buscar detalhes do pacote: ${error.message}`, 500)
    }
    throw error
  }
}
