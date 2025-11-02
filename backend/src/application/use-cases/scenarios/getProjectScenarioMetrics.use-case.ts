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
  // Cenários não têm campo release diretamente, então precisamos filtrar pelos pacotes
  let where: any = { 
    projectId
  }
  
  // Se release foi especificada, filtrar pelos pacotes dessa release
  if (release) {
    where.package = {
      projectId,
      release: release
    }
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
    failed: 0,
    approved: 0,
    reproved: 0
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
      case 'APPROVED':
        result.approved = count
        // APPROVED é um status de conclusão, mas não deve ser contado como PASSED
        // O PASSED já conta como concluído, APPROVED é aprovado após conclusão
        break
      case 'REPROVED':
        result.reproved = count
        // REPROVED é um status de falha, mas não deve ser contado como FAILED
        // O FAILED já conta como falhou, REPROVED é reprovado após conclusão
        break
    }
  })

  return result
}
