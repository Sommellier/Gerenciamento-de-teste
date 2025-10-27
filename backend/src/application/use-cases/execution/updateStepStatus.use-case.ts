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
    console.log('updateStepStatus - stepId:', stepId, 'status:', status, 'actualResult:', actualResult)
    
    // Verificar se a etapa existe
    const step = await prisma.testScenarioStep.findUnique({
      where: { id: stepId }
    })

    if (!step) {
      throw new AppError('Etapa não encontrada', 404)
    }

    console.log('updateStepStatus - Etapa encontrada:', step)

    // Atualizar status da etapa
    const updatedStep = await prisma.testScenarioStep.update({
      where: { id: stepId },
      data: {
        status,
        actualResult: actualResult || step.actualResult
      }
    })

    console.log('updateStepStatus - Etapa atualizada:', updatedStep)

    return updatedStep
  } catch (error) {
    console.error('Error in updateStepStatus:', error)
    throw error
  }
}

