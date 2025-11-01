import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { PackageStatus } from '@prisma/client'

interface SendPackageToTestInput {
  packageId: number
  projectId: number
  userId: number
}

export class SendPackageToTestUseCase {
  async execute({ packageId, projectId, userId }: SendPackageToTestInput) {
    // Buscar pacote
    const testPackage = await prisma.testPackage.findFirst({
      where: {
        id: packageId,
        projectId: projectId
      }
    })

    if (!testPackage) {
      throw new AppError('Pacote não encontrado', 404)
    }

    // Validar que pacote está em REPROVADO
    if (testPackage.status !== PackageStatus.REPROVADO) {
      throw new AppError('Pacote deve estar em REPROVADO para ser reenviado para teste', 400)
    }

    // Reenviar para teste (mudar status para EM_TESTE)
    const updatedPackage = await prisma.testPackage.update({
      where: { id: packageId },
      data: {
        status: PackageStatus.EM_TESTE
        // Mantém os campos de reprovação para histórico
      }
    })

    return { package: updatedPackage }
  }
}

