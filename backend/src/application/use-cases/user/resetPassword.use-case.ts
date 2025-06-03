import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { hashPassword } from '../../../utils/hash.util'

export async function resetPassword(token: string, newPassword: string) {
  if (!token || !newPassword) {
    throw new AppError('Token e nova senha são obrigatórios', 400)
  }

  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { token }
  })

  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    throw new AppError('Token inválido ou expirado', 400)
  }

  const hashed = await hashPassword(newPassword)

  await prisma.user.update({
    where: { id: tokenRecord.userId },
    data: { password: hashed }
  })

  await prisma.passwordResetToken.delete({
    where: { token }
  })
}
