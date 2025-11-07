import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface GetBugsInput {
  scenarioId: number
  userId: number
}

export async function getBugs({ scenarioId, userId }: GetBugsInput) {
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

    // Buscar bugs
    const bugs = await prisma.bug.findMany({
      where: { scenarioId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        scenario: {
          select: {
            id: true,
            title: true
          }
        },
        attachments: {
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return bugs
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      console.error('Error in getBugs:', error)
    }
    throw error
  }
}

