import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface GetStepAttachmentsInput {
  stepId: number
  userId: number
}

export async function getStepAttachments({
  stepId,
  userId
}: GetStepAttachmentsInput) {
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

    // Buscar anexos da etapa
    const attachments = await prisma.stepAttachment.findMany({
      where: {
        stepId
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return attachments
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      console.error('Error in getStepAttachments:', error)
    }
    throw error
  }
}

