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

    // Validar tipo de arquivo (PDF, Word, PowerPoint, Excel)
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
    ]

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError('Tipo de arquivo não permitido. Use PDF, Word, PowerPoint ou Excel', 400)
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new AppError('Arquivo muito grande. Máximo 10MB', 400)
    }

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
