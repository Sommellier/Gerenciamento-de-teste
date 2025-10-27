import { prisma } from '../../../infrastructure/prisma'
import { getStepAttachments } from '../../../application/use-cases/execution/getStepAttachments.use-case'
import { AppError } from '../../../utils/AppError'

describe('getStepAttachments', () => {
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
        stepOrder: 1,
        action: 'Click button',
        expected: 'Button clicked',
        scenarioId
      }
    })
    stepId = step.id
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.stepAttachment.deleteMany({
      where: {
        step: {
          scenario: {
            projectId
          }
        }
      }
    })
    await prisma.testScenarioStep.deleteMany({
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

  describe('getStepAttachments - casos de sucesso', () => {
    it('retorna lista vazia quando não há anexos', async () => {
      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(0)
      expect(Array.isArray(result)).toBe(true)
    })

    it('retorna anexos ordenados por data de criação (mais recente primeiro)', async () => {
      // Criar múltiplos anexos
      const attachments = []
      for (let i = 0; i < 3; i++) {
        const attachment = await prisma.stepAttachment.create({
          data: {
            filename: `file${i + 1}.pdf`,
            originalName: `original_file${i + 1}.pdf`,
            url: `/uploads/file${i + 1}.pdf`,
            size: 1024 * (i + 1),
            mimeType: 'application/pdf',
            stepId,
            uploadedBy: userId
          }
        })
        attachments.push(attachment)
      }

      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(3)
      
      // Verificar se está ordenado por createdAt desc
      for (let i = 0; i < result.length - 1; i++) {
        expect(new Date(result[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(result[i + 1].createdAt).getTime()
        )
      }
    })

    it('inclui dados do uploader para cada anexo', async () => {
      // Criar anexo
      await prisma.stepAttachment.create({
        data: {
          filename: 'test.pdf',
          originalName: 'original_test.pdf',
          url: '/uploads/test.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].uploader).toMatchObject({
        id: userId,
        name: 'Test User',
        email: 'user@example.com',
        avatar: null
      })
    })

    it('retorna anexos com diferentes tipos de arquivo', async () => {
      const fileTypes = [
        { filename: 'document.pdf', mimeType: 'application/pdf' },
        { filename: 'image.png', mimeType: 'image/png' },
        { filename: 'spreadsheet.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        { filename: 'text.txt', mimeType: 'text/plain' }
      ]

      for (const fileType of fileTypes) {
        await prisma.stepAttachment.create({
          data: {
            filename: fileType.filename,
            originalName: `original_${fileType.filename}`,
            url: `/uploads/${fileType.filename}`,
            size: 1024,
            mimeType: fileType.mimeType,
            stepId,
            uploadedBy: userId
          }
        })
      }

      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(4)
      
      const resultMimeTypes = result.map(attachment => attachment.mimeType)
      fileTypes.forEach(fileType => {
        expect(resultMimeTypes).toContain(fileType.mimeType)
      })
    })

    it('retorna anexos com diferentes tamanhos', async () => {
      const sizes = [1024, 2048, 4096, 8192] // bytes

      for (let i = 0; i < sizes.length; i++) {
        await prisma.stepAttachment.create({
          data: {
            filename: `file${i + 1}.pdf`,
            originalName: `original_file${i + 1}.pdf`,
            url: `/uploads/file${i + 1}.pdf`,
            size: sizes[i],
            mimeType: 'application/pdf',
            stepId,
            uploadedBy: userId
          }
        })
      }

      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(4)
      
      const resultSizes = result.map(attachment => attachment.size)
      sizes.forEach(size => {
        expect(resultSizes).toContain(size)
      })
    })

    it('funciona com userId inválido (não afeta a operação)', async () => {
      await prisma.stepAttachment.create({
        data: {
          filename: 'test.pdf',
          originalName: 'original_test.pdf',
          url: '/uploads/test.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await getStepAttachments({ stepId, userId: 99999 })

      expect(result).toHaveLength(1)
      expect(result[0].filename).toBe('test.pdf')
    })

    it('retorna anexos com nomes longos', async () => {
      const longFileName = 'A'.repeat(255) + '.pdf'
      
      await prisma.stepAttachment.create({
        data: {
          filename: longFileName,
          originalName: `original_${longFileName}`,
          url: `/uploads/${longFileName}`,
          size: 1024,
          mimeType: 'application/pdf',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].filename).toBe(longFileName)
    })

    it('retorna anexos com caminhos longos', async () => {
      const longPath = '/uploads/' + 'A'.repeat(500) + '.pdf'
      
      await prisma.stepAttachment.create({
        data: {
          filename: 'test.pdf',
          originalName: 'original_test.pdf',
          url: longPath,
          size: 1024,
          mimeType: 'application/pdf',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].url).toBe(longPath)
    })

    it('retorna anexos com arquivos grandes', async () => {
      const largeSize = 1024 * 1024 * 10 // 10MB
      
      await prisma.stepAttachment.create({
        data: {
          filename: 'large.pdf',
          originalName: 'original_large.pdf',
          url: '/uploads/large.pdf',
          size: largeSize,
          mimeType: 'application/pdf',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].size).toBe(largeSize)
    })
  })

  describe('getStepAttachments - casos de erro', () => {
    it('rejeita quando etapa não existe', async () => {
      await expect(getStepAttachments({ stepId: 99999, userId })).rejects.toThrow(
        new AppError('Etapa não encontrada', 404)
      )
    })

    it('rejeita quando stepId é inválido', async () => {
      await expect(getStepAttachments({ stepId: -1, userId })).rejects.toThrow(
        new AppError('Etapa não encontrada', 404)
      )
    })

    it('rejeita quando stepId é zero', async () => {
      await expect(getStepAttachments({ stepId: 0, userId })).rejects.toThrow(
        new AppError('Etapa não encontrada', 404)
      )
    })

    it('rejeita quando stepId é string inválida', async () => {
      await expect(getStepAttachments({ stepId: 'invalid' as any, userId })).rejects.toThrow()
    })

    it('rejeita quando stepId é null', async () => {
      await expect(getStepAttachments({ stepId: null as any, userId })).rejects.toThrow()
    })

    it('rejeita quando stepId é undefined', async () => {
      await expect(getStepAttachments({ stepId: undefined as any, userId })).rejects.toThrow()
    })
  })

  describe('getStepAttachments - casos especiais', () => {
    it('funciona com etapa que tem muitos anexos', async () => {
      // Criar muitos anexos
      const attachments = []
      for (let i = 0; i < 10; i++) {
        const attachment = await prisma.stepAttachment.create({
          data: {
            filename: `file${i + 1}.pdf`,
            originalName: `original_file${i + 1}.pdf`,
            url: `/uploads/file${i + 1}.pdf`,
            size: 1024 * (i + 1),
            mimeType: 'application/pdf',
            stepId,
            uploadedBy: userId
          }
        })
        attachments.push(attachment)
      }

      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(10)
      expect(Array.isArray(result)).toBe(true)
    })

    it('funciona com anexos criados por diferentes usuários', async () => {
      // Criar outro usuário
      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other@example.com',
          password: 'password123'
        }
      })

      // Criar anexos com diferentes usuários
      await Promise.all([
        prisma.stepAttachment.create({
          data: {
            filename: 'file1.pdf',
            originalName: 'original_file1.pdf',
            url: '/uploads/file1.pdf',
            size: 1024,
            mimeType: 'application/pdf',
            stepId,
            uploadedBy: userId
          }
        }),
        prisma.stepAttachment.create({
          data: {
            filename: 'file2.pdf',
            originalName: 'original_file2.pdf',
            url: '/uploads/file2.pdf',
            size: 2048,
            mimeType: 'application/pdf',
            stepId,
            uploadedBy: otherUser.id
          }
        })
      ])

      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(2)
      
      const attachmentByOtherUser = result.find(attachment => attachment.uploadedBy === otherUser.id)
      expect(attachmentByOtherUser).toBeTruthy()
      expect(attachmentByOtherUser?.uploader.name).toBe('Other User')

      // Limpar usuário adicional
      await prisma.user.delete({ where: { id: otherUser.id } })
    })

    it('não retorna anexos de outras etapas', async () => {
      // Criar outra etapa
      const otherStep = await prisma.testScenarioStep.create({
        data: {
          stepOrder: 2,
          action: 'Click other button',
          expected: 'Other button clicked',
          scenarioId
        }
      })

      // Criar anexos em ambas as etapas
      await Promise.all([
        prisma.stepAttachment.create({
          data: {
            filename: 'file1.pdf',
            originalName: 'original_file1.pdf',
            url: '/uploads/file1.pdf',
            size: 1024,
            mimeType: 'application/pdf',
            stepId,
            uploadedBy: userId
          }
        }),
        prisma.stepAttachment.create({
          data: {
            filename: 'file2.pdf',
            originalName: 'original_file2.pdf',
            url: '/uploads/file2.pdf',
            size: 2048,
            mimeType: 'application/pdf',
            stepId: otherStep.id,
            uploadedBy: userId
          }
        })
      ])

      const result = await getStepAttachments({ stepId, userId })

      // Deve retornar apenas anexos da etapa especificada
      expect(result).toHaveLength(1)
      expect(result[0].filename).toBe('file1.pdf')
    })

    it('funciona com anexos contendo caracteres especiais no nome', async () => {
      const specialFileName = 'file with @#$%^&*()_+{}|:"<>?[]\\;\',./.pdf'
      
      await prisma.stepAttachment.create({
        data: {
          filename: specialFileName,
          originalName: `original_${specialFileName}`,
          url: `/uploads/${specialFileName}`,
          size: 1024,
          mimeType: 'application/pdf',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].filename).toBe(specialFileName)
    })

    it('funciona com anexos contendo emojis no nome', async () => {
      const emojiFileName = 'file with emojis 🚀 ✅ ❌ 🎉.pdf'
      
      await prisma.stepAttachment.create({
        data: {
          filename: emojiFileName,
          originalName: `original_${emojiFileName}`,
          url: `/uploads/${emojiFileName}`,
          size: 1024,
          mimeType: 'application/pdf',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].filename).toBe(emojiFileName)
    })

    it('funciona com diferentes tipos de MIME', async () => {
      const mimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip'
      ]

      for (let i = 0; i < mimeTypes.length; i++) {
        await prisma.stepAttachment.create({
          data: {
            filename: `file${i + 1}`,
            originalName: `original_file${i + 1}`,
            url: `/uploads/file${i + 1}`,
            size: 1024,
            mimeType: mimeTypes[i],
            stepId,
            uploadedBy: userId
          }
        })
      }

      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(6)
      
      const resultMimeTypes = result.map(attachment => attachment.mimeType)
      mimeTypes.forEach(mimeType => {
        expect(resultMimeTypes).toContain(mimeType)
      })
    })
  })

  describe('getStepAttachments - validação de tipos de retorno', () => {
    it('retorna array de objetos com propriedades corretas', async () => {
      await prisma.stepAttachment.create({
        data: {
          filename: 'test.pdf',
          originalName: 'original_test.pdf',
          url: '/uploads/test.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await getStepAttachments({ stepId, userId })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      result.forEach(attachment => {
        expect(attachment).toHaveProperty('id')
        expect(attachment).toHaveProperty('filename')
        expect(attachment).toHaveProperty('url')
        expect(attachment).toHaveProperty('size')
        expect(attachment).toHaveProperty('mimeType')
        expect(attachment).toHaveProperty('stepId')
        expect(attachment).toHaveProperty('uploadedBy')
        expect(attachment).toHaveProperty('createdAt')
        expect(attachment).toHaveProperty('uploader')
      })
    })

    it('retorna tipos corretos para propriedades', async () => {
      await prisma.stepAttachment.create({
        data: {
          filename: 'test.pdf',
          originalName: 'original_test.pdf',
          url: '/uploads/test.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await getStepAttachments({ stepId, userId })

      result.forEach(attachment => {
        expect(typeof attachment.id).toBe('number')
        expect(typeof attachment.filename).toBe('string')
        expect(typeof attachment.url).toBe('string')
        expect(typeof attachment.size).toBe('number')
        expect(typeof attachment.mimeType).toBe('string')
        expect(typeof attachment.stepId).toBe('number')
        expect(typeof attachment.uploadedBy).toBe('number')
        expect(typeof attachment.createdAt).toBe('object')
        expect(typeof attachment.uploader).toBe('object')
      })
    })

    it('retorna uploader com estrutura correta', async () => {
      await prisma.stepAttachment.create({
        data: {
          filename: 'test.pdf',
          originalName: 'original_test.pdf',
          url: '/uploads/test.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await getStepAttachments({ stepId, userId })

      result.forEach(attachment => {
        expect(attachment.uploader).toHaveProperty('id')
        expect(attachment.uploader).toHaveProperty('name')
        expect(attachment.uploader).toHaveProperty('email')
        expect(attachment.uploader).toHaveProperty('avatar')
      })
    })
  })

  describe('getStepAttachments - integração com banco de dados', () => {
    it('retorna dados consistentes com o banco', async () => {
      const attachment = await prisma.stepAttachment.create({
        data: {
          filename: 'test.pdf',
          originalName: 'original_test.pdf',
          url: '/uploads/test.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await getStepAttachments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(attachment.id)
      expect(result[0].filename).toBe('test.pdf')
      expect(result[0].url).toBe('/uploads/test.pdf')
      expect(result[0].size).toBe(1024)
      expect(result[0].mimeType).toBe('application/pdf')
    })

    it('retorna apenas anexos da etapa especificada', async () => {
      // Criar outra etapa
      const otherStep = await prisma.testScenarioStep.create({
        data: {
          stepOrder: 2,
          action: 'Click other button',
          expected: 'Other button clicked',
          scenarioId
        }
      })

      // Criar anexos em ambas as etapas
      await Promise.all([
        prisma.stepAttachment.create({
          data: {
            filename: 'file1.pdf',
            originalName: 'original_file1.pdf',
            url: '/uploads/file1.pdf',
            size: 1024,
            mimeType: 'application/pdf',
            stepId,
            uploadedBy: userId
          }
        }),
        prisma.stepAttachment.create({
          data: {
            filename: 'file2.pdf',
            originalName: 'original_file2.pdf',
            url: '/uploads/file2.pdf',
            size: 2048,
            mimeType: 'application/pdf',
            stepId: otherStep.id,
            uploadedBy: userId
          }
        })
      ])

      const result = await getStepAttachments({ stepId, userId })

      // Deve retornar apenas anexos da etapa especificada
      expect(result).toHaveLength(1)
      expect(result[0].stepId).toBe(stepId)
      expect(result[0].filename).toBe('file1.pdf')
    })

    it('retorna anexos ordenados corretamente', async () => {
      // Criar anexos com delay para garantir ordem diferente
      const attachment1 = await prisma.stepAttachment.create({
        data: {
          filename: 'file1.pdf',
          originalName: 'original_file1.pdf',
          url: '/uploads/file1.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          stepId,
          uploadedBy: userId
        }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const attachment2 = await prisma.stepAttachment.create({
        data: {
            filename: 'file2.pdf',
            originalName: 'original_file2.pdf',
            url: '/uploads/file2.pdf',
            size: 2048,
            mimeType: 'application/pdf',
            stepId,
            uploadedBy: userId
        }
      })

      const result = await getStepAttachments({ stepId, userId })

      // O anexo mais recente deve ser o primeiro
      expect(result[0].id).toBe(attachment2.id)
      expect(result[1].id).toBe(attachment1.id)
    })
  })
})
