import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { AppError } from '../../../utils/AppError'
import { hashPassword } from '../../../utils/hash.util'

// Mock das dependências
jest.mock('../../../utils/hash.util')

const mockedHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>

describe('createUser', () => {
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

  describe('createUser - casos de sucesso', () => {
    it('cria usuário com dados válidos', async () => {
      const hashedPassword = 'hashed_password_123'
      mockedHashPassword.mockResolvedValue(hashedPassword)

      const result = await createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result).toMatchObject({
        name: 'Test User',
        email: 'test@example.com'
      })
      expect(result).not.toHaveProperty('password')
      expect(result.id).toBeDefined()

      expect(mockedHashPassword).toHaveBeenCalledWith('password123')

      // Verificar se usuário foi criado no banco
      const createdUser = await prisma.user.findUnique({
        where: { email: 'test@example.com' }
      })

      expect(createdUser).toBeTruthy()
      expect(createdUser?.name).toBe('Test User')
      expect(createdUser?.password).toBe(hashedPassword)
    })

    it('normaliza nome removendo espaços extras', async () => {
      const hashedPassword = 'hashed_password_123'
      mockedHashPassword.mockResolvedValue(hashedPassword)

      const result = await createUser({
        name: '  Test User  ',
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result.name).toBe('Test User')
    })

    it('normaliza email para lowercase', async () => {
      const hashedPassword = 'hashed_password_123'
      mockedHashPassword.mockResolvedValue(hashedPassword)

      const result = await createUser({
        name: 'Test User',
        email: 'TEST@EXAMPLE.COM',
        password: 'password123'
      })

      expect(result.email).toBe('test@example.com')
    })

    it('aceita nome com caracteres especiais válidos', async () => {
      const hashedPassword = 'hashed_password_123'
      mockedHashPassword.mockResolvedValue(hashedPassword)

      const result = await createUser({
        name: 'João da Silva',
        email: 'joao@example.com',
        password: 'password123'
      })

      expect(result.name).toBe('João da Silva')
    })

    it('aceita email com caracteres especiais', async () => {
      const hashedPassword = 'hashed_password_123'
      mockedHashPassword.mockResolvedValue(hashedPassword)

      const result = await createUser({
        name: 'Test User',
        email: 'user.name+tag@example-domain.co.uk',
        password: 'password123'
      })

      expect(result.email).toBe('user.name+tag@example-domain.co.uk')
    })

    it('aceita senha com caracteres especiais', async () => {
      const hashedPassword = 'hashed_password_123'
      mockedHashPassword.mockResolvedValue(hashedPassword)

      const result = await createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!@#'
      })

      expect(mockedHashPassword).toHaveBeenCalledWith('Password123!@#')
    })

    it('aceita senha com espaços', async () => {
      const hashedPassword = 'hashed_password_123'
      mockedHashPassword.mockResolvedValue(hashedPassword)

      const result = await createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'my password 123'
      })

      expect(mockedHashPassword).toHaveBeenCalledWith('my password 123')
    })
  })

  describe('createUser - casos de erro', () => {
    it('lança erro quando nome não é fornecido', async () => {
      await expect(createUser({
        name: '',
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando email não é fornecido', async () => {
      await expect(createUser({
        name: 'Test User',
        email: '',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando senha não é fornecida', async () => {
      await expect(createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: ''
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando todos os campos são vazios', async () => {
      await expect(createUser({
        name: '',
        email: '',
        password: ''
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando nome é muito curto', async () => {
      await expect(createUser({
        name: 'A',
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando nome contém caracteres inválidos', async () => {
      await expect(createUser({
        name: 'John123',
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando nome contém símbolos', async () => {
      await expect(createUser({
        name: 'John@Doe',
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando email tem formato inválido', async () => {
      await expect(createUser({
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando email tem formato inválido (sem @)', async () => {
      await expect(createUser({
        name: 'Test User',
        email: 'testexample.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando email tem formato inválido (sem domínio)', async () => {
      await expect(createUser({
        name: 'Test User',
        email: 'test@',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando senha é muito curta', async () => {
      await expect(createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: '123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando email já existe', async () => {
      const hashedPassword = 'hashed_password_123'
      mockedHashPassword.mockResolvedValue(hashedPassword)

      // Criar primeiro usuário
      await createUser({
        name: 'First User',
        email: 'test@example.com',
        password: 'password123'
      })

      // Tentar criar segundo usuário com mesmo email
      await expect(createUser({
        name: 'Second User',
        email: 'test@example.com',
        password: 'password456'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando email já existe (case insensitive)', async () => {
      const hashedPassword = 'hashed_password_123'
      mockedHashPassword.mockResolvedValue(hashedPassword)

      // Criar primeiro usuário
      await createUser({
        name: 'First User',
        email: 'test@example.com',
        password: 'password123'
      })

      // Tentar criar segundo usuário com mesmo email em maiúsculas
      await expect(createUser({
        name: 'Second User',
        email: 'TEST@EXAMPLE.COM',
        password: 'password456'
      })).rejects.toThrow(AppError)
    })
  })

  describe('createUser - validações específicas', () => {
    it('aceita nome com acentos e cedilhas', async () => {
      const hashedPassword = 'hashed_password_123'
      mockedHashPassword.mockResolvedValue(hashedPassword)

      const result = await createUser({
        name: 'José da Conceição',
        email: 'jose@example.com',
        password: 'password123'
      })

      expect(result.name).toBe('José da Conceição')
    })

    it('aceita nome com hífens', async () => {
      const hashedPassword = 'hashed_password_123'
      mockedHashPassword.mockResolvedValue(hashedPassword)

      const result = await createUser({
        name: 'Maria-José Silva',
        email: 'maria@example.com',
        password: 'password123'
      })

      expect(result.name).toBe('Maria-José Silva')
    })

    it('rejeita nome com números', async () => {
      await expect(createUser({
        name: 'John123',
        email: 'john@example.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('rejeita email com espaços', async () => {
      await expect(createUser({
        name: 'Test User',
        email: 'test @example.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('rejeita email com múltiplos @', async () => {
      await expect(createUser({
        name: 'Test User',
        email: 'test@@example.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })
  })

  describe('createUser - falha no hash', () => {
    it('não cria usuário se hash falhar', async () => {
      mockedHashPassword.mockRejectedValue(new Error('Hash service unavailable'))

      await expect(createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow('Hash service unavailable')

      // Verificar se usuário não foi criado
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' }
      })

      expect(user).toBeNull()
    })
  })

  describe('createUser - campos obrigatórios', () => {
    it('lança erro quando nome é null', async () => {
      await expect(createUser({
        name: null as any,
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando email é null', async () => {
      await expect(createUser({
        name: 'Test User',
        email: null as any,
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando senha é null', async () => {
      await expect(createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: null as any
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando nome é undefined', async () => {
      await expect(createUser({
        name: undefined as any,
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando email é undefined', async () => {
      await expect(createUser({
        name: 'Test User',
        email: undefined as any,
        password: 'password123'
      })).rejects.toThrow(AppError)
    })

    it('lança erro quando senha é undefined', async () => {
      await expect(createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: undefined as any
      })).rejects.toThrow(AppError)
    })
  })
})
