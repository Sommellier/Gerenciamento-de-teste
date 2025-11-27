import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { logger } from '../../../utils/logger'
import { sanitizeString } from '../../../utils/validation'

interface AddStepCommentInput {
  stepId: number
  text: string
  mentions?: number[] // Array de IDs de usuários mencionados
  userId: number
}

export async function addStepComment({
  stepId,
  text,
  mentions,
  userId
}: AddStepCommentInput) {
  try {
    // Verificar se a etapa existe
    const step = await prisma.testScenarioStep.findUnique({
      where: { id: stepId },
      include: {
        scenario: {
          include: {
            project: true
          }
        }
      }
    })

    if (!step) {
      throw new AppError('Etapa não encontrada', 404)
    }
    // Criar comentário
    
    const comment = await prisma.stepComment.create({
      data: {
        text: sanitizeString(text),
        mentions: mentions ? JSON.stringify(mentions) : null,
        stepId,
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

    return comment
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      logger.error('Error in addStepComment:', error)
    }
    throw error
  }
}

