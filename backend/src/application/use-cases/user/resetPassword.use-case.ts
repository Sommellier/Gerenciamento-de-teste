import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { hashPassword } from '../../../utils/hash.util'
import { validatePasswordComplexity } from '../../../utils/validation'

export async function resetPassword(token: string, newPassword: string) {
  if (!token || !newPassword) {
    throw new AppError('Token e nova senha são obrigatórios', 400)
  }

  // Validação básica de comprimento
  if (newPassword.length < 8) {
    throw new AppError('A senha deve ter pelo menos 8 caracteres', 400)
  }

  // Validação de complexidade (opcional, mas recomendado)
  // Em modo não-estrito, apenas valida mas não bloqueia
  // Pode ser ativado em modo estrito alterando o segundo parâmetro para true
  const complexityWarning = validatePasswordComplexity(newPassword, false)
  if (complexityWarning) {
    // Log do aviso, mas não bloqueia o reset
    // Em produção, pode-se considerar tornar isso obrigatório (strict: true)
    console.warn(`[Password Complexity] ${complexityWarning}`)
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
