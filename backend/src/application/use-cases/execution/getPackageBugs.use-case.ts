import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface GetPackageBugsInput {
  packageId: number
  projectId: number
  userId: number
}

export async function getPackageBugs({ packageId, projectId, userId }: GetPackageBugsInput) {
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

    // Buscar todos os cenários do pacote
    const scenarios = await prisma.testScenario.findMany({
      where: {
        packageId: packageId,
        projectId: projectId
      },
      select: {
        id: true
      }
    })

    const scenarioIds = scenarios.map(s => s.id)

    // Buscar bugs de todos os cenários do pacote
    const bugs = await prisma.bug.findMany({
      where: {
        scenarioId: {
          in: scenarioIds
        }
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
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return bugs
  } catch (error) {
    console.error('Error in getPackageBugs:', error)
    throw error
  }
}

