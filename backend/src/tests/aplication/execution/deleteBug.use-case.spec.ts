import { prisma } from '../../../infrastructure/prisma'
import { deleteBug } from '../../../application/use-cases/execution/deleteBug.use-case'
import { AppError } from '../../../utils/AppError'
import fs from 'fs'
import path from 'path'

describe('deleteBug', () => {
  let projectId: number
  let scenarioId: number
  let bugId: number
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

  describe('deleteBug - casos de sucesso', () => {
    it('deleta bug existente', async () => {
      const result = await deleteBug({ bugId, userId })

      expect(result).toMatchObject({
        message: 'Bug excluído com sucesso'
      })

      // Verificar se o bug foi realmente deletado
      const deletedBug = await prisma.bug.findUnique({
        where: { id: bugId }
      })
      expect(deletedBug).toBeNull()
    })

    it('deleta bug com diferentes severidades', async () => {
      const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

      for (const severity of severities) {
        // Criar bug
        const bug = await prisma.bug.create({
          data: {
            title: `Bug ${severity}`,
            severity,
            scenarioId,
            projectId,
            createdBy: userId
          }
        })

        // Deletar bug
        const result = await deleteBug({ bugId: bug.id, userId })

        expect(result.message).toBe('Bug excluído com sucesso')

        // Verificar se foi deletado
        const deletedBug = await prisma.bug.findUnique({
          where: { id: bug.id }
        })
        expect(deletedBug).toBeNull()
      }
    })

    it('deleta bug sem descrição', async () => {
      // Criar bug sem descrição
      const bug = await prisma.bug.create({
        data: {
          title: 'Bug sem descrição',
          severity: 'MEDIUM',
          scenarioId,
          projectId,
          createdBy: userId
        }
      })

      const result = await deleteBug({ bugId: bug.id, userId })

      expect(result.message).toBe('Bug excluído com sucesso')

      // Verificar se foi deletado
      const deletedBug = await prisma.bug.findUnique({
        where: { id: bug.id }
      })
      expect(deletedBug).toBeNull()
    })

    it('deleta bug com etapa relacionada', async () => {
      // Criar etapa
      const step = await prisma.testScenarioStep.create({
        data: {
          stepOrder: 1,
          action: 'Click button',
          expected: 'Button clicked',
          scenarioId
        }
      })

      // Criar bug com etapa relacionada
      const bug = await prisma.bug.create({
        data: {
          title: 'Bug com etapa relacionada',
          severity: 'HIGH',
          scenarioId,
          projectId,
          createdBy: userId,
          relatedStepId: step.id
        }
      })

      const result = await deleteBug({ bugId: bug.id, userId })

      expect(result.message).toBe('Bug excluído com sucesso')

      // Verificar se foi deletado
      const deletedBug = await prisma.bug.findUnique({
        where: { id: bug.id }
      })
      expect(deletedBug).toBeNull()
    })

    it('deleta múltiplos bugs', async () => {
      // Criar múltiplos bugs
      const bugs = []
      for (let i = 0; i < 3; i++) {
        const bug = await prisma.bug.create({
          data: {
            title: `Bug ${i + 1}`,
            severity: 'MEDIUM',
            scenarioId,
            projectId,
            createdBy: userId
          }
        })
        bugs.push(bug)
      }

      // Deletar todos os bugs
      for (const bug of bugs) {
        const result = await deleteBug({ bugId: bug.id, userId })
        expect(result.message).toBe('Bug excluído com sucesso')
      }

      // Verificar se todos foram deletados
      const remainingBugs = await prisma.bug.findMany({
        where: { 
          scenarioId,
          id: { in: bugs.map(b => b.id) }
        }
      })
      expect(remainingBugs).toHaveLength(0)
    })

    it('retorna mensagem de sucesso correta', async () => {
      const result = await deleteBug({ bugId, userId })

      expect(result).toHaveProperty('message')
      expect(result.message).toBe('Bug excluído com sucesso')
      expect(typeof result.message).toBe('string')
    })
  })

  describe('deleteBug - casos de erro', () => {
    it('rejeita quando bug não existe', async () => {
      await expect(deleteBug({ bugId: 99999, userId })).rejects.toThrow(
        new AppError('Bug não encontrado', 404)
      )
    })

    it('rejeita quando bugId é inválido', async () => {
      await expect(deleteBug({ bugId: -1, userId })).rejects.toThrow(
        new AppError('Bug não encontrado', 404)
      )
    })

    it('rejeita quando bugId é zero', async () => {
      await expect(deleteBug({ bugId: 0, userId })).rejects.toThrow(
        new AppError('Bug não encontrado', 404)
      )
    })

    it('rejeita quando bugId é string inválida', async () => {
      await expect(deleteBug({ bugId: 'invalid' as any, userId })).rejects.toThrow()
    })

    it('rejeita quando bugId é null', async () => {
      await expect(deleteBug({ bugId: null as any, userId })).rejects.toThrow()
    })

    it('rejeita quando bugId é undefined', async () => {
      await expect(deleteBug({ bugId: undefined as any, userId })).rejects.toThrow()
    })
  })

  describe('deleteBug - casos especiais', () => {
    it('funciona com userId inválido (não afeta a operação)', async () => {
      const result = await deleteBug({ bugId, userId: 99999 })

      expect(result.message).toBe('Bug excluído com sucesso')

      // Verificar se o bug foi deletado
      const deletedBug = await prisma.bug.findUnique({
        where: { id: bugId }
      })
      expect(deletedBug).toBeNull()
    })

    it('funciona com userId negativo', async () => {
      const result = await deleteBug({ bugId, userId: -1 })

      expect(result.message).toBe('Bug excluído com sucesso')

      // Verificar se o bug foi deletado
      const deletedBug = await prisma.bug.findUnique({
        where: { id: bugId }
      })
      expect(deletedBug).toBeNull()
    })

    it('funciona com userId zero', async () => {
      const result = await deleteBug({ bugId, userId: 0 })

      expect(result.message).toBe('Bug excluído com sucesso')

      // Verificar se o bug foi deletado
      const deletedBug = await prisma.bug.findUnique({
        where: { id: bugId }
      })
      expect(deletedBug).toBeNull()
    })

    it('funciona quando bug já foi deletado anteriormente', async () => {
      // Deletar bug pela primeira vez
      await deleteBug({ bugId, userId })

      // Tentar deletar novamente
      await expect(deleteBug({ bugId, userId })).rejects.toThrow(
        new AppError('Bug não encontrado', 404)
      )
    })

    it('funciona com bug que tem título longo', async () => {
      // Criar bug com título longo
      const longTitle = 'A'.repeat(255)
      const bug = await prisma.bug.create({
        data: {
          title: longTitle,
          severity: 'HIGH',
          scenarioId,
          projectId,
          createdBy: userId
        }
      })

      const result = await deleteBug({ bugId: bug.id, userId })

      expect(result.message).toBe('Bug excluído com sucesso')

      // Verificar se foi deletado
      const deletedBug = await prisma.bug.findUnique({
        where: { id: bug.id }
      })
      expect(deletedBug).toBeNull()
    })

    it('funciona com bug que tem descrição longa', async () => {
      // Criar bug com descrição longa
      const longDescription = 'A'.repeat(1000)
      const bug = await prisma.bug.create({
        data: {
          title: 'Bug com descrição longa',
          description: longDescription,
          severity: 'MEDIUM',
          scenarioId,
          projectId,
          createdBy: userId
        }
      })

      const result = await deleteBug({ bugId: bug.id, userId })

      expect(result.message).toBe('Bug excluído com sucesso')

      // Verificar se foi deletado
      const deletedBug = await prisma.bug.findUnique({
        where: { id: bug.id }
      })
      expect(deletedBug).toBeNull()
    })
  })

  describe('deleteBug - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const result = await deleteBug({ bugId, userId })

      expect(result).toHaveProperty('message')
      expect(Object.keys(result)).toHaveLength(1)
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await deleteBug({ bugId, userId })

      expect(typeof result.message).toBe('string')
    })

    it('retorna mensagem não vazia', async () => {
      const result = await deleteBug({ bugId, userId })

      expect(result.message).toBeTruthy()
      expect(result.message.length).toBeGreaterThan(0)
    })
  })

  describe('deleteBug - integração com banco de dados', () => {
    it('remove bug do banco de dados', async () => {
      // Verificar se bug existe antes da deleção
      const bugBefore = await prisma.bug.findUnique({
        where: { id: bugId }
      })
      expect(bugBefore).toBeTruthy()

      // Deletar bug
      await deleteBug({ bugId, userId })

      // Verificar se bug não existe mais
      const bugAfter = await prisma.bug.findUnique({
        where: { id: bugId }
      })
      expect(bugAfter).toBeNull()
    })

    it('não afeta outros bugs', async () => {
      // Criar outro bug
      const otherBug = await prisma.bug.create({
        data: {
          title: 'Outro bug',
          severity: 'LOW',
          scenarioId,
          projectId,
          createdBy: userId
        }
      })

      // Deletar bug original
      await deleteBug({ bugId, userId })

      // Verificar se outro bug ainda existe
      const remainingBug = await prisma.bug.findUnique({
        where: { id: otherBug.id }
      })
      expect(remainingBug).toBeTruthy()
      expect(remainingBug?.title).toBe('Outro bug')
    })

    it('não afeta cenário relacionado', async () => {
      // Deletar bug
      await deleteBug({ bugId, userId })

      // Verificar se cenário ainda existe
      const scenario = await prisma.testScenario.findUnique({
        where: { id: scenarioId }
      })
      expect(scenario).toBeTruthy()
      expect(scenario?.title).toBe('Test Scenario')
    })

    it('não afeta projeto relacionado', async () => {
      // Deletar bug
      await deleteBug({ bugId, userId })

      // Verificar se projeto ainda existe
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      })
      expect(project).toBeTruthy()
      expect(project?.name).toBe('Test Project')
    })
  })

  describe('deleteBug - deleção de arquivos físicos', () => {
    it('deleta arquivos físicos dos anexos quando bug é deletado', async () => {
      // Criar diretório de uploads se não existir
      const uploadsDir = path.join(process.cwd(), 'uploads', 'bug-attachments')
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }

      // Criar arquivo físico de teste
      const testFilename = `bug-attachment-${Date.now()}-${Math.random()}.pdf`
      const testFilePath = path.join(uploadsDir, testFilename)
      fs.writeFileSync(testFilePath, Buffer.from('fake pdf content'))

      // Criar anexo no banco
      const bugWithAttachment = await prisma.bug.create({
        data: {
          title: 'Bug com anexo',
          severity: 'HIGH',
          scenarioId,
          projectId,
          createdBy: userId,
          attachments: {
            create: {
              filename: testFilename,
              originalName: 'test.pdf',
              mimeType: 'application/pdf',
              size: 100,
              url: `/uploads/bug-attachments/${testFilename}`,
              uploadedBy: userId
            }
          }
        },
        include: {
          attachments: true
        }
      })

      // Verificar que arquivo existe antes
      expect(fs.existsSync(testFilePath)).toBe(true)

      // Deletar bug
      await deleteBug({ bugId: bugWithAttachment.id, userId })

      // Verificar que arquivo foi deletado
      expect(fs.existsSync(testFilePath)).toBe(false)

      // Verificar que bug foi deletado
      const deletedBug = await prisma.bug.findUnique({
        where: { id: bugWithAttachment.id }
      })
      expect(deletedBug).toBeNull()
    })

    it('continua mesmo se arquivo físico não existir', async () => {
      // Criar anexo no banco sem arquivo físico
      const bugWithAttachment = await prisma.bug.create({
        data: {
          title: 'Bug com anexo sem arquivo',
          severity: 'MEDIUM',
          scenarioId,
          projectId,
          createdBy: userId,
          attachments: {
            create: {
              filename: 'non-existent-file.pdf',
              originalName: 'test.pdf',
              mimeType: 'application/pdf',
              size: 100,
              url: '/uploads/bug-attachments/non-existent-file.pdf',
              uploadedBy: userId
            }
          }
        }
      })

      // Deletar bug (não deve lançar erro mesmo sem arquivo físico)
      const result = await deleteBug({ bugId: bugWithAttachment.id, userId })

      expect(result.message).toBe('Bug excluído com sucesso')

      // Verificar que bug foi deletado
      const deletedBug = await prisma.bug.findUnique({
        where: { id: bugWithAttachment.id }
      })
      expect(deletedBug).toBeNull()
    })

    it('continua mesmo se houver erro ao deletar arquivo físico', async () => {
      // Criar diretório de uploads se não existir
      const uploadsDir = path.join(process.cwd(), 'uploads', 'bug-attachments')
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }

      // Criar arquivo físico de teste
      const testFilename = `bug-attachment-${Date.now()}-${Math.random()}.pdf`
      const testFilePath = path.join(uploadsDir, testFilename)
      fs.writeFileSync(testFilePath, Buffer.from('fake pdf content'))

      // Criar anexo no banco
      const bugWithAttachment = await prisma.bug.create({
        data: {
          title: 'Bug com anexo',
          severity: 'HIGH',
          scenarioId,
          projectId,
          createdBy: userId,
          attachments: {
            create: {
              filename: testFilename,
              originalName: 'test.pdf',
              mimeType: 'application/pdf',
              size: 100,
              url: `/uploads/bug-attachments/${testFilename}`,
              uploadedBy: userId
            }
          }
        },
        include: {
          attachments: true
        }
      })

      // Mock fs.unlinkSync para lançar erro
      const originalUnlinkSync = fs.unlinkSync
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      fs.unlinkSync = jest.fn(() => {
        throw new Error('Erro ao deletar arquivo')
      }) as any

      // Deletar bug (deve continuar mesmo com erro ao deletar arquivo)
      const result = await deleteBug({ bugId: bugWithAttachment.id, userId })

      expect(result.message).toBe('Bug excluído com sucesso')

      // Verificar que console.error foi chamado
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao deletar arquivo de anexo de bug'),
        expect.any(Error)
      )

      // Verificar que bug foi deletado mesmo com erro no arquivo
      const deletedBug = await prisma.bug.findUnique({
        where: { id: bugWithAttachment.id }
      })
      expect(deletedBug).toBeNull()

      // Restaurar função original
      fs.unlinkSync = originalUnlinkSync
      consoleSpy.mockRestore()

      // Limpar arquivo se ainda existir
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath)
      }
    })

    it('deleta múltiplos arquivos físicos quando bug tem múltiplos anexos', async () => {
      // Criar diretório de uploads se não existir
      const uploadsDir = path.join(process.cwd(), 'uploads', 'bug-attachments')
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }

      // Criar múltiplos arquivos físicos
      const filenames = [
        `bug-attachment-${Date.now()}-1.pdf`,
        `bug-attachment-${Date.now()}-2.pdf`,
        `bug-attachment-${Date.now()}-3.pdf`
      ]
      const filePaths = filenames.map(f => path.join(uploadsDir, f))
      
      filePaths.forEach(filePath => {
        fs.writeFileSync(filePath, Buffer.from('fake pdf content'))
      })

      // Criar bug com múltiplos anexos
      const bugWithAttachments = await prisma.bug.create({
        data: {
          title: 'Bug com múltiplos anexos',
          severity: 'HIGH',
          scenarioId,
          projectId,
          createdBy: userId,
          attachments: {
            create: filenames.map(filename => ({
              filename,
              originalName: 'test.pdf',
              mimeType: 'application/pdf',
              size: 100,
              url: `/uploads/bug-attachments/${filename}`,
              uploadedBy: userId
            }))
          }
        }
      })

      // Verificar que todos os arquivos existem
      filePaths.forEach(filePath => {
        expect(fs.existsSync(filePath)).toBe(true)
      })

      // Deletar bug
      await deleteBug({ bugId: bugWithAttachments.id, userId })

      // Verificar que todos os arquivos foram deletados
      filePaths.forEach(filePath => {
        expect(fs.existsSync(filePath)).toBe(false)
      })
    })
  })
})
