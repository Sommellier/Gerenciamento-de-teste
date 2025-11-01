import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { PackageStatus } from '@prisma/client'

interface ApprovePackageInput {
  packageId: number
  projectId: number
  approverId: number
}

export class ApprovePackageUseCase {
  async execute({ packageId, projectId, approverId }: ApprovePackageInput) {
    // Buscar pacote
    const testPackage = await prisma.testPackage.findFirst({
      where: {
        id: packageId,
        projectId: projectId
      },
      include: {
        scenarios: {
          include: {
            testador: {
              select: { id: true, name: true, email: true }
            },
            aprovador: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        project: true
      }
    })

    if (!testPackage) {
      throw new AppError('Pacote não encontrado', 404)
    }

    // Validar que pacote está em EM_TESTE
    if (testPackage.status !== PackageStatus.EM_TESTE) {
      throw new AppError('Pacote deve estar em EM_TESTE para ser aprovado', 400)
    }

    // RB2.1: Aprovar o pacote (mudar status para CONCLUIDO)
    const updatedPackage = await prisma.testPackage.update({
      where: { id: packageId },
      data: {
        status: PackageStatus.CONCLUIDO,
        approvedById: approverId,
        approvedAt: new Date(),
        // Limpar campos de reprovação se existirem
        rejectedById: null,
        rejectedAt: null,
        rejectionReason: null
      },
      include: {
        approvedBy: {
          select: { id: true, name: true, email: true }
        },
        scenarios: {
          include: {
            testador: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    return { package: updatedPackage }
  }
}

