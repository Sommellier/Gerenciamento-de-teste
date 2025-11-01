import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { loginUser } from '../../../application/use-cases/user/loginUser.use-case'
import { AppError } from '../../../utils/AppError'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

// Mock das dependências
jest.mock('bcrypt')
jest.mock('jsonwebtoken')

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockedJwt = jwt as jest.Mocked<typeof jwt>

describe('loginUser', () => {
  beforeEach(async () => {
    // Limpar dados de teste em ordem correta para evitar foreign key constraints
    await prisma.passwordResetToken.deleteMany()
    await prisma.userOnProject.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  })

  afterEach(async () => {
    // Limpar dados de teste em ordem correta para evitar foreign key constraints
    await prisma.passwordResetToken.deleteMany()
    await prisma.userOnProject.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('loginUser - casos de sucesso', () => {
    it('faz login com credenciais válidas', async () => {
      const hashedPassword = 'hashed_password_123'
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword
        }
      })

      mockedBcrypt.compare.mockResolvedValue(true as never)
      mockedJwt.sign.mockReturnValue('mock_jwt_token' as never)

      const result = await loginUser({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result).toMatchObject({
        user: {
          id: user.id,
          name: 'Test User',
          email: 'test@example.com'
        },
        accessToken: 'mock_jwt_token',
        refreshToken: 'mock_jwt_token'
      })
      expect(result.user).not.toHaveProperty('password')
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', hashedPassword)
      expect(mockedJwt.sign).toHaveBeenCalledTimes(2)
      // Verificar chamada do access token
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId: user.id, email: user.email, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      )
      // Verificar chamada do refresh token
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId: user.id, email: user.email, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      )
    })

    it('normaliza email para lowercase', async () => {
      const hashedPassword = 'hashed_password_123'
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword
        }
      })

      mockedBcrypt.compare.mockResolvedValue(true as never)
      mockedJwt.sign.mockReturnValue('mock_jwt_token' as never)

      const result = await loginUser({
        email: 'TEST@EXAMPLE.COM',
        password: 'password123'
      })

      expect(result.user.email).toBe('test@example.com')
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', hashedPassword)
    })

    it('remove espaços em branco do email', async () => {
      const hashedPassword = 'hashed_password_123'
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword
        }
      })

      mockedBcrypt.compare.mockResolvedValue(true as never)
      mockedJwt.sign.mockReturnValue('mock_jwt_token' as never)

      const result = await loginUser({
        email: '  test@example.com  ',
        password: 'password123'
      })

      expect(result.user.email).toBe('test@example.com')
    })
  })

  describe('loginUser - casos de erro', () => {
    it('lança erro quando email não é fornecido', async () => {
      await expect(loginUser({
        email: '',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando senha não é fornecida', async () => {
      await expect(loginUser({
        email: 'test@example.com',
        password: ''
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando email e senha não são fornecidos', async () => {
      await expect(loginUser({
        email: '',
        password: ''
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando formato de email é inválido', async () => {
      await expect(loginUser({
        email: 'invalid-email',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando formato de email é inválido (sem @)', async () => {
      await expect(loginUser({
        email: 'testexample.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando formato de email é inválido (sem domínio)', async () => {
      await expect(loginUser({
        email: 'test@',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando usuário não existe', async () => {
      await expect(loginUser({
        email: 'nonexistent@example.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando senha está incorreta', async () => {
      const hashedPassword = 'hashed_password_123'
      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword
        }
      })

      mockedBcrypt.compare.mockResolvedValue(false as never)

      await expect(loginUser({
        email: 'test@example.com',
        password: 'wrong_password'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando JWT_SECRET não está configurado', async () => {
      const hashedPassword = 'hashed_password_123'
      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword
        }
      })

      const originalSecret = process.env.JWT_SECRET
      delete process.env.JWT_SECRET

      mockedBcrypt.compare.mockResolvedValue(true as never)

      try {
        await expect(loginUser({
          email: 'test@example.com',
          password: 'password123'
        })).rejects.toThrow(AppError)
      } finally {
        if (originalSecret !== undefined) {
          process.env.JWT_SECRET = originalSecret
        }
      }
    })

    it('lança erro quando usuário existe mas senha não confere', async () => {
      const hashedPassword = 'hashed_password_123'
      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword
        }
      })

      mockedBcrypt.compare.mockResolvedValue(false as never)

      await expect(loginUser({
        email: 'test@example.com',
        password: 'wrong_password'
      })).rejects.toThrow(AppError)
    })
  })

  describe('loginUser - validações de entrada', () => {
    it('aceita email com caracteres especiais válidos', async () => {
      const hashedPassword = 'hashed_password_123'
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test.user+tag@example-domain.co.uk',
          password: hashedPassword
        }
      })

      mockedBcrypt.compare.mockResolvedValue(true as never)
      mockedJwt.sign.mockReturnValue('mock_jwt_token' as never)

      const result = await loginUser({
        email: 'test.user+tag@example-domain.co.uk',
        password: 'password123'
      })

      expect(result.user.email).toBe('test.user+tag@example-domain.co.uk')
    })

    it('rejeita email com espaços', async () => {
      await expect(loginUser({
        email: 'test @example.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('rejeita email com múltiplos @', async () => {
      await expect(loginUser({
        email: 'test@@example.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })
  })
})
