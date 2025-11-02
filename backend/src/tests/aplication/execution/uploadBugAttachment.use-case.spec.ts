import { prisma } from '../../../infrastructure/prisma'
import { uploadBugAttachment } from '../../../application/use-cases/execution/uploadBugAttachment.use-case'
import { AppError } from '../../../utils/AppError'
import { ScenarioType, Priority, ScenarioStatus } from '@prisma/client'

describe('uploadBugAttachment', () => {
  let projectId: number
  let scenarioId: number
  let bugId: number
  let userId: number

  beforeEach(async () => {
    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `user_${Date.now()}@example.com`,
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
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        status: ScenarioStatus.CREATED,
        projectId
      }
    })
    scenarioId = scenario.id

    // Criar bug
    const bug = await prisma.bug.create({
      data: {
        title: 'Bug de teste',
        description: 'Descrição do bug',
        severity: 'HIGH',
        scenarioId,
        projectId,
        createdBy: userId
      }
    })
    bugId = bug.id
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.bugAttachment.deleteMany({
      where: { bugId }
    })
    await prisma.bug.deleteMany({
      where: {
        scenario: {
          projectId
        }
      }
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

  describe('uploadBugAttachment - casos de sucesso', () => {
    it('faz upload de arquivo PDF', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 2 * 1024 * 1024, // 2MB
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result).toMatchObject({
        filename: 'test-document.pdf',
        originalName: 'original-document.pdf',
        mimeType: 'application/pdf',
        size: 2 * 1024 * 1024,
        url: '/uploads/bug-attachments/test-document.pdf',
        bugId,
        uploadedBy: userId
      })
    })

    it('faz upload de arquivo Word (.docx)', async () => {
      const mockFile = {
        filename: 'test-document.docx',
        originalname: 'original-document.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1 * 1024 * 1024,
        buffer: Buffer.from('fake docx data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      expect(result.filename).toBe('test-document.docx')
    })

    it('faz upload de arquivo Word (.doc)', async () => {
      const mockFile = {
        filename: 'test-document.doc',
        originalname: 'original-document.doc',
        mimetype: 'application/msword',
        size: 1 * 1024 * 1024,
        buffer: Buffer.from('fake doc data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result.mimeType).toBe('application/msword')
      expect(result.filename).toBe('test-document.doc')
    })

    it('faz upload de arquivo PowerPoint (.pptx)', async () => {
      const mockFile = {
        filename: 'test-presentation.pptx',
        originalname: 'original-presentation.pptx',
        mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        size: 3 * 1024 * 1024,
        buffer: Buffer.from('fake pptx data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation')
      expect(result.filename).toBe('test-presentation.pptx')
    })

    it('faz upload de arquivo PowerPoint (.ppt)', async () => {
      const mockFile = {
        filename: 'test-presentation.ppt',
        originalname: 'original-presentation.ppt',
        mimetype: 'application/vnd.ms-powerpoint',
        size: 3 * 1024 * 1024,
        buffer: Buffer.from('fake ppt data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result.mimeType).toBe('application/vnd.ms-powerpoint')
      expect(result.filename).toBe('test-presentation.ppt')
    })

    it('faz upload de arquivo Excel (.xlsx)', async () => {
      const mockFile = {
        filename: 'test-spreadsheet.xlsx',
        originalname: 'original-spreadsheet.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 2 * 1024 * 1024,
        buffer: Buffer.from('fake xlsx data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      expect(result.filename).toBe('test-spreadsheet.xlsx')
    })

    it('faz upload de arquivo Excel (.xls)', async () => {
      const mockFile = {
        filename: 'test-spreadsheet.xls',
        originalname: 'original-spreadsheet.xls',
        mimetype: 'application/vnd.ms-excel',
        size: 2 * 1024 * 1024,
        buffer: Buffer.from('fake xls data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result.mimeType).toBe('application/vnd.ms-excel')
      expect(result.filename).toBe('test-spreadsheet.xls')
    })

    it('inclui dados do uploader', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result.uploader).toMatchObject({
        id: userId,
        name: 'Test User',
        email: expect.stringContaining('@example.com')
      })
    })

    it('faz upload de arquivo com tamanho máximo permitido (10MB)', async () => {
      const mockFile = {
        filename: 'large-document.pdf',
        originalname: 'large-document.pdf',
        mimetype: 'application/pdf',
        size: 10 * 1024 * 1024, // 10MB (limite máximo)
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result.size).toBe(10 * 1024 * 1024)
    })

    it('faz upload de múltiplos arquivos para o mesmo bug', async () => {
      const files = [
        {
          filename: 'document1.pdf',
          originalname: 'original1.pdf',
          mimetype: 'application/pdf',
          size: 1024 * 1024,
          buffer: Buffer.from('fake pdf data 1')
        },
        {
          filename: 'document2.docx',
          originalname: 'original2.docx',
          mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 2 * 1024 * 1024,
          buffer: Buffer.from('fake docx data')
        },
        {
          filename: 'presentation1.pptx',
          originalname: 'original.pptx',
          mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          size: 3 * 1024 * 1024,
          buffer: Buffer.from('fake pptx data')
        }
      ] as Express.Multer.File[]

      const results = []
      for (const file of files) {
        const result = await uploadBugAttachment({
          bugId,
          file,
          userId
        })
        results.push(result)
      }

      expect(results).toHaveLength(3)
      expect(results[0].mimeType).toBe('application/pdf')
      expect(results[1].mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      expect(results[2].mimeType).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation')
    })
  })

  describe('uploadBugAttachment - casos de erro', () => {
    it('rejeita quando bug não existe', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      await expect(uploadBugAttachment({
        bugId: 99999,
        file: mockFile,
        userId
      })).rejects.toThrow(new AppError('Bug não encontrado', 404))
    })

    it('rejeita quando bugId é inválido', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      await expect(uploadBugAttachment({
        bugId: -1,
        file: mockFile,
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando bugId é zero', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      await expect(uploadBugAttachment({
        bugId: 0,
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

      await expect(uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })).rejects.toThrow(new AppError('Tipo de arquivo não permitido. Use PDF, Word, PowerPoint ou Excel', 400))
    })

    it('rejeita arquivo muito grande', async () => {
      const mockFile = {
        filename: 'large-document.pdf',
        originalname: 'large-document.pdf',
        mimetype: 'application/pdf',
        size: 11 * 1024 * 1024, // 11MB (acima do limite de 10MB)
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      await expect(uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })).rejects.toThrow(new AppError('Arquivo muito grande. Máximo 10MB', 400))
    })

    it('rejeita quando userId é inválido', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      await expect(uploadBugAttachment({
        bugId,
        file: mockFile,
        userId: -1
      })).rejects.toThrow()
    })

    it('rejeita quando bugId é null', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      await expect(uploadBugAttachment({
        bugId: null as any,
        file: mockFile,
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando bugId é undefined', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      await expect(uploadBugAttachment({
        bugId: undefined as any,
        file: mockFile,
        userId
      })).rejects.toThrow()
    })
  })

  describe('uploadBugAttachment - casos especiais', () => {
    it('faz upload de arquivo com nome longo', async () => {
      const longFilename = 'A'.repeat(255) + '.pdf'
      const longOriginalName = 'A'.repeat(255) + '.pdf'
      
      const mockFile = {
        filename: longFilename,
        originalname: longOriginalName,
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result.filename).toBe(longFilename)
      expect(result.originalName).toBe(longOriginalName)
    })

    it('faz upload de arquivo com nome contendo caracteres especiais', async () => {
      const specialFilename = 'file with @#$%^&*()_+{}|:"<>?[]\\;\',./.pdf'
      const specialOriginalName = 'original with @#$%^&*()_+{}|:"<>?[]\\;\',./.pdf'
      
      const mockFile = {
        filename: specialFilename,
        originalname: specialOriginalName,
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result.filename).toBe(specialFilename)
      expect(result.originalName).toBe(specialOriginalName)
    })

    it('faz upload de arquivo com diferentes tamanhos', async () => {
      const sizes = [
        1024, // 1KB
        1024 * 1024, // 1MB
        5 * 1024 * 1024, // 5MB
        10 * 1024 * 1024 // 10MB
      ]

      for (let i = 0; i < sizes.length; i++) {
        const mockFile = {
          filename: `file${i + 1}.pdf`,
          originalname: `original${i + 1}.pdf`,
          mimetype: 'application/pdf',
          size: sizes[i],
          buffer: Buffer.from('fake pdf data')
        } as Express.Multer.File

        const result = await uploadBugAttachment({
          bugId,
          file: mockFile,
          userId
        })

        expect(result.size).toBe(sizes[i])

        // Limpar após cada teste
        await prisma.bugAttachment.delete({
          where: { id: result.id }
        })
      }
    })

    it('faz upload para diferentes bugs', async () => {
      // Criar outro bug
      const bug2 = await prisma.bug.create({
        data: {
          title: 'Bug 2',
          description: 'Descrição do bug 2',
          severity: 'MEDIUM',
          scenarioId,
          projectId,
          createdBy: userId
        }
      })

      const mockFile1 = {
        filename: 'file1.pdf',
        originalname: 'original1.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data 1')
      } as Express.Multer.File

      const mockFile2 = {
        filename: 'file2.docx',
        originalname: 'original2.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2 * 1024 * 1024,
        buffer: Buffer.from('fake docx data')
      } as Express.Multer.File

      const result1 = await uploadBugAttachment({
        bugId,
        file: mockFile1,
        userId
      })

      const result2 = await uploadBugAttachment({
        bugId: bug2.id,
        file: mockFile2,
        userId
      })

      expect(result1.bugId).toBe(bugId)
      expect(result2.bugId).toBe(bug2.id)
      expect(result1.mimeType).toBe('application/pdf')
      expect(result2.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')

      // Limpar
      await prisma.bugAttachment.deleteMany({ where: { bugId: bug2.id } })
      await prisma.bug.delete({ where: { id: bug2.id } })
    })
  })

  describe('uploadBugAttachment - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('filename')
      expect(result).toHaveProperty('originalName')
      expect(result).toHaveProperty('mimeType')
      expect(result).toHaveProperty('size')
      expect(result).toHaveProperty('url')
      expect(result).toHaveProperty('bugId')
      expect(result).toHaveProperty('uploadedBy')
      expect(result).toHaveProperty('createdAt')
      expect(result).toHaveProperty('uploader')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(typeof result.id).toBe('number')
      expect(typeof result.filename).toBe('string')
      expect(typeof result.originalName).toBe('string')
      expect(typeof result.mimeType).toBe('string')
      expect(typeof result.size).toBe('number')
      expect(typeof result.url).toBe('string')
      expect(typeof result.bugId).toBe('number')
      expect(typeof result.uploadedBy).toBe('number')
      expect(typeof result.createdAt).toBe('object')
      expect(typeof result.uploader).toBe('object')
    })

    it('retorna uploader com estrutura correta', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result.uploader).toHaveProperty('id')
      expect(result.uploader).toHaveProperty('name')
      expect(result.uploader).toHaveProperty('email')
      expect(result.uploader).toHaveProperty('avatar')
    })
  })

  describe('uploadBugAttachment - integração com banco de dados', () => {
    it('retorna dados consistentes com o banco', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      const dbAttachment = await prisma.bugAttachment.findUnique({
        where: { id: result.id }
      })

      expect(dbAttachment).toMatchObject({
        filename: result.filename,
        originalName: result.originalName,
        mimeType: result.mimeType,
        size: result.size,
        url: result.url,
        bugId: result.bugId,
        uploadedBy: result.uploadedBy
      })
    })

    it('faz upload apenas para o bug especificado', async () => {
      // Criar outro bug
      const bug2 = await prisma.bug.create({
        data: {
          title: 'Bug 2',
          description: 'Descrição do bug 2',
          severity: 'MEDIUM',
          scenarioId,
          projectId,
          createdBy: userId
        }
      })

      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      const attachments1 = await prisma.bugAttachment.findMany({
        where: { bugId }
      })

      const attachments2 = await prisma.bugAttachment.findMany({
        where: { bugId: bug2.id }
      })

      expect(attachments1).toHaveLength(1)
      expect(attachments2).toHaveLength(0)

      // Limpar
      await prisma.bugAttachment.deleteMany({ where: { bugId } })
      await prisma.bug.delete({ where: { id: bug2.id } })
    })

    it('gera URL correta para o arquivo', async () => {
      const mockFile = {
        filename: 'test-document.pdf',
        originalname: 'original-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('fake pdf data')
      } as Express.Multer.File

      const result = await uploadBugAttachment({
        bugId,
        file: mockFile,
        userId
      })

      expect(result.url).toBe('/uploads/bug-attachments/test-document.pdf')
    })
  })
})

