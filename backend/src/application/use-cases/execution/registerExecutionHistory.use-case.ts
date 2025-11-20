import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { logger } from '../../../utils/logger'

interface RegisterExecutionHistoryInput {
  scenarioId: number
  action: string // STARTED, COMPLETED, FAILED, STEP_COMPLETED, BUG_CREATED, etc.
  description?: string
  metadata?: Record<string, any>
  userId: number
}

export async function registerExecutionHistory({
  scenarioId,
  action,
  description,
  metadata,
  userId
}: RegisterExecutionHistoryInput) {
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

    // Registrar histórico
    const history = await prisma.scenarioExecutionHistory.create({
      data: {
        action,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
        scenarioId,
        userId
      },
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

    return history
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      logger.error('Error in registerExecutionHistory:', error)
    }
    throw error
  }
}

