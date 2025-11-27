import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { hashPassword } from '../../../utils/hash.util'
import { sanitizeTextOnly, validatePasswordComplexity } from '../../../utils/validation'

interface UpdateUserInput {
  name?: string
  email?: string
  password?: string
  avatar?: string | null
}

export async function updateUser(userId: string, data: UpdateUserInput) {
  const numericUserId = Number(userId)

  if (isNaN(numericUserId)) {
    throw new AppError('Invalid user ID', 400)
  }

  const user = await prisma.user.findUnique({ where: { id: numericUserId } })
  if (!user) {
    throw new AppError('User not found', 404)
  }

  const updates: any = {}

  if (data.name) {
    const name = sanitizeTextOnly(data.name.trim())
    if (name.length < 2 || !/^[A-Za-zÀ-ÖØ-öø-ÿ\s-]+$/.test(name)) {
      throw new AppError('Invalid name', 400)
    }
    updates.name = name
  }

  if (data.email) {
    const email = data.email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400)
    }

    const emailTaken = await prisma.user.findFirst({
      where: { email, NOT: { id: numericUserId } }
    })
    if (emailTaken) {
      throw new AppError('Email already exists', 409)
    }

    updates.email = email
  }

  if (data.password) {
    // Validação básica de comprimento
    if (data.password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400)
    }

    // Validação de complexidade (opcional, mas recomendado)
    // Em modo não-estrito, apenas valida mas não bloqueia
    // Pode ser ativado em modo estrito alterando o segundo parâmetro para true
    const complexityWarning = validatePasswordComplexity(data.password, false)
    if (complexityWarning) {
      // Log do aviso, mas não bloqueia a atualização
      // Em produção, pode-se considerar tornar isso obrigatório (strict: true)
      console.warn(`[Password Complexity] ${complexityWarning}`)
    }

    updates.password = await hashPassword(data.password)
  }

  if (data.avatar !== undefined) {
    updates.avatar = data.avatar
  }

  const updatedUser = await prisma.user.update({
    where: { id: numericUserId },
    data: updates
  })

  const { password: _, ...safeUser } = updatedUser
  return safeUser
}
