import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import fs from 'fs'
import path from 'path'
import { logger } from '../../../utils/logger'

interface UploadBugAttachmentInput {
  bugId: number
  file: Express.Multer.File
  userId: number
}

export async function uploadBugAttachment({
  bugId,
  file,
  userId
}: UploadBugAttachmentInput) {
  try {
    // Verificar se o bug existe
    const bug = await prisma.bug.findUnique({
      where: { id: bugId },
      include: {
        scenario: {
          include: {
            project: true
          }
        }
      }
    })

    if (!bug) {
      throw new AppError('Bug não encontrado', 404)
    }

    // Validar arquivo usando magic bytes e outras verificações
    const { validateBugAttachmentFile } = await import('../../../utils/fileValidation')
    await validateBugAttachmentFile(file)
    
    // Não sanitizar originalname - manter como está para preservar o nome original do usuário
    // A sanitização do filename será feita pelo multer se necessário

    // Construir URL relativa
    const url = `/uploads/bug-attachments/${file.filename}`

    // Criar registro no banco
    const attachment = await prisma.bugAttachment.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
        bugId,
        uploadedBy: userId
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    return attachment
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      logger.error('Error in uploadBugAttachment:', error)
    }
    throw error
  }
}
