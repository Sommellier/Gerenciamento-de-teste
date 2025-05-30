import { prisma } from '../../infrastructure/prisma'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { AppError } from '../../utils/AppError'

interface LoginInput {
  email: string
  password: string
}

export async function loginUser({ email, password }: LoginInput) {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400)
  }

  const normalizedEmail = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(normalizedEmail)) {
    throw new AppError('Invalid email format', 400)
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Invalid credentials', 401)
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new AppError('JWT secret not configured', 500)
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    jwtSecret,
    { expiresIn: '1h' }
  )

  const { password: _, ...safeUser } = user
  return {
    user: safeUser,
    token
  }
}
