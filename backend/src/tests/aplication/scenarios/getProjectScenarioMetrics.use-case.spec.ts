import { prisma } from '../../../infrastructure/prisma'
import { getProjectScenarioMetrics } from '../../../application/use-cases/scenarios/getProjectScenarioMetrics.use-case'
import { AppError } from '../../../utils/AppError'

describe('getProjectScenarioMetrics', () => {
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

  describe('getProjectScenarioMetrics - casos de sucesso', () => {
    it('retorna métricas zeradas quando não há cenários', async () => {
      const result = await getProjectScenarioMetrics({ projectId })

      expect(result).toEqual({
        created: 0,
        executed: 0,
        passed: 0,
        failed: 0
      })
    })

    it('retorna métricas com cenários de diferentes status', async () => {
      // Criar cenários com diferentes status
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
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Scenario 3',
            description: 'Description 3',
            projectId,
            release: '2024-01',
            status: 'EXECUTED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Scenario 4',
            description: 'Description 4',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Scenario 5',
            description: 'Description 5',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Scenario 6',
            description: 'Description 6',
            projectId,
            release: '2024-01',
            status: 'FAILED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectScenarioMetrics({ projectId })

      expect(result).toEqual({
        created: 2,
        executed: 1,
        passed: 2,
        failed: 1
      })
    })

    it('retorna métricas filtradas por release', async () => {
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
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Scenario 3',
            description: 'Description 3',
            projectId,
            release: '2024-02',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Scenario 4',
            description: 'Description 4',
            projectId,
            release: '2024-02',
            status: 'FAILED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectScenarioMetrics({ projectId, release: '2024-01' })

      expect(result).toEqual({
        created: 1,
        executed: 0,
        passed: 1,
        failed: 0
      })
    })

    it('retorna métricas sem filtro de release quando release não é especificada', async () => {
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

      const result = await getProjectScenarioMetrics({ projectId })

      expect(result).toEqual({
        created: 1,
        executed: 0,
        passed: 1,
        failed: 0
      })
    })

    it('retorna métricas com apenas um status', async () => {
      // Criar apenas cenários com status CREATED
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
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Scenario 3',
            description: 'Description 3',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectScenarioMetrics({ projectId })

      expect(result).toEqual({
        created: 3,
        executed: 0,
        passed: 0,
        failed: 0
      })
    })

    it('retorna métricas com muitos cenários', async () => {
      // Criar muitos cenários
      const scenarios = []
      for (let i = 0; i < 50; i++) {
        const statuses = ['CREATED', 'EXECUTED', 'PASSED', 'FAILED'] as const
        const status = statuses[i % 4]
        
        scenarios.push({
          title: `Scenario ${i}`,
          description: `Description ${i}`,
          projectId,
          release: '2024-01',
          status,
          type: 'FUNCTIONAL' as const,
          priority: 'MEDIUM' as const
        })
      }

      await prisma.testScenario.createMany({
        data: scenarios
      })

      const result = await getProjectScenarioMetrics({ projectId })

      // Deve ter 12-13 cenários de cada status (50/4)
      expect(result.created).toBeGreaterThanOrEqual(12)
      expect(result.executed).toBeGreaterThanOrEqual(12)
      expect(result.passed).toBeGreaterThanOrEqual(12)
      expect(result.failed).toBeGreaterThanOrEqual(12)
      expect(result.created + result.executed + result.passed + result.failed).toBe(50)
    })
  })

  describe('getProjectScenarioMetrics - casos de erro', () => {
    it('rejeita quando projeto não existe', async () => {
      const nonExistentProjectId = 999999

      await expect(getProjectScenarioMetrics({ projectId: nonExistentProjectId })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é inválido', async () => {
      await expect(getProjectScenarioMetrics({ projectId: 0 })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é negativo', async () => {
      await expect(getProjectScenarioMetrics({ projectId: -1 })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é undefined', async () => {
      await expect(getProjectScenarioMetrics({ projectId: undefined as any })).rejects.toThrow()
    })

    it('rejeita quando projectId é null', async () => {
      await expect(getProjectScenarioMetrics({ projectId: null as any })).rejects.toThrow()
    })
  })

  describe('getProjectScenarioMetrics - validação de entrada', () => {
    it('aceita release como string vazia', async () => {
      const result = await getProjectScenarioMetrics({ projectId, release: '' })

      expect(result).toEqual({
        created: 0,
        executed: 0,
        passed: 0,
        failed: 0
      })
    })

    it('aceita release como undefined', async () => {
      const result = await getProjectScenarioMetrics({ projectId, release: undefined })

      expect(result).toEqual({
        created: 0,
        executed: 0,
        passed: 0,
        failed: 0
      })
    })

    it('aceita release como null', async () => {
      const result = await getProjectScenarioMetrics({ projectId, release: null as any })

      expect(result).toEqual({
        created: 0,
        executed: 0,
        passed: 0,
        failed: 0
      })
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

        const result = await getProjectScenarioMetrics({ projectId, release })

        expect(result.created).toBe(1)
        expect(result.executed).toBe(0)
        expect(result.passed).toBe(0)
        expect(result.failed).toBe(0)

        // Limpar para próximo teste
        await prisma.testScenario.deleteMany({
          where: { projectId, release }
        })
      }
    })
  })

  describe('getProjectScenarioMetrics - casos especiais', () => {
    it('funciona com projeto que tem cenários de diferentes tipos', async () => {
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

      const result = await getProjectScenarioMetrics({ projectId })

      expect(result).toEqual({
        created: 1,
        executed: 1,
        passed: 1,
        failed: 1
      })
    })

    it('funciona com projeto que tem cenários de diferentes prioridades', async () => {
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

      const result = await getProjectScenarioMetrics({ projectId })

      expect(result).toEqual({
        created: 1,
        executed: 1,
        passed: 1,
        failed: 1
      })
    })

    it('funciona com projeto que tem cenários de diferentes ambientes', async () => {
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

      const result = await getProjectScenarioMetrics({ projectId })

      expect(result).toEqual({
        created: 1,
        executed: 1,
        passed: 1,
        failed: 1
      })
    })

    it('funciona com projeto que tem cenários com assigneeEmail', async () => {
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

      const result = await getProjectScenarioMetrics({ projectId })

      expect(result).toEqual({
        created: 1,
        executed: 0,
        passed: 1,
        failed: 0
      })
    })

    it('funciona com projeto que tem cenários com tags', async () => {
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

      const result = await getProjectScenarioMetrics({ projectId })

      expect(result).toEqual({
        created: 1,
        executed: 0,
        passed: 1,
        failed: 0
      })
    })

    it('funciona com projeto que tem cenários com steps', async () => {
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

      // Criar steps para o cenário
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

      const result = await getProjectScenarioMetrics({ projectId })

      expect(result).toEqual({
        created: 1,
        executed: 0,
        passed: 0,
        failed: 0
      })
    })
  })

  describe('getProjectScenarioMetrics - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const result = await getProjectScenarioMetrics({ projectId })

      expect(result).toHaveProperty('created')
      expect(result).toHaveProperty('executed')
      expect(result).toHaveProperty('passed')
      expect(result).toHaveProperty('failed')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await getProjectScenarioMetrics({ projectId })

      expect(typeof result.created).toBe('number')
      expect(typeof result.executed).toBe('number')
      expect(typeof result.passed).toBe('number')
      expect(typeof result.failed).toBe('number')
    })

    it('retorna valores não negativos', async () => {
      const result = await getProjectScenarioMetrics({ projectId })

      expect(result.created).toBeGreaterThanOrEqual(0)
      expect(result.executed).toBeGreaterThanOrEqual(0)
      expect(result.passed).toBeGreaterThanOrEqual(0)
      expect(result.failed).toBeGreaterThanOrEqual(0)
    })

    it('retorna valores inteiros', async () => {
      const result = await getProjectScenarioMetrics({ projectId })

      expect(Number.isInteger(result.created)).toBe(true)
      expect(Number.isInteger(result.executed)).toBe(true)
      expect(Number.isInteger(result.passed)).toBe(true)
      expect(Number.isInteger(result.failed)).toBe(true)
    })
  })

  describe('getProjectScenarioMetrics - casos de edge', () => {
    it('funciona com projeto que tem muitos cenários de um status', async () => {
      // Criar muitos cenários com status CREATED
      const scenarios = []
      for (let i = 0; i < 1000; i++) {
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

      const result = await getProjectScenarioMetrics({ projectId })

      expect(result.created).toBe(1000)
      expect(result.executed).toBe(0)
      expect(result.passed).toBe(0)
      expect(result.failed).toBe(0)
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

      const result = await getProjectScenarioMetrics({ projectId })

      expect(result.created).toBe(1)
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

      const result = await getProjectScenarioMetrics({ projectId })

      expect(result.created).toBe(1)
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

      const result = await getProjectScenarioMetrics({ projectId })

      expect(result.created).toBe(1)
    })
  })
})
