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
    // Buscar pacote com projeto e membros
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
        project: {
          include: {
            userProjects: {
              where: {
                userId: approverId
              }
            }
          }
        }
      }
    })

    if (!testPackage) {
      throw new AppError('Pacote não encontrado', 404)
    }

    // Verificar se usuário é owner ou manager
    const isOwner = testPackage.project.ownerId === approverId
    const isManager = testPackage.project.userProjects.some(
      up => up.userId === approverId && up.role === 'MANAGER'
    )

    if (!isOwner && !isManager) {
      throw new AppError('Apenas o dono do projeto ou um manager podem aprovar o pacote', 403)
    }

    // Verificar se existem cenários no pacote
    if (testPackage.scenarios.length === 0) {
      throw new AppError('Pacote não possui cenários para aprovar', 400)
    }

    // Verificar se todos os cenários estão aprovados
    const allScenariosApproved = testPackage.scenarios.every(
      scenario => scenario.status === 'APPROVED'
    )

    if (!allScenariosApproved) {
      throw new AppError('Todos os cenários devem estar aprovados para aprovar o pacote', 400)
    }

    // Verificar se o pacote já está aprovado
    if (testPackage.status === PackageStatus.APROVADO) {
      throw new AppError('Pacote já está aprovado', 400)
    }

    // Aprovar o pacote (mudar status para APROVADO)
    const updatedPackage = await prisma.testPackage.update({
      where: { id: packageId },
      data: {
        status: PackageStatus.APROVADO,
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

