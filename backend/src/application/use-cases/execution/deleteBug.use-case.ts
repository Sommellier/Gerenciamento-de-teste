import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import fs from 'fs'
import path from 'path'
import { logger } from '../../../utils/logger'

interface DeleteBugInput {
  bugId: number
  userId: number
}

export async function deleteBug({ bugId, userId }: DeleteBugInput) {
  try {
    // Verificar se o bug existe e buscar seus anexos
    const bug = await prisma.bug.findUnique({
      where: { id: bugId },
      include: {
        attachments: {
          select: {
            filename: true
          }
        }
      }
    })

    if (!bug) {
      throw new AppError('Bug não encontrado', 404)
    }

    // Deletar arquivos físicos dos anexos
    for (const attachment of bug.attachments) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', 'bug-attachments', attachment.filename)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (fileError) {
        logger.error(`Erro ao deletar arquivo de anexo de bug ${attachment.filename}:`, fileError)
        // Continuar mesmo se não conseguir deletar o arquivo
      }
    }

    // Deletar o bug (os anexos serão deletados em cascade pelo Prisma)
    await prisma.bug.delete({
      where: { id: bugId }
    })

    return { message: 'Bug excluído com sucesso' }
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      logger.error('Error in deleteBug:', error)
    }
    throw error
  }
}

