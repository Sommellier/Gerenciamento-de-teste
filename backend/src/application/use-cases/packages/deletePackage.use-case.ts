import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface DeletePackageInput {
  packageId: number
  projectId: number
}

export async function deletePackage({ packageId, projectId }: DeletePackageInput) {
  try {
    // Verificar se o pacote existe e pertence ao projeto
    const existingPackage = await prisma.testPackage.findFirst({
      where: {
        id: packageId,
        projectId: projectId
      }
    })

    if (!existingPackage) {
      throw new AppError('Pacote não encontrado', 404)
    }

    // Deletar o pacote (os passos serão deletados automaticamente devido ao CASCADE)
    await prisma.testPackage.delete({
      where: { id: packageId }
    })

    return { message: 'Pacote deletado com sucesso' }
  } catch (error) {
    console.error('Error in deletePackage:', error)
    throw error
  }
}
