import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import * as fs from 'fs'
import * as path from 'path'

interface UploadStepAttachmentInput {
  stepId: number
  file: Express.Multer.File
  userId: number
}

export async function uploadStepAttachment({
  stepId,
  file,
  userId
}: UploadStepAttachmentInput) {
  try {
    // Verificar se a etapa existe
    const step = await prisma.testScenarioStep.findUnique({
      where: { id: stepId },
      include: {
        scenario: {
          include: {
            project: true
          }
        }
      }
    })

    if (!step) {
      throw new AppError('Etapa não encontrada', 404)
    }

    // Validar tipo de arquivo
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf'
    ]

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError('Tipo de arquivo não permitido', 400)
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new AppError('Arquivo muito grande. Máximo 5MB', 400)
    }

    // Construir URL relativa
    const url = `/uploads/evidences/${file.filename}`

    // Criar registro no banco
    const attachment = await prisma.stepAttachment.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
        stepId,
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
      console.error('Error in uploadStepAttachment:', error)
    }
    throw error
  }
}

