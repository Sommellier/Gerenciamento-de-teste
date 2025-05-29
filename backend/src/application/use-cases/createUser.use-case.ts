import { prisma } from '../../infrastructure/prisma'
import { hashPassword } from '../../utils/hash.util' 
import 'dotenv/config'

interface CreateUserInput {
  name: string
  email: string
  password: string
}

export async function createUser({ name, email, password }: CreateUserInput) {
  const userExists = await prisma.user.findUnique({ where: { email } })
  if (userExists) {
    throw new Error('Email already exists')
  }

  const hashedPassword = await hashPassword(password)

  return await prisma.user.create({
    data: { name, email, password: hashedPassword }
  })
}
