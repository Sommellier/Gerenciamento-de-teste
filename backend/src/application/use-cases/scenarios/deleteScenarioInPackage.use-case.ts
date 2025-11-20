import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { logger } from '../../../utils/logger'

interface DeleteScenarioInPackageInput {
  scenarioId: number
  packageId: number
  projectId: number
}

export async function deleteScenarioInPackage({
  scenarioId,
  packageId,
  projectId
}: DeleteScenarioInPackageInput) {
  try {
    // Verificar se o cenário existe e pertence ao pacote e projeto
    const existingScenario = await prisma.testScenario.findFirst({
      where: {
        id: scenarioId,
        packageId: packageId,
        projectId: projectId
      }
    })

    if (!existingScenario) {
      throw new AppError('Cenário não encontrado', 404)
    }

    // Deletar o cenário (os passos serão deletados automaticamente devido ao CASCADE)
    await prisma.testScenario.delete({
      where: { id: scenarioId }
    })

    return { message: 'Cenário deletado com sucesso' }
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      logger.error('Error in deleteScenarioInPackage:', error)
    }
    throw error
  }
}
