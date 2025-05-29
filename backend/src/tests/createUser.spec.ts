import { createUser } from '../application/use-cases/createUser.use-case'
import { prisma } from '../infrastructure/prisma'
import bcrypt from 'bcrypt'
import { beforeAll, describe, expect, it } from '@jest/globals'

describe('User Registration', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany()
  })

  it('should register a user with a hashed password', async () => {
    const result = await createUser({
      name: 'Felipe',
      email: 'user@example.com',
      password: 'securepass'
    })

    expect(result).toHaveProperty('id')
    expect(result.email).toBe('user@example.com')
    expect(result.password).not.toBe('securepass')
    const isHashed = await bcrypt.compare('securepass', result.password)
    expect(isHashed).toBe(true)
  })

  it('should not allow duplicate email', async () => {
    await expect(() =>
      createUser({
        name: 'Richard',
        email: 'user@example.com',
        password: 'anotherpass'
      })
    ).rejects.toThrow('Email already exists')
  })
})
