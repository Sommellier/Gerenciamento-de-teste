import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface DeleteBugInput {
  bugId: number
  userId: number
}

export async function deleteBug({ bugId, userId }: DeleteBugInput) {
  try {
    // Verificar se o bug existe
    const bug = await prisma.bug.findUnique({
      where: { id: bugId }
    })

    if (!bug) {
      throw new AppError('Bug não encontrado', 404)
    }

    // Deletar o bug
    await prisma.bug.delete({
      where: { id: bugId }
    })

    return { message: 'Bug excluído com sucesso' }
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      console.error('Error in deleteBug:', error)
    }
    throw error
  }
}

