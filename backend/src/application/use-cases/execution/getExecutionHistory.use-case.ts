import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { logger } from '../../../utils/logger'

interface GetExecutionHistoryInput {
  scenarioId: number
  userId: number
}

export async function getExecutionHistory({ scenarioId, userId }: GetExecutionHistoryInput) {
  try {
    // Verificar se o cenário existe
    const scenario = await prisma.testScenario.findUnique({
      where: { id: scenarioId },
      include: {
        project: true
      }
    })

    if (!scenario) {
      throw new AppError('Cenário não encontrado', 404)
    }

    // Buscar histórico
    const history = await prisma.scenarioExecutionHistory.findMany({
      where: { scenarioId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Parse metadata
    return history.map(entry => ({
      ...entry,
      metadata: entry.metadata ? JSON.parse(entry.metadata) : null
    }))
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      logger.error('Error in getExecutionHistory:', error)
    }
    throw error
  }
}

