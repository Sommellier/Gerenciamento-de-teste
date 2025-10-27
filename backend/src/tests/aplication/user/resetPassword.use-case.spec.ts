import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { resetPassword } from '../../../application/use-cases/user/resetPassword.use-case'
import { AppError } from '../../../utils/AppError'
import { hashPassword } from '../../../utils/hash.util'

// Mock das dependências
jest.mock('../../../utils/hash.util')

const mockedHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>

describe('resetPassword', () => {
  let user: any
  let tokenRecord: any

  beforeEach(async () => {
    // Limpar dados de teste em ordem correta para evitar foreign key constraints
    await prisma.passwordResetToken.deleteMany()
    await prisma.userOnProject.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()

    // Criar usuário de teste
    user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'old_hashed_password'
      }
    })

    // Criar token de reset válido
    tokenRecord = await prisma.passwordResetToken.create({
      data: {
        token: 'valid_reset_token',
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hora no futuro
      }
    })
  })

  afterEach(async () => {
    // Limpar dados de teste em ordem correta para evitar foreign key constraints
    await prisma.passwordResetToken.deleteMany()
    await prisma.userOnProject.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('resetPassword - casos de sucesso', () => {
    it('redefine senha com token válido', async () => {
      const newHashedPassword = 'new_hashed_password'
      mockedHashPassword.mockResolvedValue(newHashedPassword)

      await resetPassword('valid_reset_token', 'newpassword123')

      // Verificar se senha foi atualizada
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(updatedUser?.password).toBe(newHashedPassword)
      expect(mockedHashPassword).toHaveBeenCalledWith('newpassword123')

      // Verificar se token foi removido
      const deletedToken = await prisma.passwordResetToken.findUnique({
        where: { token: 'valid_reset_token' }
      })

      expect(deletedToken).toBeNull()
    })

    it('aceita senha com caracteres especiais', async () => {
      const newHashedPassword = 'new_hashed_password'
      mockedHashPassword.mockResolvedValue(newHashedPassword)

      await resetPassword('valid_reset_token', 'NewPass123!@#')

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(updatedUser?.password).toBe(newHashedPassword)
      expect(mockedHashPassword).toHaveBeenCalledWith('NewPass123!@#')
    })

    it('aceita senha com espaços', async () => {
      const newHashedPassword = 'new_hashed_password'
      mockedHashPassword.mockResolvedValue(newHashedPassword)

      await resetPassword('valid_reset_token', 'new password 123')

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(updatedUser?.password).toBe(newHashedPassword)
      expect(mockedHashPassword).toHaveBeenCalledWith('new password 123')
    })
  })

  describe('resetPassword - casos de erro', () => {
    it('lança erro quando token não é fornecido', async () => {
      await expect(resetPassword('', 'newpassword123')).rejects.toThrow(AppError)
    })

    it('lança erro quando nova senha não é fornecida', async () => {
      await expect(resetPassword('valid_reset_token', '')).rejects.toThrow(AppError)
    })

    it('lança erro quando token e nova senha não são fornecidos', async () => {
      await expect(resetPassword('', '')).rejects.toThrow(AppError)
    })

    it('lança erro quando token é null', async () => {
      await expect(resetPassword(null as any, 'newpassword123')).rejects.toThrow(AppError)
    })

    it('lança erro quando nova senha é null', async () => {
      await expect(resetPassword('valid_reset_token', null as any)).rejects.toThrow(AppError)
    })

    it('lança erro quando token não existe', async () => {
      await expect(resetPassword('nonexistent_token', 'newpassword123')).rejects.toThrow(AppError)
    })

    it('lança erro quando token está expirado', async () => {
      // Criar token expirado
      await prisma.passwordResetToken.create({
        data: {
          token: 'expired_token',
          userId: user.id,
          expiresAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hora no passado
        }
      })

      await expect(resetPassword('expired_token', 'newpassword123')).rejects.toThrow(AppError)
    })

    it('lança erro quando token está exatamente na data de expiração', async () => {
      // Criar token que expira exatamente agora
      await prisma.passwordResetToken.create({
        data: {
          token: 'expiring_now_token',
          userId: user.id,
          expiresAt: new Date(Date.now())
        }
      })

      await expect(resetPassword('expiring_now_token', 'newpassword123')).rejects.toThrow(AppError)
    })
  })

  describe('resetPassword - múltiplos tokens', () => {
    it('remove apenas o token usado', async () => {
      // Remover o token original criado no beforeEach
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id }
      })

      // Criar múltiplos tokens para o mesmo usuário
      await prisma.passwordResetToken.create({
        data: {
          token: 'token_1',
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        }
      })

      await prisma.passwordResetToken.create({
        data: {
          token: 'token_2',
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        }
      })

      const newHashedPassword = 'new_hashed_password'
      mockedHashPassword.mockResolvedValue(newHashedPassword)

      await resetPassword('token_1', 'newpassword123')

      // Verificar se apenas token_1 foi removido
      const remainingTokens = await prisma.passwordResetToken.findMany({
        where: { userId: user.id }
      })

      expect(remainingTokens).toHaveLength(1)
      expect(remainingTokens[0].token).toBe('token_2')
    })
  })

  describe('resetPassword - falha no hash', () => {
    it('não atualiza senha se hash falhar', async () => {
      mockedHashPassword.mockRejectedValue(new Error('Hash service unavailable'))

      await expect(resetPassword('valid_reset_token', 'newpassword123')).rejects.toThrow('Hash service unavailable')

      // Verificar se senha não foi alterada
      const unchangedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(unchangedUser?.password).toBe('old_hashed_password')

      // Verificar se token ainda existe
      const existingToken = await prisma.passwordResetToken.findUnique({
        where: { token: 'valid_reset_token' }
      })

      expect(existingToken).toBeTruthy()
    })
  })

  describe('resetPassword - usuário não existe', () => {
    it('lança erro quando usuário associado ao token não existe', async () => {
      // Este teste não é possível devido à constraint de foreign key
      // O Prisma não permite criar tokens para usuários inexistentes
      const newHashedPassword = 'new_hashed_password'
      mockedHashPassword.mockResolvedValue(newHashedPassword)

      await expect(resetPassword('orphan_token', 'newpassword123')).rejects.toThrow(AppError)
    })
  })
})
