import 'dotenv/config'
import { describe, it, beforeEach, afterAll, expect } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { loginUser } from '../../../application/use-cases/user/loginUser.use-case'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

describe('User Login', () => {
  let userData: { name: string; email: string; password: string }

  beforeEach(async () => {
    // LIMPEZA EM ORDEM (ajuste a lista conforme seu schema real)
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany(),
      prisma.execution.deleteMany(),      // se Execution referenciar User
      prisma.userOnProject.deleteMany(),
      prisma.testCase.deleteMany(),
      prisma.project.deleteMany(),
      prisma.user.deleteMany(),
    ])

    userData = {
      name: 'Tester Login',
      email: `${unique('login')}@example.com`,
      password: 'pass1234',
    }

    await createUser(userData)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should login successfully and return a token', async () => {
    const result = await loginUser({
      email: userData.email,
      password: userData.password,
    })

    expect(result).toHaveProperty('token')
    expect(result.user.email).toBe(userData.email)
    expect(result.user).not.toHaveProperty('password')
  })

  it('should fail with wrong password', async () => {
    await expect(
      loginUser({ email: userData.email, password: 'wrong' })
    ).rejects.toThrow(/invalid credentials/i)
  })

  it('should fail with non-existing user', async () => {
    await expect(
      loginUser({ email: 'nonexist@qa.com', password: '123' })
    ).rejects.toThrow(/invalid credentials/i)
  })

  it('should fail with invalid email format', async () => {
    await expect(
      loginUser({ email: 'invalid-email', password: '123' })
    ).rejects.toThrow(/invalid email format/i)
  })

  it('should fail if email is missing', async () => {
    await expect(
      loginUser({ email: '', password: 'pass1234' })
    ).rejects.toThrow(/email and password are required/i)
  })

  it('should fail if password is missing', async () => {
    await expect(
      loginUser({ email: userData.email, password: '' })
    ).rejects.toThrow(/email and password are required/i)
  })

  it('should fail if JWT secret is not configured', async () => {
  const prev = process.env.JWT_SECRET
  try {
    delete process.env.JWT_SECRET

    await expect(
      loginUser({ email: userData.email, password: userData.password })
    ).rejects.toThrow(/JWT secret not configured/i)
  } finally {
    if (prev !== undefined) process.env.JWT_SECRET = prev
    else delete process.env.JWT_SECRET
  }
})

})
