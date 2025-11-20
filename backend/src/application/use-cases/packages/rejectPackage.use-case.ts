import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { PackageStatus } from '@prisma/client'
import { sendEmail } from '../../../utils/email.util'
import { logger } from '../../../utils/logger'

interface RejectPackageInput {
  packageId: number
  projectId: number
  rejectorId: number
  rejectionReason: string
}

export class RejectPackageUseCase {
  async execute({ packageId, projectId, rejectorId, rejectionReason }: RejectPackageInput) {
    // RB3.1: Validar que justificativa foi fornecida (já validado no controller)
    
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
      throw new AppError('Pacote deve estar em EM_TESTE para ser reprovado', 400)
    }

    // RB3.2 & RB5.1: Reprovar o pacote (salvar motivo e trilha de auditoria)
    const updatedPackage = await prisma.testPackage.update({
      where: { id: packageId },
      data: {
        status: PackageStatus.REPROVADO,
        rejectedById: rejectorId,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason,
        // Limpar campos de aprovação se existirem
        approvedById: null,
        approvedAt: null
      },
      include: {
        rejectedBy: {
          select: { id: true, name: true, email: true }
        },
        scenarios: {
          include: {
            testador: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        project: {
          include: {
            owner: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    // RB4.1: Enviar e-mail para testador responsável
    // Coletar emails únicos dos testadores (do pacote ou dos cenários)
    const testerEmails = new Set<string>()
    
    // Adicionar testador do pacote se houver
    if (testPackage.assigneeEmail) {
      testerEmails.add(testPackage.assigneeEmail)
    }
    
    // Adicionar testadores dos cenários
    testPackage.scenarios.forEach(scenario => {
      if (scenario.testador?.email) {
        testerEmails.add(scenario.testador.email)
      }
    })

    // Enviar e-mail para cada testador
    const emailPromises = Array.from(testerEmails).map(email => {
      const subject = `Pacote de Testes Reproado: ${testPackage.title}`
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto">
          <h2>Pacote de Testes Reproado</h2>
          <p>O pacote de testes <strong>${testPackage.title}</strong> foi reprovado.</p>
          <p><strong>Projeto:</strong> ${updatedPackage.project.name}</p>
          <p><strong>Motivo da Reprovação:</strong></p>
          <p style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap;">${rejectionReason}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          <p>Por favor, revise o pacote e faça os ajustes necessários.</p>
        </div>
      `
      return sendEmail(email, subject, html).catch(error => {
        logger.error(`Erro ao enviar e-mail para ${email}:`, error)
        // Não falha a operação se o e-mail falhar
      })
    })

    await Promise.all(emailPromises)

    return { package: updatedPackage }
  }
}

