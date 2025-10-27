import { prisma } from '../../../infrastructure/prisma'
import { getBugs } from '../../../application/use-cases/execution/getBugs.use-case'
import { AppError } from '../../../utils/AppError'

describe('getBugs', () => {
  let projectId: number
  let scenarioId: number
  let userId: number
  let bugIds: number[] = []

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

    // Criar múltiplos bugs para teste
    const bugs = await Promise.all([
      prisma.bug.create({
        data: {
          title: 'Bug 1',
          description: 'Descrição do bug 1',
          severity: 'HIGH',
          scenarioId,
          projectId,
          createdBy: userId
        }
      }),
      prisma.bug.create({
        data: {
          title: 'Bug 2',
          description: 'Descrição do bug 2',
          severity: 'MEDIUM',
          scenarioId,
          projectId,
          createdBy: userId
        }
      }),
      prisma.bug.create({
        data: {
          title: 'Bug 3',
          description: 'Descrição do bug 3',
          severity: 'LOW',
          scenarioId,
          projectId,
          createdBy: userId
        }
      })
    ])

    bugIds = bugs.map(bug => bug.id)
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

  describe('getBugs - casos de sucesso', () => {
    it('retorna lista de bugs do cenário', async () => {
      const result = await getBugs({ scenarioId, userId })

      expect(result).toHaveLength(3)
      
      // Verificar se todos os bugs estão presentes (ordem pode variar)
      const titles = result.map(bug => bug.title).sort()
      expect(titles).toEqual(['Bug 1', 'Bug 2', 'Bug 3'])
      
      const severities = result.map(bug => bug.severity).sort()
      expect(severities).toEqual(['HIGH', 'LOW', 'MEDIUM'])
      
      // Verificar se todos têm o scenarioId correto
      result.forEach(bug => {
        expect(bug.scenarioId).toBe(scenarioId)
      })
    })

    it('retorna lista vazia quando não há bugs', async () => {
      // Criar cenário sem bugs
      const emptyScenario = await prisma.testScenario.create({
        data: {
          title: 'Empty Scenario',
          description: 'Scenario without bugs',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId
        }
      })

      const result = await getBugs({ scenarioId: emptyScenario.id, userId })

      expect(result).toHaveLength(0)
      expect(Array.isArray(result)).toBe(true)
    })

    it('retorna bugs ordenados por data de criação (mais recente primeiro)', async () => {
      const result = await getBugs({ scenarioId, userId })

      expect(result).toHaveLength(3)
      
      // Verificar se está ordenado por createdAt desc
      for (let i = 0; i < result.length - 1; i++) {
        expect(new Date(result[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(result[i + 1].createdAt).getTime()
        )
      }
    })

    it('inclui dados do criador para cada bug', async () => {
      const result = await getBugs({ scenarioId, userId })

      expect(result).toHaveLength(3)
      
      result.forEach(bug => {
        expect(bug.creator).toMatchObject({
          id: userId,
          name: 'Test User',
          email: 'user@example.com',
          avatar: null
        })
      })
    })

    it('inclui dados do cenário para cada bug', async () => {
      const result = await getBugs({ scenarioId, userId })

      expect(result).toHaveLength(3)
      
      result.forEach(bug => {
        expect(bug.scenario).toMatchObject({
          id: scenarioId,
          title: 'Test Scenario'
        })
      })
    })

    it('retorna bugs com diferentes severidades', async () => {
      const result = await getBugs({ scenarioId, userId })

      const severities = result.map(bug => bug.severity)
      expect(severities).toContain('HIGH')
      expect(severities).toContain('MEDIUM')
      expect(severities).toContain('LOW')
    })

    it('retorna bugs com e sem descrição', async () => {
      // Criar bug sem descrição
      await prisma.bug.create({
        data: {
          title: 'Bug sem descrição',
          severity: 'CRITICAL',
          scenarioId,
          projectId,
          createdBy: userId
        }
      })

      const result = await getBugs({ scenarioId, userId })

      expect(result).toHaveLength(4)
      
      const bugsWithDescription = result.filter(bug => bug.description)
      const bugsWithoutDescription = result.filter(bug => !bug.description)
      
      expect(bugsWithDescription.length).toBeGreaterThan(0)
      expect(bugsWithoutDescription.length).toBeGreaterThan(0)
    })

    it('retorna bugs com etapa relacionada', async () => {
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
      await prisma.bug.create({
        data: {
          title: 'Bug com etapa relacionada',
          severity: 'HIGH',
          scenarioId,
          projectId,
          createdBy: userId,
          relatedStepId: step.id
        }
      })

      const result = await getBugs({ scenarioId, userId })

      const bugWithStep = result.find(bug => bug.relatedStepId === step.id)
      expect(bugWithStep).toBeTruthy()
      expect(bugWithStep?.title).toBe('Bug com etapa relacionada')
    })

    it('funciona com userId inválido (não afeta a operação)', async () => {
      const result = await getBugs({ scenarioId, userId: 99999 })

      expect(result).toHaveLength(3)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getBugs - casos de erro', () => {
    it('rejeita quando cenário não existe', async () => {
      await expect(getBugs({ scenarioId: 99999, userId })).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )
    })

    it('rejeita quando scenarioId é inválido', async () => {
      await expect(getBugs({ scenarioId: -1, userId })).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )
    })

    it('rejeita quando scenarioId é zero', async () => {
      await expect(getBugs({ scenarioId: 0, userId })).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )
    })

    it('rejeita quando scenarioId é string inválida', async () => {
      await expect(getBugs({ scenarioId: 'invalid' as any, userId })).rejects.toThrow()
    })

    it('rejeita quando scenarioId é null', async () => {
      await expect(getBugs({ scenarioId: null as any, userId })).rejects.toThrow()
    })

    it('rejeita quando scenarioId é undefined', async () => {
      await expect(getBugs({ scenarioId: undefined as any, userId })).rejects.toThrow()
    })
  })

  describe('getBugs - casos especiais', () => {
    it('funciona com cenário que tem muitos bugs', async () => {
      // Criar muitos bugs
      const manyBugs = []
      for (let i = 0; i < 10; i++) {
        const bug = await prisma.bug.create({
          data: {
            title: `Bug ${i + 4}`,
            severity: 'MEDIUM',
            scenarioId,
            projectId,
            createdBy: userId
          }
        })
        manyBugs.push(bug)
      }

      const result = await getBugs({ scenarioId, userId })

      expect(result).toHaveLength(13) // 3 originais + 10 novos
      expect(Array.isArray(result)).toBe(true)
    })

    it('funciona com bugs criados por diferentes usuários', async () => {
      // Criar outro usuário
      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other@example.com',
          password: 'password123'
        }
      })

      // Criar bug com outro usuário
      await prisma.bug.create({
        data: {
          title: 'Bug de outro usuário',
          severity: 'HIGH',
          scenarioId,
          projectId,
          createdBy: otherUser.id
        }
      })

      const result = await getBugs({ scenarioId, userId })

      expect(result).toHaveLength(4)
      
      const bugByOtherUser = result.find(bug => bug.createdBy === otherUser.id)
      expect(bugByOtherUser).toBeTruthy()
      expect(bugByOtherUser?.creator.name).toBe('Other User')

      // Limpar usuário adicional
      await prisma.user.delete({ where: { id: otherUser.id } })
    })

    it('funciona com bugs com títulos longos', async () => {
      const longTitle = 'A'.repeat(255)
      await prisma.bug.create({
        data: {
          title: longTitle,
          severity: 'HIGH',
          scenarioId,
          projectId,
          createdBy: userId
        }
      })

      const result = await getBugs({ scenarioId, userId })

      const bugWithLongTitle = result.find(bug => bug.title === longTitle)
      expect(bugWithLongTitle).toBeTruthy()
    })

    it('funciona com bugs com descrições longas', async () => {
      const longDescription = 'A'.repeat(1000)
      await prisma.bug.create({
        data: {
          title: 'Bug com descrição longa',
          description: longDescription,
          severity: 'MEDIUM',
          scenarioId,
          projectId,
          createdBy: userId
        }
      })

      const result = await getBugs({ scenarioId, userId })

      const bugWithLongDescription = result.find(bug => bug.description === longDescription)
      expect(bugWithLongDescription).toBeTruthy()
    })

    it('funciona com bugs contendo caracteres especiais', async () => {
      const specialTitle = 'Bug com @#$%^&*()_+{}|:"<>?[]\\;\',./'
      await prisma.bug.create({
        data: {
          title: specialTitle,
          severity: 'LOW',
          scenarioId,
          projectId,
          createdBy: userId
        }
      })

      const result = await getBugs({ scenarioId, userId })

      const bugWithSpecialChars = result.find(bug => bug.title === specialTitle)
      expect(bugWithSpecialChars).toBeTruthy()
    })

    it('funciona com bugs contendo emojis', async () => {
      const emojiTitle = 'Bug com emojis 🐛 🚀 ✅ ❌ 🎉'
      await prisma.bug.create({
        data: {
          title: emojiTitle,
          severity: 'HIGH',
          scenarioId,
          projectId,
          createdBy: userId
        }
      })

      const result = await getBugs({ scenarioId, userId })

      const bugWithEmojis = result.find(bug => bug.title === emojiTitle)
      expect(bugWithEmojis).toBeTruthy()
    })
  })

  describe('getBugs - validação de tipos de retorno', () => {
    it('retorna array de objetos com propriedades corretas', async () => {
      const result = await getBugs({ scenarioId, userId })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      result.forEach(bug => {
        expect(bug).toHaveProperty('id')
        expect(bug).toHaveProperty('title')
        expect(bug).toHaveProperty('description')
        expect(bug).toHaveProperty('severity')
        expect(bug).toHaveProperty('scenarioId')
        expect(bug).toHaveProperty('projectId')
        expect(bug).toHaveProperty('createdBy')
        expect(bug).toHaveProperty('createdAt')
        expect(bug).toHaveProperty('updatedAt')
        expect(bug).toHaveProperty('creator')
        expect(bug).toHaveProperty('scenario')
      })
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await getBugs({ scenarioId, userId })

      result.forEach(bug => {
        expect(typeof bug.id).toBe('number')
        expect(typeof bug.title).toBe('string')
        expect(typeof bug.severity).toBe('string')
        expect(typeof bug.scenarioId).toBe('number')
        expect(typeof bug.projectId).toBe('number')
        expect(typeof bug.createdBy).toBe('number')
        expect(typeof bug.createdAt).toBe('object')
        expect(typeof bug.updatedAt).toBe('object')
        expect(typeof bug.creator).toBe('object')
        expect(typeof bug.scenario).toBe('object')
      })
    })

    it('retorna creator com estrutura correta', async () => {
      const result = await getBugs({ scenarioId, userId })

      result.forEach(bug => {
        expect(bug.creator).toHaveProperty('id')
        expect(bug.creator).toHaveProperty('name')
        expect(bug.creator).toHaveProperty('email')
        expect(bug.creator).toHaveProperty('avatar')
      })
    })

    it('retorna scenario com estrutura correta', async () => {
      const result = await getBugs({ scenarioId, userId })

      result.forEach(bug => {
        expect(bug.scenario).toHaveProperty('id')
        expect(bug.scenario).toHaveProperty('title')
      })
    })
  })

  describe('getBugs - integração com banco de dados', () => {
    it('retorna dados consistentes com o banco', async () => {
      const result = await getBugs({ scenarioId, userId })

      // Verificar se todos os bugs retornados existem no banco
      for (const bug of result) {
        const dbBug = await prisma.bug.findUnique({
          where: { id: bug.id }
        })
        expect(dbBug).toBeTruthy()
        expect(dbBug?.title).toBe(bug.title)
        expect(dbBug?.severity).toBe(bug.severity)
      }
    })

    it('retorna apenas bugs do cenário especificado', async () => {
      // Criar outro cenário com bug
      const otherScenario = await prisma.testScenario.create({
        data: {
          title: 'Other Scenario',
          description: 'Other Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId
        }
      })

      await prisma.bug.create({
        data: {
          title: 'Bug de outro cenário',
          severity: 'HIGH',
          scenarioId: otherScenario.id,
          projectId,
          createdBy: userId
        }
      })

      const result = await getBugs({ scenarioId, userId })

      // Verificar se não retorna bugs de outros cenários
      result.forEach(bug => {
        expect(bug.scenarioId).toBe(scenarioId)
      })

      // Verificar se retorna apenas bugs do cenário correto
      const otherScenarioBugs = result.filter(bug => bug.scenarioId === otherScenario.id)
      expect(otherScenarioBugs).toHaveLength(0)
    })

    it('retorna bugs ordenados corretamente', async () => {
      // Criar bug com delay para garantir ordem diferente
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const latestBug = await prisma.bug.create({
        data: {
          title: 'Latest Bug',
          severity: 'CRITICAL',
          scenarioId,
          projectId,
          createdBy: userId
        }
      })

      const result = await getBugs({ scenarioId, userId })

      // O bug mais recente deve ser o primeiro
      expect(result[0].id).toBe(latestBug.id)
      expect(result[0].title).toBe('Latest Bug')
    })
  })
})
