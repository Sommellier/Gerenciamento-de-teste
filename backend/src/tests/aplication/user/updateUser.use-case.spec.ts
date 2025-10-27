import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { updateUser } from '../../../application/use-cases/user/updateUser.use-case'
import { AppError } from '../../../utils/AppError'
import { hashPassword } from '../../../utils/hash.util'

// Mock das dependências
jest.mock('../../../utils/hash.util')

const mockedHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>

describe('updateUser', () => {
  let user: any

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
        password: 'hashed_password',
        avatar: null
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

  describe('updateUser - casos de sucesso', () => {
    it('atualiza nome do usuário', async () => {
      const result = await updateUser(user.id.toString(), {
        name: 'Updated Name'
      })

      expect(result.name).toBe('Updated Name')
      expect(result.email).toBe('test@example.com')
      expect(result).not.toHaveProperty('password')

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })
      expect(updatedUser?.name).toBe('Updated Name')
    })

    it('atualiza email do usuário', async () => {
      const result = await updateUser(user.id.toString(), {
        email: 'updated@example.com'
      })

      expect(result.email).toBe('updated@example.com')
      expect(result.name).toBe('Test User')

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })
      expect(updatedUser?.email).toBe('updated@example.com')
    })

    it('atualiza senha do usuário', async () => {
      const newHashedPassword = 'new_hashed_password'
      mockedHashPassword.mockResolvedValue(newHashedPassword)

      const result = await updateUser(user.id.toString(), {
        password: 'newpassword123'
      })

      expect(result).not.toHaveProperty('password')
      expect(mockedHashPassword).toHaveBeenCalledWith('newpassword123')

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })
      expect(updatedUser?.password).toBe(newHashedPassword)
    })

    it('atualiza avatar do usuário', async () => {
      const result = await updateUser(user.id.toString(), {
        avatar: 'https://example.com/avatar.jpg'
      })

      expect(result.avatar).toBe('https://example.com/avatar.jpg')

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })
      expect(updatedUser?.avatar).toBe('https://example.com/avatar.jpg')
    })

    it('atualiza múltiplos campos simultaneamente', async () => {
      const newHashedPassword = 'new_hashed_password'
      mockedHashPassword.mockResolvedValue(newHashedPassword)

      const result = await updateUser(user.id.toString(), {
        name: 'New Name',
        email: 'newemail@example.com',
        password: 'newpassword123',
        avatar: 'https://example.com/new-avatar.jpg'
      })

      expect(result.name).toBe('New Name')
      expect(result.email).toBe('newemail@example.com')
      expect(result.avatar).toBe('https://example.com/new-avatar.jpg')
      expect(result).not.toHaveProperty('password')

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })
      expect(updatedUser?.name).toBe('New Name')
      expect(updatedUser?.email).toBe('newemail@example.com')
      expect(updatedUser?.password).toBe(newHashedPassword)
      expect(updatedUser?.avatar).toBe('https://example.com/new-avatar.jpg')
    })

    it('normaliza nome removendo espaços extras', async () => {
      const result = await updateUser(user.id.toString(), {
        name: '  Updated Name  '
      })

      expect(result.name).toBe('Updated Name')
    })

    it('normaliza email para lowercase', async () => {
      const result = await updateUser(user.id.toString(), {
        email: 'UPDATED@EXAMPLE.COM'
      })

      expect(result.email).toBe('updated@example.com')
    })

    it('aceita nome com caracteres especiais válidos', async () => {
      const result = await updateUser(user.id.toString(), {
        name: 'João da Silva'
      })

      expect(result.name).toBe('João da Silva')
    })

    it('aceita email com caracteres especiais', async () => {
      const result = await updateUser(user.id.toString(), {
        email: 'user.name+tag@example-domain.co.uk'
      })

      expect(result.email).toBe('user.name+tag@example-domain.co.uk')
    })

    it('permite definir avatar como null', async () => {
      const result = await updateUser(user.id.toString(), {
        avatar: null
      })

      expect(result.avatar).toBeNull()
    })
  })

  describe('updateUser - casos de erro', () => {
    it('lança erro quando userId é inválido', async () => {
      await expect(updateUser('invalid', { name: 'New Name' })).rejects.toThrow(AppError)
    })

    it('lança erro quando userId é NaN', async () => {
      await expect(updateUser('abc', { name: 'New Name' })).rejects.toThrow(AppError)
    })

    it('lança erro quando usuário não existe', async () => {
      await expect(updateUser('99999', { name: 'New Name' })).rejects.toThrow(AppError)
    })

    it('lança erro quando nome é muito curto', async () => {
      await expect(updateUser(user.id.toString(), { name: 'A' })).rejects.toThrow(AppError)
    })

    it('lança erro quando nome contém caracteres inválidos', async () => {
      await expect(updateUser(user.id.toString(), { name: 'John123' })).rejects.toThrow(AppError)
    })

    it('lança erro quando nome contém símbolos', async () => {
      await expect(updateUser(user.id.toString(), { name: 'John@Doe' })).rejects.toThrow(AppError)
    })

    it('lança erro quando email tem formato inválido', async () => {
      await expect(updateUser(user.id.toString(), { email: 'invalid-email' })).rejects.toThrow(AppError)
    })

    it('lança erro quando email já existe para outro usuário', async () => {
      // Criar outro usuário
      await prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other@example.com',
          password: 'hashed_password'
        }
      })

      await expect(updateUser(user.id.toString(), { email: 'other@example.com' })).rejects.toThrow(AppError)
    })

    it('lança erro quando senha é muito curta', async () => {
      await expect(updateUser(user.id.toString(), { password: '123' })).rejects.toThrow(AppError)
    })

    it('permite atualizar email para o mesmo email atual', async () => {
      const result = await updateUser(user.id.toString(), {
        email: 'test@example.com'
      })

      expect(result.email).toBe('test@example.com')
    })
  })

  describe('updateUser - validações específicas', () => {
    it('aceita nome com acentos e cedilhas', async () => {
      const result = await updateUser(user.id.toString(), {
        name: 'José da Conceição'
      })

      expect(result.name).toBe('José da Conceição')
    })

    it('aceita nome com hífens', async () => {
      const result = await updateUser(user.id.toString(), {
        name: 'Maria-José Silva'
      })

      expect(result.name).toBe('Maria-José Silva')
    })

    it('rejeita nome com números', async () => {
      await expect(updateUser(user.id.toString(), { name: 'John123' })).rejects.toThrow(AppError)
    })

    it('rejeita email com espaços', async () => {
      await expect(updateUser(user.id.toString(), { email: 'test @example.com' })).rejects.toThrow(AppError)
    })

    it('rejeita email com múltiplos @', async () => {
      await expect(updateUser(user.id.toString(), { email: 'test@@example.com' })).rejects.toThrow(AppError)
    })
  })

  describe('updateUser - campos opcionais', () => {
    it('não atualiza campos não fornecidos', async () => {
      const result = await updateUser(user.id.toString(), {
        name: 'Updated Name'
      })

      expect(result.name).toBe('Updated Name')
      expect(result.email).toBe('test@example.com') // Não foi alterado
      expect(result.avatar).toBeNull() // Não foi alterado
    })

    it('permite atualizar apenas avatar', async () => {
      const result = await updateUser(user.id.toString(), {
        avatar: 'https://example.com/avatar.jpg'
      })

      expect(result.name).toBe('Test User') // Não foi alterado
      expect(result.email).toBe('test@example.com') // Não foi alterado
      expect(result.avatar).toBe('https://example.com/avatar.jpg')
    })
  })

  describe('updateUser - falha no hash', () => {
    it('não atualiza senha se hash falhar', async () => {
      mockedHashPassword.mockRejectedValue(new Error('Hash service unavailable'))

      await expect(updateUser(user.id.toString(), { password: 'newpassword123' })).rejects.toThrow('Hash service unavailable')

      // Verificar se senha não foi alterada
      const unchangedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(unchangedUser?.password).toBe('hashed_password')
    })
  })
})
