import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { createScenarioInPackage } from '../../../application/use-cases/scenarios/createScenarioInPackage.use-case'
import { AppError } from '../../../utils/AppError'
import { ScenarioType, Priority } from '@prisma/client'

describe('createScenarioInPackage', () => {
  let projectId: number
  let packageId: number
  let userId: number
  let testadorId: number
  let aprovadorId: number

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

    // Criar testador
    const testador = await prisma.user.create({
      data: {
        name: 'Testador User',
        email: `testador_${Date.now()}@example.com`,
        password: 'password123'
      }
    })
    testadorId = testador.id

    // Criar aprovador
    const aprovador = await prisma.user.create({
      data: {
        name: 'Aprovador User',
        email: `aprovador_${Date.now()}@example.com`,
        password: 'password123'
      }
    })
    aprovadorId = aprovador.id

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

    // Adicionar testador e aprovador ao projeto
    await prisma.userOnProject.createMany({
      data: [
        {
          userId: testadorId,
          projectId: projectId,
          role: 'TESTER'
        },
        {
          userId: aprovadorId,
          projectId: projectId,
          role: 'APPROVER'
        }
      ]
    })
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.testScenarioStep.deleteMany()
    await prisma.testScenario.deleteMany()
    await prisma.testPackage.deleteMany()
    await prisma.userOnProject.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('createScenarioInPackage - casos de sucesso', () => {
    it('cria cenário com dados básicos', async () => {
      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test', 'auth'],
        steps: [
          {
            action: 'Click login button',
            expected: 'User is logged in'
          }
        ]
      }

      const result = await createScenarioInPackage(scenarioData)

      expect(result).toMatchObject({
        title: 'Test Scenario',
        description: 'Test Description',
        type: ScenarioType.FUNCTIONAL, // Herdado do pacote
        priority: Priority.HIGH,
        projectId,
        packageId
      })
      expect(result.tags).toEqual(['test', 'auth'])
      expect(result.steps).toHaveLength(1)
      expect(result.steps[0]).toMatchObject({
        action: 'Click login button',
        expected: 'User is logged in',
        stepOrder: 1
      })
    })

    it('cria cenário sem steps', async () => {
      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario Without Steps',
        description: 'Test Description',
        priority: 'MEDIUM' as const,
        tags: ['test'],
        steps: []
      }

      const result = await createScenarioInPackage(scenarioData)

      expect(result).toMatchObject({
        title: 'Test Scenario Without Steps',
        description: 'Test Description',
        priority: Priority.MEDIUM,
        projectId,
        packageId
      })
      expect(result.steps).toHaveLength(0)
    })

    it('cria cenário com tipo específico', async () => {
      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'REGRESSION' as const,
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: []
      }

      const result = await createScenarioInPackage(scenarioData)

      expect(result.type).toBe(ScenarioType.REGRESSION)
    })

    it('cria cenário com testador e aprovador', async () => {
      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [],
        testadorId,
        aprovadorId
      }

      const result = await createScenarioInPackage(scenarioData)

      expect(result.testador).toMatchObject({
        id: testadorId,
        name: 'Testador User',
        email: expect.stringContaining('testador_')
      })
      expect(result.aprovador).toMatchObject({
        id: aprovadorId,
        name: 'Aprovador User',
        email: expect.stringContaining('aprovador_')
      })
    })

    it('cria cenário com assigneeId', async () => {
      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [],
        assigneeId: testadorId
      }

      const result = await createScenarioInPackage(scenarioData)

      expect(result).toMatchObject({
        title: 'Test Scenario',
        projectId,
        packageId
      })
    })

    it('cria cenário com assigneeEmail', async () => {
      const testador = await prisma.user.findUnique({
        where: { id: testadorId }
      })

      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [],
        assigneeEmail: testador!.email
      }

      const result = await createScenarioInPackage(scenarioData)

      expect(result).toMatchObject({
        title: 'Test Scenario',
        projectId,
        packageId
      })
    })

    it('cria cenário com assigneeId como objeto', async () => {
      const testador = await prisma.user.findUnique({
        where: { id: testadorId }
      })

      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [],
        assigneeId: {
          value: testadorId,
          email: testador!.email
        } as any
      }

      const result = await createScenarioInPackage(scenarioData)

      expect(result).toMatchObject({
        title: 'Test Scenario',
        projectId,
        packageId
      })
    })

    it('cria cenário com múltiplos steps', async () => {
      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [
          {
            action: 'Step 1',
            expected: 'Expected 1'
          },
          {
            action: 'Step 2',
            expected: 'Expected 2'
          },
          {
            action: 'Step 3',
            expected: 'Expected 3'
          }
        ]
      }

      const result = await createScenarioInPackage(scenarioData)

      expect(result.steps).toHaveLength(3)
      expect(result.steps[0]).toMatchObject({
        action: 'Step 1',
        expected: 'Expected 1',
        stepOrder: 1
      })
      expect(result.steps[1]).toMatchObject({
        action: 'Step 2',
        expected: 'Expected 2',
        stepOrder: 2
      })
      expect(result.steps[2]).toMatchObject({
        action: 'Step 3',
        expected: 'Expected 3',
        stepOrder: 3
      })
    })

    it('cria cenário com tags vazias', async () => {
      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: [],
        steps: []
      }

      const result = await createScenarioInPackage(scenarioData)

      expect(result.tags).toEqual([])
    })
  })

  describe('createScenarioInPackage - casos de erro', () => {
    it('lança erro quando pacote não existe', async () => {
      const scenarioData = {
        packageId: 99999,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: []
      }

      await expect(createScenarioInPackage(scenarioData)).rejects.toThrow(
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

      const scenarioData = {
        packageId: otherPackage.id,
        projectId, // Projeto diferente
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: []
      }

      await expect(createScenarioInPackage(scenarioData)).rejects.toThrow(
        new AppError('Pacote não encontrado', 404)
      )

      // Limpar
      await prisma.testPackage.delete({ where: { id: otherPackage.id } })
      await prisma.project.delete({ where: { id: otherProject.id } })
    })

    it('lança erro quando assigneeId não existe', async () => {
      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [],
        assigneeId: 99999
      }

      await expect(createScenarioInPackage(scenarioData)).rejects.toThrow(
        new AppError('Usuário responsável não encontrado', 404)
      )
    })

    it('lança erro quando assigneeEmail não existe', async () => {
      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [],
        assigneeEmail: 'nonexistent@example.com'
      }

      await expect(createScenarioInPackage(scenarioData)).rejects.toThrow(
        new AppError('Usuário responsável não encontrado', 404)
      )
    })

    it('lança erro quando testadorId não existe', async () => {
      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [],
        testadorId: 99999
      }

      await expect(createScenarioInPackage(scenarioData)).rejects.toThrow(
        new AppError('Testador não encontrado', 404)
      )
    })

    it('lança erro quando testador não é membro do projeto', async () => {
      // Criar usuário que não é membro do projeto
      const nonMember = await prisma.user.create({
        data: {
          name: 'Non Member',
          email: `nonmember_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [],
        testadorId: nonMember.id
      }

      await expect(createScenarioInPackage(scenarioData)).rejects.toThrow(
        new AppError('Testador deve ser membro do projeto', 400)
      )

      // Limpar
      await prisma.user.delete({ where: { id: nonMember.id } })
    })

    it('lança erro quando aprovadorId não existe', async () => {
      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [],
        aprovadorId: 99999
      }

      await expect(createScenarioInPackage(scenarioData)).rejects.toThrow(
        new AppError('Aprovador não encontrado', 404)
      )
    })

    it('lança erro quando aprovador não é membro do projeto', async () => {
      // Criar usuário que não é membro do projeto
      const nonMember = await prisma.user.create({
        data: {
          name: 'Non Member',
          email: `nonmember_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [],
        aprovadorId: nonMember.id
      }

      await expect(createScenarioInPackage(scenarioData)).rejects.toThrow(
        new AppError('Aprovador deve ser membro do projeto', 400)
      )

      // Limpar
      await prisma.user.delete({ where: { id: nonMember.id } })
    })

    it('lança erro quando assigneeId é objeto mas usuário não existe', async () => {
      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [],
        assigneeId: {
          value: 99999
          // email não fornecido para forçar validação do actualAssigneeId
        } as any
      }

      await expect(createScenarioInPackage(scenarioData)).rejects.toThrow(
        new AppError('Usuário responsável não encontrado', 404)
      )
    })
  })

  describe('createScenarioInPackage - casos especiais', () => {
    it('herda tipo do pacote quando não fornecido', async () => {
      // Atualizar pacote para ter tipo diferente
      await prisma.testPackage.update({
        where: { id: packageId },
        data: { type: ScenarioType.REGRESSION }
      })

      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: []
        // type não fornecido
      }

      const result = await createScenarioInPackage(scenarioData)

      expect(result.type).toBe(ScenarioType.REGRESSION)
    })

    it('funciona com assigneeId e assigneeEmail fornecidos', async () => {
      const testador = await prisma.user.findUnique({
        where: { id: testadorId }
      })

      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [],
        assigneeId: testadorId,
        assigneeEmail: testador!.email
      }

      const result = await createScenarioInPackage(scenarioData)

      expect(result).toMatchObject({
        title: 'Test Scenario',
        projectId,
        packageId
      })
    })

    it('funciona apenas com assigneeEmail sem assigneeId', async () => {
      const testador = await prisma.user.findUnique({
        where: { id: testadorId }
      })

      const scenarioData = {
        packageId,
        projectId,
        title: 'Test Scenario',
        description: 'Test Description',
        priority: 'HIGH' as const,
        tags: ['test'],
        steps: [],
        assigneeEmail: testador!.email
        // assigneeId não fornecido
      }

      const result = await createScenarioInPackage(scenarioData)

      expect(result).toMatchObject({
        title: 'Test Scenario',
        projectId,
        packageId
      })
    })
  })
})
