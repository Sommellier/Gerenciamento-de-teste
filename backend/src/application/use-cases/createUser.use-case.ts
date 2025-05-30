import { prisma } from '../../infrastructure/prisma'
<<<<<<< HEAD
import { hashPassword } from '../../utils/hash.util'
import { AppError } from '../../utils/AppError'
=======
import { hashPassword } from '../../utils/hash.util' 
>>>>>>> c94f46664fe2374fef459d98c075d165f4a61602
import 'dotenv/config'

interface CreateUserInput {
  name: string
  email: string
  password: string
}

type SafeUser = Omit<Awaited<ReturnType<typeof prisma.user.create>>, 'password'>

export async function createUser({ name, email, password }: CreateUserInput): Promise<SafeUser> {
  if (!name || !email || !password) {
    throw new AppError('All fields (name, email, password) are required', 400)
  }

  const normalizedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()

  if (normalizedName.length < 2) {
    throw new AppError('Name must be at least 2 characters long', 400)
  }

  const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/
  if (!nameRegex.test(normalizedName)) {
    throw new AppError('Name contains invalid characters', 400)
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(normalizedEmail)) {
    throw new AppError('Invalid email format', 400)
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400)
  }

  const userExists = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (userExists) {
    throw new AppError('Email already exists', 409)
  }

  const hashedPassword = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
    },
  })
<<<<<<< HEAD

  const { password: _, ...safeUser } = user
  return safeUser
=======
>>>>>>> c94f46664fe2374fef459d98c075d165f4a61602
}
