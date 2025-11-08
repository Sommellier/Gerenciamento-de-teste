import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { deleteScenarioInPackage } from '../../../application/use-cases/scenarios/deleteScenarioInPackage.use-case'
import { AppError } from '../../../utils/AppError'
import { ScenarioType, Priority, ScenarioStatus } from '@prisma/client'

describe('deleteScenarioInPackage', () => {
  let projectId: number
  let packageId: number
  let scenarioId: number
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

    // Criar cenário de teste
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Test Scenario',
        description: 'Test Description',
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
    scenarioId = scenario.id
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.testScenarioStep.deleteMany()
    await prisma.testScenario.deleteMany()
    await prisma.testPackage.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('deleteScenarioInPackage - casos de sucesso', () => {
    it('deleta cenário com sucesso', async () => {
      const result = await deleteScenarioInPackage({
        scenarioId,
        packageId,
        projectId
      })

      expect(result).toEqual({
        message: 'Cenário deletado com sucesso'
      })

      // Verificar se o cenário foi deletado
      const deletedScenario = await prisma.testScenario.findUnique({
        where: { id: scenarioId }
      })
      expect(deletedScenario).toBeNull()
    })

    it('deleta cenário e seus steps automaticamente', async () => {
      // Verificar se os steps existem antes da deleção
      const stepsBefore = await prisma.testScenarioStep.findMany({
        where: { scenarioId }
      })
      expect(stepsBefore).toHaveLength(2)

      const result = await deleteScenarioInPackage({
        scenarioId,
        packageId,
        projectId
      })

      expect(result).toEqual({
        message: 'Cenário deletado com sucesso'
      })

      // Verificar se os steps foram deletados automaticamente
      const stepsAfter = await prisma.testScenarioStep.findMany({
        where: { scenarioId }
      })
      expect(stepsAfter).toHaveLength(0)
    })

    it('deleta cenário sem steps', async () => {
      // Criar cenário sem steps
      const scenarioWithoutSteps = await prisma.testScenario.create({
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

      const result = await deleteScenarioInPackage({
        scenarioId: scenarioWithoutSteps.id,
        packageId,
        projectId
      })

      expect(result).toEqual({
        message: 'Cenário deletado com sucesso'
      })

      // Verificar se o cenário foi deletado
      const deletedScenario = await prisma.testScenario.findUnique({
        where: { id: scenarioWithoutSteps.id }
      })
      expect(deletedScenario).toBeNull()
    })

    it('deleta cenário com diferentes tipos e status', async () => {
      // Criar cenários com diferentes tipos e status
      const scenarios = await Promise.all([
        prisma.testScenario.create({
          data: {
            title: 'Functional Scenario',
            description: 'Description',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.CREATED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          }
        }),
        prisma.testScenario.create({
          data: {
            title: 'Regression Scenario',
            description: 'Description',
            type: ScenarioType.REGRESSION,
            priority: Priority.MEDIUM,
            status: ScenarioStatus.EXECUTED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          }
        }),
        prisma.testScenario.create({
          data: {
            title: 'Smoke Scenario',
            description: 'Description',
            type: ScenarioType.SMOKE,
            priority: Priority.LOW,
            status: ScenarioStatus.PASSED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          }
        }),
        prisma.testScenario.create({
          data: {
            title: 'E2E Scenario',
            description: 'Description',
            type: ScenarioType.E2E,
            priority: Priority.CRITICAL,
            status: ScenarioStatus.FAILED,
            tags: JSON.stringify(['test']),
            projectId,
            packageId
          }
        })
      ])

      // Deletar cada cenário
      for (const scenario of scenarios) {
        const result = await deleteScenarioInPackage({
          scenarioId: scenario.id,
          packageId,
          projectId
        })

        expect(result).toEqual({
          message: 'Cenário deletado com sucesso'
        })

        // Verificar se o cenário foi deletado
        const deletedScenario = await prisma.testScenario.findUnique({
          where: { id: scenario.id }
        })
        expect(deletedScenario).toBeNull()
      }
    })

    it('deleta cenário com múltiplos steps', async () => {
      // Criar cenário com muitos steps
      const scenarioWithManySteps = await prisma.testScenario.create({
        data: {
          title: 'Scenario With Many Steps',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId,
          steps: {
            create: Array.from({ length: 10 }, (_, i) => ({
              action: `Step ${i + 1}`,
              expected: `Expected ${i + 1}`,
              stepOrder: i + 1
            }))
          }
        }
      })

      // Verificar se os steps existem antes da deleção
      const stepsBefore = await prisma.testScenarioStep.findMany({
        where: { scenarioId: scenarioWithManySteps.id }
      })
      expect(stepsBefore).toHaveLength(10)

      const result = await deleteScenarioInPackage({
        scenarioId: scenarioWithManySteps.id,
        packageId,
        projectId
      })

      expect(result).toEqual({
        message: 'Cenário deletado com sucesso'
      })

      // Verificar se todos os steps foram deletados
      const stepsAfter = await prisma.testScenarioStep.findMany({
        where: { scenarioId: scenarioWithManySteps.id }
      })
      expect(stepsAfter).toHaveLength(0)
    })

    it('não afeta outros cenários do mesmo pacote', async () => {
      // Criar outro cenário no mesmo pacote
      const otherScenario = await prisma.testScenario.create({
        data: {
          title: 'Other Scenario',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId
        }
      })

      const result = await deleteScenarioInPackage({
        scenarioId,
        packageId,
        projectId
      })

      expect(result).toEqual({
        message: 'Cenário deletado com sucesso'
      })

      // Verificar se o outro cenário ainda existe
      const remainingScenario = await prisma.testScenario.findUnique({
        where: { id: otherScenario.id }
      })
      expect(remainingScenario).not.toBeNull()
      expect(remainingScenario!.title).toBe('Other Scenario')

      // Limpar
      await prisma.testScenario.delete({ where: { id: otherScenario.id } })
    })

    it('não afeta cenários de outros pacotes', async () => {
      // Criar outro pacote
      const otherPackage = await prisma.testPackage.create({
        data: {
          title: 'Other Package',
          description: 'Other Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          release: '2024-01',
          projectId: projectId
        }
      })

      // Criar cenário no outro pacote
      const otherScenario = await prisma.testScenario.create({
        data: {
          title: 'Other Package Scenario',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId: otherPackage.id
        }
      })

      const result = await deleteScenarioInPackage({
        scenarioId,
        packageId,
        projectId
      })

      expect(result).toEqual({
        message: 'Cenário deletado com sucesso'
      })

      // Verificar se o cenário do outro pacote ainda existe
      const remainingScenario = await prisma.testScenario.findUnique({
        where: { id: otherScenario.id }
      })
      expect(remainingScenario).not.toBeNull()
      expect(remainingScenario!.title).toBe('Other Package Scenario')

      // Limpar
      await prisma.testScenario.delete({ where: { id: otherScenario.id } })
      await prisma.testPackage.delete({ where: { id: otherPackage.id } })
    })
  })

  describe('deleteScenarioInPackage - casos de erro', () => {
    it('lança erro quando cenário não existe', async () => {
      await expect(deleteScenarioInPackage({
        scenarioId: 99999,
        packageId,
        projectId
      })).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )
    })

    it('lança erro quando cenário não pertence ao pacote', async () => {
      // Criar outro pacote
      const otherPackage = await prisma.testPackage.create({
        data: {
          title: 'Other Package',
          description: 'Other Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          release: '2024-01',
          projectId: projectId
        }
      })

      await expect(deleteScenarioInPackage({
        scenarioId,
        packageId: otherPackage.id,
        projectId
      })).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )

      // Limpar
      await prisma.testPackage.delete({ where: { id: otherPackage.id } })
    })

    it('lança erro quando cenário não pertence ao projeto', async () => {
      // Criar outro projeto
      const otherProject = await prisma.project.create({
        data: {
          name: 'Other Project',
          description: 'Other Description',
          ownerId: userId
        }
      })

      await expect(deleteScenarioInPackage({
        scenarioId,
        packageId,
        projectId: otherProject.id
      })).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )

      // Limpar
      await prisma.project.delete({ where: { id: otherProject.id } })
    })

    it('lança erro quando pacote não existe', async () => {
      await expect(deleteScenarioInPackage({
        scenarioId,
        packageId: 99999,
        projectId
      })).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )
    })

    it('lança erro quando projeto não existe', async () => {
      await expect(deleteScenarioInPackage({
        scenarioId,
        packageId,
        projectId: 99999
      })).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )
    })
  })

  describe('deleteScenarioInPackage - casos especiais', () => {
    it('funciona com cenário que já foi deletado anteriormente', async () => {
      // Deletar o cenário uma primeira vez
      await deleteScenarioInPackage({
        scenarioId,
        packageId,
        projectId
      })

      // Tentar deletar novamente deve falhar
      await expect(deleteScenarioInPackage({
        scenarioId,
        packageId,
        projectId
      })).rejects.toThrow(
        new AppError('Cenário não encontrado', 404)
      )
    })

    it('funciona com cenário que tem relacionamentos', async () => {
      // Criar cenário com testador e aprovador
      const scenarioWithRelations = await prisma.testScenario.create({
        data: {
          title: 'Scenario With Relations',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId,
          testadorId: userId,
          aprovadorId: userId
        }
      })

      const result = await deleteScenarioInPackage({
        scenarioId: scenarioWithRelations.id,
        packageId,
        projectId
      })

      expect(result).toEqual({
        message: 'Cenário deletado com sucesso'
      })

      // Verificar se o cenário foi deletado
      const deletedScenario = await prisma.testScenario.findUnique({
        where: { id: scenarioWithRelations.id }
      })
      expect(deletedScenario).toBeNull()
    })

    it('funciona com cenário que tem tags complexas', async () => {
      // Criar cenário com tags complexas
      const complexTags = ['tag1', 'tag2', 'tag3', 'special-tag', 'test-tag']
      const scenarioWithComplexTags = await prisma.testScenario.create({
        data: {
          title: 'Scenario With Complex Tags',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(complexTags),
          projectId,
          packageId
        }
      })

      const result = await deleteScenarioInPackage({
        scenarioId: scenarioWithComplexTags.id,
        packageId,
        projectId
      })

      expect(result).toEqual({
        message: 'Cenário deletado com sucesso'
      })

      // Verificar se o cenário foi deletado
      const deletedScenario = await prisma.testScenario.findUnique({
        where: { id: scenarioWithComplexTags.id }
      })
      expect(deletedScenario).toBeNull()
    })

    it('funciona com cenário que tem environment definido', async () => {
      // Criar cenário com environment
      const scenarioWithEnvironment = await prisma.testScenario.create({
        data: {
          title: 'Scenario With Environment',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId,
          environment: 'PROD'
        }
      })

      const result = await deleteScenarioInPackage({
        scenarioId: scenarioWithEnvironment.id,
        packageId,
        projectId
      })

      expect(result).toEqual({
        message: 'Cenário deletado com sucesso'
      })

      // Verificar se o cenário foi deletado
      const deletedScenario = await prisma.testScenario.findUnique({
        where: { id: scenarioWithEnvironment.id }
      })
      expect(deletedScenario).toBeNull()
    })

    it('funciona com cenário que tem assigneeEmail definido', async () => {
      // Criar cenário com assigneeEmail
      const scenarioWithAssignee = await prisma.testScenario.create({
        data: {
          title: 'Scenario With Assignee',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          tags: JSON.stringify(['test']),
          projectId,
          packageId,
          assigneeEmail: 'assignee@example.com'
        }
      })

      const result = await deleteScenarioInPackage({
        scenarioId: scenarioWithAssignee.id,
        packageId,
        projectId
      })

      expect(result).toEqual({
        message: 'Cenário deletado com sucesso'
      })

      // Verificar se o cenário foi deletado
      const deletedScenario = await prisma.testScenario.findUnique({
        where: { id: scenarioWithAssignee.id }
      })
      expect(deletedScenario).toBeNull()
    })
  })
})




















