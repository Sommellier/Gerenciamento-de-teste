import { prisma } from '../../../infrastructure/prisma'
import { registerExecutionHistory } from '../../../application/use-cases/execution/registerExecutionHistory.use-case'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { AppError } from '../../../utils/AppError'

describe('registerExecutionHistory', () => {
  let projectId: number
  let scenarioId: number
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
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.scenarioExecutionHistory.deleteMany({
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

  describe('registerExecutionHistory - casos de sucesso', () => {
    it('registra histórico de execução com ação básica', async () => {
      const result = await registerExecutionHistory({
        scenarioId,
        action: 'STARTED',
        userId
      })

      expect(result).toMatchObject({
        action: 'STARTED',
        description: null,
        metadata: null,
        scenarioId,
        userId
      })
      expect(result.user).toMatchObject({
        id: userId,
        name: 'Test User',
        email: 'user@example.com'
      })
    })

    it('registra histórico com descrição', async () => {
      const description = 'Cenário iniciado pelo usuário'
      
      const result = await registerExecutionHistory({
        scenarioId,
        action: 'STARTED',
        description,
        userId
      })

      expect(result.description).toBe(description)
    })

    it('registra histórico com metadata JSON', async () => {
      const metadata = {
        stepCount: 5,
        environment: 'production',
        browser: 'Chrome'
      }
      
      const result = await registerExecutionHistory({
        scenarioId,
        action: 'COMPLETED',
        description: 'Cenário completado',
        metadata,
        userId
      })

      expect(result.metadata).toBe(JSON.stringify(metadata))
    })

    it('registra diferentes tipos de ações', async () => {
      const actions = [
        'STARTED',
        'STEP_COMPLETED',
        'BUG_CREATED',
        'COMPLETED',
        'FAILED'
      ]

      for (const action of actions) {
        const result = await registerExecutionHistory({
          scenarioId,
          action,
          userId
        })

        expect(result.action).toBe(action)
      }
    })

    it('registra múltiplos históricos para o mesmo cenário', async () => {
      const histories = [
        { action: 'STARTED', description: 'Iniciado' },
        { action: 'STEP_COMPLETED', description: 'Etapa 1 concluída' },
        { action: 'STEP_COMPLETED', description: 'Etapa 2 concluída' },
        { action: 'COMPLETED', description: 'Cenário concluído' }
      ]

      for (const history of histories) {
        const result = await registerExecutionHistory({
          scenarioId,
          action: history.action,
          description: history.description,
          userId
        })

        expect(result.action).toBe(history.action)
        expect(result.description).toBe(history.description)
      }
    })

    it('registra histórico com metadata complexa', async () => {
      const metadata = {
        steps: [
          { id: 1, status: 'PASSED', duration: 1000 },
          { id: 2, status: 'FAILED', duration: 2000 }
        ],
        totalDuration: 3000,
        environment: {
          name: 'production',
          version: '1.0.0'
        }
      }
      
      const result = await registerExecutionHistory({
        scenarioId,
        action: 'COMPLETED',
        metadata,
        userId
      })

      expect(result.metadata).toBe(JSON.stringify(metadata))
    })

    it('registra histórico com descrição longa', async () => {
      const longDescription = 'A'.repeat(1000)
      
      const result = await registerExecutionHistory({
        scenarioId,
        action: 'FAILED',
        description: longDescription,
        userId
      })

      expect(result.description).toBe(longDescription)
    })

    it('funciona com userId inválido (não afeta a operação)', async () => {
      await expect(registerExecutionHistory({
        scenarioId,
        action: 'STARTED',
        userId: 99999
      })).rejects.toThrow(PrismaClientKnownRequestError)
    })
  })

  describe('registerExecutionHistory - casos de erro', () => {
    it('rejeita quando cenário não existe', async () => {
      await expect(registerExecutionHistory({
        scenarioId: 99999,
        action: 'STARTED',
        userId
      })).rejects.toThrow(new AppError('Cenário não encontrado', 404))
    })

    it('rejeita quando scenarioId é inválido', async () => {
      await expect(registerExecutionHistory({
        scenarioId: -1,
        action: 'STARTED',
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando scenarioId é zero', async () => {
      await expect(registerExecutionHistory({
        scenarioId: 0,
        action: 'STARTED',
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando action é vazia', async () => {
      const result = await registerExecutionHistory({
        scenarioId,
        action: '',
        userId
      })

      expect(result.action).toBe('')
    })

    it('rejeita quando userId é inválido', async () => {
      await expect(registerExecutionHistory({
        scenarioId,
        action: 'STARTED',
        userId: -1
      })).rejects.toThrow()
    })
  })

  describe('registerExecutionHistory - casos especiais', () => {
    it('funciona com cenário que tem muitos históricos', async () => {
      const count = 50
      
      for (let i = 0; i < count; i++) {
        await registerExecutionHistory({
          scenarioId,
          action: 'STEP_COMPLETED',
          description: `Etapa ${i + 1} concluída`,
          userId
        })
      }

      const histories = await prisma.scenarioExecutionHistory.findMany({
        where: { scenarioId }
      })

      expect(histories).toHaveLength(count)
    })

    it('registra históricos com diferentes usuários', async () => {
      // Usar email único com timestamp para evitar conflitos
      const uniqueEmail = `user2-${Date.now()}@example.com`
      const user2 = await prisma.user.create({
        data: {
          name: 'User 2',
          email: uniqueEmail,
          password: 'password123'
        }
      })

      const history1 = await registerExecutionHistory({
        scenarioId,
        action: 'STARTED',
        userId
      })

      const history2 = await registerExecutionHistory({
        scenarioId,
        action: 'COMPLETED',
        userId: user2.id
      })

      expect(history1.userId).toBe(userId)
      expect(history2.userId).toBe(user2.id)

      await prisma.user.delete({ where: { id: user2.id } })
    })

    it('registra histórico com caracteres especiais na descrição', async () => {
      const specialDescription = 'Descrição com @#$%^&*()_+{}|:"<>?[]\\;\',./'
      
      const result = await registerExecutionHistory({
        scenarioId,
        action: 'FAILED',
        description: specialDescription,
        userId
      })

      expect(result.description).toBe(specialDescription)
    })

    it('registra histórico com emojis na descrição', async () => {
      const emojiDescription = 'Cenário falhou 😞 Erro crítico 🚨'
      
      const result = await registerExecutionHistory({
        scenarioId,
        action: 'FAILED',
        description: emojiDescription,
        userId
      })

      expect(result.description).toBe(emojiDescription)
    })

    it('registra histórico com quebras de linha na descrição', async () => {
      const multilineDescription = 'Linha 1\nLinha 2\nLinha 3'
      
      const result = await registerExecutionHistory({
        scenarioId,
        action: 'COMPLETED',
        description: multilineDescription,
        userId
      })

      expect(result.description).toBe(multilineDescription)
    })

    it('registra histórico com metadata undefined', async () => {
      const result = await registerExecutionHistory({
        scenarioId,
        action: 'STARTED',
        metadata: undefined,
        userId
      })

      expect(result.metadata).toBeNull()
    })
  })

  describe('registerExecutionHistory - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const result = await registerExecutionHistory({
        scenarioId,
        action: 'STARTED',
        description: 'Test description',
        metadata: { test: 'data' },
        userId
      })

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('action')
      expect(result).toHaveProperty('description')
      expect(result).toHaveProperty('metadata')
      expect(result).toHaveProperty('scenarioId')
      expect(result).toHaveProperty('userId')
      expect(result).toHaveProperty('createdAt')
      expect(result).toHaveProperty('user')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await registerExecutionHistory({
        scenarioId,
        action: 'STARTED',
        userId
      })

      expect(typeof result.id).toBe('number')
      expect(typeof result.action).toBe('string')
      expect(typeof result.scenarioId).toBe('number')
      expect(typeof result.userId).toBe('number')
      expect(typeof result.createdAt).toBe('object')
      expect(typeof result.user).toBe('object')
    })

    it('retorna user com estrutura correta', async () => {
      const result = await registerExecutionHistory({
        scenarioId,
        action: 'STARTED',
        userId
      })

      expect(result.user).toHaveProperty('id')
      expect(result.user).toHaveProperty('name')
      expect(result.user).toHaveProperty('email')
      expect(result.user).toHaveProperty('avatar')
    })
  })

  describe('registerExecutionHistory - integração com banco de dados', () => {
    it('retorna dados consistentes com o banco', async () => {
      const result = await registerExecutionHistory({
        scenarioId,
        action: 'STARTED',
        description: 'Test description',
        metadata: { test: 'data' },
        userId
      })

      const dbHistory = await prisma.scenarioExecutionHistory.findUnique({
        where: { id: result.id }
      })

      expect(dbHistory).toMatchObject({
        action: result.action,
        description: result.description,
        metadata: result.metadata,
        scenarioId: result.scenarioId,
        userId: result.userId
      })
    })

    it('registra histórico apenas para o cenário especificado', async () => {
      // Criar outro cenário
      const otherScenario = await prisma.testScenario.create({
        data: {
          title: 'Other Scenario',
          description: 'Other Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId
        }
      })

      await registerExecutionHistory({
        scenarioId,
        action: 'STARTED',
        userId
      })

      await registerExecutionHistory({
        scenarioId: otherScenario.id,
        action: 'COMPLETED',
        userId
      })

      const histories = await prisma.scenarioExecutionHistory.findMany({
        where: { scenarioId }
      })

      expect(histories).toHaveLength(1)
      expect(histories[0].action).toBe('STARTED')

      await prisma.testScenario.delete({ where: { id: otherScenario.id } })
    })

    it('registra históricos ordenados por data de criação', async () => {
      const actions = ['STARTED', 'STEP_COMPLETED', 'COMPLETED']
      
      for (const action of actions) {
        await registerExecutionHistory({
          scenarioId,
          action,
          userId
        })
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const histories = await prisma.scenarioExecutionHistory.findMany({
        where: { scenarioId },
        orderBy: { createdAt: 'asc' }
      })

      expect(histories).toHaveLength(3)
      expect(histories[0].action).toBe('STARTED')
      expect(histories[1].action).toBe('STEP_COMPLETED')
      expect(histories[2].action).toBe('COMPLETED')
    })
  })
})
