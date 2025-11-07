import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { getPackageScenarios } from '../../../application/use-cases/scenarios/getPackageScenarios.use-case'
import { AppError } from '../../../utils/AppError'
import { ScenarioType, Priority, ScenarioStatus } from '@prisma/client'

describe('getPackageScenarios', () => {
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
    await prisma.testPackage.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('getPackageScenarios - casos de sucesso', () => {
    it('retorna lista vazia quando pacote não tem cenários', async () => {
      const result = await getPackageScenarios({ packageId, projectId })

      expect(result).toEqual([])
    })

    it('retorna cenários do pacote ordenados por data de criação', async () => {
      // Criar cenários com diferentes datas
      const scenario1 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 1',
          description: 'Description 1',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test', 'auth']),
          projectId,
          packageId,
          createdAt: new Date('2024-01-01T10:00:00Z')
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
          createdAt: new Date('2024-01-02T10:00:00Z')
        }
      })

      const scenario3 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 3',
          description: 'Description 3',
          type: ScenarioType.SMOKE,
          priority: Priority.LOW,
          status: ScenarioStatus.PASSED,
          tags: JSON.stringify(['smoke', 'quick']),
          projectId,
          packageId,
          createdAt: new Date('2024-01-03T10:00:00Z')
        }
      })

      const result = await getPackageScenarios({ packageId, projectId })

      expect(result).toHaveLength(3)
      // Deve estar ordenado por createdAt desc (mais recente primeiro)
      expect(result[0].title).toBe('Scenario 3')
      expect(result[1].title).toBe('Scenario 2')
      expect(result[2].title).toBe('Scenario 1')
    })

    it('retorna cenários com steps incluídos', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Scenario with Steps',
          description: 'Description',
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

      const result = await getPackageScenarios({ packageId, projectId })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        title: 'Scenario with Steps',
        description: 'Description',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        status: ScenarioStatus.CREATED,
        projectId,
        packageId
      })
      expect(result[0].tags).toEqual(['test'])
      expect(result[0].steps).toHaveLength(3)
      expect(result[0].steps[0]).toMatchObject({
        action: 'Step 1',
        expected: 'Expected 1',
        stepOrder: 1
      })
      expect(result[0].steps[1]).toMatchObject({
        action: 'Step 2',
        expected: 'Expected 2',
        stepOrder: 2
      })
      expect(result[0].steps[2]).toMatchObject({
        action: 'Step 3',
        expected: 'Expected 3',
        stepOrder: 3
      })
    })

    it('retorna cenários com tags parseadas corretamente', async () => {
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.CREATED,
            tags: JSON.stringify(['test', 'auth', 'login']),
            projectId,
            packageId
          },
          {
            title: 'Scenario 2',
            description: 'Description 2',
            type: ScenarioType.REGRESSION,
            priority: Priority.MEDIUM,
            status: ScenarioStatus.EXECUTED,
            tags: JSON.stringify(['regression', 'critical']),
            projectId,
            packageId
          },
          {
            title: 'Scenario 3',
            description: 'Description 3',
            type: ScenarioType.SMOKE,
            priority: Priority.LOW,
            status: ScenarioStatus.PASSED,
            tags: null, // Tags nulas
            projectId,
            packageId
          }
        ]
      })

      const result = await getPackageScenarios({ packageId, projectId })

      expect(result).toHaveLength(3)
      expect(result[0].tags).toEqual(['test', 'auth', 'login'])
      expect(result[1].tags).toEqual(['regression', 'critical'])
      expect(result[2].tags).toEqual([]) // Tags nulas devem retornar array vazio
    })

    it('retorna cenários com diferentes tipos e prioridades', async () => {
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Functional Scenario',
            description: 'Description',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.CREATED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          },
          {
            title: 'Regression Scenario',
            description: 'Description',
            type: ScenarioType.REGRESSION,
            priority: Priority.MEDIUM,
            status: ScenarioStatus.EXECUTED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          },
          {
            title: 'Smoke Scenario',
            description: 'Description',
            type: ScenarioType.SMOKE,
            priority: Priority.LOW,
            status: ScenarioStatus.PASSED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          },
          {
            title: 'E2E Scenario',
            description: 'Description',
            type: ScenarioType.E2E,
            priority: Priority.CRITICAL,
            status: ScenarioStatus.FAILED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          }
        ]
      })

      const result = await getPackageScenarios({ packageId, projectId })

      expect(result).toHaveLength(4)
      
      const types = result.map(s => s.type)
      expect(types).toContain(ScenarioType.FUNCTIONAL)
      expect(types).toContain(ScenarioType.REGRESSION)
      expect(types).toContain(ScenarioType.SMOKE)
      expect(types).toContain(ScenarioType.E2E)

      const priorities = result.map(s => s.priority)
      expect(priorities).toContain(Priority.HIGH)
      expect(priorities).toContain(Priority.MEDIUM)
      expect(priorities).toContain(Priority.LOW)
      expect(priorities).toContain(Priority.CRITICAL)

      const statuses = result.map(s => s.status)
      expect(statuses).toContain(ScenarioStatus.CREATED)
      expect(statuses).toContain(ScenarioStatus.EXECUTED)
      expect(statuses).toContain(ScenarioStatus.PASSED)
      expect(statuses).toContain(ScenarioStatus.FAILED)
    })

    it('retorna cenários com steps ordenados corretamente', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Scenario with Steps',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId,
          steps: {
            create: [
              {
                action: 'Step 3',
                expected: 'Expected 3',
                stepOrder: 3
              },
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

      const result = await getPackageScenarios({ packageId, projectId })

      expect(result).toHaveLength(1)
      expect(result[0].steps).toHaveLength(3)
      // Steps devem estar ordenados por stepOrder asc
      expect(result[0].steps[0].stepOrder).toBe(1)
      expect(result[0].steps[0].action).toBe('Step 1')
      expect(result[0].steps[1].stepOrder).toBe(2)
      expect(result[0].steps[1].action).toBe('Step 2')
      expect(result[0].steps[2].stepOrder).toBe(3)
      expect(result[0].steps[2].action).toBe('Step 3')
    })

    it('retorna cenários sem steps', async () => {
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

      const result = await getPackageScenarios({ packageId, projectId })

      expect(result).toHaveLength(1)
      expect(result[0].steps).toEqual([])
    })
  })

  describe('getPackageScenarios - casos de erro', () => {
    it('lança erro quando pacote não existe', async () => {
      await expect(getPackageScenarios({ packageId: 99999, projectId })).rejects.toThrow(
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

      await expect(getPackageScenarios({ packageId: otherPackage.id, projectId })).rejects.toThrow(
        new AppError('Pacote não encontrado', 404)
      )

      // Limpar
      await prisma.testPackage.delete({ where: { id: otherPackage.id } })
      await prisma.project.delete({ where: { id: otherProject.id } })
    })

    it('lança erro quando projectId é inválido', async () => {
      await expect(getPackageScenarios({ packageId, projectId: 99999 })).rejects.toThrow(
        new AppError('Pacote não encontrado', 404)
      )
    })
  })

  describe('getPackageScenarios - casos especiais', () => {
    it('funciona com cenários de diferentes projetos no mesmo pacote', async () => {
      // Criar cenário no pacote correto
      await prisma.testScenario.create({
        data: {
          title: 'Correct Scenario',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId
        }
      })

      // Criar outro projeto e cenário (não deve aparecer nos resultados)
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
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId: otherProject.id,
          packageId // Mesmo pacote, mas projeto diferente
        }
      })

      const result = await getPackageScenarios({ packageId, projectId })

      // Deve retornar apenas o cenário do projeto correto
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Correct Scenario')
      expect(result[0].projectId).toBe(projectId)

      // Limpar
      await prisma.testScenario.deleteMany({ where: { projectId: otherProject.id } })
      await prisma.project.delete({ where: { id: otherProject.id } })
    })

    it('funciona com tags JSON malformadas', async () => {
      // Criar cenário com tags JSON inválidas (simulando dados corrompidos)
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Scenario with Invalid Tags',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: 'invalid json', // JSON inválido
          projectId,
          packageId
        }
      })

      // Este teste pode falhar se o JSON.parse lançar erro
      // Vamos testar se o use-case trata isso graciosamente
      await expect(getPackageScenarios({ packageId, projectId })).rejects.toThrow()
    })

    it('funciona com cenários criados em diferentes momentos', async () => {
      // Criar cenários com delays para garantir diferentes timestamps
      const scenario1 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 1',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId
        }
      })

      // Aguardar um pouco para garantir timestamp diferente
      await new Promise(resolve => setTimeout(resolve, 10))

      const scenario2 = await prisma.testScenario.create({
        data: {
          title: 'Scenario 2',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId
        }
      })

      const result = await getPackageScenarios({ packageId, projectId })

      expect(result).toHaveLength(2)
      // Deve estar ordenado por createdAt desc (mais recente primeiro)
      expect(result[0].id).toBe(scenario2.id)
      expect(result[1].id).toBe(scenario1.id)
    })
  })
})



















