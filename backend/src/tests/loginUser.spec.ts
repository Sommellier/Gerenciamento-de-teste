import { loginUser } from '../application/use-cases/loginUser.use-case'
import { createUser } from '../application/use-cases/createUser.use-case'
import { prisma } from '../infrastructure/prisma'

describe('User Login', () => {
  const userData = {
    name: 'Tester Login',
    email: 'login@example.com',
    password: 'pass1234'
  }

  beforeAll(async () => {
    await prisma.user.deleteMany()
    await createUser(userData)
  })

  it('should login successfully and return a token', async () => {
    const result = await loginUser({
      email: userData.email,
      password: userData.password
    })

    expect(result).toHaveProperty('token')
    expect(result.user.email).toBe(userData.email)
    expect(result.user).not.toHaveProperty('password')
  })

  it('should fail with wrong password', async () => {
    await expect(() =>
      loginUser({ email: userData.email, password: 'wrong' })
    ).rejects.toThrow('Invalid credentials')
  })

  it('should fail with non-existing user', async () => {
    await expect(() =>
      loginUser({ email: 'nonexist@qa.com', password: '123' })
    ).rejects.toThrow('Invalid credentials')
  })
})
