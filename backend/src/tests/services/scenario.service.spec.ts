import { prisma } from '../../infrastructure/prisma'
import { ScenarioService } from '../../services/scenario.service'
import { AppError } from '../../utils/AppError'

describe('ScenarioService', () => {
  let scenarioService: ScenarioService
  let projectId: number
  let packageId: number
  let ownerId: number
  let userId: number

  beforeEach(async () => {
    scenarioService = new ScenarioService()

    // Criar usuário dono do projeto
    const owner = await prisma.user.create({
      data: {
        name: 'Project Owner',
        email: 'owner@example.com',
        password: 'password123'
      }
    })
    ownerId = owner.id

    // Criar usuário membro
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
        ownerId
      }
    })
    projectId = project.id

    // Criar membro do projeto
    await prisma.userOnProject.create({
      data: {
        userId,
        projectId,
        role: 'TESTER'
      }
    })

    // Criar pacote de teste
    const testPackage = await prisma.testPackage.create({
      data: {
        title: 'Test Package',
        description: 'Test Package Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId,
        release: '2024-01'
      }
    })
    packageId = testPackage.id
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.testScenarioStep.deleteMany({
      where: { scenario: { projectId } }
    })
    await prisma.testScenario.deleteMany({
      where: { projectId }
    })
    await prisma.testPackage.deleteMany({
      where: { projectId }
    })
    await prisma.userOnProject.deleteMany({
      where: { projectId }
    })
    await prisma.project.deleteMany({
      where: { id: projectId }
    })
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['owner@example.com', 'user@example.com']
        }
      }
    })
  })

  describe('getPackageScenarios', () => {
    it('deve retornar cenários de um pacote com filtros', async () => {
      // Criar cenários de teste
      const scenario1 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 1',
          description: 'Description 1',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId,
          projectId,
          steps: {
            create: [
              { action: 'Action 1', expected: 'Expected 1', stepOrder: 1 }
            ]
          }
        }
      })

      const scenario2 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 2',
          description: 'Description 2',
          type: 'REGRESSION',
          priority: 'MEDIUM',
          status: 'PASSED',
          packageId,
          projectId,
          steps: {
            create: [
              { action: 'Action 2', expected: 'Expected 2', stepOrder: 1 }
            ]
          }
        }
      })

      const filters = {
        page: 1,
        pageSize: 20,
        sort: 'title' as const,
        sortOrder: 'asc' as const
      }

      const result = await scenarioService.getPackageScenarios(packageId, filters, userId)

      expect(result.scenarios).toHaveLength(2)
      expect(result.pagination.total).toBe(2)
      expect(result.scenarios[0].title).toBe('Scenario 1')
    })

    it('deve filtrar por status', async () => {
      await prisma.testScenario.create({
        data: {
          title: 'Created Scenario',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId,
          projectId,
          steps: {
            create: [{ action: 'Action', expected: 'Expected', stepOrder: 1 }]
          }
        }
      })

      await prisma.testScenario.create({
        data: {
          title: 'Passed Scenario',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'PASSED',
          packageId,
          projectId,
          steps: {
            create: [{ action: 'Action', expected: 'Expected', stepOrder: 1 }]
          }
        }
      })

      const filters = {
        page: 1,
        pageSize: 20,
        sort: 'title' as const,
        sortOrder: 'asc' as const,
        status: 'CREATED' as const
      }

      const result = await scenarioService.getPackageScenarios(packageId, filters, userId)

      expect(result.scenarios).toHaveLength(1)
      expect(result.scenarios[0].status).toBe('CREATED')
    })

    it('deve negar acesso se usuário não tem permissão', async () => {
      const unauthorizedUser = await prisma.user.create({
        data: {
          name: 'Unauthorized User',
          email: `unauthorized_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      const filters = {
        page: 1,
        pageSize: 20,
        sort: 'title' as const,
        sortOrder: 'asc' as const
      }

      await expect(
        scenarioService.getPackageScenarios(packageId, filters, unauthorizedUser.id)
      ).rejects.toThrow(AppError)

      // Limpar usuário não autorizado
      await prisma.user.delete({
        where: { id: unauthorizedUser.id }
      })
    })
  })

  describe('createScenario', () => {
    it('deve criar cenário com dados válidos', async () => {
      const scenarioData = {
        title: 'New Scenario',
        description: 'New Description',
        type: 'FUNCTIONAL' as const,
        priority: 'HIGH' as const,
        severity: 'MEDIUM' as const,
        module: 'Auth',
        environment: 'DEV' as const,
        tags: ['test', 'auth'],
        preconditions: ['User logged in'],
        steps: [
          {
            order: 1,
            action: 'Click login button',
            dataInput: 'username: test, password: test123',
            expected: 'User is logged in',
            checkpoint: 'Check dashboard is visible'
          }
        ]
      }

      const result = await scenarioService.createScenario(packageId, scenarioData, userId)

      expect(result.title).toBe('New Scenario')
      expect(result.type).toBe('FUNCTIONAL')
      expect(result.priority).toBe('HIGH')
      expect(result.steps).toHaveLength(1)
      expect(result.steps[0].action).toBe('Click login button')
    })

    it('deve validar se ownerUserId existe', async () => {
      const scenarioData = {
        title: 'New Scenario',
        type: 'FUNCTIONAL' as const,
        priority: 'HIGH' as const,
        ownerUserId: 99999, // ID inexistente
        steps: [
          {
            order: 1,
            action: 'Action',
            expected: 'Expected'
          }
        ]
      }

      await expect(
        scenarioService.createScenario(packageId, scenarioData, userId)
      ).rejects.toThrow(AppError)
    })
  })

  describe('executeScenario', () => {
    it('deve executar cenário e atualizar status', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId,
          projectId,
          steps: {
            create: [
              { action: 'Action', expected: 'Expected', stepOrder: 1 }
            ]
          }
        }
      })

      const executionData = {
        status: 'PASSED' as const,
        notes: 'Execution completed successfully'
      }

      const result = await scenarioService.executeScenario(scenario.id, executionData, userId)

      expect(result.status).toBe('PASSED')
      expect(result.notes).toBe('Execution completed successfully')

      // Verificar se status do cenário foi atualizado
      const updatedScenario = await prisma.testScenario.findUnique({
        where: { id: scenario.id }
      })
      expect(updatedScenario?.status).toBe('PASSED')
    })

    it('deve gerar número sequencial de execução', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId,
          projectId,
          steps: {
            create: [
              { action: 'Action', expected: 'Expected', stepOrder: 1 }
            ]
          }
        }
      })

      // Primeira execução
      await scenarioService.executeScenario(scenario.id, { status: 'PASSED' }, userId)
      
      // Segunda execução
      const result = await scenarioService.executeScenario(scenario.id, { status: 'FAILED' }, userId)
    })
  })

  describe('duplicateScenario', () => {
    it('deve duplicar cenário com todos os dados', async () => {
      const originalScenario = await prisma.testScenario.create({
        data: {
          title: 'Original Scenario',
          description: 'Original Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          tags: JSON.stringify(['test', 'auth']),
          status: 'PASSED',
          packageId,
          projectId,
          steps: {
            create: [
              { action: 'Action 1', expected: 'Expected 1', stepOrder: 1 },
              { action: 'Action 2', expected: 'Expected 2', stepOrder: 2 }
            ]
          }
        }
      })

      const duplicatedScenario = await scenarioService.duplicateScenario(originalScenario.id, userId)

      expect(duplicatedScenario.title).toBe('Original Scenario (Cópia)')
      expect(duplicatedScenario.description).toBe('Original Description')
      expect(duplicatedScenario.type).toBe('FUNCTIONAL')
      expect(duplicatedScenario.priority).toBe('HIGH')
      expect(duplicatedScenario.status).toBe('CREATED') // Status deve ser resetado
      expect(duplicatedScenario.steps).toHaveLength(2)
    })
  })

  describe('exportScenariosToCSV', () => {
    it('deve exportar cenários para CSV', async () => {
      await prisma.testScenario.create({
        data: {
          title: 'Scenario 1',
          description: 'Description 1',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId,
          projectId,
          steps: {
            create: [
              { action: 'Action 1', expected: 'Expected 1', stepOrder: 1 }
            ]
          }
        }
      })

      await prisma.testScenario.create({
        data: {
          title: 'Scenario 2',
          description: 'Description 2',
          type: 'REGRESSION',
          priority: 'MEDIUM',
          status: 'PASSED',
          packageId,
          projectId,
          steps: {
            create: [
              { action: 'Action 2', expected: 'Expected 2', stepOrder: 1 }
            ]
          }
        }
      })

      const csvContent = await scenarioService.exportScenariosToCSV(packageId, userId)

      expect(csvContent).toContain('"ID","Título","Descrição","Tipo","Prioridade"')
      expect(csvContent).toContain('Scenario 1')
      expect(csvContent).toContain('Scenario 2')
      expect(csvContent).toContain('FUNCTIONAL')
      expect(csvContent).toContain('REGRESSION')
    })
  })
})
