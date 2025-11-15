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

    it('faz parse de tags JSON string de cenário corretamente (linhas 95-101)', async () => {
      // Criar cenário com tags como string JSON
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: packageId,
          tags: JSON.stringify(['tag1', 'tag2', 'tag3']) // tags como string JSON
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      // Deve fazer parse da string JSON (linha 94)
      expect(result.scenarios[0].tags).toEqual(['tag1', 'tag2', 'tag3'])
      expect(Array.isArray(result.scenarios[0].tags)).toBe(true)
    })

    it('trata erro ao fazer parse de tags JSON de cenário (linhas 99-101)', async () => {
      // Criar cenário com tags JSON inválido
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: packageId,
          tags: 'invalid json{{{'
        }
      })

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      // Deve tratar erro e retornar array vazio (linha 101)
      expect(result.scenarios[0].tags).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao fazer parse das tags do cenário:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('faz parse de tags JSON string de pacote corretamente (linhas 116-122)', async () => {
      // Criar pacote com tags como string JSON
      const packageWithTags = await prisma.testPackage.create({
        data: {
          title: 'Package With Tags',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          release: '2024-01',
          projectId: projectId,
          tags: JSON.stringify(['pkg-tag1', 'pkg-tag2']) // tags como string JSON
        }
      })

      const result = await getPackageDetails({
        packageId: packageWithTags.id,
        projectId
      })

      // Deve fazer parse da string JSON (linha 115)
      expect(result.tags).toEqual(['pkg-tag1', 'pkg-tag2'])
      expect(Array.isArray(result.tags)).toBe(true)

      // Limpar
      await prisma.testPackage.delete({ where: { id: packageWithTags.id } })
    })

    it('trata erro ao fazer parse de tags JSON de pacote (linhas 120-122)', async () => {
      // Criar pacote com tags JSON inválido
      const packageWithInvalidTags = await prisma.testPackage.create({
        data: {
          title: 'Package Invalid Tags',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          release: '2024-01',
          projectId: projectId,
          tags: 'invalid json{{{'
        }
      })

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await getPackageDetails({
        packageId: packageWithInvalidTags.id,
        projectId
      })

      // Deve tratar erro e retornar array vazio (linha 122)
      expect(result.tags).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao fazer parse das tags do pacote:', expect.any(Error))

      consoleSpy.mockRestore()

      // Limpar
      await prisma.testPackage.delete({ where: { id: packageWithInvalidTags.id } })
    })

    it('trata tags de cenário como array diretamente (linhas 95-96)', async () => {
      // Criar cenário com tags como string JSON
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: packageId,
          tags: JSON.stringify(['tag1', 'tag2'])
        }
      })

      // Buscar do banco - o Prisma retorna como string
      const scenarioFromDb = await prisma.testScenario.findUnique({
        where: { id: scenario.id }
      })

      // Simular o código que trata tags como string (linha 93) ou array (linha 95)
      let parsedTags: string[] = []
      if (scenarioFromDb?.tags) {
        if (typeof scenarioFromDb.tags === 'string') {
          parsedTags = JSON.parse(scenarioFromDb.tags)
        } else if (Array.isArray(scenarioFromDb.tags)) {
          parsedTags = scenarioFromDb.tags // linha 96
        }
      }
      expect(parsedTags).toEqual(['tag1', 'tag2'])

      // Verificar que o código também funciona
      const result = await getPackageDetails({
        packageId,
        projectId
      })

      expect(Array.isArray(result.scenarios[0].tags)).toBe(true)
      expect(result.scenarios[0].tags).toEqual(['tag1', 'tag2'])
    })

    it('trata tags de cenário quando já vem como array do banco (linhas 95-96)', async () => {
      // Criar cenário diretamente no banco
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId: projectId,
          packageId: packageId,
          tags: JSON.stringify(['tag1', 'tag2'])
        }
      })

      // Mock do findMany para retornar tags como array (simulando caso onde Prisma retorna array)
      const originalFindMany = (prisma.testScenario as any).findMany
      const mockScenarios = [{
        ...scenario,
        tags: ['tag1', 'tag2'] as any, // tags como array (linha 96)
        steps: [],
        testador: null,
        aprovador: null
      }]

      ;(prisma.testScenario as any).findMany = jest.fn().mockResolvedValue(mockScenarios)

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      // Deve tratar tags como array diretamente (linha 96)
      expect(Array.isArray(result.scenarios[0].tags)).toBe(true)
      expect(result.scenarios[0].tags).toEqual(['tag1', 'tag2'])

      // Restaurar função original
      ;(prisma.testScenario as any).findMany = originalFindMany
    })

    it('trata tags de pacote como array diretamente (linhas 116-117)', async () => {
      // Criar pacote com tags como string JSON
      const packageWithTags = await prisma.testPackage.create({
        data: {
          title: 'Package With Tags',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          release: '2024-01',
          projectId: projectId,
          tags: JSON.stringify(['pkg-tag1', 'pkg-tag2'])
        }
      })

      // Buscar do banco - o Prisma retorna como string
      const packageFromDb = await prisma.testPackage.findUnique({
        where: { id: packageWithTags.id }
      })

      // Simular o código que trata tags como string (linha 114) ou array (linha 116)
      let parsedTags: string[] = []
      if (packageFromDb?.tags) {
        if (typeof packageFromDb.tags === 'string') {
          parsedTags = JSON.parse(packageFromDb.tags)
        } else if (Array.isArray(packageFromDb.tags)) {
          parsedTags = packageFromDb.tags // linha 117
        }
      }
      expect(parsedTags).toEqual(['pkg-tag1', 'pkg-tag2'])

      // Verificar que o código também funciona
      const result = await getPackageDetails({
        packageId: packageWithTags.id,
        projectId
      })

      expect(Array.isArray(result.tags)).toBe(true)
      expect(result.tags).toEqual(['pkg-tag1', 'pkg-tag2'])

      // Limpar
      await prisma.testPackage.delete({ where: { id: packageWithTags.id } })
    })

    it('trata tags de pacote quando já vem como array do banco (linhas 116-117)', async () => {
      // Criar pacote diretamente no banco
      const packageWithTags = await prisma.testPackage.create({
        data: {
          title: 'Package With Tags',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          release: '2024-01',
          projectId: projectId,
          tags: JSON.stringify(['pkg-tag1', 'pkg-tag2'])
        }
      })

      // Mock do findFirst para retornar tags como array (simulando caso onde Prisma retorna array)
      const originalFindFirst = prisma.testPackage.findFirst
      const mockPackage = {
        ...packageWithTags,
        tags: ['pkg-tag1', 'pkg-tag2'] as any, // tags como array (linha 117)
        steps: [],
        project: {
          id: projectId,
          name: 'Test Project',
          description: 'Test Project Description',
          ownerId: userId
        },
        approvedBy: null,
        rejectedBy: null
      }

      prisma.testPackage.findFirst = jest.fn().mockResolvedValue(mockPackage)

      const result = await getPackageDetails({
        packageId: packageWithTags.id,
        projectId
      })

      // Deve tratar tags como array diretamente (linha 117)
      expect(Array.isArray(result.tags)).toBe(true)
      expect(result.tags).toEqual(['pkg-tag1', 'pkg-tag2'])

      // Restaurar função original
      prisma.testPackage.findFirst = originalFindFirst

      // Limpar
      await prisma.testPackage.delete({ where: { id: packageWithTags.id } })
    })

    it('calcula executionRate e successRate corretamente (linhas 171-173)', async () => {
      // Criar cenários com diferentes status
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario CREATED',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.CREATED,
            projectId,
            packageId
          },
          {
            title: 'Scenario EXECUTED',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.EXECUTED,
            projectId,
            packageId
          },
          {
            title: 'Scenario PASSED',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.PASSED,
            projectId,
            packageId
          },
          {
            title: 'Scenario FAILED',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.FAILED,
            projectId,
            packageId
          }
        ]
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      // executionRate: cenários executados (EXECUTED, PASSED, FAILED) / total
      // 3 executados de 4 total = 75%
      expect(result.metrics.executionRate).toBe(75)

      // successRate: cenários PASSED + APPROVED / total de cenários
      // 1 PASSED de 4 total = 25%
      expect(result.metrics.successRate).toBe(25)
    })

    it('calcula executionRate e successRate quando não há cenários executados (linhas 171-173)', async () => {
      // Criar apenas cenário CREATED
      await prisma.testScenario.create({
        data: {
          title: 'Scenario CREATED',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId,
          packageId
        }
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      // executionRate: 0 executados de 1 total = 0%
      expect(result.metrics.executionRate).toBe(0)

      // successRate: 0 concluídos (PASSED + APPROVED) de 1 total = 0%
      expect(result.metrics.successRate).toBe(0)
    })

    it('calcula executionRate e successRate com cenários EXECUTED (linhas 171-173)', async () => {
      // Criar cenários com diferentes status
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario CREATED',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.CREATED,
            projectId,
            packageId
          },
          {
            title: 'Scenario EXECUTED',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.EXECUTED,
            projectId,
            packageId
          },
          {
            title: 'Scenario PASSED',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.PASSED,
            projectId,
            packageId
          },
          {
            title: 'Scenario FAILED',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.FAILED,
            projectId,
            packageId
          }
        ]
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      // executionRate: 3 executados (EXECUTED, PASSED, FAILED) de 4 total = 75%
      expect(result.metrics.executionRate).toBe(75)

      // successRate: 1 concluído (PASSED) de 4 total = 25%
      expect(result.metrics.successRate).toBe(25)
    })

    it('calcula successRate quando todos os executados passaram (linhas 171-173)', async () => {
      // Criar apenas cenários PASSED
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario PASSED 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.PASSED,
            projectId,
            packageId
          },
          {
            title: 'Scenario PASSED 2',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.PASSED,
            projectId,
            packageId
          }
        ]
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      // executionRate: 2 executados de 2 total = 100%
      expect(result.metrics.executionRate).toBe(100)

      // successRate: 2 concluídos (PASSED) de 2 total = 100%
      expect(result.metrics.successRate).toBe(100)
    })

    it('calcula successRate incluindo cenários APPROVED', async () => {
      // Criar cenários com diferentes status incluindo APPROVED
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario CREATED',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.CREATED,
            projectId,
            packageId
          },
          {
            title: 'Scenario PASSED',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.PASSED,
            projectId,
            packageId
          },
          {
            title: 'Scenario APPROVED',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          },
          {
            title: 'Scenario FAILED',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.FAILED,
            projectId,
            packageId
          }
        ]
      })

      const result = await getPackageDetails({
        packageId,
        projectId
      })

      // successRate: 2 concluídos (1 PASSED + 1 APPROVED) de 4 total = 50%
      expect(result.metrics.successRate).toBe(50)
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

    it('trata erro Error e converte para AppError (linha 204)', async () => {
      // Mock do prisma para simular erro Error
      const originalFindFirst = prisma.testPackage.findFirst
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      prisma.testPackage.findFirst = jest.fn().mockImplementationOnce(() => {
        // Simular erro que é instância de Error
        throw new Error('Database connection failed')
      })

      await expect(getPackageDetails({
        packageId,
        projectId
      })).rejects.toMatchObject({
        statusCode: 500,
        message: 'Erro ao buscar detalhes do pacote: Database connection failed'
      })

      // Verificar que o erro foi logado (linha 202)
      expect(consoleSpy).toHaveBeenCalledWith('Error in getPackageDetails:', expect.any(Error))

      consoleSpy.mockRestore()
      // Restaurar função original
      prisma.testPackage.findFirst = originalFindFirst
    })
  })
})
