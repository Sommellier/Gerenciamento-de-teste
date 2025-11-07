import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface CreateBugInput {
  scenarioId: number
  title: string
  description?: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  relatedStepId?: number
  userId: number
}

export async function createBug({
  scenarioId,
  title,
  description,
  severity,
  relatedStepId,
  userId
}: CreateBugInput) {
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

    // Criar bug
    const bug = await prisma.bug.create({
      data: {
        title,
        description,
        severity,
        scenarioId,
        relatedStepId,
        projectId: scenario.projectId,
        createdBy: userId
      },
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
      }
    })

    // Atualizar status do cenário para FAILED se não estiver
    if (scenario.status !== 'FAILED') {
      await prisma.testScenario.update({
        where: { id: scenarioId },
        data: { status: 'FAILED' }
      })
    }

    // Registrar no histórico
    await prisma.scenarioExecutionHistory.create({
      data: {
        action: 'BUG_CREATED',
        description: `Bug criado: ${title}`,
        metadata: JSON.stringify({
          bugId: bug.id,
          severity,
          relatedStepId
        }),
        scenarioId,
        userId
      }
    })

    return bug
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      console.error('Error in createBug:', error)
    }
    throw error
  }
}

