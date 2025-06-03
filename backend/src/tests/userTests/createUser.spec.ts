import 'dotenv/config'
import { createUser } from '../../application/use-cases/user/createUser.use-case'
import { prisma } from '../../infrastructure/prisma'
import bcrypt from 'bcrypt'
import { beforeEach, describe, expect, it } from '@jest/globals'

describe('User Registration', () => {
  beforeEach(async () => {
    await prisma.passwordResetToken.deleteMany()
    await prisma.execution.deleteMany()
    await prisma.userOnProject.deleteMany()
    await prisma.user.deleteMany()
  })

  it('should register a user with a hashed password', async () => {
    const uniqueEmail = `user_${Date.now()}_${Math.random().toString(36).substring(2)}@example.com`

    const result = await createUser({
      name: 'Felipe',
      email: uniqueEmail,
      password: 'securepass'
    })

    expect(result).toHaveProperty('id')
    expect(result.email).toBe(uniqueEmail)

    const dbUser = await prisma.user.findUnique({ where: { email: uniqueEmail } })
    expect(dbUser).not.toBeNull()
    expect(dbUser!.password).not.toBe('securepass')

    const isHashed = await bcrypt.compare('securepass', dbUser!.password)
    expect(isHashed).toBe(true)
  })

  it('should not allow duplicate email', async () => {
    const email = `user_${Date.now()}_${Math.random().toString(36).substring(2)}@example.com`

    await createUser({
      name: 'Felipe',
      email,
      password: 'securepass'
    })

    await expect(() =>
      createUser({
        name: 'Richard',
        email,
        password: 'anotherpass'
      })
    ).rejects.toThrow('Email already exists')
  })

  it('should throw error if name is too short', async () => {
    const email = `shortname_${Date.now()}@example.com`

    await expect(() =>
      createUser({
        name: 'A',
        email,
        password: 'validpassword'
      })
    ).rejects.toThrow('Name must be at least 2 characters long')
  })

  it('should throw error if email format is invalid', async () => {
    await expect(() =>
      createUser({
        name: 'Invalid Email',
        email: 'invalid-email',
        password: 'validpassword'
      })
    ).rejects.toThrow('Invalid email format')
  })

  it('should throw error if password is too short', async () => {
    const email = `shortpass_${Date.now()}@example.com`

    await expect(() =>
      createUser({
        name: 'User',
        email,
        password: 'short'
      })
    ).rejects.toThrow('Password must be at least 8 characters long')
  })

  it('should normalize email and trim name', async () => {
    const result = await createUser({
      name: '   João   ',
      email: '  Normalizado@Example.COM ',
      password: 'validpassword'
    })

    expect(result.name).toBe('João')
    expect(result.email).toBe('normalizado@example.com')
  })
})
