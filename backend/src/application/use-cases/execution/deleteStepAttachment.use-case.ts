import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import fs from 'fs'
import path from 'path'
import { logger } from '../../../utils/logger'

interface DeleteStepAttachmentInput {
  attachmentId: number
  userId: number
}

export async function deleteStepAttachment({
  attachmentId,
  userId
}: DeleteStepAttachmentInput) {
  try {
    // Buscar o anexo com informações da etapa
    const attachment = await prisma.stepAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        step: {
          include: {
            scenario: {
              include: {
                project: true
              }
            }
          }
        }
      }
    })

    if (!attachment) {
      throw new AppError('Anexo não encontrado', 404)
    }

    // Verificar se o usuário tem permissão para deletar
    // Permitir se o usuário fez o upload ou se é ADMIN/MANAGER/OWNER do projeto
    const project = attachment.step.scenario.project
    const isOwner = project.ownerId === userId
    const userProject = await prisma.userOnProject.findFirst({
      where: {
        userId,
        projectId: project.id
      }
    })

    const canDelete = 
      attachment.uploadedBy === userId ||
      isOwner ||
      userProject?.role === 'ADMIN' ||
      userProject?.role === 'MANAGER' ||
      userProject?.role === 'OWNER'

    if (!canDelete) {
      throw new AppError('Sem permissão para excluir este anexo', 403)
    }

    // Deletar arquivo físico se existir
    try {
      const filePath = path.join(process.cwd(), 'uploads', 'evidences', attachment.filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (fileError) {
      logger.error('Erro ao deletar arquivo físico:', fileError)
      // Continuar mesmo se não conseguir deletar o arquivo
    }

    // Deletar registro do banco
    await prisma.stepAttachment.delete({
      where: { id: attachmentId }
    })

    return { success: true }
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      logger.error('Error in deleteStepAttachment:', error)
    }
    throw error
  }
}
