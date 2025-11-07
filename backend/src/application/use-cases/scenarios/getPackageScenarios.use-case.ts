import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface GetPackageScenariosInput {
  packageId: number
  projectId: number
}

export async function getPackageScenarios({ packageId, projectId }: GetPackageScenariosInput) {
  try {
    // Verificar se o pacote existe e pertence ao projeto
    const testPackage = await prisma.testPackage.findFirst({
      where: {
        id: packageId,
        projectId: projectId
      }
    })

    if (!testPackage) {
      throw new AppError('Pacote não encontrado', 404)
    }

    // Buscar cenários do pacote
    const scenarios = await prisma.testScenario.findMany({
      where: {
        packageId: packageId,
        projectId: projectId
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Converter tags de JSON string para array
    const scenariosWithParsedTags = scenarios.map(scenario => ({
      ...scenario,
      tags: scenario.tags ? JSON.parse(scenario.tags) : []
    }))

    return scenariosWithParsedTags
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      console.error('Error in getPackageScenarios:', error)
    }
    throw error
  }
}
