import { prisma } from '../../../infrastructure/prisma'
import { uploadAvatar } from '../../../application/use-cases/upload/uploadAvatar.use-case'
import { AppError } from '../../../utils/AppError'

// Mock do módulo fs
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    mkdir: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn()
  },
  existsSync: jest.fn(() => true)
}))

// Importar após os mocks
const { promises: fs } = require('fs')

const mockFs = fs as jest.Mocked<typeof fs>

describe('uploadAvatar', () => {
  let userId: number
  let tempFilePath: string

  beforeEach(async () => {
    // Criar usuário de teste
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      }
    })
    userId = user.id

    // Configurar caminhos de teste
    tempFilePath = '/tmp/test-avatar.jpg'

    // Resetar mocks
    jest.clearAllMocks()
    
    // Configurar mocks padrão
    mockFs.stat.mockResolvedValue({ size: 1024 * 1024 } as any) // 1MB
    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.rename.mockResolvedValue(undefined)
    mockFs.unlink.mockResolvedValue(undefined)
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.user.deleteMany({
      where: {
        email: 'test@example.com'
      }
    })
  })

  describe('uploadAvatar - casos de erro', () => {
    it('rejeita quando usuário não existe', async () => {
      await expect(uploadAvatar({
        userId: 99999,
        filePath: tempFilePath,
        originalName: 'avatar.jpg'
      })).rejects.toMatchObject({
        status: 404,
        message: 'Usuário não encontrado'
      })
    })

    it('rejeita quando userId é inválido', async () => {
      await expect(uploadAvatar({
        userId: NaN,
        filePath: tempFilePath,
        originalName: 'avatar.jpg'
      })).rejects.toThrow() // PrismaClientValidationError
    })

    it('rejeita quando userId é negativo', async () => {
      await expect(uploadAvatar({
        userId: -1,
        filePath: tempFilePath,
        originalName: 'avatar.jpg'
      })).rejects.toThrow() // PrismaClientValidationError
    })

    it('rejeita quando userId é undefined', async () => {
      await expect(uploadAvatar({
        userId: undefined as any,
        filePath: tempFilePath,
        originalName: 'avatar.jpg'
      })).rejects.toThrow() // PrismaClientValidationError
    })

    it('rejeita quando userId é null', async () => {
      await expect(uploadAvatar({
        userId: null as any,
        filePath: tempFilePath,
        originalName: 'avatar.jpg'
      })).rejects.toThrow() // PrismaClientValidationError
    })

    it('rejeita formato de arquivo não suportado', async () => {
      await expect(uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'avatar.bmp'
      })).rejects.toMatchObject({
        status: 400,
        message: 'Formato de arquivo não suportado. Use JPG, PNG, GIF ou WEBP'
      })
    })

    it('rejeita formato de arquivo sem extensão', async () => {
      await expect(uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'avatar'
      })).rejects.toMatchObject({
        status: 400,
        message: 'Formato de arquivo não suportado. Use JPG, PNG, GIF ou WEBP'
      })
    })

    it('rejeita arquivo muito grande', async () => {
      mockFs.stat.mockResolvedValue({ size: 6 * 1024 * 1024 }) // 6MB

      await expect(uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'large_avatar.jpg'
      })).rejects.toMatchObject({
        status: 400,
        message: 'Arquivo muito grande. Tamanho máximo permitido: 5MB'
      })
    })

    it('rejeita quando arquivo não existe', async () => {
      mockFs.stat.mockRejectedValue(new Error('File not found'))

      await expect(uploadAvatar({
        userId,
        filePath: 'non/existent/file.jpg',
        originalName: 'avatar.jpg'
      })).rejects.toThrow('File not found')
    })

    it('rejeita quando não consegue criar diretório', async () => {
      mockFs.stat.mockResolvedValue({ size: 1024 * 1024 })
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'))

      await expect(uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'avatar.jpg'
      })).rejects.toThrow('Permission denied')
    })

    it('rejeita quando não consegue mover arquivo', async () => {
      mockFs.stat.mockResolvedValue({ size: 1024 * 1024 })
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.rename.mockRejectedValue(new Error('Move failed'))

      await expect(uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'avatar.jpg'
      })).rejects.toThrow('Move failed')
    })
  })

  describe('uploadAvatar - casos de sucesso básicos', () => {
    it('faz upload de avatar com sucesso', async () => {
      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'my_avatar.jpg'
      })

      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('avatarUrl')
      expect(result.avatarUrl).toMatch(/^\/uploads\/avatars\/avatar_\d+_\d+_[a-z0-9]+\.jpg$/)
      expect(mockFs.mkdir).toHaveBeenCalled()
      expect(mockFs.rename).toHaveBeenCalled()
      
      // Verificar se o usuário foi atualizado no banco
      const updatedUser = await prisma.user.findUnique({ where: { id: userId } })
      expect(updatedUser?.avatar).toBe(result.avatarUrl)
    })

    it('faz upload de avatar PNG', async () => {
      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'my_avatar.png'
      })

      expect(result.avatarUrl).toMatch(/\.png$/)
    })

    it('faz upload de avatar GIF', async () => {
      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'my_avatar.gif'
      })

      expect(result.avatarUrl).toMatch(/\.gif$/)
    })

    it('faz upload de avatar WEBP', async () => {
      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'my_avatar.webp'
      })

      expect(result.avatarUrl).toMatch(/\.webp$/)
    })

    it('faz upload de avatar JPEG', async () => {
      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'my_avatar.jpeg'
      })

      expect(result.avatarUrl).toMatch(/\.jpeg$/)
    })

    it('faz upload de avatar com arquivo pequeno', async () => {
      mockFs.stat.mockResolvedValue({ size: 100 * 1024 }) // 100KB

      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'small_avatar.jpg'
      })

      expect(result.avatarUrl).toMatch(/^\/uploads\/avatars\/avatar_\d+_\d+_[a-z0-9]+\.jpg$/)
    })

    it('faz upload de avatar com arquivo de tamanho limite', async () => {
      mockFs.stat.mockResolvedValue({ size: 5 * 1024 * 1024 }) // 5MB

      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'limit_avatar.jpg'
      })

      expect(result.avatarUrl).toMatch(/^\/uploads\/avatars\/avatar_\d+_\d+_[a-z0-9]+\.jpg$/)
    })
  })

  describe('uploadAvatar - casos especiais', () => {
    it('funciona com usuário que já tem avatar', async () => {
      const existingAvatarUrl = '/uploads/avatars/old_avatar.jpg'
      await prisma.user.update({
        where: { id: userId },
        data: { avatar: existingAvatarUrl }
      })

      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'new_avatar.jpg'
      })

      expect(mockFs.unlink).toHaveBeenCalled()
      expect(result.avatarUrl).not.toBe(existingAvatarUrl)
    })

    it('funciona com usuário sem avatar anterior', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { avatar: null }
      })

      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'new_avatar.jpg'
      })

      expect(mockFs.unlink).not.toHaveBeenCalled()
      expect(result.avatarUrl).toMatch(/^\/uploads\/avatars\/avatar_\d+_\d+_[a-z0-9]+\.jpg$/)
    })

    it('ignora erro ao remover avatar anterior inexistente', async () => {
      const existingAvatarUrl = '/uploads/avatars/old_avatar.jpg'
      await prisma.user.update({
        where: { id: userId },
        data: { avatar: existingAvatarUrl }
      })

      mockFs.unlink.mockRejectedValue(new Error('File not found')) // Simulate old avatar not existing

      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'new_avatar.jpg'
      })

      expect(mockFs.unlink).toHaveBeenCalled()
      expect(result.avatarUrl).not.toBe(existingAvatarUrl)
    })
  })

  describe('uploadAvatar - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'avatar.jpg'
      })

      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('avatarUrl')
      expect(result.user).toHaveProperty('id')
      expect(result.user).toHaveProperty('name')
      expect(result.user).toHaveProperty('email')
      expect(result.user).toHaveProperty('avatar')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'avatar.jpg'
      })

      expect(typeof result.user.id).toBe('number')
      expect(typeof result.user.name).toBe('string')
      expect(typeof result.user.email).toBe('string')
      expect(typeof result.user.avatar).toBe('string')
      expect(typeof result.avatarUrl).toBe('string')
    })

    it('retorna avatarUrl com formato correto', async () => {
      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'avatar.jpg'
      })

      expect(result.avatarUrl).toMatch(/^\/uploads\/avatars\/avatar_\d+_\d+_[a-z0-9]+\.jpg$/)
    })

    it('retorna usuário atualizado com nova URL do avatar', async () => {
      const result = await uploadAvatar({
        userId,
        filePath: tempFilePath,
        originalName: 'avatar.jpg'
      })

      const updatedUserInDb = await prisma.user.findUnique({ where: { id: userId } })
      expect(updatedUserInDb?.avatar).toBe(result.avatarUrl)
    })
  })
})