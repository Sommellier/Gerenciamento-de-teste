import { prisma } from '../../../infrastructure/prisma'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { AppError } from '../../../utils/AppError'

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

  // Access token com expiração de 1 hora
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, type: 'access' },
    jwtSecret,
    { expiresIn: '1h' }
  )

  // Refresh token com expiração de 7 dias
  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email, type: 'refresh' },
    jwtSecret,
    { expiresIn: '7d' }
  )

  const { password: _, ...safeUser } = user
  return {
    user: safeUser,
    accessToken,
    refreshToken
  }
}
