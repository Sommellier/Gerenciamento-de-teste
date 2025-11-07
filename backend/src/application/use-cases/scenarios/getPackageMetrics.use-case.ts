import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface GetPackageMetricsInput {
  packageId: number
  projectId: number
}

export async function getPackageMetrics({ packageId, projectId }: GetPackageMetricsInput) {
  try {
    // Verificar se o pacote existe e pertence ao projeto
    const testPackage = await prisma.testPackage.findFirst({
      where: {
        id: packageId,
        projectId: projectId
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        }
      }
    })

    if (!testPackage) {
      throw new AppError('Pacote não encontrado', 404)
    }

    // Buscar cenários do pacote
    const scenarios = await prisma.testScenario.findMany({
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

    // Calcular métricas do pacote
    const packageSteps = testPackage.steps.length
    const totalScenarios = scenarios.length
    const totalScenarioSteps = scenarios.reduce((acc, scenario) => acc + scenario.steps.length, 0)

    // Calcular métricas por status dos cenários
    const scenariosByStatus = scenarios.reduce((acc, scenario) => {
      acc[scenario.status] = (acc[scenario.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calcular métricas por tipo dos cenários
    const scenariosByType = scenarios.reduce((acc, scenario) => {
      acc[scenario.type] = (acc[scenario.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calcular métricas por prioridade dos cenários
    const scenariosByPriority = scenarios.reduce((acc, scenario) => {
      acc[scenario.priority] = (acc[scenario.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calcular métricas por ambiente dos cenários
    const scenariosByEnvironment = scenarios.reduce((acc, scenario) => {
      // TODO: environment não existe no schema atual
      const env = 'N/A' // scenario.environment || 'N/A'
      acc[env] = (acc[env] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calcular percentual de cenários executados
    const executedScenarios = scenariosByStatus.EXECUTED || 0
    const passedScenarios = scenariosByStatus.PASSED || 0
    const failedScenarios = scenariosByStatus.FAILED || 0
    const totalExecuted = executedScenarios + passedScenarios + failedScenarios
    const executionRate = totalScenarios > 0 ? (totalExecuted / totalScenarios) * 100 : 0

    // Calcular taxa de sucesso dos cenários executados
    const successRate = totalExecuted > 0 ? (passedScenarios / totalExecuted) * 100 : 0

    return {
      package: {
        id: testPackage.id,
        title: testPackage.title,
        status: testPackage.status,
        steps: packageSteps,
        release: testPackage.release
      },
      scenarios: {
        total: totalScenarios,
        totalSteps: totalScenarioSteps,
        byStatus: {
          created: scenariosByStatus.CREATED || 0,
          executed: executedScenarios,
          passed: passedScenarios,
          failed: failedScenarios
        },
        byType: scenariosByType,
        byPriority: scenariosByPriority,
        byEnvironment: scenariosByEnvironment,
        executionRate: Math.round(executionRate * 100) / 100,
        successRate: Math.round(successRate * 100) / 100
      },
      summary: {
        totalSteps: packageSteps + totalScenarioSteps,
        executionRate,
        successRate
      }
    }
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      console.error('Error in getPackageMetrics:', error)
    }
    throw error
  }
}
