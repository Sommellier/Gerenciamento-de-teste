import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface UpdateStepStatusInput {
  stepId: number
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'BLOCKED'
  actualResult?: string
  userId: number
}

export async function updateStepStatus({
  stepId,
  status,
  actualResult,
  userId
}: UpdateStepStatusInput) {
  try {
    // Verificar se a etapa existe
    const step = await prisma.testScenarioStep.findUnique({
      where: { id: stepId }
    })

    if (!step) {
      throw new AppError('Etapa não encontrada', 404)
    }

    // Atualizar status da etapa
    const updatedStep = await prisma.testScenarioStep.update({
      where: { id: stepId },
      data: {
        status,
        actualResult: actualResult || step.actualResult
      }
    })

    return updatedStep
  } catch (error) {
    console.error('Error in updateStepStatus:', error)
    throw error
  }
}

