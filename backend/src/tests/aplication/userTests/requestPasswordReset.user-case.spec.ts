const mockFindUnique = jest.fn()
const mockCreateToken = jest.fn()
const mockSendEmail = jest.fn()

jest.mock('../../../../src/infrastructure/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique
    },
    passwordResetToken: {
      create: mockCreateToken
    }
  }
}))

jest.mock('../../../../src/utils/email.util', () => ({
  sendEmail: mockSendEmail
}))

import { requestPasswordReset } from '../../../application/use-cases/user/requestPasswordReset.use-case'
import { AppError } from '../../../utils/AppError'

const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashed_password'
}

describe('requestPasswordReset', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deve lançar erro se email não for fornecido', async () => {
    await expect(requestPasswordReset('')).rejects.toThrow(AppError)
  })

  it('deve lançar erro se usuário não existir', async () => {
    mockFindUnique.mockResolvedValue(null)
    await expect(requestPasswordReset('naoexiste@example.com')).rejects.toThrow('User with this email does not exist')
  })

  it('deve criar token e enviar e-mail com sucesso', async () => {
    mockFindUnique.mockResolvedValue(mockUser)
    mockCreateToken.mockResolvedValue({})

    await requestPasswordReset(mockUser.email)

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: mockUser.email } })

    expect(mockCreateToken).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          token: expect.any(String),
          userId: mockUser.id,
          expiresAt: expect.any(Date)
        })
      })
    )

    expect(mockSendEmail).toHaveBeenCalledWith(
      mockUser.email,
      expect.stringContaining('Redefinição'),
      expect.stringContaining('Clique aqui para redefinir')
    )
  })
})


it('deve gerar um token com 64 caracteres', async () => {
  mockFindUnique.mockResolvedValue(mockUser)
  mockCreateToken.mockResolvedValue({})

  await requestPasswordReset(mockUser.email)

  const calledWith = mockCreateToken.mock.calls[0][0]
  expect(calledWith.data.token).toHaveLength(64)
})

it('deve definir expiresAt para cerca de 1 hora no futuro', async () => {
  mockFindUnique.mockResolvedValue(mockUser)
  mockCreateToken.mockResolvedValue({})

  const now = Date.now()
  jest.useFakeTimers().setSystemTime(now)

  await requestPasswordReset(mockUser.email)

  const expiresAt = mockCreateToken.mock.calls[0][0].data.expiresAt
  const diff = expiresAt.getTime() - now
  expect(diff).toBeGreaterThanOrEqual(3599000) // ~59m59s
  expect(diff).toBeLessThanOrEqual(3601000)    // ~60m1s

  jest.useRealTimers()
})

it('deve lançar erro se envio de e-mail falhar', async () => {
  mockFindUnique.mockResolvedValue(mockUser)
  mockCreateToken.mockResolvedValue({})
  mockSendEmail.mockRejectedValue(new Error('SMTP error'))

  await expect(requestPasswordReset(mockUser.email)).rejects.toThrow('SMTP error')
})

it('deve lançar erro se token já existir para o usuário', async () => {
  mockFindUnique.mockResolvedValue(mockUser)
  mockCreateToken.mockRejectedValue(new Error('Token already exists'))

  await expect(requestPasswordReset(mockUser.email)).rejects.toThrow('Token already exists')
})

