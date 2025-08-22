import 'dotenv/config'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { prisma } from '../../../infrastructure/prisma'
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

  it('should throw error if name is missing', async () => {
    const email = `missing_name_${Date.now()}@example.com`

    await expect(() =>
      createUser({
        name: '',
        email,
        password: 'validpassword',
      } as any)
    ).rejects.toThrow('All fields (name, email, password) are required')
  })

  it('should throw error if email is missing', async () => {
    await expect(() =>
      createUser({
        name: 'User',
        email: '',
        password: 'validpassword',
      } as any)
    ).rejects.toThrow('All fields (name, email, password) are required')
  })

  it('should throw error if password is missing', async () => {
    const email = `missing_password_${Date.now()}@example.com`

    await expect(() =>
      createUser({
        name: 'User',
        email,
        password: '',
      } as any)
    ).rejects.toThrow('All fields (name, email, password) are required')
  })

  it('should throw error if name contains invalid characters', async () => {
    const email = `invalid_chars_${Date.now()}@example.com`

    await expect(() =>
      createUser({
        name: 'John123$',
        email,
        password: 'validpassword'
      })
    ).rejects.toThrow('Name contains invalid characters')
  })
  it('should accept accented letters and spaces in name', async () => {
    const email = `acentos_${Date.now()}@example.com`
    const res = await createUser({
      name: 'Álvaro João',
      email,
      password: 'validpassword',
    })
    expect(res).toHaveProperty('id')
    expect(res.name).toBe('Álvaro João')
  })

  it('should throw if name has hyphen or symbols (regex only letters/spaces)', async () => {
    const email = `hifen_${Date.now()}@example.com`
    await expect(() =>
      createUser({
        name: 'Ana-Maria', // "-" é inválido pelo regex atual
        email,
        password: 'validpassword',
      })
    ).rejects.toThrow('Name contains invalid characters')
  })

  it('should throw duplicate email ignoring case and extra spaces', async () => {
    const base = `dup_${Date.now()}@example.com`

    await createUser({
      name: 'Primeiro',
      email: base,
      password: 'validpassword',
    })

    await expect(() =>
      createUser({
        name: 'Segundo',
        email: `  ${base.toUpperCase()}  `, // variação de caixa+espaço
        password: 'anotherpass',
      })
    ).rejects.toThrow('Email already exists')
  })

  it('should throw error if name only has spaces (trim -> empty -> too short)', async () => {
    const email = `only_spaces_name_${Date.now()}@example.com`
    await expect(() =>
      createUser({
        name: '   ',
        email,
        password: 'validpassword',
      })
    ).rejects.toThrow('Name must be at least 2 characters long')
  })

  it('should throw error if email only has spaces (trim -> empty -> required)', async () => {
    await expect(() =>
      createUser({
        name: 'Usuário',
        email: '   ',
        password: 'validpassword',
      } as any)
    ).rejects.toThrow('Invalid email format')
  })
})
