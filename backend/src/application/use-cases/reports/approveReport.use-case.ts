import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import crypto from 'crypto'

interface ApproveReportInput {
  reportId: number
  approverId: number
  comment?: string
}

export async function approveReport({ reportId, approverId, comment }: ApproveReportInput) {
  // Buscar relatório
  const report = await prisma.testReport.findUnique({
    where: { id: reportId },
    include: {
      scenario: {
        include: {
          project: {
            include: {
              owner: true
            }
          },
          aprovador: true
        }
      },
      package: {
        include: {
          project: {
            include: {
              owner: true
            }
          }
        }
      },
      approval: true
    }
  })

  if (!report) {
    console.error('🔴 [approveReport] Relatório não encontrado:', reportId)
    throw new AppError('Relatório não encontrado', 404)
  }

  // Verificar se já foi aprovado/reprovado
  if (report.approval) {
    console.error('🔴 [approveReport] Relatório já foi aprovado/reprovado:', {
      reportId,
      approvalStatus: report.approval.status
    })
    throw new AppError('Relatório já foi aprovado ou reprovado', 400)
  }

  // Verificar permissões: apenas dono do projeto ou aprovador do cenário podem aprovar
  const project = report.scenario?.project || report.package?.project
  if (!project) {
    throw new AppError('Projeto não encontrado para este relatório', 404)
  }

  const isOwner = project.ownerId === approverId
  const isApprover = report.scenario?.aprovadorId === approverId

  if (!isOwner && !isApprover) {
    throw new AppError('Apenas o dono do projeto ou o aprovador do cenário podem aprovar este relatório', 403)
  }

  // Calcular hash do arquivo atual
  const fileHash = crypto.createHash('sha256').update(report.content).digest('hex')

  // Criar aprovação
  const approval = await prisma.testReportApproval.create({
    data: {
      reportId: report.id,
      status: 'APPROVED',
      comment: comment || null,
      approvedBy: approverId,
      fileHash,
      verificationUrl: null // TODO: Implementar QR code se necessário
    },
    include: {
      approver: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      report: {
        include: {
          scenario: true,
          package: true
        }
      }
    }
  })

  // Atualizar status do cenário para APPROVED se o relatório estiver associado a um cenário
  if (report.scenarioId) {
    await prisma.testScenario.update({
      where: { id: report.scenarioId },
      data: { status: 'APPROVED' }
    })
  }

  return { approval }
}

