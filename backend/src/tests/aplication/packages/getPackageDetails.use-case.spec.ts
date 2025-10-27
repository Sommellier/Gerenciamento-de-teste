import { prisma } from '../../../infrastructure/prisma'
import { getPackageDetails } from '../../../application/use-cases/packages/getPackageDetails.use-case'
import { AppError } from '../../../utils/AppError'
import { ScenarioType, Priority, ScenarioStatus, StepExecutionStatus } from '@prisma/client'

describe('getPackageDetails', () => {
  let projectId: number
  let packageId: number
  let userId: number

  beforeEach(async () => {
    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `user_${Date.now()}@example.com`,
        password: 'password123'
      }
    })
    userId = user.id

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Project Description',
        ownerId: userId
      }
    })
    projectId = project.id

    // Criar pacote
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
    // Limpar dados
    await prisma.testScenario.deleteMany({
      where: { projectId }
    })
    await prisma.testPackage.deleteMany({
      where: { projectId }
    })
    await prisma.project.deleteMany({
      where: { id: projectId }
    })
    await prisma.user.deleteMany({
      where: { id: userId }
    })
  })

  describe('getPackageDetails - casos de sucesso', () => {
    it('retorna detalhes do pacote com dados básicos', async () => {
      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result).toMatchObject({
        id: packageId,
        title: 'Test Package',
        description: 'Test Package Description',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        release: '2024-01',
        projectId: projectId
      })
      expect(result.project).toMatchObject({
        id: projectId,
        name: 'Test Project',
        description: 'Test Project Description'
      })
      expect(result.scenarios).toEqual([])
      expect(result.metrics).toMatchObject({
        totalScenarios: 0,
        totalSteps: 0,
        packageSteps: 0,
        scenariosByType: {},
        scenariosByPriority: {},
        scenariosByStatus: {},
        executionRate: 0,
        successRate: 0
      })
    })

    it('retorna detalhes do pacote com cenários', async () => {
      // Criar cenários
      const scenario1 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 1',
          description: 'Description 1',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.PASSED,
          tags: JSON.stringify(['tag1', 'tag2']),
          projectId: projectId,
          packageId: packageId
        }
      })

      const scenario2 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 2',
          description: 'Description 2',
          type: ScenarioType.REGRESSION,
          priority: Priority.MEDIUM,
          status: ScenarioStatus.FAILED,
          tags: JSON.stringify(['tag3']),
          projectId: projectId,
          packageId: packageId
        }
      })

      // Criar steps para os cenários
      await prisma.testScenarioStep.create({
        data: {
          action: 'Step 1 action',
          expected: 'Step 1 expected',
          stepOrder: 1,
          scenarioId: scenario1.id
        }
      })

      await prisma.testScenarioStep.create({
        data: {
          action: 'Step 2 action',
          expected: 'Step 2 expected',
          stepOrder: 1,
          scenarioId: scenario2.id
        }
      })

      await prisma.testScenarioStep.create({
        data: {
          action: 'Step 3 action',
          expected: 'Step 3 expected',
          stepOrder: 2,
          scenarioId: scenario2.id
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.scenarios).toHaveLength(2)
      expect(result.scenarios[0]).toMatchObject({
        id: scenario1.id,
        title: 'Scenario 1',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        status: ScenarioStatus.PASSED,
        tags: ['tag1', 'tag2']
      })
      expect(result.scenarios[1]).toMatchObject({
        id: scenario2.id,
        title: 'Scenario 2',
        type: ScenarioType.REGRESSION,
        priority: Priority.MEDIUM,
        status: ScenarioStatus.FAILED,
        tags: ['tag3']
      })

      expect(result.metrics).toMatchObject({
        totalScenarios: 2,
        totalSteps: 3,
        packageSteps: 0,
        scenariosByType: {
          FUNCTIONAL: 1,
          REGRESSION: 1
        },
        scenariosByPriority: {
          HIGH: 1,
          MEDIUM: 1
        },
        scenariosByStatus: {
          PASSED: 1,
          FAILED: 1
        },
        executionRate: 100,
        successRate: 50
      })
    })

    it('retorna detalhes do pacote com tags convertidas', async () => {
      // Atualizar pacote com tags
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          tags: JSON.stringify(['package-tag1', 'package-tag2'])
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.tags).toEqual(['package-tag1', 'package-tag2'])
    })

    it('retorna detalhes do pacote com cenários ordenados por stepOrder', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: packageId
        }
      })

      // Criar steps em ordem diferente
      await prisma.testScenarioStep.create({
        data: {
          action: 'Step 2 action',
          expected: 'Step 2 expected',
          stepOrder: 2,
          scenarioId: scenario.id
        }
      })

      await prisma.testScenarioStep.create({
        data: {
          action: 'Step 1 action',
          expected: 'Step 1 expected',
          stepOrder: 1,
          scenarioId: scenario.id
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.scenarios[0].steps).toHaveLength(2)
      expect(result.scenarios[0].steps[0].stepOrder).toBe(1)
      expect(result.scenarios[0].steps[1].stepOrder).toBe(2)
    })

    it('calcula métricas corretamente com diferentes status', async () => {
      // Criar cenários com diferentes status
      await prisma.testScenario.create({
        data: {
          title: 'Created Scenario',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: packageId
        }
      })

      await prisma.testScenario.create({
        data: {
          title: 'Passed Scenario',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.PASSED,
          projectId: projectId,
          packageId: packageId
        }
      })

      await prisma.testScenario.create({
        data: {
          title: 'Failed Scenario',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.FAILED,
          projectId: projectId,
          packageId: packageId
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.metrics).toMatchObject({
        totalScenarios: 3,
        executionRate: 66.67, // 2/3 * 100
        successRate: 50 // 1/2 * 100
      })
    })

    it('retorna detalhes do pacote com steps do pacote', async () => {
      // Criar steps do pacote
      await prisma.testPackageStep.create({
        data: {
          action: 'Package Step 1',
          expected: 'Package Expected 1',
          stepOrder: 1,
          packageId: packageId
        }
      })

      await prisma.testPackageStep.create({
        data: {
          action: 'Package Step 2',
          expected: 'Package Expected 2',
          stepOrder: 2,
          packageId: packageId
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.steps).toHaveLength(2)
      expect(result.steps[0]).toMatchObject({
        action: 'Package Step 1',
        expected: 'Package Expected 1',
        stepOrder: 1
      })
      expect(result.steps[1]).toMatchObject({
        action: 'Package Step 2',
        expected: 'Package Expected 2',
        stepOrder: 2
      })
      expect(result.metrics.packageSteps).toBe(2)
    })

    it('retorna detalhes do pacote com cenários que têm testador e aprovador', async () => {
      // Criar outro usuário para ser testador
      const tester = await prisma.user.create({
        data: {
          name: 'Tester User',
          email: `tester_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      // Criar outro usuário para ser aprovador
      const approver = await prisma.user.create({
        data: {
          name: 'Approver User',
          email: `approver_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: packageId,
          testadorId: tester.id,
          aprovadorId: approver.id
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.scenarios[0]).toMatchObject({
        id: scenario.id,
        testador: {
          id: tester.id,
          name: 'Tester User',
          email: tester.email
        },
        aprovador: {
          id: approver.id,
          name: 'Approver User',
          email: approver.email
        }
      })

      // Limpar usuários criados
      await prisma.user.deleteMany({
        where: { id: { in: [tester.id, approver.id] } }
      })
    })

    it('retorna detalhes do pacote com cenários sem testador e aprovador', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: packageId
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.scenarios[0]).toMatchObject({
        id: scenario.id,
        testador: null,
        aprovador: null
      })
    })

    it('retorna detalhes do pacote com tags vazias', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: packageId,
          tags: null
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.scenarios[0].tags).toEqual([])
    })

    it('retorna detalhes do pacote com métricas zeradas quando não há cenários', async () => {
      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.metrics).toMatchObject({
        totalScenarios: 0,
        totalSteps: 0,
        packageSteps: 0,
        scenariosByType: {},
        scenariosByPriority: {},
        scenariosByStatus: {},
        executionRate: 0,
        successRate: 0
      })
    })
  })

  describe('getPackageDetails - casos de erro', () => {
    it('rejeita quando pacote não existe', async () => {
      await expect(getPackageDetails({
        packageId: 99999,
        projectId
      })).rejects.toThrow(AppError)
    })

    it('rejeita quando pacote não pertence ao projeto', async () => {
      // Criar outro projeto
      const otherProject = await prisma.project.create({
        data: {
          name: 'Other Project',
          description: 'Other Project Description',
          ownerId: userId
        }
      })

      // Criar pacote no outro projeto
      const otherPackage = await prisma.testPackage.create({
        data: {
          title: 'Other Package',
          description: 'Other Package Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          release: '2024-01',
          projectId: otherProject.id
        }
      })

      await expect(getPackageDetails({
        packageId: otherPackage.id,
        projectId
      })).rejects.toThrow(AppError)

      // Limpar dados
      await prisma.testPackage.deleteMany({
        where: { projectId: otherProject.id }
      })
      await prisma.project.deleteMany({
        where: { id: otherProject.id }
      })
    })

    it('rejeita quando packageId é inválido', async () => {
      await expect(getPackageDetails({
        packageId: -1,
        projectId
      })).rejects.toThrow(AppError)
    })

    it('rejeita quando projectId é inválido', async () => {
      await expect(getPackageDetails({
        packageId,
        projectId: -1
      })).rejects.toThrow(AppError)
    })

    it('rejeita quando packageId é zero', async () => {
      await expect(getPackageDetails({
        packageId: 0,
        projectId
      })).rejects.toThrow(AppError)
    })

    it('rejeita quando projectId é zero', async () => {
      await expect(getPackageDetails({
        packageId,
        projectId: 0
      })).rejects.toThrow(AppError)
    })
  })

  describe('getPackageDetails - casos especiais', () => {
    it('funciona com pacote que tem muitos cenários', async () => {
      // Criar muitos cenários
      const scenarios = []
      for (let i = 1; i <= 50; i++) {
        const scenario = await prisma.testScenario.create({
          data: {
            title: `Scenario ${i}`,
            description: `Description ${i}`,
            type: i % 2 === 0 ? ScenarioType.FUNCTIONAL : ScenarioType.REGRESSION,
            priority: i % 3 === 0 ? Priority.HIGH : i % 3 === 1 ? Priority.MEDIUM : Priority.LOW,
            status: i % 4 === 0 ? ScenarioStatus.PASSED : i % 4 === 1 ? ScenarioStatus.FAILED : i % 4 === 2 ? ScenarioStatus.EXECUTED : ScenarioStatus.CREATED,
            projectId: projectId,
            packageId: packageId
          }
        })
        scenarios.push(scenario)
      }

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.scenarios).toHaveLength(50)
      expect(result.metrics.totalScenarios).toBe(50)
    })

    it('funciona com cenários que têm muitos steps', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: packageId
        }
      })

      // Criar muitos steps
      for (let i = 1; i <= 20; i++) {
        await prisma.testScenarioStep.create({
          data: {
            action: `Step ${i} action`,
            expected: `Step ${i} expected`,
            stepOrder: i,
            scenarioId: scenario.id
          }
        })
      }

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.scenarios[0].steps).toHaveLength(20)
      expect(result.metrics.totalSteps).toBe(20)
    })

    it('funciona com pacote que tem tags complexas', async () => {
      const complexTags = ['tag1', 'tag with spaces', 'tag-with-dashes', 'tag_with_underscores', 'tag@with#special$chars']
      
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          tags: JSON.stringify(complexTags)
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.tags).toEqual(complexTags)
    })

    it('funciona com cenários que têm tags complexas', async () => {
      const complexTags = ['tag1', 'tag with spaces', 'tag-with-dashes', 'tag_with_underscores', 'tag@with#special$chars']
      
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: packageId,
          tags: JSON.stringify(complexTags)
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.scenarios[0].tags).toEqual(complexTags)
    })

    it('funciona com pacote que tem steps ordenados corretamente', async () => {
      // Criar steps em ordem aleatória
      await prisma.testPackageStep.create({
        data: {
          action: 'Step 3 action',
          expected: 'Step 3 expected',
          stepOrder: 3,
          packageId: packageId
        }
      })

      await prisma.testPackageStep.create({
        data: {
          action: 'Step 1 action',
          expected: 'Step 1 expected',
          stepOrder: 1,
          packageId: packageId
        }
      })

      await prisma.testPackageStep.create({
        data: {
          action: 'Step 2 action',
          expected: 'Step 2 expected',
          stepOrder: 2,
          packageId: packageId
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.steps).toHaveLength(3)
      expect(result.steps[0].stepOrder).toBe(1)
      expect(result.steps[1].stepOrder).toBe(2)
      expect(result.steps[2].stepOrder).toBe(3)
    })

    it('funciona com cenários que têm steps ordenados corretamente', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: packageId
        }
      })

      // Criar steps em ordem aleatória
      await prisma.testScenarioStep.create({
        data: {
          action: 'Step 3 action',
          expected: 'Step 3 expected',
          stepOrder: 3,
          scenarioId: scenario.id
        }
      })

      await prisma.testScenarioStep.create({
        data: {
          action: 'Step 1 action',
          expected: 'Step 1 expected',
          stepOrder: 1,
          scenarioId: scenario.id
        }
      })

      await prisma.testScenarioStep.create({
        data: {
          action: 'Step 2 action',
          expected: 'Step 2 expected',
          stepOrder: 2,
          scenarioId: scenario.id
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.scenarios[0].steps).toHaveLength(3)
      expect(result.scenarios[0].steps[0].stepOrder).toBe(1)
      expect(result.scenarios[0].steps[1].stepOrder).toBe(2)
      expect(result.scenarios[0].steps[2].stepOrder).toBe(3)
    })
  })

  describe('getPackageDetails - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('title')
      expect(result).toHaveProperty('description')
      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('priority')
      expect(result).toHaveProperty('release')
      expect(result).toHaveProperty('projectId')
      expect(result).toHaveProperty('project')
      expect(result).toHaveProperty('scenarios')
      expect(result).toHaveProperty('metrics')
      expect(result).toHaveProperty('steps')
      expect(result).toHaveProperty('tags')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(typeof result.id).toBe('number')
      expect(typeof result.title).toBe('string')
      expect(typeof result.description).toBe('string')
      expect(typeof result.type).toBe('string')
      expect(typeof result.priority).toBe('string')
      expect(typeof result.release).toBe('string')
      expect(typeof result.projectId).toBe('number')
      expect(typeof result.project).toBe('object')
      expect(Array.isArray(result.scenarios)).toBe(true)
      expect(typeof result.metrics).toBe('object')
      expect(Array.isArray(result.steps)).toBe(true)
      expect(Array.isArray(result.tags)).toBe(true)
    })

    it('retorna project com estrutura correta', async () => {
      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.project).toHaveProperty('id')
      expect(result.project).toHaveProperty('name')
      expect(result.project).toHaveProperty('description')
      expect(typeof result.project.id).toBe('number')
      expect(typeof result.project.name).toBe('string')
      expect(typeof result.project.description).toBe('string')
    })

    it('retorna metrics com estrutura correta', async () => {
      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.metrics).toHaveProperty('totalScenarios')
      expect(result.metrics).toHaveProperty('totalSteps')
      expect(result.metrics).toHaveProperty('packageSteps')
      expect(result.metrics).toHaveProperty('scenariosByType')
      expect(result.metrics).toHaveProperty('scenariosByPriority')
      expect(result.metrics).toHaveProperty('scenariosByStatus')
      expect(result.metrics).toHaveProperty('executionRate')
      expect(result.metrics).toHaveProperty('successRate')
      expect(typeof result.metrics.totalScenarios).toBe('number')
      expect(typeof result.metrics.totalSteps).toBe('number')
      expect(typeof result.metrics.packageSteps).toBe('number')
      expect(typeof result.metrics.executionRate).toBe('number')
      expect(typeof result.metrics.successRate).toBe('number')
    })
  })

  describe('getPackageDetails - integração com banco de dados', () => {
    it('retorna dados consistentes com o banco', async () => {
      const result = await getPackageDetails({
        packageId,
        projectId
      })

      // Verificar se os dados retornados são consistentes com o banco
      const packageFromDb = await prisma.testPackage.findUnique({
        where: { id: packageId }
      })

      expect(result.id).toBe(packageFromDb?.id)
      expect(result.title).toBe(packageFromDb?.title)
      expect(result.description).toBe(packageFromDb?.description)
      expect(result.type).toBe(packageFromDb?.type)
      expect(result.priority).toBe(packageFromDb?.priority)
      expect(result.release).toBe(packageFromDb?.release)
      expect(result.projectId).toBe(packageFromDb?.projectId)
    })

    it('retorna cenários apenas do pacote especificado', async () => {
      // Criar outro pacote
      const otherPackage = await prisma.testPackage.create({
        data: {
          title: 'Other Package',
          description: 'Other Package Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          release: '2024-01',
          projectId: projectId
        }
      })

      // Criar cenários para ambos os pacotes
      await prisma.testScenario.create({
        data: {
          title: 'Scenario in Package 1',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: packageId
        }
      })

      await prisma.testScenario.create({
        data: {
          title: 'Scenario in Package 2',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: otherPackage.id
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.scenarios).toHaveLength(1)
      expect(result.scenarios[0].title).toBe('Scenario in Package 1')
      expect(result.metrics.totalScenarios).toBe(1)

      // Limpar dados
      await prisma.testScenario.deleteMany({
        where: { projectId }
      })
      await prisma.testPackage.deleteMany({
        where: { projectId }
      })
    })

    it('retorna steps ordenados por stepOrder', async () => {
      // Criar steps em ordem aleatória
      await prisma.testPackageStep.create({
        data: {
          action: 'Step 3 action',
          expected: 'Step 3 expected',
          stepOrder: 3,
          packageId: packageId
        }
      })

      await prisma.testPackageStep.create({
        data: {
          action: 'Step 1 action',
          expected: 'Step 1 expected',
          stepOrder: 1,
          packageId: packageId
        }
      })

      await prisma.testPackageStep.create({
        data: {
          action: 'Step 2 action',
          expected: 'Step 2 expected',
          stepOrder: 2,
          packageId: packageId
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result.steps).toHaveLength(3)
      expect(result.steps[0].action).toBe('Step 1 action')
      expect(result.steps[1].action).toBe('Step 2 action')
      expect(result.steps[2].action).toBe('Step 3 action')
    })
  })

  describe('getPackageDetails - casos de erro específicos', () => {
    it('deve lidar com erro na consulta de cenários e usar fallback', async () => {
      // Mock do prisma para simular erro na consulta de cenários
      const originalFindMany = prisma.testScenario.findMany
      
      // Simular erro na primeira consulta (com testador e aprovador)
      prisma.testScenario.findMany = jest.fn().mockImplementationOnce(() => {
        throw new Error('Database connection error')
      }).mockImplementationOnce(() => {
        // Segunda chamada (fallback) deve funcionar
        return originalFindMany.call(prisma.testScenario, {
          where: {
            packageId: packageId,
            projectId: projectId
          },
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' }
            }
          }
        })
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(result).toBeDefined()
      expect(result.scenarios).toEqual([])

      // Restaurar função original
      prisma.testScenario.findMany = originalFindMany
    })

    it('deve lidar com erro não-Error e re-lançar', async () => {
      // Mock do prisma para simular erro não-Error
      const originalFindFirst = prisma.testPackage.findFirst
      
      prisma.testPackage.findFirst = jest.fn().mockImplementationOnce(() => {
        // Simular erro que não é instância de Error
        throw 'String error'
      })

      await expect(getPackageDetails({
        packageId,
        projectId
      })).rejects.toBe('String error')

      // Restaurar função original
      prisma.testPackage.findFirst = originalFindFirst
    })
  })
})
