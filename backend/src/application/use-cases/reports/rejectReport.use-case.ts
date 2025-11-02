import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import crypto from 'crypto'

interface RejectReportInput {
  reportId: number
  rejectorId: number
  comment: string // Obrigatório para reprovação
}

export async function rejectReport({ reportId, rejectorId, comment }: RejectReportInput) {
  if (!comment || comment.trim().length === 0) {
    console.error('🔴 [rejectReport] Comentário obrigatório não fornecido')
    throw new AppError('Comentário é obrigatório para reprovação', 400)
  }

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
    console.error('🔴 [rejectReport] Relatório não encontrado:', reportId)
    throw new AppError('Relatório não encontrado', 404)
  }

  // Verificar se já foi aprovado/reprovado
  if (report.approval) {
    console.error('🔴 [rejectReport] Relatório já foi aprovado/reprovado:', {
      reportId,
      approvalStatus: report.approval.status
    })
    throw new AppError('Relatório já foi aprovado ou reprovado', 400)
  }

  // Verificar permissões: apenas dono do projeto ou aprovador do cenário podem reprovar
  const project = report.scenario?.project || report.package?.project
  if (!project) {
    throw new AppError('Projeto não encontrado para este relatório', 404)
  }

  const isOwner = project.ownerId === rejectorId
  const isApprover = report.scenario?.aprovadorId === rejectorId

  if (!isOwner && !isApprover) {
    throw new AppError('Apenas o dono do projeto ou o aprovador do cenário podem reprovar este relatório', 403)
  }

  // Calcular hash do arquivo atual
  const fileHash = crypto.createHash('sha256').update(report.content).digest('hex')

  // Criar reprovação
  const approval = await prisma.testReportApproval.create({
    data: {
      reportId: report.id,
      status: 'REJECTED',
      comment: comment.trim(),
      approvedBy: rejectorId,
      fileHash,
      verificationUrl: null
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

  // Atualizar status do cenário para REPROVED se o relatório estiver associado a um cenário
  if (report.scenarioId) {
    await prisma.testScenario.update({
      where: { id: report.scenarioId },
      data: { status: 'REPROVED' }
    })
  }

  return { approval }
}

