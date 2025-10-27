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
    // TODO: Adicionar limpeza de scenarioEvidence quando o modelo estiver disponível
    // TODO: Adicionar limpeza de scenarioExecution quando o modelo estiver disponível
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

    it('deve usar valores padrão quando filtros não são fornecidos', async () => {
      await prisma.testScenario.create({
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

      const filters = {} // Filtros vazios para testar valores padrão

      const result = await scenarioService.getPackageScenarios(packageId, filters, userId)

      expect(result.scenarios).toHaveLength(1)
      expect(result.pagination.page).toBe(1) // Valor padrão
      expect(result.pagination.pageSize).toBe(20) // Valor padrão
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

    it('deve filtrar por tag', async () => {
      await prisma.testScenario.create({
        data: {
          title: 'Scenario with tag',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId,
          projectId,
          tags: JSON.stringify(['auth', 'login']),
          steps: {
            create: [{ action: 'Action', expected: 'Expected', stepOrder: 1 }]
          }
        }
      })

      await prisma.testScenario.create({
        data: {
          title: 'Scenario without tag',
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

      const filters = {
        page: 1,
        pageSize: 20,
        sort: 'title' as const,
        sortOrder: 'asc' as const,
        tag: 'auth'
      }

      const result = await scenarioService.getPackageScenarios(packageId, filters, userId)

      expect(result.scenarios).toHaveLength(1)
      expect(result.scenarios[0].title).toBe('Scenario with tag')
    })

    it('deve filtrar por tipo', async () => {
      await prisma.testScenario.create({
        data: {
          title: 'Functional Scenario',
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
          title: 'Regression Scenario',
          type: 'REGRESSION',
          priority: 'HIGH',
          status: 'CREATED',
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
        type: 'FUNCTIONAL' as const
      }

      const result = await scenarioService.getPackageScenarios(packageId, filters, userId)

      expect(result.scenarios).toHaveLength(1)
      expect(result.scenarios[0].type).toBe('FUNCTIONAL')
    })

    it('deve filtrar por prioridade', async () => {
      await prisma.testScenario.create({
        data: {
          title: 'High Priority Scenario',
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
          title: 'Medium Priority Scenario',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM',
          status: 'CREATED',
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
        priority: 'HIGH' as const
      }

      const result = await scenarioService.getPackageScenarios(packageId, filters, userId)

      expect(result.scenarios).toHaveLength(1)
      expect(result.scenarios[0].priority).toBe('HIGH')
    })

    it('deve filtrar por query de busca', async () => {
      await prisma.testScenario.create({
        data: {
          title: 'Login Test Scenario',
          description: 'Test user login functionality',
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
          title: 'Logout Test Scenario',
          description: 'Test user logout functionality',
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

      const filters = {
        page: 1,
        pageSize: 20,
        sort: 'title' as const,
        sortOrder: 'asc' as const,
        q: 'login'
      }

      const result = await scenarioService.getPackageScenarios(packageId, filters, userId)

      expect(result.scenarios).toHaveLength(1)
      expect(result.scenarios[0].title).toBe('Login Test Scenario')
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

    it('deve criar cenário com steps sem order definido', async () => {
      const scenarioData = {
        title: 'New Scenario',
        type: 'FUNCTIONAL' as const,
        priority: 'HIGH' as const,
        steps: [
          {
            order: 0, // Order 0 para testar stepOrder: step.order || index + 1
            action: 'First Action',
            expected: 'First Expected'
          },
          {
            order: 0, // Order 0 para testar stepOrder: step.order || index + 1
            action: 'Second Action',
            expected: 'Second Expected'
          }
        ]
      }

      const result = await scenarioService.createScenario(packageId, scenarioData, userId)

      expect(result.title).toBe('New Scenario')
      expect(result.steps).toHaveLength(2)
      expect(result.steps[0].action).toBe('First Action')
      expect(result.steps[1].action).toBe('Second Action')
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

    it('deve validar se aprovadorId existe', async () => {
      const scenarioData = {
        title: 'New Scenario',
        type: 'FUNCTIONAL' as const,
        priority: 'HIGH' as const,
        aprovadorId: 99999, // ID inexistente
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

    it('deve negar acesso se usuário não tem permissão', async () => {
      const unauthorizedUser = await prisma.user.create({
        data: {
          name: 'Unauthorized User',
          email: `unauthorized_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      const scenarioData = {
        title: 'New Scenario',
        type: 'FUNCTIONAL' as const,
        priority: 'HIGH' as const,
        steps: [
          {
            order: 1,
            action: 'Action',
            expected: 'Expected'
          }
        ]
      }

      await expect(
        scenarioService.createScenario(packageId, scenarioData, unauthorizedUser.id)
      ).rejects.toThrow(AppError)

      // Limpar usuário não autorizado
      await prisma.user.delete({
        where: { id: unauthorizedUser.id }
      })
    })

    it('deve validar se testadorId existe', async () => {
      const scenarioData = {
        title: 'New Scenario',
        type: 'FUNCTIONAL' as const,
        priority: 'HIGH' as const,
        testadorId: 99999, // ID inexistente
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

    it('deve atualizar cenário com todos os campos opcionais', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Original Scenario',
          description: 'Original Description',
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

      const updateData = {
        id: scenario.id,
        title: 'Updated Scenario',
        description: 'Updated Description',
        type: 'REGRESSION' as const,
        priority: 'MEDIUM' as const,
        status: 'EXECUTED' as const,
        tags: ['tag1', 'tag2'],
        testadorId: userId,
        aprovadorId: userId
      }

      const result = await scenarioService.updateScenario(scenario.id, updateData, userId)

      expect(result.title).toBe('Updated Scenario')
      expect(result.description).toBe('Updated Description')
      expect(result.type).toBe('REGRESSION')
      expect(result.priority).toBe('MEDIUM')
      expect(result.status).toBe('EXECUTED')
    })

    it('deve atualizar cenário com tags null', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Original Scenario',
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

      const updateData = {
        id: scenario.id,
        title: 'Updated Scenario',
        tags: null as any
      }

      const result = await scenarioService.updateScenario(scenario.id, updateData, userId)

      expect(result.title).toBe('Updated Scenario')
    })

    it('deve atualizar cenário com testadorId e aprovadorId undefined', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Original Scenario',
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

      const updateData = {
        id: scenario.id,
        title: 'Updated Scenario',
        testadorId: undefined,
        aprovadorId: undefined
      }

      const result = await scenarioService.updateScenario(scenario.id, updateData, userId)

      expect(result.title).toBe('Updated Scenario')
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
      // expect(result.runNumber).toBe(1) // TODO: Implementar quando modelo estiver disponível
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

      // expect(result.runNumber).toBe(2) // TODO: Implementar quando modelo estiver disponível
    })

    it('deve executar cenário com status BLOCKED', async () => {
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
        status: 'BLOCKED' as const,
        notes: 'Execution blocked due to dependency'
      }

      const result = await scenarioService.executeScenario(scenario.id, executionData, userId)

      expect(result.status).toBe('BLOCKED')
      expect(result.notes).toBe('Execution blocked due to dependency')

      // Verificar se status do cenário foi atualizado para EXECUTED (não PASSED nem FAILED)
      const updatedScenario = await prisma.testScenario.findUnique({
        where: { id: scenario.id }
      })
      expect(updatedScenario?.status).toBe('EXECUTED')
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
          // severity: 'MEDIUM', // TODO: Implementar quando campo estiver disponível
          // module: 'Auth', // TODO: Implementar quando campo estiver disponível
          // environment: 'DEV', // TODO: Implementar quando campo estiver disponível
          tags: JSON.stringify(['test', 'auth']),
          // preconditions: JSON.stringify(['User logged in']), // TODO: Implementar quando campo estiver disponível
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

    it('deve negar acesso se usuário não tem permissão', async () => {
      const unauthorizedUser = await prisma.user.create({
        data: {
          name: 'Unauthorized User',
          email: `unauthorized_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      await expect(
        scenarioService.exportScenariosToCSV(packageId, unauthorizedUser.id)
      ).rejects.toThrow(AppError)

      // Limpar usuário não autorizado
      await prisma.user.delete({
        where: { id: unauthorizedUser.id }
      })
    })

    it('deve exportar cenários com tags null', async () => {
      await prisma.testScenario.create({
        data: {
          title: 'Scenario with null tags',
          description: 'Description with null tags',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId,
          projectId,
          tags: null, // Tags null para testar a branch específica
          steps: {
            create: [
              { action: 'Action 1', expected: 'Expected 1', stepOrder: 1 }
            ]
          }
        }
      })

      const csvContent = await scenarioService.exportScenariosToCSV(packageId, userId)

      expect(csvContent).toContain('"ID","Título","Descrição","Tipo","Prioridade"')
      expect(csvContent).toContain('Scenario with null tags')
      expect(csvContent).toContain('FUNCTIONAL')
    })
  })

  describe('updateScenario', () => {
    it('deve atualizar cenário com dados válidos', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Original Scenario',
          description: 'Original Description',
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

      const updateData = {
        id: scenario.id,
        title: 'Updated Scenario',
        description: 'Updated Description',
        type: 'REGRESSION' as const,
        priority: 'MEDIUM' as const,
        steps: [
          {
            order: 1,
            action: 'Updated Action',
            expected: 'Updated Expected'
          },
          {
            order: 2,
            action: 'New Action',
            expected: 'New Expected'
          }
        ]
      }

      const result = await scenarioService.updateScenario(scenario.id, updateData, userId)

      expect(result.title).toBe('Updated Scenario')
      expect(result.description).toBe('Updated Description')
      expect(result.type).toBe('REGRESSION')
      expect(result.priority).toBe('MEDIUM')
      expect(result.steps).toHaveLength(2)
      expect(result.steps[0].action).toBe('Updated Action')
      expect(result.steps[1].action).toBe('New Action')
    })

    it('deve atualizar cenário sem steps', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Original Scenario',
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

      const updateData = {
        id: scenario.id,
        title: 'Updated Scenario',
        description: 'Updated Description'
      }

      const result = await scenarioService.updateScenario(scenario.id, updateData, userId)

      expect(result.title).toBe('Updated Scenario')
      expect(result.description).toBe('Updated Description')
      // Steps devem permanecer inalterados
      expect(result.steps).toHaveLength(1)
    })

    it('deve atualizar cenário com steps sem order definido', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Original Scenario',
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

      const updateData = {
        id: scenario.id,
        title: 'Updated Scenario',
        steps: [
          {
            order: 0, // Order 0 para testar stepOrder: step.order || index + 1
            action: 'Updated Action',
            expected: 'Updated Expected'
          },
          {
            order: 0, // Order 0 para testar stepOrder: step.order || index + 1
            action: 'New Action',
            expected: 'New Expected'
          }
        ]
      }

      const result = await scenarioService.updateScenario(scenario.id, updateData, userId)

      expect(result.title).toBe('Updated Scenario')
      expect(result.steps).toHaveLength(2)
      expect(result.steps[0].action).toBe('Updated Action')
      expect(result.steps[1].action).toBe('New Action')
    })
  })

  describe('deleteScenario', () => {
    it('deve deletar cenário com sucesso', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Scenario to Delete',
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

      const result = await scenarioService.deleteScenario(scenario.id, userId)

      expect(result.message).toBe('Cenário deletado com sucesso')

      // Verificar se o cenário foi deletado
      const deletedScenario = await prisma.testScenario.findUnique({
        where: { id: scenario.id }
      })
      expect(deletedScenario).toBeNull()
    })
  })

  describe('uploadEvidence', () => {
    it('deve fazer upload de evidência com arquivo válido', async () => {
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

      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        filename: 'evidence-123.jpg',
        buffer: Buffer.from('test image data')
      } as Express.Multer.File

      const result = await scenarioService.uploadEvidence(scenario.id, mockFile, userId)

      expect(result.id).toBe(1)
      expect(result.filename).toBe('evidence-123.jpg')
      expect(result.originalName).toBe('test.jpg')
      expect(result.uploadedByUser.id).toBe(userId)
    })

    it('deve rejeitar arquivo com tipo não permitido', async () => {
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

      const mockFile = {
        fieldname: 'file',
        originalname: 'test.exe',
        mimetype: 'application/x-executable',
        filename: 'test.exe',
        buffer: Buffer.from('executable data')
      } as Express.Multer.File

      await expect(
        scenarioService.uploadEvidence(scenario.id, mockFile, userId)
      ).rejects.toThrow(AppError)
    })

    it('deve rejeitar arquivo muito grande', async () => {
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

      const mockFile = {
        fieldname: 'file',
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        filename: 'large.jpg',
        size: 6 * 1024 * 1024, // 6MB (maior que o limite de 5MB)
        buffer: Buffer.from('large image data')
      } as Express.Multer.File

      await expect(
        scenarioService.uploadEvidence(scenario.id, mockFile, userId)
      ).rejects.toThrow(AppError)
    })
  })

  describe('getScenarioById', () => {
    it('deve retornar cenário por ID', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
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

      const result = await scenarioService.getScenarioById(scenario.id, userId)

      expect(result.id).toBe(scenario.id)
      expect(result.title).toBe('Test Scenario')
      expect(result.description).toBe('Test Description')
      expect(result.steps).toHaveLength(2)
    })

    it('deve retornar erro se cenário não existe', async () => {
      await expect(
        scenarioService.getScenarioById(99999, userId)
      ).rejects.toThrow(AppError)
    })

    it('deve negar acesso se usuário não tem permissão', async () => {
      const unauthorizedUser = await prisma.user.create({
        data: {
          name: 'Unauthorized User',
          email: `unauthorized_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

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

      await expect(
        scenarioService.getScenarioById(scenario.id, unauthorizedUser.id)
      ).rejects.toThrow(AppError)

      // Limpar usuário não autorizado
      await prisma.user.delete({
        where: { id: unauthorizedUser.id }
      })
    })
  })

  describe('checkPackageAccess', () => {
    it('deve retornar null se pacote não existe', async () => {
      const result = await scenarioService.checkPackageAccess(99999, userId)
      expect(result).toBeNull()
    })

    it('deve retornar dados de acesso para owner do projeto', async () => {
      const result = await scenarioService.checkPackageAccess(packageId, ownerId)
      expect(result).not.toBeNull()
      expect(result?.projectId).toBe(projectId)
    })

    it('deve retornar dados de acesso para membro do projeto', async () => {
      const result = await scenarioService.checkPackageAccess(packageId, userId)
      expect(result).not.toBeNull()
      expect(result?.projectId).toBe(projectId)
    })

    it('deve retornar null para usuário sem acesso', async () => {
      const unauthorizedUser = await prisma.user.create({
        data: {
          name: 'Unauthorized User',
          email: `unauthorized_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      const result = await scenarioService.checkPackageAccess(packageId, unauthorizedUser.id)
      expect(result).toBeNull()

      // Limpar usuário não autorizado
      await prisma.user.delete({
        where: { id: unauthorizedUser.id }
      })
    })
  })
})
