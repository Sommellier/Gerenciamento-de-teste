import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface GetStepCommentsInput {
  stepId: number
  userId: number
}

export async function getStepComments({ stepId, userId }: GetStepCommentsInput) {
  try {
    // Verificar se a etapa existe e se o usuário tem acesso
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

    // Buscar comentários
    const comments = await prisma.stepComment.findMany({
      where: { stepId },
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
      orderBy: { createdAt: 'asc' }
    })

    // Parse mentions
    return comments.map(comment => ({
      ...comment,
      mentions: comment.mentions ? JSON.parse(comment.mentions) : []
    }))
  } catch (error) {
    console.error('Error in getStepComments:', error)
    throw error
  }
}

