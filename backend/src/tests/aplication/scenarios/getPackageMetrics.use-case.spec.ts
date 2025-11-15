import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { getPackageMetrics } from '../../../application/use-cases/scenarios/getPackageMetrics.use-case'
import { AppError } from '../../../utils/AppError'
import { ScenarioType, Priority, ScenarioStatus } from '@prisma/client'

describe('getPackageMetrics', () => {
  let projectId: number
  let packageId: number
  let userId: number

  beforeEach(async () => {
    // Criar usuário principal
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `test_${Date.now()}@example.com`,
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

    // Criar pacote de teste
    const testPackage = await prisma.testPackage.create({
      data: {
        title: 'Test Package',
        description: 'Test Package Description',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        release: '2024-01',
        projectId: projectId
      }
    })
    packageId = testPackage.id
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.testScenarioStep.deleteMany()
    await prisma.testScenario.deleteMany()
    await prisma.testPackageStep.deleteMany()
    await prisma.testPackage.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('getPackageMetrics - casos de sucesso', () => {
    it('retorna métricas de pacote vazio', async () => {
      const result = await getPackageMetrics({ packageId, projectId })

      expect(result).toMatchObject({
        package: {
          id: packageId,
          title: 'Test Package',
          steps: 0,
          release: '2024-01'
        },
        scenarios: {
          total: 0,
          totalSteps: 0,
          byStatus: {
            created: 0,
            executed: 0,
            passed: 0,
            failed: 0
          },
          byType: {},
          byPriority: {},
          byEnvironment: {},
          executionRate: 0,
          successRate: 0
        },
        summary: {
          totalSteps: 0,
          executionRate: 0,
          successRate: 0
        }
      })
    })

    it('retorna métricas de pacote com cenários', async () => {
      // Criar cenários com diferentes status
      const scenario1 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 1',
          description: 'Description 1',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId,
          steps: {
            create: [
              {
                action: 'Step 1',
                expected: 'Expected 1',
                stepOrder: 1
              },
              {
                action: 'Step 2',
                expected: 'Expected 2',
                stepOrder: 2
              }
            ]
          }
        }
      })

      const scenario2 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 2',
          description: 'Description 2',
          type: ScenarioType.REGRESSION,
          priority: Priority.MEDIUM,
          status: ScenarioStatus.EXECUTED,
          tags: JSON.stringify(['regression']),
          projectId,
          packageId,
          steps: {
            create: [
              {
                action: 'Step 1',
                expected: 'Expected 1',
                stepOrder: 1
              }
            ]
          }
        }
      })

      const scenario3 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 3',
          description: 'Description 3',
          type: ScenarioType.SMOKE,
          priority: Priority.LOW,
          status: ScenarioStatus.PASSED,
          tags: JSON.stringify(['smoke']),
          projectId,
          packageId,
          steps: {
            create: [
              {
                action: 'Step 1',
                expected: 'Expected 1',
                stepOrder: 1
              },
              {
                action: 'Step 2',
                expected: 'Expected 2',
                stepOrder: 2
              },
              {
                action: 'Step 3',
                expected: 'Expected 3',
                stepOrder: 3
              }
            ]
          }
        }
      })

      const scenario4 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 4',
          description: 'Description 4',
          type: ScenarioType.E2E,
          priority: Priority.CRITICAL,
          status: ScenarioStatus.FAILED,
          tags: JSON.stringify(['e2e']),
          projectId,
          packageId,
          steps: {
            create: [
              {
                action: 'Step 1',
                expected: 'Expected 1',
                stepOrder: 1
              }
            ]
          }
        }
      })

      const result = await getPackageMetrics({ packageId, projectId })

      expect(result).toMatchObject({
        package: {
          id: packageId,
          title: 'Test Package',
          steps: 0,
          release: '2024-01'
        },
        scenarios: {
          total: 4,
          totalSteps: 7, // 2 + 1 + 3 + 1
          byStatus: {
            created: 1,
            executed: 1,
            passed: 1,
            failed: 1
          },
          byType: {
            FUNCTIONAL: 1,
            REGRESSION: 1,
            SMOKE: 1,
            E2E: 1
          },
          byPriority: {
            HIGH: 1,
            MEDIUM: 1,
            LOW: 1,
            CRITICAL: 1
          },
          byEnvironment: { 'N/A': 4 },
          executionRate: 75, // 3 executados de 4 total
          successRate: 33.33 // 1 passou de 3 executados
        },
        summary: {
          totalSteps: 7, // 0 do pacote + 7 dos cenários
          executionRate: 75,
          successRate: 33.33333333333333 // Não arredondado no summary
        }
      })
    })

    it('retorna métricas de pacote com steps próprios', async () => {
      // Adicionar steps ao pacote
      await prisma.testPackageStep.createMany({
        data: [
          {
            action: 'Package Step 1',
            expected: 'Package Expected 1',
            stepOrder: 1,
            packageId
          },
          {
            action: 'Package Step 2',
            expected: 'Package Expected 2',
            stepOrder: 2,
            packageId
          }
        ]
      })

      // Criar cenário
      await prisma.testScenario.create({
        data: {
          title: 'Scenario 1',
          description: 'Description 1',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.PASSED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId,
          steps: {
            create: [
              {
                action: 'Scenario Step 1',
                expected: 'Scenario Expected 1',
                stepOrder: 1
              }
            ]
          }
        }
      })

      const result = await getPackageMetrics({ packageId, projectId })

      expect(result).toMatchObject({
        package: {
          id: packageId,
          title: 'Test Package',
          steps: 2,
          release: '2024-01'
        },
        scenarios: {
          total: 1,
          totalSteps: 1,
          byStatus: {
            created: 0,
            executed: 0,
            passed: 1,
            failed: 0
          },
          executionRate: 100,
          successRate: 100
        },
        summary: {
          totalSteps: 3, // 2 do pacote + 1 do cenário
          executionRate: 100,
          successRate: 100
        }
      })
    })

    it('calcula corretamente taxa de execução quando não há cenários', async () => {
      const result = await getPackageMetrics({ packageId, projectId })

      expect(result.scenarios.executionRate).toBe(0)
      expect(result.scenarios.successRate).toBe(0)
      expect(result.summary.executionRate).toBe(0)
      expect(result.summary.successRate).toBe(0)
    })

    it('calcula corretamente taxa de sucesso quando não há cenários executados', async () => {
      // Criar apenas cenários não executados
      await prisma.testScenario.create({
        data: {
          title: 'Scenario 1',
          description: 'Description 1',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId
        }
      })

      const result = await getPackageMetrics({ packageId, projectId })

      expect(result.scenarios.executionRate).toBe(0)
      expect(result.scenarios.successRate).toBe(0)
      expect(result.summary.executionRate).toBe(0)
      expect(result.summary.successRate).toBe(0)
    })

    it('calcula corretamente métricas com cenários de mesmo tipo', async () => {
      // Criar múltiplos cenários do mesmo tipo
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.CREATED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          },
          {
            title: 'Scenario 2',
            description: 'Description 2',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.PASSED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          },
          {
            title: 'Scenario 3',
            description: 'Description 3',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.FAILED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          }
        ]
      })

      const result = await getPackageMetrics({ packageId, projectId })

      expect(result.scenarios.byType.FUNCTIONAL).toBe(3)
      expect(result.scenarios.byPriority.HIGH).toBe(3)
      expect(result.scenarios.byStatus.created).toBe(1)
      expect(result.scenarios.byStatus.passed).toBe(1)
      expect(result.scenarios.byStatus.failed).toBe(1)
      expect(result.scenarios.executionRate).toBe(66.67) // 2 executados de 3
      expect(result.scenarios.successRate).toBeCloseTo(33.33, 1) // 1 concluído (PASSED) de 3 total = 33.33%
    })

    it('retorna métricas com valores arredondados corretamente', async () => {
      // Criar cenários para gerar percentuais com decimais
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.PASSED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          },
          {
            title: 'Scenario 2',
            description: 'Description 2',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.FAILED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          },
          {
            title: 'Scenario 3',
            description: 'Description 3',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.CREATED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          }
        ]
      })

      const result = await getPackageMetrics({ packageId, projectId })

      // 2 executados de 3 = 66.666...% -> arredondado para 66.67%
      expect(result.scenarios.executionRate).toBe(66.67)
      // 1 concluído (PASSED) de 3 total = 33.33%
      expect(result.scenarios.successRate).toBeCloseTo(33.33, 1)
    })

    it('calcula successRate incluindo cenários APPROVED', async () => {
      // Criar cenários com diferentes status incluindo APPROVED
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario CREATED',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.CREATED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          },
          {
            title: 'Scenario PASSED',
            description: 'Description 2',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.PASSED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          },
          {
            title: 'Scenario APPROVED',
            description: 'Description 3',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          },
          {
            title: 'Scenario FAILED',
            description: 'Description 4',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.FAILED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          }
        ]
      })

      const result = await getPackageMetrics({ packageId, projectId })

      // successRate: 2 concluídos (1 PASSED + 1 APPROVED) de 4 total = 50%
      expect(result.scenarios.successRate).toBe(50)
      expect(result.summary.successRate).toBe(50)
    })
  })

  describe('getPackageMetrics - casos de erro', () => {
    it('lança erro quando pacote não existe', async () => {
      await expect(getPackageMetrics({ packageId: 99999, projectId })).rejects.toThrow(
        new AppError('Pacote não encontrado', 404)
      )
    })

    it('lança erro quando pacote não pertence ao projeto', async () => {
      // Criar outro projeto
      const otherProject = await prisma.project.create({
        data: {
          name: 'Other Project',
          description: 'Other Description',
          ownerId: userId
        }
      })

      // Criar pacote no outro projeto
      const otherPackage = await prisma.testPackage.create({
        data: {
          title: 'Other Package',
          description: 'Other Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          release: '2024-01',
          projectId: otherProject.id
        }
      })

      await expect(getPackageMetrics({ packageId: otherPackage.id, projectId })).rejects.toThrow(
        new AppError('Pacote não encontrado', 404)
      )

      // Limpar
      await prisma.testPackage.delete({ where: { id: otherPackage.id } })
      await prisma.project.delete({ where: { id: otherProject.id } })
    })

    it('lança erro quando projectId é inválido', async () => {
      await expect(getPackageMetrics({ packageId, projectId: 99999 })).rejects.toThrow(
        new AppError('Pacote não encontrado', 404)
      )
    })
  })

  describe('getPackageMetrics - casos especiais', () => {
    it('funciona com cenários sem steps', async () => {
      await prisma.testScenario.create({
        data: {
          title: 'Scenario Without Steps',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId
        }
      })

      const result = await getPackageMetrics({ packageId, projectId })

      expect(result.scenarios.totalSteps).toBe(0)
      expect(result.summary.totalSteps).toBe(0)
    })

    it('funciona com cenários de diferentes projetos no mesmo pacote', async () => {
      // Criar cenário no pacote correto
      await prisma.testScenario.create({
        data: {
          title: 'Correct Scenario',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.PASSED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId
        }
      })

      // Criar outro projeto e cenário (não deve aparecer nas métricas)
      const otherProject = await prisma.project.create({
        data: {
          name: 'Other Project',
          description: 'Other Description',
          ownerId: userId
        }
      })

      await prisma.testScenario.create({
        data: {
          title: 'Other Scenario',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.PASSED,
          tags: JSON.stringify(['test']),
          projectId: otherProject.id,
          packageId // Mesmo pacote, mas projeto diferente
        }
      })

      const result = await getPackageMetrics({ packageId, projectId })

      // Deve retornar apenas o cenário do projeto correto
      expect(result.scenarios.total).toBe(1)
      expect(result.scenarios.byStatus.passed).toBe(1)

      // Limpar
      await prisma.testScenario.deleteMany({ where: { projectId: otherProject.id } })
      await prisma.project.delete({ where: { id: otherProject.id } })
    })

    it('funciona com pacote que tem steps mas nenhum cenário', async () => {
      // Adicionar steps ao pacote
      await prisma.testPackageStep.createMany({
        data: [
          {
            action: 'Package Step 1',
            expected: 'Package Expected 1',
            stepOrder: 1,
            packageId
          },
          {
            action: 'Package Step 2',
            expected: 'Package Expected 2',
            stepOrder: 2,
            packageId
          },
          {
            action: 'Package Step 3',
            expected: 'Package Expected 3',
            stepOrder: 3,
            packageId
          }
        ]
      })

      const result = await getPackageMetrics({ packageId, projectId })

      expect(result.package.steps).toBe(3)
      expect(result.scenarios.total).toBe(0)
      expect(result.scenarios.totalSteps).toBe(0)
      expect(result.summary.totalSteps).toBe(3) // Apenas steps do pacote
    })
  })
})
