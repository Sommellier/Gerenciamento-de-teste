import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface GetProjectScenarioMetricsInput {
  projectId: number
  release?: string
}

export async function getProjectScenarioMetrics({ projectId, release }: GetProjectScenarioMetricsInput) {
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

  // Buscar métricas agregadas de cenários
  const metrics = await prisma.testScenario.groupBy({
    by: ['status'],
    where,
    _count: {
      status: true
    }
  })

  // Inicializar contadores
  const result = {
    created: 0,
    executed: 0,
    passed: 0,
    failed: 0
  }

  // Mapear resultados
  metrics.forEach(metric => {
    const count = metric._count.status
    switch (metric.status) {
      case 'CREATED':
        result.created = count
        break
      case 'EXECUTED':
        result.executed = count
        break
      case 'PASSED':
        result.passed = count
        break
      case 'FAILED':
        result.failed = count
        break
    }
  })

  return result
}
