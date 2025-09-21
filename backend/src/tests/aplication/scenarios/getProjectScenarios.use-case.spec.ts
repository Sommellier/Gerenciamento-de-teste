import { prisma } from '../../../infrastructure/prisma'
import { getProjectScenarios } from '../../../application/use-cases/scenarios/getProjectScenarios.use-case'
import { AppError } from '../../../utils/AppError'

describe('getProjectScenarios', () => {
  let projectId: number
  let ownerId: number

  beforeEach(async () => {
    // Criar usuário dono do projeto
    const owner = await prisma.user.create({
      data: {
        name: 'Project Owner',
        email: 'owner@example.com',
        password: 'password123'
      }
    })
    ownerId = owner.id

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId
      }
    })
    projectId = project.id
  })

  afterEach(async () => {
    // Limpar dados de teste
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
      where: {
        email: 'owner@example.com'
      }
    })
  })

  describe('getProjectScenarios - casos de sucesso', () => {
    it('retorna array vazio quando não há cenários', async () => {
      const result = await getProjectScenarios({ projectId })

      expect(result).toEqual([])
    })

    it('retorna cenários ordenados por data de criação decrescente', async () => {
      // Criar cenários em momentos diferentes
      const scenario1 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 1',
          description: 'Description 1',
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      // Aguardar um pouco para garantir diferença de tempo
      await new Promise(resolve => setTimeout(resolve, 10))

      const scenario2 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 2',
          description: 'Description 2',
          projectId,
          release: '2024-01',
          status: 'PASSED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(scenario2.id) // Mais recente primeiro
      expect(result[1].id).toBe(scenario1.id) // Mais antigo por último
    })

    it('retorna cenários filtrados por release', async () => {
      // Criar cenários com diferentes releases
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Scenario 2',
            description: 'Description 2',
            projectId,
            release: '2024-02',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectScenarios({ projectId, release: '2024-01' })

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Scenario 1')
      expect(result[0].release).toBe('2024-01')
    })

    it('retorna cenários sem filtro de release quando release não é especificada', async () => {
      // Criar cenários com diferentes releases
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Scenario 2',
            description: 'Description 2',
            projectId,
            release: '2024-02',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(2)
    })

    it('retorna cenários com steps ordenados por stepOrder', async () => {
      // Criar cenário com steps
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Scenario with Steps',
          description: 'Description',
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      // Criar steps em ordem aleatória
      await prisma.testScenarioStep.createMany({
        data: [
          {
            scenarioId: scenario.id,
            stepOrder: 3,
            action: 'Action 3',
            expected: 'Expected 3'
          },
          {
            scenarioId: scenario.id,
            stepOrder: 1,
            action: 'Action 1',
            expected: 'Expected 1'
          },
          {
            scenarioId: scenario.id,
            stepOrder: 2,
            action: 'Action 2',
            expected: 'Expected 2'
          }
        ]
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(1)
      expect(result[0].steps).toHaveLength(3)
      expect(result[0].steps[0].stepOrder).toBe(1)
      expect(result[0].steps[1].stepOrder).toBe(2)
      expect(result[0].steps[2].stepOrder).toBe(3)
    })

    it('retorna cenários com diferentes tipos', async () => {
      // Criar cenários de diferentes tipos
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Functional Scenario',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Regression Scenario',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'REGRESSION',
            priority: 'HIGH'
          },
          {
            title: 'Smoke Scenario',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'EXECUTED',
            type: 'SMOKE',
            priority: 'LOW'
          },
          {
            title: 'E2E Scenario',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'FAILED',
            type: 'E2E',
            priority: 'CRITICAL'
          }
        ]
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(4)
      expect(result.map(s => s.type)).toEqual(expect.arrayContaining(['E2E', 'SMOKE', 'REGRESSION', 'FUNCTIONAL']))
    })

    it('retorna cenários com diferentes prioridades', async () => {
      // Criar cenários de diferentes prioridades
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Low Priority Scenario',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'LOW'
          },
          {
            title: 'Medium Priority Scenario',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'High Priority Scenario',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'EXECUTED',
            type: 'FUNCTIONAL',
            priority: 'HIGH'
          },
          {
            title: 'Critical Priority Scenario',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'FAILED',
            type: 'FUNCTIONAL',
            priority: 'CRITICAL'
          }
        ]
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(4)
      expect(result.map(s => s.priority)).toEqual(expect.arrayContaining(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']))
    })

    it('retorna cenários com diferentes ambientes', async () => {
      // Criar cenários de diferentes ambientes
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'DEV Scenario',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            environment: 'DEV'
          },
          {
            title: 'QA Scenario',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            environment: 'QA'
          },
          {
            title: 'STAGING Scenario',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'EXECUTED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            environment: 'STAGING'
          },
          {
            title: 'PROD Scenario',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'FAILED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            environment: 'PROD'
          }
        ]
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(4)
      expect(result.map(s => s.environment)).toEqual(expect.arrayContaining(['PROD', 'STAGING', 'QA', 'DEV']))
    })

    it('retorna cenários com assigneeEmail', async () => {
      // Criar cenários com assigneeEmail
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            assigneeEmail: 'assignee1@example.com'
          },
          {
            title: 'Scenario 2',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            assigneeEmail: 'assignee2@example.com'
          }
        ]
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(2)
      expect(result.map(s => s.assigneeEmail)).toEqual(expect.arrayContaining(['assignee1@example.com', 'assignee2@example.com']))
    })

    it('retorna cenários com tags', async () => {
      // Criar cenários com tags
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            tags: ['tag1', 'tag2']
          },
          {
            title: 'Scenario 2',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            tags: ['tag3', 'tag4']
          }
        ]
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(2)
      expect(result.map(s => s.tags)).toEqual(expect.arrayContaining([['tag1', 'tag2'], ['tag3', 'tag4']]))
    })
  })

  describe('getProjectScenarios - casos de erro', () => {
    it('rejeita quando projeto não existe', async () => {
      const nonExistentProjectId = 999999

      await expect(getProjectScenarios({ projectId: nonExistentProjectId })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é inválido', async () => {
      await expect(getProjectScenarios({ projectId: 0 })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é negativo', async () => {
      await expect(getProjectScenarios({ projectId: -1 })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é undefined', async () => {
      await expect(getProjectScenarios({ projectId: undefined as any })).rejects.toThrow()
    })

    it('rejeita quando projectId é null', async () => {
      await expect(getProjectScenarios({ projectId: null as any })).rejects.toThrow()
    })
  })

  describe('getProjectScenarios - validação de entrada', () => {
    it('aceita release como string vazia', async () => {
      const result = await getProjectScenarios({ projectId, release: '' })

      expect(result).toEqual([])
    })

    it('aceita release como undefined', async () => {
      const result = await getProjectScenarios({ projectId, release: undefined })

      expect(result).toEqual([])
    })

    it('aceita release como null', async () => {
      const result = await getProjectScenarios({ projectId, release: null as any })

      expect(result).toEqual([])
    })

    it('aceita diferentes formatos de release válidos', async () => {
      const releases = ['2024-01', '2024-12', '2023-06', '2025-03']
      
      for (const release of releases) {
        await prisma.testScenario.create({
          data: {
            title: `Scenario ${release}`,
            description: `Description ${release}`,
            projectId,
            release,
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        })

        const result = await getProjectScenarios({ projectId, release })

        expect(result).toHaveLength(1)
        expect(result[0].release).toBe(release)

        // Limpar para próximo teste
        await prisma.testScenario.deleteMany({
          where: { projectId, release }
        })
      }
    })
  })

  describe('getProjectScenarios - casos especiais', () => {
    it('funciona com projeto que tem muitos cenários', async () => {
      // Criar muitos cenários
      const scenarios = []
      for (let i = 0; i < 100; i++) {
        scenarios.push({
          title: `Scenario ${i}`,
          description: `Description ${i}`,
          projectId,
          release: '2024-01',
          status: 'CREATED' as const,
          type: 'FUNCTIONAL' as const,
          priority: 'MEDIUM' as const
        })
      }

      await prisma.testScenario.createMany({
        data: scenarios
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(100)
      // Verificar se está ordenado por createdAt desc
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(result[i + 1].createdAt.getTime())
      }
    })

    it('funciona com projeto que tem cenários com títulos longos', async () => {
      const longTitle = 'A'.repeat(255)
      await prisma.testScenario.create({
        data: {
          title: longTitle,
          description: 'Description',
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe(longTitle)
    })

    it('funciona com projeto que tem cenários com descrições longas', async () => {
      const longDescription = 'A'.repeat(1000)
      await prisma.testScenario.create({
        data: {
          title: 'Scenario',
          description: longDescription,
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(1)
      expect(result[0].description).toBe(longDescription)
    })

    it('funciona com projeto que tem cenários com muitas tags', async () => {
      const manyTags = Array.from({ length: 20 }, (_, i) => `tag${i}`)
      await prisma.testScenario.create({
        data: {
          title: 'Scenario',
          description: 'Description',
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM',
          tags: manyTags
        }
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(1)
      expect(result[0].tags).toEqual(manyTags)
    })

    it('funciona com projeto que tem cenários com muitos steps', async () => {
      // Criar cenário com muitos steps
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Scenario with Many Steps',
          description: 'Description',
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      // Criar muitos steps
      const steps = []
      for (let i = 0; i < 50; i++) {
        steps.push({
          scenarioId: scenario.id,
          stepOrder: i + 1,
          action: `Action ${i + 1}`,
          expected: `Expected ${i + 1}`
        })
      }

      await prisma.testScenarioStep.createMany({
        data: steps
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(1)
      expect(result[0].steps).toHaveLength(50)
      // Verificar se steps estão ordenados por stepOrder
      for (let i = 0; i < result[0].steps.length - 1; i++) {
        expect(result[0].steps[i].stepOrder).toBeLessThan(result[0].steps[i + 1].stepOrder)
      }
    })
  })

  describe('getProjectScenarios - validação de tipos de retorno', () => {
    it('retorna array de objetos com propriedades corretas', async () => {
      await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectScenarios({ projectId })

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(1)
      
      const scenario = result[0]
      expect(scenario).toHaveProperty('id')
      expect(scenario).toHaveProperty('title')
      expect(scenario).toHaveProperty('description')
      expect(scenario).toHaveProperty('type')
      expect(scenario).toHaveProperty('priority')
      expect(scenario).toHaveProperty('tags')
      expect(scenario).toHaveProperty('assigneeEmail')
      expect(scenario).toHaveProperty('environment')
      expect(scenario).toHaveProperty('release')
      expect(scenario).toHaveProperty('projectId')
      expect(scenario).toHaveProperty('createdAt')
      expect(scenario).toHaveProperty('updatedAt')
      expect(scenario).toHaveProperty('steps')
    })

    it('retorna tipos corretos para propriedades', async () => {
      await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectScenarios({ projectId })

      const scenario = result[0]
      expect(typeof scenario.id).toBe('number')
      expect(typeof scenario.title).toBe('string')
      expect(typeof scenario.description).toBe('string')
      expect(typeof scenario.type).toBe('string')
      expect(typeof scenario.priority).toBe('string')
      expect(Array.isArray(scenario.tags)).toBe(true)
      expect(typeof scenario.assigneeEmail).toBe('object') // Pode ser null
      expect(typeof scenario.environment).toBe('object') // Pode ser null
      expect(typeof scenario.release).toBe('string')
      expect(typeof scenario.projectId).toBe('number')
      expect(scenario.createdAt).toBeInstanceOf(Date)
      expect(scenario.updatedAt).toBeInstanceOf(Date)
      expect(Array.isArray(scenario.steps)).toBe(true)
    })

    it('retorna array vazio quando não há cenários', async () => {
      const result = await getProjectScenarios({ projectId })

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })

    it('retorna steps com estrutura correta', async () => {
      // Criar cenário com steps
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      await prisma.testScenarioStep.createMany({
        data: [
          {
            scenarioId: scenario.id,
            stepOrder: 1,
            action: 'Action 1',
            expected: 'Expected 1'
          },
          {
            scenarioId: scenario.id,
            stepOrder: 2,
            action: 'Action 2',
            expected: 'Expected 2'
          }
        ]
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(1)
      expect(result[0].steps).toHaveLength(2)
      
      result[0].steps.forEach((step, index) => {
        expect(step).toHaveProperty('id')
        expect(step).toHaveProperty('action')
        expect(step).toHaveProperty('expected')
        expect(step).toHaveProperty('stepOrder')
        expect(step).toHaveProperty('createdAt')
        expect(step).toHaveProperty('updatedAt')
        
        expect(typeof step.id).toBe('number')
        expect(typeof step.action).toBe('string')
        expect(typeof step.expected).toBe('string')
        expect(typeof step.stepOrder).toBe('number')
        expect(step.createdAt).toBeInstanceOf(Date)
        expect(step.updatedAt).toBeInstanceOf(Date)
        expect(step.stepOrder).toBe(index + 1)
      })
    })
  })

  describe('getProjectScenarios - casos de edge', () => {
    it('funciona com projeto que tem apenas um cenário', async () => {
      await prisma.testScenario.create({
        data: {
          title: 'Single Scenario',
          description: 'Description',
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Single Scenario')
    })

    it('funciona com projeto que tem cenários com releases muito antigas', async () => {
      await prisma.testScenario.create({
        data: {
          title: 'Old Scenario',
          description: 'Description',
          projectId,
          release: '2020-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(1)
      expect(result[0].release).toBe('2020-01')
    })

    it('funciona com projeto que tem cenários com releases futuras', async () => {
      await prisma.testScenario.create({
        data: {
          title: 'Future Scenario',
          description: 'Description',
          projectId,
          release: '2030-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectScenarios({ projectId })

      expect(result).toHaveLength(1)
      expect(result[0].release).toBe('2030-01')
    })
  })
})
