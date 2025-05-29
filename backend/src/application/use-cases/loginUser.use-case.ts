import { prisma } from '../../infrastructure/prisma'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

interface LoginInput {
  email: string
  password: string
}

export async function loginUser({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error('Invalid credentials')
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || 'secret', 
    { expiresIn: '1h' }
  )

  const { password: _, ...safeUser } = user

  return {
    user: safeUser,
    token
  }
}
