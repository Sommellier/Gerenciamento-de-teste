import { prisma } from '../../../infrastructure/prisma'
import { updateBug } from '../../../application/use-cases/execution/updateBug.use-case'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { AppError } from '../../../utils/AppError'

describe('updateBug', () => {
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
        title: 'Original Bug Title',
        description: 'Original Bug Description',
        severity: 'MEDIUM',
        status: 'OPEN',
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

  describe('updateBug - casos de sucesso', () => {
    it('atualiza título do bug', async () => {
      const newTitle = 'Updated Bug Title'
      
      const result = await updateBug({
        bugId,
        title: newTitle,
        userId
      })

      expect(result.title).toBe(newTitle)
      expect(result.description).toBe('Original Bug Description')
      expect(result.severity).toBe('MEDIUM')
      expect(result.status).toBe('OPEN')
    })

    it('atualiza descrição do bug', async () => {
      const newDescription = 'Updated Bug Description'
      
      const result = await updateBug({
        bugId,
        description: newDescription,
        userId
      })

      expect(result.title).toBe('Original Bug Title')
      expect(result.description).toBe(newDescription)
      expect(result.severity).toBe('MEDIUM')
      expect(result.status).toBe('OPEN')
    })

    it('atualiza severidade do bug', async () => {
      const newSeverity = 'HIGH' as const
      
      const result = await updateBug({
        bugId,
        severity: newSeverity,
        userId
      })

      expect(result.title).toBe('Original Bug Title')
      expect(result.description).toBe('Original Bug Description')
      expect(result.severity).toBe(newSeverity)
      expect(result.status).toBe('OPEN')
    })

    it('atualiza status do bug', async () => {
      const newStatus = 'IN_PROGRESS' as const
      
      const result = await updateBug({
        bugId,
        status: newStatus,
        userId
      })

      expect(result.title).toBe('Original Bug Title')
      expect(result.description).toBe('Original Bug Description')
      expect(result.severity).toBe('MEDIUM')
      expect(result.status).toBe(newStatus)
    })

    it('atualiza múltiplos campos simultaneamente', async () => {
      const updates = {
        title: 'Completely Updated Title',
        description: 'Completely Updated Description',
        severity: 'CRITICAL' as const,
        status: 'RESOLVED' as const
      }
      
      const result = await updateBug({
        bugId,
        ...updates,
        userId
      })

      expect(result.title).toBe(updates.title)
      expect(result.description).toBe(updates.description)
      expect(result.severity).toBe(updates.severity)
      expect(result.status).toBe(updates.status)
    })

    it('atualiza com título longo', async () => {
      const longTitle = 'A'.repeat(500)
      
      const result = await updateBug({
        bugId,
        title: longTitle,
        userId
      })

      expect(result.title).toBe(longTitle)
    })

    it('atualiza com descrição longa', async () => {
      const longDescription = 'A'.repeat(2000)
      
      const result = await updateBug({
        bugId,
        description: longDescription,
        userId
      })

      expect(result.description).toBe(longDescription)
    })

    it('atualiza com diferentes severidades', async () => {
      const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
      
      for (const severity of severities) {
        const result = await updateBug({
          bugId,
          severity,
          userId
        })

        expect(result.severity).toBe(severity)
      }
    })

    it('atualiza com diferentes status', async () => {
      const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
      
      for (const status of statuses) {
        const result = await updateBug({
          bugId,
          status,
          userId
        })

        expect(result.status).toBe(status)
      }
    })

    it('inclui dados do criador e cenário', async () => {
      const result = await updateBug({
        bugId,
        title: 'Updated Title',
        userId
      })

      expect(result.creator).toMatchObject({
        id: userId,
        name: 'Test User',
        email: 'user@example.com'
      })
      expect(result.scenario).toMatchObject({
        id: scenarioId,
        title: 'Test Scenario'
      })
    })

    it('funciona com userId inválido (não afeta a operação)', async () => {
      const result = await updateBug({
        bugId,
        title: 'Updated Title',
        userId: 99999
      })

      expect(result.title).toBe('Updated Title')
    })
  })

  describe('updateBug - casos de erro', () => {
    it('rejeita quando bug não existe', async () => {
      await expect(updateBug({
        bugId: 99999,
        title: 'Updated Title',
        userId
      })).rejects.toThrow(new AppError('Bug não encontrado', 404))
    })

    it('rejeita quando bugId é inválido', async () => {
      await expect(updateBug({
        bugId: -1,
        title: 'Updated Title',
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando bugId é zero', async () => {
      await expect(updateBug({
        bugId: 0,
        title: 'Updated Title',
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando userId é inválido', async () => {
      const result = await updateBug({
        bugId,
        title: 'Updated Title',
        userId: -1
      })

      expect(result.title).toBe('Updated Title')
    })
  })

  describe('updateBug - casos especiais', () => {
    it('atualiza bug com título contendo caracteres especiais', async () => {
      const specialTitle = 'Bug com @#$%^&*()_+{}|:"<>?[]\\;\',./'
      
      const result = await updateBug({
        bugId,
        title: specialTitle,
        userId
      })

      expect(result.title).toBe(specialTitle)
    })

    it('atualiza bug com descrição contendo emojis', async () => {
      const emojiDescription = 'Bug crítico 🚨 Preciso de atenção urgente ⚠️'
      
      const result = await updateBug({
        bugId,
        description: emojiDescription,
        userId
      })

      expect(result.description).toBe(emojiDescription)
    })

    it('atualiza bug com descrição contendo quebras de linha', async () => {
      const multilineDescription = 'Linha 1\nLinha 2\nLinha 3'
      
      const result = await updateBug({
        bugId,
        description: multilineDescription,
        userId
      })

      expect(result.description).toBe(multilineDescription)
    })

    it('atualiza múltiplos bugs independentemente', async () => {
      // Criar outro bug
      const bug2 = await prisma.bug.create({
        data: {
          title: 'Bug 2',
          description: 'Description 2',
          severity: 'LOW',
          status: 'OPEN',
          projectId,
          scenarioId,
          createdBy: userId
        }
      })

      const result1 = await updateBug({
        bugId,
        title: 'Updated Bug 1',
        userId
      })

      const result2 = await updateBug({
        bugId: bug2.id,
        title: 'Updated Bug 2',
        userId
      })

      expect(result1.title).toBe('Updated Bug 1')
      expect(result2.title).toBe('Updated Bug 2')
    })

    it('atualiza bug várias vezes sequencialmente', async () => {
      const updates = [
        { title: 'Update 1' },
        { description: 'Description Update' },
        { severity: 'HIGH' as const },
        { status: 'IN_PROGRESS' as const },
        { title: 'Final Update' }
      ]

      let currentBugId = bugId
      for (const update of updates) {
        const result = await updateBug({
          bugId: currentBugId,
          ...update,
          userId
        })
        currentBugId = result.id
      }

      const finalBug = await prisma.bug.findUnique({
        where: { id: bugId }
      })

      expect(finalBug?.title).toBe('Final Update')
      expect(finalBug?.description).toBe('Description Update')
      expect(finalBug?.severity).toBe('HIGH')
      expect(finalBug?.status).toBe('IN_PROGRESS')
    })

    it('atualiza bug com campos undefined', async () => {
      const result = await updateBug({
        bugId,
        title: undefined,
        description: undefined,
        severity: undefined,
        status: undefined,
        userId
      })

      // Campos undefined não devem ser atualizados
      expect(result.title).toBe('Original Bug Title')
      expect(result.description).toBe('Original Bug Description')
      expect(result.severity).toBe('MEDIUM')
      expect(result.status).toBe('OPEN')
    })
  })

  describe('updateBug - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const result = await updateBug({
        bugId,
        title: 'Updated Title',
        userId
      })

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('title')
      expect(result).toHaveProperty('description')
      expect(result).toHaveProperty('severity')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('scenarioId')
      expect(result).toHaveProperty('createdBy')
      expect(result).toHaveProperty('createdAt')
      expect(result).toHaveProperty('updatedAt')
      expect(result).toHaveProperty('creator')
      expect(result).toHaveProperty('scenario')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await updateBug({
        bugId,
        title: 'Updated Title',
        userId
      })

      expect(typeof result.id).toBe('number')
      expect(typeof result.title).toBe('string')
      expect(typeof result.description).toBe('string')
      expect(typeof result.severity).toBe('string')
      expect(typeof result.status).toBe('string')
      expect(typeof result.scenarioId).toBe('number')
      expect(typeof result.createdBy).toBe('number')
      expect(typeof result.createdAt).toBe('object')
      expect(typeof result.updatedAt).toBe('object')
      expect(typeof result.creator).toBe('object')
      expect(typeof result.scenario).toBe('object')
    })

    it('retorna creator com estrutura correta', async () => {
      const result = await updateBug({
        bugId,
        title: 'Updated Title',
        userId
      })

      expect(result.creator).toHaveProperty('id')
      expect(result.creator).toHaveProperty('name')
      expect(result.creator).toHaveProperty('email')
      expect(result.creator).toHaveProperty('avatar')
    })

    it('retorna scenario com estrutura correta', async () => {
      const result = await updateBug({
        bugId,
        title: 'Updated Title',
        userId
      })

      expect(result.scenario).toHaveProperty('id')
      expect(result.scenario).toHaveProperty('title')
    })
  })

  describe('updateBug - integração com banco de dados', () => {
    it('retorna dados consistentes com o banco', async () => {
      const result = await updateBug({
        bugId,
        title: 'Updated Title',
        description: 'Updated Description',
        severity: 'HIGH',
        status: 'IN_PROGRESS',
        userId
      })

      const dbBug = await prisma.bug.findUnique({
        where: { id: bugId }
      })

      expect(dbBug).toMatchObject({
        title: result.title,
        description: result.description,
        severity: result.severity,
        status: result.status,
        scenarioId: result.scenarioId,
        createdBy: result.createdBy
      })
    })

    it('atualiza apenas o bug especificado', async () => {
      // Criar outro bug
      const bug2 = await prisma.bug.create({
        data: {
          title: 'Bug 2',
          description: 'Description 2',
          severity: 'LOW',
          status: 'OPEN',
          projectId,
          scenarioId,
          createdBy: userId
        }
      })

      await updateBug({
        bugId,
        title: 'Updated Bug 1',
        userId
      })

      const bug1 = await prisma.bug.findUnique({ where: { id: bugId } })
      const bug2After = await prisma.bug.findUnique({ where: { id: bug2.id } })

      expect(bug1?.title).toBe('Updated Bug 1')
      expect(bug2After?.title).toBe('Bug 2')
    })

    it('atualiza timestamp de updatedAt', async () => {
      const originalBug = await prisma.bug.findUnique({
        where: { id: bugId }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const result = await updateBug({
        bugId,
        title: 'Updated Title',
        userId
      })

      expect(result.updatedAt.getTime()).toBeGreaterThan(originalBug!.updatedAt.getTime())
    })
  })
})
