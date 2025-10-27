import { prisma } from '../../../infrastructure/prisma'
import { getProjectMetrics } from '../../../application/use-cases/scenarios/getProjectMetrics.use-case'
import { AppError } from '../../../utils/AppError'

describe('getProjectMetrics', () => {
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
    await prisma.testPackage.deleteMany({
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

  describe('getProjectMetrics - casos de sucesso', () => {
    it('retorna métricas zeradas quando não há pacotes', async () => {
      const result = await getProjectMetrics({ projectId })

      expect(result).toEqual({
        created: 0,
        executed: 0,
        passed: 0,
        failed: 0
      })
    })

    it('retorna métricas com pacotes de diferentes status', async () => {
      // Criar pacotes com diferentes status
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description 1',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 2',
            description: 'Description 2',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 3',
            description: 'Description 3',
            projectId,
            release: '2024-01',
            status: 'EXECUTED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 4',
            description: 'Description 4',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 5',
            description: 'Description 5',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 6',
            description: 'Description 6',
            projectId,
            release: '2024-01',
            status: 'FAILED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectMetrics({ projectId })

      expect(result).toEqual({
        created: 2,
        executed: 1,
        passed: 2,
        failed: 1
      })
    })

    it('retorna métricas filtradas por release', async () => {
      // Criar pacotes com diferentes releases
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description 1',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 2',
            description: 'Description 2',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 3',
            description: 'Description 3',
            projectId,
            release: '2024-02',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 4',
            description: 'Description 4',
            projectId,
            release: '2024-02',
            status: 'FAILED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectMetrics({ projectId, release: '2024-01' })

      expect(result).toEqual({
        created: 1,
        executed: 0,
        passed: 1,
        failed: 0
      })
    })

    it('retorna métricas sem filtro de release quando release não é especificada', async () => {
      // Criar pacotes com diferentes releases
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description 1',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 2',
            description: 'Description 2',
            projectId,
            release: '2024-02',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectMetrics({ projectId })

      expect(result).toEqual({
        created: 1,
        executed: 0,
        passed: 1,
        failed: 0
      })
    })

    it('retorna métricas com apenas um status', async () => {
      // Criar apenas pacotes com status CREATED
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description 1',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 2',
            description: 'Description 2',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 3',
            description: 'Description 3',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectMetrics({ projectId })

      expect(result).toEqual({
        created: 3,
        executed: 0,
        passed: 0,
        failed: 0
      })
    })

    it('retorna métricas com muitos pacotes', async () => {
      // Criar muitos pacotes
      const packages = []
      for (let i = 0; i < 50; i++) {
        const statuses = ['CREATED', 'EXECUTED', 'PASSED', 'FAILED'] as const
        const status = statuses[i % 4]
        
        packages.push({
          title: `Package ${i}`,
          description: `Description ${i}`,
          projectId,
          release: '2024-01',
          status,
          type: 'FUNCTIONAL' as const,
          priority: 'MEDIUM' as const
        })
      }

      await prisma.testPackage.createMany({
        data: packages
      })

      const result = await getProjectMetrics({ projectId })

      // Deve ter 12-13 pacotes de cada status (50/4)
      expect(result.created).toBeGreaterThanOrEqual(12)
      expect(result.executed).toBeGreaterThanOrEqual(12)
      expect(result.passed).toBeGreaterThanOrEqual(12)
      expect(result.failed).toBeGreaterThanOrEqual(12)
      expect(result.created + result.executed + result.passed + result.failed).toBe(50)
    })
  })

  describe('getProjectMetrics - casos de erro', () => {
    it('rejeita quando projeto não existe', async () => {
      const nonExistentProjectId = 999999

      await expect(getProjectMetrics({ projectId: nonExistentProjectId })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é inválido', async () => {
      await expect(getProjectMetrics({ projectId: 0 })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é negativo', async () => {
      await expect(getProjectMetrics({ projectId: -1 })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é undefined', async () => {
      await expect(getProjectMetrics({ projectId: undefined as any })).rejects.toThrow()
    })

    it('rejeita quando projectId é null', async () => {
      await expect(getProjectMetrics({ projectId: null as any })).rejects.toThrow()
    })
  })

  describe('getProjectMetrics - validação de entrada', () => {
    it('aceita release como string vazia', async () => {
      const result = await getProjectMetrics({ projectId, release: '' })

      expect(result).toEqual({
        created: 0,
        executed: 0,
        passed: 0,
        failed: 0
      })
    })

    it('aceita release como undefined', async () => {
      const result = await getProjectMetrics({ projectId, release: undefined })

      expect(result).toEqual({
        created: 0,
        executed: 0,
        passed: 0,
        failed: 0
      })
    })

    it('aceita release como null', async () => {
      const result = await getProjectMetrics({ projectId, release: null as any })

      expect(result).toEqual({
        created: 0,
        executed: 0,
        passed: 0,
        failed: 0
      })
    })

    it('aceita diferentes formatos de release', async () => {
      const releases = ['2024-01', '2024-12', '2023-06', '2025-03']
      
      for (const release of releases) {
        await prisma.testPackage.create({
          data: {
            title: `Package ${release}`,
            description: `Description ${release}`,
            projectId,
            release,
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        })

        const result = await getProjectMetrics({ projectId, release })

        expect(result.created).toBe(1)
        expect(result.executed).toBe(0)
        expect(result.passed).toBe(0)
        expect(result.failed).toBe(0)

        // Limpar para próximo teste
        await prisma.testPackage.deleteMany({
          where: { projectId, release }
        })
      }
    })
  })

  describe('getProjectMetrics - casos especiais', () => {
    it('funciona com projeto que tem pacotes de diferentes tipos', async () => {
      // Criar pacotes de diferentes tipos
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Functional Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Regression Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'REGRESSION',
            priority: 'HIGH'
          },
          {
            title: 'Smoke Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'EXECUTED',
            type: 'SMOKE',
            priority: 'LOW'
          },
          {
            title: 'E2E Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'FAILED',
            type: 'E2E',
            priority: 'CRITICAL'
          }
        ]
      })

      const result = await getProjectMetrics({ projectId })

      expect(result).toEqual({
        created: 1,
        executed: 1,
        passed: 1,
        failed: 1
      })
    })

    it('funciona com projeto que tem pacotes de diferentes prioridades', async () => {
      // Criar pacotes de diferentes prioridades
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Low Priority Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'LOW'
          },
          {
            title: 'Medium Priority Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'High Priority Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'EXECUTED',
            type: 'FUNCTIONAL',
            priority: 'HIGH'
          },
          {
            title: 'Critical Priority Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'FAILED',
            type: 'FUNCTIONAL',
            priority: 'CRITICAL'
          }
        ]
      })

      const result = await getProjectMetrics({ projectId })

      expect(result).toEqual({
        created: 1,
        executed: 1,
        passed: 1,
        failed: 1
      })
    })

    it('funciona com projeto que tem pacotes de diferentes ambientes', async () => {
      // Criar pacotes de diferentes ambientes
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'DEV Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            environment: 'DEV'
          },
          {
            title: 'QA Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            environment: 'QA'
          },
          {
            title: 'STAGING Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'EXECUTED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            environment: 'STAGING'
          },
          {
            title: 'PROD Package',
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

      const result = await getProjectMetrics({ projectId })

      expect(result).toEqual({
        created: 1,
        executed: 1,
        passed: 1,
        failed: 1
      })
    })

    it('funciona com projeto que tem pacotes com assigneeEmail', async () => {
      // Criar pacotes com assigneeEmail
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            assigneeEmail: 'assignee1@example.com'
          },
          {
            title: 'Package 2',
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

      const result = await getProjectMetrics({ projectId })

      expect(result).toEqual({
        created: 1,
        executed: 0,
        passed: 1,
        failed: 0
      })
    })

    it('funciona com projeto que tem pacotes com tags', async () => {
      // Criar pacotes com tags
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            tags: JSON.stringify(['tag1', 'tag2'])
          },
          {
            title: 'Package 2',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            tags: JSON.stringify(['tag3', 'tag4'])
          }
        ]
      })

      const result = await getProjectMetrics({ projectId })

      expect(result).toEqual({
        created: 1,
        executed: 0,
        passed: 1,
        failed: 0
      })
    })
  })

  describe('getProjectMetrics - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const result = await getProjectMetrics({ projectId })

      expect(result).toHaveProperty('created')
      expect(result).toHaveProperty('executed')
      expect(result).toHaveProperty('passed')
      expect(result).toHaveProperty('failed')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await getProjectMetrics({ projectId })

      expect(typeof result.created).toBe('number')
      expect(typeof result.executed).toBe('number')
      expect(typeof result.passed).toBe('number')
      expect(typeof result.failed).toBe('number')
    })

    it('retorna valores não negativos', async () => {
      const result = await getProjectMetrics({ projectId })

      expect(result.created).toBeGreaterThanOrEqual(0)
      expect(result.executed).toBeGreaterThanOrEqual(0)
      expect(result.passed).toBeGreaterThanOrEqual(0)
      expect(result.failed).toBeGreaterThanOrEqual(0)
    })

    it('retorna valores inteiros', async () => {
      const result = await getProjectMetrics({ projectId })

      expect(Number.isInteger(result.created)).toBe(true)
      expect(Number.isInteger(result.executed)).toBe(true)
      expect(Number.isInteger(result.passed)).toBe(true)
      expect(Number.isInteger(result.failed)).toBe(true)
    })
  })

  describe('getProjectMetrics - casos de edge', () => {
    it('funciona com projeto que tem muitos pacotes de um status', async () => {
      // Criar muitos pacotes com status CREATED
      const packages = []
      for (let i = 0; i < 1000; i++) {
        packages.push({
          title: `Package ${i}`,
          description: `Description ${i}`,
          projectId,
          release: '2024-01',
          status: 'CREATED' as const,
          type: 'FUNCTIONAL' as const,
          priority: 'MEDIUM' as const
        })
      }

      await prisma.testPackage.createMany({
        data: packages
      })

      const result = await getProjectMetrics({ projectId })

      expect(result.created).toBe(1000)
      expect(result.executed).toBe(0)
      expect(result.passed).toBe(0)
      expect(result.failed).toBe(0)
    })

    it('funciona com projeto que tem pacotes com títulos longos', async () => {
      const longTitle = 'A'.repeat(255)
      await prisma.testPackage.create({
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

      const result = await getProjectMetrics({ projectId })

      expect(result.created).toBe(1)
    })

    it('funciona com projeto que tem pacotes com descrições longas', async () => {
      const longDescription = 'A'.repeat(1000)
      await prisma.testPackage.create({
        data: {
          title: 'Package',
          description: longDescription,
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectMetrics({ projectId })

      expect(result.created).toBe(1)
    })
  })
})
