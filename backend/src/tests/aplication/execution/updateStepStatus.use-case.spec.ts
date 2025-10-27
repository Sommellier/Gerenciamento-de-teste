import { prisma } from '../../../infrastructure/prisma'
import { updateStepStatus } from '../../../application/use-cases/execution/updateStepStatus.use-case'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { AppError } from '../../../utils/AppError'

describe('updateStepStatus', () => {
  let projectId: number
  let scenarioId: number
  let stepId: number
  let userId: number

  beforeEach(async () => {
    // Criar usuário
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
        ownerId: userId
      }
    })
    projectId = project.id

    // Criar cenário
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId
      }
    })
    scenarioId = scenario.id

    // Criar etapa
    const step = await prisma.testScenarioStep.create({
      data: {
        action: 'Click login button',
        expected: 'User is logged in',
        stepOrder: 1,
        scenarioId
      }
    })
    stepId = step.id
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.testScenarioStep.deleteMany({
      where: { scenarioId }
    })
    await prisma.testScenario.deleteMany({
      where: { projectId }
    })
    await prisma.project.deleteMany({
      where: { id: projectId }
    })
    await prisma.user.deleteMany({
      where: { id: userId }
    })
  })

  describe('updateStepStatus - casos de sucesso', () => {
    it('atualiza status para PENDING', async () => {
      const result = await updateStepStatus({
        stepId,
        status: 'PENDING',
        userId
      })

      expect(result.status).toBe('PENDING')
      expect(result.actualResult).toBeNull()
    })

    it('atualiza status para PASSED', async () => {
      const result = await updateStepStatus({
        stepId,
        status: 'PASSED',
        userId
      })

      expect(result.status).toBe('PASSED')
    })

    it('atualiza status para FAILED', async () => {
      const result = await updateStepStatus({
        stepId,
        status: 'FAILED',
        userId
      })

      expect(result.status).toBe('FAILED')
    })

    it('atualiza status para BLOCKED', async () => {
      const result = await updateStepStatus({
        stepId,
        status: 'BLOCKED',
        userId
      })

      expect(result.status).toBe('BLOCKED')
    })

    it('atualiza status com actualResult', async () => {
      const actualResult = 'User successfully logged in'
      
      const result = await updateStepStatus({
        stepId,
        status: 'PASSED',
        actualResult,
        userId
      })

      expect(result.status).toBe('PASSED')
      expect(result.actualResult).toBe(actualResult)
    })

    it('atualiza actualResult sem alterar status existente', async () => {
      // Primeiro, definir um status
      await updateStepStatus({
        stepId,
        status: 'PASSED',
        userId
      })

      // Depois, atualizar apenas o actualResult
      const newActualResult = 'Updated actual result'
      const result = await updateStepStatus({
        stepId,
        status: 'PASSED',
        actualResult: newActualResult,
        userId
      })

      expect(result.status).toBe('PASSED')
      expect(result.actualResult).toBe(newActualResult)
    })

    it('atualiza status múltiplas vezes', async () => {
      const statuses = ['PENDING', 'PASSED', 'FAILED', 'BLOCKED', 'PASSED']
      
      for (const status of statuses) {
        const result = await updateStepStatus({
          stepId,
          status: status as 'PENDING' | 'PASSED' | 'FAILED' | 'BLOCKED',
          userId
        })

        expect(result.status).toBe(status)
      }
    })

    it('atualiza com actualResult longo', async () => {
      const longActualResult = 'A'.repeat(1000)
      
      const result = await updateStepStatus({
        stepId,
        status: 'FAILED',
        actualResult: longActualResult,
        userId
      })

      expect(result.actualResult).toBe(longActualResult)
    })

    it('atualiza com actualResult contendo caracteres especiais', async () => {
      const specialActualResult = 'Resultado com @#$%^&*()_+{}|:"<>?[]\\;\',./'
      
      const result = await updateStepStatus({
        stepId,
        status: 'FAILED',
        actualResult: specialActualResult,
        userId
      })

      expect(result.actualResult).toBe(specialActualResult)
    })

    it('atualiza com actualResult contendo emojis', async () => {
      const emojiActualResult = 'Etapa falhou 😞 Erro crítico 🚨'
      
      const result = await updateStepStatus({
        stepId,
        status: 'FAILED',
        actualResult: emojiActualResult,
        userId
      })

      expect(result.actualResult).toBe(emojiActualResult)
    })

    it('atualiza com actualResult contendo quebras de linha', async () => {
      const multilineActualResult = 'Linha 1\nLinha 2\nLinha 3'
      
      const result = await updateStepStatus({
        stepId,
        status: 'FAILED',
        actualResult: multilineActualResult,
        userId
      })

      expect(result.actualResult).toBe(multilineActualResult)
    })

    it('funciona com userId inválido (não afeta a operação)', async () => {
      const result = await updateStepStatus({
        stepId,
        status: 'PASSED',
        userId: 99999
      })

      expect(result.status).toBe('PASSED')
    })
  })

  describe('updateStepStatus - casos de erro', () => {
    it('rejeita quando etapa não existe', async () => {
      await expect(updateStepStatus({
        stepId: 99999,
        status: 'PASSED',
        userId
      })).rejects.toThrow(new AppError('Etapa não encontrada', 404))
    })

    it('rejeita quando stepId é inválido', async () => {
      await expect(updateStepStatus({
        stepId: -1,
        status: 'PASSED',
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando stepId é zero', async () => {
      await expect(updateStepStatus({
        stepId: 0,
        status: 'PASSED',
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando status é inválido', async () => {
      await expect(updateStepStatus({
        stepId,
        status: 'INVALID_STATUS' as any,
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando userId é inválido', async () => {
      const result = await updateStepStatus({
        stepId,
        status: 'PASSED',
        userId: -1
      })

      expect(result.status).toBe('PASSED')
    })
  })

  describe('updateStepStatus - casos especiais', () => {
    it('atualiza múltiplas etapas independentemente', async () => {
      // Criar outra etapa
      const step2 = await prisma.testScenarioStep.create({
        data: {
          action: 'Click logout button',
          expected: 'User is logged out',
          stepOrder: 2,
          scenarioId
        }
      })

      const result1 = await updateStepStatus({
        stepId,
        status: 'PASSED',
        actualResult: 'Step 1 passed',
        userId
      })

      const result2 = await updateStepStatus({
        stepId: step2.id,
        status: 'FAILED',
        actualResult: 'Step 2 failed',
        userId
      })

      expect(result1.status).toBe('PASSED')
      expect(result1.actualResult).toBe('Step 1 passed')
      expect(result2.status).toBe('FAILED')
      expect(result2.actualResult).toBe('Step 2 failed')
    })

    it('atualiza etapa várias vezes sequencialmente', async () => {
      const updates = [
        { status: 'PENDING' as const, actualResult: 'Starting step' },
        { status: 'PASSED' as const, actualResult: 'Step completed successfully' },
        { status: 'FAILED' as const, actualResult: 'Step failed due to error' },
        { status: 'BLOCKED' as const, actualResult: 'Step blocked by dependency' },
        { status: 'PASSED' as const, actualResult: 'Step finally passed' }
      ]

      let currentStepId = stepId
      for (const update of updates) {
        const result = await updateStepStatus({
          stepId: currentStepId,
          ...update,
          userId
        })
        currentStepId = result.id
      }

      const finalStep = await prisma.testScenarioStep.findUnique({
        where: { id: stepId }
      })

      expect(finalStep?.status).toBe('PASSED')
      expect(finalStep?.actualResult).toBe('Step finally passed')
    })

    it('preserva actualResult anterior quando não fornecido', async () => {
      const initialActualResult = 'Initial actual result'
      
      // Definir initial actualResult
      await updateStepStatus({
        stepId,
        status: 'PASSED',
        actualResult: initialActualResult,
        userId
      })

      // Atualizar apenas o status, sem fornecer actualResult
      const result = await updateStepStatus({
        stepId,
        status: 'FAILED',
        userId
      })

      expect(result.status).toBe('FAILED')
      expect(result.actualResult).toBe(initialActualResult)
    })

    it('atualiza etapa com actualResult undefined', async () => {
      const result = await updateStepStatus({
        stepId,
        status: 'PENDING',
        actualResult: undefined,
        userId
      })

      expect(result.status).toBe('PENDING')
      expect(result.actualResult).toBeNull()
    })
  })

  describe('updateStepStatus - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const result = await updateStepStatus({
        stepId,
        status: 'PASSED',
        actualResult: 'Test result',
        userId
      })

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('action')
      expect(result).toHaveProperty('expected')
      expect(result).toHaveProperty('actualResult')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('stepOrder')
      expect(result).toHaveProperty('scenarioId')
      expect(result).toHaveProperty('createdAt')
      expect(result).toHaveProperty('updatedAt')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await updateStepStatus({
        stepId,
        status: 'PASSED',
        actualResult: 'Test result',
        userId
      })

      expect(typeof result.id).toBe('number')
      expect(typeof result.action).toBe('string')
      expect(typeof result.expected).toBe('string')
      expect(typeof result.status).toBe('string')
      expect(typeof result.stepOrder).toBe('number')
      expect(typeof result.scenarioId).toBe('number')
      expect(typeof result.createdAt).toBe('object')
      expect(typeof result.updatedAt).toBe('object')
    })

    it('retorna actualResult como string ou null', async () => {
      const resultWithResult = await updateStepStatus({
        stepId,
        status: 'PASSED',
        actualResult: 'Test result',
        userId
      })

      const resultWithoutResult = await updateStepStatus({
        stepId,
        status: 'PENDING',
        userId
      })

      expect(typeof resultWithResult.actualResult).toBe('string')
      expect(resultWithoutResult.actualResult).toBe('Test result') // Mantém o valor anterior quando não fornecido
    })
  })

  describe('updateStepStatus - integração com banco de dados', () => {
    it('retorna dados consistentes com o banco', async () => {
      const result = await updateStepStatus({
        stepId,
        status: 'PASSED',
        actualResult: 'Test result',
        userId
      })

      const dbStep = await prisma.testScenarioStep.findUnique({
        where: { id: stepId }
      })

      expect(dbStep).toMatchObject({
        status: result.status,
        actualResult: result.actualResult,
        action: result.action,
        expected: result.expected,
        stepOrder: result.stepOrder,
        scenarioId: result.scenarioId
      })
    })

    it('atualiza apenas a etapa especificada', async () => {
      // Criar outra etapa
      const step2 = await prisma.testScenarioStep.create({
        data: {
          action: 'Click logout button',
          expected: 'User is logged out',
          stepOrder: 2,
          scenarioId
        }
      })

      await updateStepStatus({
        stepId,
        status: 'PASSED',
        actualResult: 'Step 1 passed',
        userId
      })

      const step1 = await prisma.testScenarioStep.findUnique({ where: { id: stepId } })
      const step2After = await prisma.testScenarioStep.findUnique({ where: { id: step2.id } })

      expect(step1?.status).toBe('PASSED')
      expect(step1?.actualResult).toBe('Step 1 passed')
      expect(step2After?.status).toBe('PENDING') // Status padrão
      expect(step2After?.actualResult).toBeNull() // Valor padrão
    })

    it('atualiza timestamp de updatedAt', async () => {
      const originalStep = await prisma.testScenarioStep.findUnique({
        where: { id: stepId }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const result = await updateStepStatus({
        stepId,
        status: 'PASSED',
        userId
      })

      expect(result.updatedAt.getTime()).toBeGreaterThan(originalStep!.updatedAt.getTime())
    })

    it('preserva dados originais não atualizados', async () => {
      const originalStep = await prisma.testScenarioStep.findUnique({
        where: { id: stepId }
      })

      const result = await updateStepStatus({
        stepId,
        status: 'PASSED',
        userId
      })

      expect(result.action).toBe(originalStep!.action)
      expect(result.expected).toBe(originalStep!.expected)
      expect(result.stepOrder).toBe(originalStep!.stepOrder)
      expect(result.scenarioId).toBe(originalStep!.scenarioId)
      expect(result.createdAt).toEqual(originalStep!.createdAt)
    })
  })
})
