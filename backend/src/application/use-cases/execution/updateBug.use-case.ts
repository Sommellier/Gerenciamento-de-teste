import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface UpdateBugInput {
  bugId: number
  title?: string
  description?: string
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  userId: number
}

export async function updateBug({
  bugId,
  title,
  description,
  severity,
  status,
  userId
}: UpdateBugInput) {
  try {
    // Verificar se o bug existe
    const bug = await prisma.bug.findUnique({
      where: { id: bugId }
    })

    if (!bug) {
      throw new AppError('Bug não encontrado', 404)
    }

    // Preparar dados de atualização
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (severity !== undefined) updateData.severity = severity
    if (status !== undefined) updateData.status = status

    // Atualizar o bug
    const updatedBug = await prisma.bug.update({
      where: { id: bugId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        scenario: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    return updatedBug
  } catch (error) {
    console.error('Error in updateBug:', error)
    throw error
  }
}

