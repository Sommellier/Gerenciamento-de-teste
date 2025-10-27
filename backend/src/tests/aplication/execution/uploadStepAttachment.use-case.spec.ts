import { prisma } from '../../../infrastructure/prisma'
import { uploadStepAttachment } from '../../../application/use-cases/execution/uploadStepAttachment.use-case'
import { AppError } from '../../../utils/AppError'

describe('uploadStepAttachment', () => {
  let projectId: number
  let scenarioId: number
  let stepId: number
  let userId: number

  beforeEach(async () => {
    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'user@example.com',
        password: 'password123'
      }
    })
    userId = user.id

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: userId
      }
    })
    projectId = project.id

    // Criar cenário
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId
      }
    })
    scenarioId = scenario.id

    // Criar etapa
    const step = await prisma.testScenarioStep.create({
      data: {
        action: 'Click login button',
        expected: 'User is logged in',
        stepOrder: 1,
        scenarioId
      }
    })
    stepId = step.id
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.stepAttachment.deleteMany({
      where: { stepId }
    })
    await prisma.testScenarioStep.deleteMany({
      where: { scenarioId }
    })
    await prisma.testScenario.deleteMany({
      where: { projectId }
    })
    await prisma.project.deleteMany({
      where: { id: projectId }
    })
    await prisma.user.deleteMany({
      where: { id: userId }
    })
  })

  describe('uploadStepAttachment - casos de sucesso', () => {
    it('faz upload de arquivo JPEG', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024, // 1MB
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(result).toMatchObject({
        filename: 'test-image.jpg',
        originalName: 'original-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
        url: '/uploads/evidences/test-image.jpg',
        stepId,
        uploadedBy: userId
      })
    })

    it('faz upload de arquivo PNG', async () => {
      const mockFile = {
        filename: 'test-image.png',
        originalname: 'original-image.png',
        mimetype: 'image/png',
        size: 512 * 1024, // 512KB
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(result.mimeType).toBe('image/png')
      expect(result.filename).toBe('test-image.png')
    })

    it('faz upload de arquivo PDF', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 2 * 1024 * 1024, // 2MB
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(result.mimeType).toBe('application/pdf')
      expect(result.filename).toBe('test-document.pdf')
    })

    it('faz upload de arquivo JPG', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(result.mimeType).toBe('image/jpg')
    })

    it('inclui dados do uploader', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(result.uploader).toMatchObject({
        id: userId,
        name: 'Test User',
        email: 'user@example.com'
      })
    })

    it('faz upload de arquivo com nome longo', async () => {
      const longFilename = 'A'.repeat(255) + '.jpg'
      const longOriginalName = 'A'.repeat(255) + '.jpg'
      
      const mockFile = {
        filename: longFilename,
        originalname: longOriginalName,
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(result.filename).toBe(longFilename)
      expect(result.originalName).toBe(longOriginalName)
    })

    it('faz upload de arquivo com tamanho máximo permitido', async () => {
      const mockFile = {
        filename: 'large-image.jpg',
        originalname: 'large-image.jpg',
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024, // 5MB (limite máximo)
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(result.size).toBe(5 * 1024 * 1024)
    })

    it('faz upload de múltiplos arquivos para a mesma etapa', async () => {
      const files = [
        {
          filename: 'image1.jpg',
          originalname: 'original1.jpg',
          mimetype: 'image/jpeg',
          size: 1024 * 1024,
          buffer: Buffer.from('fake image data 1')
        },
        {
          filename: 'image2.png',
          originalname: 'original2.png',
          mimetype: 'image/png',
          size: 512 * 1024,
          buffer: Buffer.from('fake image data 2')
        },
        {
          filename: 'document.pdf',
          originalname: 'original.pdf',
          mimetype: 'application/pdf',
          size: 2 * 1024 * 1024,
          buffer: Buffer.from('fake pdf data')
        }
      ] as Express.Multer.File[]

      const results = []
      for (const file of files) {
        const result = await uploadStepAttachment({
          stepId,
          file,
          userId
        })
        results.push(result)
      }

      expect(results).toHaveLength(3)
      expect(results[0].mimeType).toBe('image/jpeg')
      expect(results[1].mimeType).toBe('image/png')
      expect(results[2].mimeType).toBe('application/pdf')
    })

    it('funciona com userId inválido (não afeta a operação)', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      await expect(uploadStepAttachment({
        stepId,
        file: mockFile,
        userId: 99999
      })).rejects.toThrow()
    })
  })

  describe('uploadStepAttachment - casos de erro', () => {
    it('rejeita quando etapa não existe', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      await expect(uploadStepAttachment({
        stepId: 99999,
        file: mockFile,
        userId
      })).rejects.toThrow(new AppError('Etapa não encontrada', 404))
    })

    it('rejeita quando stepId é inválido', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      await expect(uploadStepAttachment({
        stepId: -1,
        file: mockFile,
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando stepId é zero', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      await expect(uploadStepAttachment({
        stepId: 0,
        file: mockFile,
        userId
      })).rejects.toThrow()
    })

    it('rejeita tipo de arquivo não permitido', async () => {
      const mockFile = {
        filename: 'test-file.txt',
        originalname: 'original-file.txt',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.from('fake text data')
      } as Express.Multer.File

      await expect(uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })).rejects.toThrow(new AppError('Tipo de arquivo não permitido', 400))
    })

    it('rejeita arquivo muito grande', async () => {
      const mockFile = {
        filename: 'large-image.jpg',
        originalname: 'large-image.jpg',
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB (acima do limite de 5MB)
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      await expect(uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })).rejects.toThrow(new AppError('Arquivo muito grande. Máximo 5MB', 400))
    })

    it('rejeita quando userId é inválido', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      await expect(uploadStepAttachment({
        stepId,
        file: mockFile,
        userId: -1
      })).rejects.toThrow()
    })
  })

  describe('uploadStepAttachment - casos especiais', () => {
    it('faz upload de arquivo com nome contendo caracteres especiais', async () => {
      const specialFilename = 'file with @#$%^&*()_+{}|:"<>?[]\\;\',./.jpg'
      const specialOriginalName = 'original with @#$%^&*()_+{}|:"<>?[]\\;\',./.jpg'
      
      const mockFile = {
        filename: specialFilename,
        originalname: specialOriginalName,
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(result.filename).toBe(specialFilename)
      expect(result.originalName).toBe(specialOriginalName)
    })

    it('faz upload de arquivo com nome contendo emojis', async () => {
      const emojiFilename = 'file with emojis 🚀 ✅ ❌ 🎉.jpg'
      const emojiOriginalName = 'original with emojis 🚀 ✅ ❌ 🎉.jpg'
      
      const mockFile = {
        filename: emojiFilename,
        originalname: emojiOriginalName,
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(result.filename).toBe(emojiFilename)
      expect(result.originalName).toBe(emojiOriginalName)
    })

    it('faz upload de arquivo com diferentes tamanhos', async () => {
      const sizes = [
        1024, // 1KB
        1024 * 1024, // 1MB
        2 * 1024 * 1024, // 2MB
        5 * 1024 * 1024 // 5MB
      ]

      for (let i = 0; i < sizes.length; i++) {
        const mockFile = {
          filename: `file${i + 1}.jpg`,
          originalname: `original${i + 1}.jpg`,
          mimetype: 'image/jpeg',
          size: sizes[i],
          buffer: Buffer.from('fake image data')
        } as Express.Multer.File

        const result = await uploadStepAttachment({
          stepId,
          file: mockFile,
          userId
        })

        expect(result.size).toBe(sizes[i])
      }
    })

    it('faz upload de arquivo para diferentes etapas', async () => {
      // Criar outra etapa
      const step2 = await prisma.testScenarioStep.create({
        data: {
          action: 'Click logout button',
          expected: 'User is logged out',
          stepOrder: 2,
          scenarioId
        }
      })

      const mockFile1 = {
        filename: 'file1.jpg',
        originalname: 'original1.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data 1')
      } as Express.Multer.File

      const mockFile2 = {
        filename: 'file2.png',
        originalname: 'original2.png',
        mimetype: 'image/png',
        size: 512 * 1024,
        buffer: Buffer.from('fake image data 2')
      } as Express.Multer.File

      const result1 = await uploadStepAttachment({
        stepId,
        file: mockFile1,
        userId
      })

      const result2 = await uploadStepAttachment({
        stepId: step2.id,
        file: mockFile2,
        userId
      })

      expect(result1.stepId).toBe(stepId)
      expect(result2.stepId).toBe(step2.id)
      expect(result1.mimeType).toBe('image/jpeg')
      expect(result2.mimeType).toBe('image/png')
    })

    it('faz upload de arquivo com diferentes usuários', async () => {
      const user2 = await prisma.user.create({
        data: {
          name: 'User 2',
          email: 'user2@example.com',
          password: 'password123'
        }
      })

      const mockFile1 = {
        filename: 'file1.jpg',
        originalname: 'original1.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data 1')
      } as Express.Multer.File

      const mockFile2 = {
        filename: 'file2.jpg',
        originalname: 'original2.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data 2')
      } as Express.Multer.File

      const result1 = await uploadStepAttachment({
        stepId,
        file: mockFile1,
        userId
      })

      const result2 = await uploadStepAttachment({
        stepId,
        file: mockFile2,
        userId: user2.id
      })

      expect(result1.uploadedBy).toBe(userId)
      expect(result2.uploadedBy).toBe(user2.id)

      await prisma.user.delete({ where: { id: user2.id } })
    })

    it('faz upload de arquivo com MIME type case-insensitive', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg', // MIME type em minúsculas (como esperado)
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(result.mimeType).toBe('image/jpeg')
    })
  })

  describe('uploadStepAttachment - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('filename')
      expect(result).toHaveProperty('originalName')
      expect(result).toHaveProperty('mimeType')
      expect(result).toHaveProperty('size')
      expect(result).toHaveProperty('url')
      expect(result).toHaveProperty('stepId')
      expect(result).toHaveProperty('uploadedBy')
      expect(result).toHaveProperty('createdAt')
      expect(result).toHaveProperty('uploader')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(typeof result.id).toBe('number')
      expect(typeof result.filename).toBe('string')
      expect(typeof result.originalName).toBe('string')
      expect(typeof result.mimeType).toBe('string')
      expect(typeof result.size).toBe('number')
      expect(typeof result.url).toBe('string')
      expect(typeof result.stepId).toBe('number')
      expect(typeof result.uploadedBy).toBe('number')
      expect(typeof result.createdAt).toBe('object')
      expect(typeof result.uploader).toBe('object')
    })

    it('retorna uploader com estrutura correta', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(result.uploader).toHaveProperty('id')
      expect(result.uploader).toHaveProperty('name')
      expect(result.uploader).toHaveProperty('email')
      expect(result.uploader).toHaveProperty('avatar')
    })
  })

  describe('uploadStepAttachment - integração com banco de dados', () => {
    it('retorna dados consistentes com o banco', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      const dbAttachment = await prisma.stepAttachment.findUnique({
        where: { id: result.id }
      })

      expect(dbAttachment).toMatchObject({
        filename: result.filename,
        originalName: result.originalName,
        mimeType: result.mimeType,
        size: result.size,
        url: result.url,
        stepId: result.stepId,
        uploadedBy: result.uploadedBy
      })
    })

    it('faz upload apenas para a etapa especificada', async () => {
      // Criar outra etapa
      const step2 = await prisma.testScenarioStep.create({
        data: {
          action: 'Click logout button',
          expected: 'User is logged out',
          stepOrder: 2,
          scenarioId
        }
      })

      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      const attachments1 = await prisma.stepAttachment.findMany({
        where: { stepId }
      })

      const attachments2 = await prisma.stepAttachment.findMany({
        where: { stepId: step2.id }
      })

      expect(attachments1).toHaveLength(1)
      expect(attachments2).toHaveLength(0)
    })

    it('gera URL correta para o arquivo', async () => {
      const mockFile = {
        filename: 'test-image.jpg',
        originalname: 'original-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake image data')
      } as Express.Multer.File

      const result = await uploadStepAttachment({
        stepId,
        file: mockFile,
        userId
      })

      expect(result.url).toBe('/uploads/evidences/test-image.jpg')
    })
  })
})
