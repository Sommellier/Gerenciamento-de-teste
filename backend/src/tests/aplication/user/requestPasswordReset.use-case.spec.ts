import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { requestPasswordReset } from '../../../application/use-cases/user/requestPasswordReset.use-case'
import { AppError } from '../../../utils/AppError'
import { sendEmail } from '../../../utils/email.util'

// Mock das dependências
jest.mock('../../../utils/email.util')

const mockedSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>

describe('requestPasswordReset', () => {
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

  describe('requestPasswordReset - casos de sucesso', () => {
    it('solicita reset de senha com email válido', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed_password'
        }
      })

      mockedSendEmail.mockResolvedValue(undefined)

      await requestPasswordReset('test@example.com')

      // Verificar se token foi criado
      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id }
      })

      expect(tokenRecord).toBeTruthy()
      expect(tokenRecord?.token).toBeDefined()
      expect(tokenRecord?.expiresAt).toBeInstanceOf(Date)
      expect(tokenRecord?.expiresAt.getTime()).toBeGreaterThan(Date.now())

      expect(mockedSendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Redefinição de Senha',
        expect.stringContaining('Clique aqui para redefinir sua senha')
      )
    })

    it('normaliza email para lowercase', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed_password'
        }
      })

      mockedSendEmail.mockResolvedValue(undefined)

      await requestPasswordReset('TEST@EXAMPLE.COM')

      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id }
      })

      expect(tokenRecord).toBeTruthy()
      expect(mockedSendEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        expect.any(String)
      )
    })

    it('remove espaços em branco do email', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed_password'
        }
      })

      mockedSendEmail.mockResolvedValue(undefined)

      await requestPasswordReset('  test@example.com  ')

      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id }
      })

      expect(tokenRecord).toBeTruthy()
      expect(mockedSendEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        expect.any(String)
      )
    })

    it('cria token com expiração de 1 hora', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed_password'
        }
      })

      mockedSendEmail.mockResolvedValue(undefined)

      const beforeRequest = Date.now()
      await requestPasswordReset('test@example.com')
      const afterRequest = Date.now()

      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id }
      })

      expect(tokenRecord?.expiresAt.getTime()).toBeGreaterThanOrEqual(beforeRequest + 60 * 60 * 1000)
      expect(tokenRecord?.expiresAt.getTime()).toBeLessThanOrEqual(afterRequest + 60 * 60 * 1000)
    })

    it('envia email com link de reset correto', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed_password'
        }
      })

      mockedSendEmail.mockResolvedValue(undefined)

      await requestPasswordReset('test@example.com')

      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id }
      })

      const expectedLink = `${process.env.FRONTEND_URL}/reset-password?token=${tokenRecord?.token}`

      expect(mockedSendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Redefinição de Senha',
        expect.stringContaining(expectedLink)
      )
    })

    it('inclui nome do usuário no email', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'João Silva',
          email: 'joao@example.com',
          password: 'hashed_password'
        }
      })

      mockedSendEmail.mockResolvedValue(undefined)

      await requestPasswordReset('joao@example.com')

      expect(mockedSendEmail).toHaveBeenCalledWith(
        'joao@example.com',
        'Redefinição de Senha',
        expect.stringContaining('João Silva')
      )
    })
  })

  describe('requestPasswordReset - casos de erro', () => {
    it('lança erro quando email não é fornecido', async () => {
      await expect(requestPasswordReset('')).rejects.toThrow(AppError)
    })

    it('lança erro quando email é null', async () => {
      await expect(requestPasswordReset(null as any)).rejects.toThrow(AppError)
    })

    it('lança erro quando email é undefined', async () => {
      await expect(requestPasswordReset(undefined as any)).rejects.toThrow(AppError)
    })

    it('lança erro quando usuário não existe', async () => {
      await expect(requestPasswordReset('nonexistent@example.com')).rejects.toThrow(AppError)
    })

    it('lança erro quando usuário não existe (email normalizado)', async () => {
      await expect(requestPasswordReset('NONEXISTENT@EXAMPLE.COM')).rejects.toThrow(AppError)
    })
  })

  describe('requestPasswordReset - múltiplos tokens', () => {
    it('permite criar múltiplos tokens para o mesmo usuário', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed_password'
        }
      })

      mockedSendEmail.mockResolvedValue(undefined)

      await requestPasswordReset('test@example.com')
      await requestPasswordReset('test@example.com')

      const tokens = await prisma.passwordResetToken.findMany({
        where: { userId: user.id }
      })

      expect(tokens).toHaveLength(2)
      expect(tokens[0].token).not.toBe(tokens[1].token)
    })
  })

  describe('requestPasswordReset - falha no envio de email', () => {
    it('cria token mesmo se envio de email falhar', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed_password'
        }
      })

      mockedSendEmail.mockRejectedValue(new Error('Email service unavailable'))

      await expect(requestPasswordReset('test@example.com')).rejects.toThrow('Email service unavailable')

      // Verificar se token foi criado mesmo com falha no email
      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id }
      })

      expect(tokenRecord).toBeTruthy()
    })
  })
})
