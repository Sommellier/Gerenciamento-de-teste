import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { hashPassword } from '../../../utils/hash.util'

interface UpdateUserInput {
  name?: string
  email?: string
  password?: string
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
    const name = data.name.trim()
    if (name.length < 2 || !/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(name)) {
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
    if (data.password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400)
    }

    updates.password = await hashPassword(data.password)
  }

  const updatedUser = await prisma.user.update({
    where: { id: numericUserId },
    data: updates
  })

  const { password: _, ...safeUser } = updatedUser
  return safeUser
}
