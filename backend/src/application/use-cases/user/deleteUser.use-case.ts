import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

export async function deleteUser(userId: string): Promise<boolean> {
  const numericUserId = Number(userId)

  if (isNaN(numericUserId)) {
    throw new AppError('Invalid user ID', 400)
  }

  const user = await prisma.user.findUnique({ where: { id: numericUserId } })

  if (!user) {
    throw new AppError('User not found', 404)
  }

  await prisma.user.delete({ where: { id: numericUserId } })

  return true
}
