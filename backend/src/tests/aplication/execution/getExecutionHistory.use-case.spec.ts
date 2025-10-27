import { prisma } from '../../../infrastructure/prisma'
import { getExecutionHistory } from '../../../application/use-cases/execution/getExecutionHistory.use-case'
import { AppError } from '../../../utils/AppError'

describe('getExecutionHistory', () => {
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

  describe('getExecutionHistory - casos de sucesso', () => {
    it('retorna lista vazia quando não há histórico', async () => {
      const result = await getExecutionHistory({ scenarioId, userId })

      expect(result).toHaveLength(0)
      expect(Array.isArray(result)).toBe(true)
    })

    it('retorna histórico ordenado por data de criação (mais recente primeiro)', async () => {
      // Criar múltiplos históricos
      const histories = []
      for (let i = 0; i < 3; i++) {
        const history = await prisma.scenarioExecutionHistory.create({
          data: {
            action: `ACTION_${i + 1}`,
            description: `Descrição ${i + 1}`,
            metadata: JSON.stringify({ step: i + 1 }),
            scenarioId,
            userId
          }
        })
        histories.push(history)
      }

      const result = await getExecutionHistory({ scenarioId, userId })

      expect(result).toHaveLength(3)
      
      // Verificar se está ordenado por createdAt desc
      for (let i = 0; i < result.length - 1; i++) {
        expect(new Date(result[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(result[i + 1].createdAt).getTime()
        )
      }
    })

    it('inclui dados do usuário para cada entrada', async () => {
      // Criar histórico
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug criado',
          metadata: JSON.stringify({ bugId: 123 }),
          scenarioId,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].user).toMatchObject({
        id: userId,
        name: 'Test User',
        email: 'user@example.com',
        avatar: null
      })
    })

    it('parse metadata corretamente', async () => {
      const metadata = { bugId: 123, severity: 'HIGH' }
      
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug criado',
          metadata: JSON.stringify(metadata),
          scenarioId,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].metadata).toEqual(metadata)
    })

    it('retorna metadata null quando não há metadata', async () => {
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'SCENARIO_EXECUTED',
          description: 'Cenário executado',
          metadata: null,
          scenarioId,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].metadata).toBeNull()
    })

    it('retorna diferentes tipos de ações', async () => {
      const actions = ['BUG_CREATED', 'SCENARIO_EXECUTED', 'COMMENT_ADDED', 'ATTACHMENT_UPLOADED']
      
      for (const action of actions) {
        await prisma.scenarioExecutionHistory.create({
          data: {
            action,
            description: `Ação: ${action}`,
            metadata: JSON.stringify({ type: action }),
            scenarioId,
            userId
          }
        })
      }

      const result = await getExecutionHistory({ scenarioId, userId })

      expect(result).toHaveLength(4)
      
      const resultActions = result.map(h => h.action)
      actions.forEach(action => {
        expect(resultActions).toContain(action)
      })
    })

    it('funciona com userId inválido (não afeta a operação)', async () => {
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug criado',
          metadata: JSON.stringify({ bugId: 123 }),
          scenarioId,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId: 99999 })

      expect(result).toHaveLength(1)
      expect(result[0].action).toBe('BUG_CREATED')
    })

    it('retorna histórico com descrições longas', async () => {
      const longDescription = 'A'.repeat(500)
      
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: longDescription,
          metadata: JSON.stringify({ description: longDescription }),
          scenarioId,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].description).toBe(longDescription)
    })

    it('retorna histórico com metadata complexa', async () => {
      const complexMetadata = {
        bugId: 123,
        severity: 'HIGH',
        steps: [1, 2, 3],
        user: { id: userId, name: 'Test User' },
        timestamp: new Date().toISOString()
      }
      
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug com metadata complexa',
          metadata: JSON.stringify(complexMetadata),
          scenarioId,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].metadata).toEqual(complexMetadata)
    })
  })

  describe('getExecutionHistory - casos de erro', () => {
    it('rejeita quando cenário não existe', async () => {
      await expect(getExecutionHistory({ scenarioId: 99999, userId })).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )
    })

    it('rejeita quando scenarioId é inválido', async () => {
      await expect(getExecutionHistory({ scenarioId: -1, userId })).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )
    })

    it('rejeita quando scenarioId é zero', async () => {
      await expect(getExecutionHistory({ scenarioId: 0, userId })).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )
    })

    it('rejeita quando scenarioId é string inválida', async () => {
      await expect(getExecutionHistory({ scenarioId: 'invalid' as any, userId })).rejects.toThrow()
    })

    it('rejeita quando scenarioId é null', async () => {
      await expect(getExecutionHistory({ scenarioId: null as any, userId })).rejects.toThrow()
    })

    it('rejeita quando scenarioId é undefined', async () => {
      await expect(getExecutionHistory({ scenarioId: undefined as any, userId })).rejects.toThrow()
    })
  })

  describe('getExecutionHistory - casos especiais', () => {
    it('funciona com cenário que tem muito histórico', async () => {
      // Criar muito histórico
      const histories = []
      for (let i = 0; i < 10; i++) {
        const history = await prisma.scenarioExecutionHistory.create({
          data: {
            action: `ACTION_${i + 1}`,
            description: `Descrição ${i + 1}`,
            metadata: JSON.stringify({ index: i + 1 }),
            scenarioId,
            userId
          }
        })
        histories.push(history)
      }

      const result = await getExecutionHistory({ scenarioId, userId })

      expect(result).toHaveLength(10)
      expect(Array.isArray(result)).toBe(true)
    })

    it('funciona com histórico criado por diferentes usuários', async () => {
      // Criar outro usuário
      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other@example.com',
          password: 'password123'
        }
      })

      // Criar histórico com outro usuário
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug criado por outro usuário',
          metadata: JSON.stringify({ userId: otherUser.id }),
          scenarioId,
          userId: otherUser.id
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].user.name).toBe('Other User')

      // Limpar usuário adicional
      await prisma.user.delete({ where: { id: otherUser.id } })
    })

    it('funciona com metadata contendo caracteres especiais', async () => {
      const specialMetadata = {
        description: 'Bug com @#$%^&*()_+{}|:"<>?[]\\;\',./',
        emoji: '🐛 🚀 ✅ ❌ 🎉',
        multiline: 'Bug\ncom\nquebras\nde\nlinha'
      }
      
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug com caracteres especiais',
          metadata: JSON.stringify(specialMetadata),
          scenarioId,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].metadata).toEqual(specialMetadata)
    })

    it('funciona com metadata JSON inválida', async () => {
      // Criar histórico com metadata JSON inválida
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug com metadata inválida',
          metadata: 'invalid json',
          scenarioId,
          userId
        }
      })

      // Deve lançar erro ao tentar fazer parse
      await expect(getExecutionHistory({ scenarioId, userId })).rejects.toThrow()
    })

    it('funciona com cenário de outro projeto', async () => {
      // Criar outro projeto e cenário
      const otherProject = await prisma.project.create({
        data: {
          name: 'Other Project',
          description: 'Other Description',
          ownerId: userId
        }
      })

      const otherScenario = await prisma.testScenario.create({
        data: {
          title: 'Other Scenario',
          description: 'Other Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId: otherProject.id
        }
      })

      // Criar histórico no outro cenário
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug em outro cenário',
          metadata: JSON.stringify({ scenarioId: otherScenario.id }),
          scenarioId: otherScenario.id,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      // Não deve retornar histórico do outro cenário
      expect(result).toHaveLength(0)

      // Limpar dados adicionais
      await prisma.scenarioExecutionHistory.deleteMany({
        where: { scenarioId: otherScenario.id }
      })
      await prisma.testScenario.deleteMany({
        where: { projectId: otherProject.id }
      })
      await prisma.project.deleteMany({
        where: { id: otherProject.id }
      })
    })
  })

  describe('getExecutionHistory - validação de tipos de retorno', () => {
    it('retorna array de objetos com propriedades corretas', async () => {
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug criado',
          metadata: JSON.stringify({ bugId: 123 }),
          scenarioId,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      result.forEach(entry => {
        expect(entry).toHaveProperty('id')
        expect(entry).toHaveProperty('action')
        expect(entry).toHaveProperty('description')
        expect(entry).toHaveProperty('metadata')
        expect(entry).toHaveProperty('scenarioId')
        expect(entry).toHaveProperty('userId')
        expect(entry).toHaveProperty('createdAt')
        expect(entry).toHaveProperty('user')
      })
    })

    it('retorna tipos corretos para propriedades', async () => {
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug criado',
          metadata: JSON.stringify({ bugId: 123 }),
          scenarioId,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      result.forEach(entry => {
        expect(typeof entry.id).toBe('number')
        expect(typeof entry.action).toBe('string')
        expect(typeof entry.description).toBe('string')
        expect(typeof entry.scenarioId).toBe('number')
        expect(typeof entry.userId).toBe('number')
        expect(typeof entry.createdAt).toBe('object')
        expect(typeof entry.user).toBe('object')
      })
    })

    it('retorna user com estrutura correta', async () => {
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug criado',
          metadata: JSON.stringify({ bugId: 123 }),
          scenarioId,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      result.forEach(entry => {
        expect(entry.user).toHaveProperty('id')
        expect(entry.user).toHaveProperty('name')
        expect(entry.user).toHaveProperty('email')
        expect(entry.user).toHaveProperty('avatar')
      })
    })

    it('retorna metadata parseada corretamente', async () => {
      const metadata = { bugId: 123, severity: 'HIGH' }
      
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug criado',
          metadata: JSON.stringify(metadata),
          scenarioId,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      result.forEach(entry => {
        if (entry.metadata) {
          expect(typeof entry.metadata).toBe('object')
          expect(entry.metadata).not.toBeInstanceOf(String)
        }
      })
    })
  })

  describe('getExecutionHistory - integração com banco de dados', () => {
    it('retorna dados consistentes com o banco', async () => {
      const metadata = { bugId: 123, severity: 'HIGH' }
      
      const history = await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug criado',
          metadata: JSON.stringify(metadata),
          scenarioId,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(history.id)
      expect(result[0].action).toBe('BUG_CREATED')
      expect(result[0].description).toBe('Bug criado')
      expect(result[0].metadata).toEqual(metadata)
    })

    it('retorna apenas histórico do cenário especificado', async () => {
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

      // Criar histórico em ambos os cenários
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug no cenário original',
          metadata: JSON.stringify({ scenarioId }),
          scenarioId,
          userId
        }
      })

      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'BUG_CREATED',
          description: 'Bug no outro cenário',
          metadata: JSON.stringify({ scenarioId: otherScenario.id }),
          scenarioId: otherScenario.id,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      // Deve retornar apenas histórico do cenário especificado
      expect(result).toHaveLength(1)
      expect(result[0].scenarioId).toBe(scenarioId)
      expect(result[0].description).toBe('Bug no cenário original')
    })

    it('retorna histórico ordenado corretamente', async () => {
      // Criar histórico com delay para garantir ordem diferente
      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'FIRST_ACTION',
          description: 'Primeira ação',
          metadata: JSON.stringify({ order: 1 }),
          scenarioId,
          userId
        }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      await prisma.scenarioExecutionHistory.create({
        data: {
          action: 'SECOND_ACTION',
          description: 'Segunda ação',
          metadata: JSON.stringify({ order: 2 }),
          scenarioId,
          userId
        }
      })

      const result = await getExecutionHistory({ scenarioId, userId })

      // A segunda ação deve ser a primeira (mais recente)
      expect(result[0].action).toBe('SECOND_ACTION')
      expect(result[1].action).toBe('FIRST_ACTION')
    })
  })
})

