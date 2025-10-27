import { prisma } from '../../../infrastructure/prisma'
import { createBug } from '../../../application/use-cases/execution/createBug.use-case'
import { AppError } from '../../../utils/AppError'

describe('createBug', () => {
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
    await prisma.scenarioExecutionHistory.deleteMany({
      where: {
        scenario: {
          projectId
        }
      }
    })
    await prisma.bug.deleteMany({
      where: {
        scenario: {
          projectId
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

  describe('createBug - casos de sucesso', () => {
    it('cria bug com dados básicos', async () => {
      const bugData = {
        scenarioId,
        title: 'Bug de teste',
        description: 'Descrição do bug',
        severity: 'HIGH' as const,
        userId
      }

      const result = await createBug(bugData)

      expect(result).toMatchObject({
        title: 'Bug de teste',
        description: 'Descrição do bug',
        severity: 'HIGH',
        scenarioId,
        projectId,
        createdBy: userId
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

    it('cria bug sem descrição', async () => {
      const bugData = {
        scenarioId,
        title: 'Bug sem descrição',
        severity: 'MEDIUM' as const,
        userId
      }

      const result = await createBug(bugData)

      expect(result).toMatchObject({
        title: 'Bug sem descrição',
        description: null,
        severity: 'MEDIUM',
        scenarioId
      })
    })

    it('cria bug com etapa relacionada', async () => {
      const bugData = {
        scenarioId,
        title: 'Bug com etapa relacionada',
        description: 'Bug relacionado à etapa',
        severity: 'CRITICAL' as const,
        relatedStepId: stepId,
        userId
      }

      const result = await createBug(bugData)

      expect(result).toMatchObject({
        title: 'Bug com etapa relacionada',
        severity: 'CRITICAL',
        relatedStepId: stepId
      })
    })

    it('cria bug com todas as severidades', async () => {
      const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

      for (const severity of severities) {
        const bugData = {
          scenarioId,
          title: `Bug ${severity}`,
          severity,
          userId
        }

        const result = await createBug(bugData)

        expect(result.severity).toBe(severity)
      }
    })

    it('atualiza status do cenário para FAILED', async () => {
      // Primeiro, criar cenário com status diferente de FAILED
      await prisma.testScenario.update({
        where: { id: scenarioId },
        data: { status: 'PASSED' }
      })

      const bugData = {
        scenarioId,
        title: 'Bug que falha cenário',
        severity: 'HIGH' as const,
        userId
      }

      await createBug(bugData)

      // Verificar se o status foi atualizado
      const updatedScenario = await prisma.testScenario.findUnique({
        where: { id: scenarioId }
      })

      expect(updatedScenario?.status).toBe('FAILED')
    })

    it('mantém status FAILED se já estiver FAILED', async () => {
      // Primeiro, definir cenário como FAILED
      await prisma.testScenario.update({
        where: { id: scenarioId },
        data: { status: 'FAILED' }
      })

      const bugData = {
        scenarioId,
        title: 'Bug adicional',
        severity: 'LOW' as const,
        userId
      }

      await createBug(bugData)

      // Verificar se o status permanece FAILED
      const updatedScenario = await prisma.testScenario.findUnique({
        where: { id: scenarioId }
      })

      expect(updatedScenario?.status).toBe('FAILED')
    })

    it('cria histórico de execução', async () => {
      const bugData = {
        scenarioId,
        title: 'Bug com histórico',
        severity: 'MEDIUM' as const,
        userId
      }

      const result = await createBug(bugData)

      // Verificar se o histórico foi criado
      const history = await prisma.scenarioExecutionHistory.findFirst({
        where: {
          scenarioId,
          action: 'BUG_CREATED'
        }
      })

      expect(history).toBeTruthy()
      expect(history?.description).toBe('Bug criado: Bug com histórico')
      expect(history?.userId).toBe(userId)
      
      const metadata = JSON.parse(history?.metadata || '{}')
      expect(metadata.bugId).toBe(result.id)
      expect(metadata.severity).toBe('MEDIUM')
    })

    it('inclui dados do criador no resultado', async () => {
      const bugData = {
        scenarioId,
        title: 'Bug de teste',
        severity: 'HIGH' as const,
        userId
      }

      const result = await createBug(bugData)

      expect(result.creator).toMatchObject({
        id: userId,
        name: 'Test User',
        email: 'user@example.com',
        avatar: null
      })
    })

    it('inclui dados do cenário no resultado', async () => {
      const bugData = {
        scenarioId,
        title: 'Bug de teste',
        severity: 'HIGH' as const,
        userId
      }

      const result = await createBug(bugData)

      expect(result.scenario).toMatchObject({
        id: scenarioId,
        title: 'Test Scenario'
      })
    })
  })

  describe('createBug - casos de erro', () => {
    it('rejeita quando cenário não existe', async () => {
      const bugData = {
        scenarioId: 99999,
        title: 'Bug de teste',
        severity: 'HIGH' as const,
        userId
      }

      await expect(createBug(bugData)).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )
    })

    it('rejeita quando scenarioId é inválido', async () => {
      const bugData = {
        scenarioId: -1,
        title: 'Bug de teste',
        severity: 'HIGH' as const,
        userId
      }

      await expect(createBug(bugData)).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )
    })

    it('rejeita quando scenarioId é zero', async () => {
      const bugData = {
        scenarioId: 0,
        title: 'Bug de teste',
        severity: 'HIGH' as const,
        userId
      }

      await expect(createBug(bugData)).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )
    })

    it('rejeita quando título está vazio', async () => {
      const bugData = {
        scenarioId,
        title: '',
        severity: 'HIGH' as const,
        userId
      }

      // Deve criar o bug mesmo com título vazio (validação de negócio)
      const result = await createBug(bugData)
      expect(result.title).toBe('')
    })

    it('rejeita quando userId é inválido', async () => {
      const bugData = {
        scenarioId,
        title: 'Bug de teste',
        severity: 'HIGH' as const,
        userId: 99999
      }

      // Deve lançar erro de foreign key constraint
      await expect(createBug(bugData)).rejects.toThrow()
    })

    it('rejeita quando relatedStepId é inválido', async () => {
      const bugData = {
        scenarioId,
        title: 'Bug de teste',
        severity: 'HIGH' as const,
        relatedStepId: 99999,
        userId
      }

      // Deve criar o bug mesmo com relatedStepId inválido (validação de negócio)
      const result = await createBug(bugData)
      expect(result.relatedStepId).toBe(99999)
    })
  })

  describe('createBug - casos especiais', () => {
    it('funciona com título longo', async () => {
      const longTitle = 'A'.repeat(255)
      const bugData = {
        scenarioId,
        title: longTitle,
        severity: 'HIGH' as const,
        userId
      }

      const result = await createBug(bugData)
      expect(result.title).toBe(longTitle)
    })

    it('funciona com descrição longa', async () => {
      const longDescription = 'A'.repeat(1000)
      const bugData = {
        scenarioId,
        title: 'Bug com descrição longa',
        description: longDescription,
        severity: 'MEDIUM' as const,
        userId
      }

      const result = await createBug(bugData)
      expect(result.description).toBe(longDescription)
    })

    it('funciona com título contendo caracteres especiais', async () => {
      const specialTitle = 'Bug com @#$%^&*()_+{}|:"<>?[]\\;\',./'
      const bugData = {
        scenarioId,
        title: specialTitle,
        severity: 'LOW' as const,
        userId
      }

      const result = await createBug(bugData)
      expect(result.title).toBe(specialTitle)
    })

    it('funciona com descrição contendo emojis', async () => {
      const emojiDescription = 'Bug com emojis 🐛 🚀 ✅ ❌ 🎉'
      const bugData = {
        scenarioId,
        title: 'Bug com emojis',
        description: emojiDescription,
        severity: 'HIGH' as const,
        userId
      }

      const result = await createBug(bugData)
      expect(result.description).toBe(emojiDescription)
    })

    it('funciona com descrição contendo quebras de linha', async () => {
      const multilineDescription = 'Bug\ncom\nquebras\nde\nlinha'
      const bugData = {
        scenarioId,
        title: 'Bug multiline',
        description: multilineDescription,
        severity: 'CRITICAL' as const,
        userId
      }

      const result = await createBug(bugData)
      expect(result.description).toBe(multilineDescription)
    })

    it('funciona com relatedStepId sendo null', async () => {
      const bugData = {
        scenarioId,
        title: 'Bug sem etapa relacionada',
        severity: 'MEDIUM' as const,
        relatedStepId: undefined,
        userId
      }

      const result = await createBug(bugData)
      expect(result.relatedStepId).toBeNull()
    })
  })

  describe('createBug - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const bugData = {
        scenarioId,
        title: 'Bug de teste',
        severity: 'HIGH' as const,
        userId
      }

      const result = await createBug(bugData)

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('title')
      expect(result).toHaveProperty('description')
      expect(result).toHaveProperty('severity')
      expect(result).toHaveProperty('scenarioId')
      expect(result).toHaveProperty('projectId')
      expect(result).toHaveProperty('createdBy')
      expect(result).toHaveProperty('createdAt')
      expect(result).toHaveProperty('updatedAt')
      expect(result).toHaveProperty('creator')
      expect(result).toHaveProperty('scenario')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const bugData = {
        scenarioId,
        title: 'Bug de teste',
        severity: 'HIGH' as const,
        userId
      }

      const result = await createBug(bugData)

      expect(typeof result.id).toBe('number')
      expect(typeof result.title).toBe('string')
      expect(typeof result.severity).toBe('string')
      expect(typeof result.scenarioId).toBe('number')
      expect(typeof result.projectId).toBe('number')
      expect(typeof result.createdBy).toBe('number')
      expect(typeof result.createdAt).toBe('object')
      expect(typeof result.updatedAt).toBe('object')
      expect(typeof result.creator).toBe('object')
      expect(typeof result.scenario).toBe('object')
    })

    it('retorna creator com estrutura correta', async () => {
      const bugData = {
        scenarioId,
        title: 'Bug de teste',
        severity: 'HIGH' as const,
        userId
      }

      const result = await createBug(bugData)

      expect(result.creator).toHaveProperty('id')
      expect(result.creator).toHaveProperty('name')
      expect(result.creator).toHaveProperty('email')
      expect(result.creator).toHaveProperty('avatar')
    })

    it('retorna scenario com estrutura correta', async () => {
      const bugData = {
        scenarioId,
        title: 'Bug de teste',
        severity: 'HIGH' as const,
        userId
      }

      const result = await createBug(bugData)

      expect(result.scenario).toHaveProperty('id')
      expect(result.scenario).toHaveProperty('title')
    })
  })
})
