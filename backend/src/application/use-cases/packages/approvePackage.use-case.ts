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

    // RB1.1: Validar se ECT está disponível (ectUrl válido e acessível)
    if (!testPackage.ectUrl || testPackage.ectUrl.trim().length === 0) {
      throw new AppError('ECT é obrigatório para aprovação do pacote', 400)
    }

    // Validar se URL é acessível (pode fazer uma validação simples ou verificar se o arquivo existe)
    try {
      const url = new URL(testPackage.ectUrl)
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new AppError('URL do ECT inválida', 400)
      }
    } catch {
      throw new AppError('URL do ECT inválida ou inacessível', 400)
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

