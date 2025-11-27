import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { logger } from '../../../utils/logger'

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

    // Validar arquivo usando magic bytes e outras verificações
    const { validateEvidenceFile } = await import('../../../utils/fileValidation')
    await validateEvidenceFile(file)
    
    // Não sanitizar originalname - manter como está para preservar o nome original do usuário
    // A sanitização do filename será feita pelo multer se necessário

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
      logger.error('Error in uploadStepAttachment:', error)
      // Se for um erro do sistema de arquivos ou do banco, converter para AppError
      if (error instanceof Error) {
        throw new AppError(`Erro ao fazer upload: ${error.message}`, 500)
      }
      throw new AppError('Erro inesperado ao fazer upload', 500)
    }
    throw error
  }
}

