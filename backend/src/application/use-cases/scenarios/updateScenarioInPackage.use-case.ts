import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { logger } from '../../../utils/logger'
import { ScenarioStatus } from '@prisma/client'
import { sanitizeTextOnly, sanitizeString } from '../../../utils/validation'

interface UpdateScenarioInPackageInput {
  scenarioId: number
  packageId: number
  projectId: number
  title?: string
  description?: string
  type?: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  tags?: string[]
  steps?: Array<{
    action: string
    expected: string
  }>
  assigneeId?: number
  assigneeEmail?: string
  environment?: 'DEV' | 'QA' | 'STAGING' | 'PROD'
  status?: 'CREATED' | 'EXECUTED' | 'PASSED' | 'FAILED' | 'BLOQUEADO' | 'APPROVED' | 'REPROVED'
}

export async function updateScenarioInPackage({
  scenarioId,
  packageId,
  projectId,
  title,
  description,
  type,
  priority,
  tags,
  steps,
  assigneeId,
  assigneeEmail,
  environment,
  status
}: UpdateScenarioInPackageInput) {
  try {
    // Verificar se o cenário existe e pertence ao pacote e projeto
    const existingScenario = await prisma.testScenario.findFirst({
      where: {
        id: scenarioId,
        packageId: packageId,
        projectId: projectId
      }
    })

    if (!existingScenario) {
      throw new AppError('Cenário não encontrado', 404)
    }

    // Determinar o email do responsável se fornecido
    let finalAssigneeEmail = assigneeEmail

    if (assigneeId && !finalAssigneeEmail) {
      // Se assigneeId foi fornecido, buscar o email do usuário
      const user = await prisma.user.findUnique({
        where: { id: assigneeId }
      })

      if (!user) {
        throw new AppError('Usuário responsável não encontrado', 404)
      }

      finalAssigneeEmail = user.email
    } else if (finalAssigneeEmail && !assigneeId) {
      // Se assigneeEmail foi fornecido, validar se o usuário existe
      const user = await prisma.user.findUnique({
        where: { email: finalAssigneeEmail }
      })

      if (!user) {
        throw new AppError('Usuário responsável não encontrado', 404)
      }
    }

    // Verificar se o cenário está bloqueado (todas as etapas bloqueadas)
    const scenarioWithSteps = await prisma.testScenario.findUnique({
      where: { id: scenarioId },
      include: {
        steps: true
      }
    })

    const isBlocked = scenarioWithSteps && scenarioWithSteps.steps.length > 0 && 
                      scenarioWithSteps.steps.every(step => step.status === 'BLOCKED')

    // Preparar dados para atualização
    const updateData: any = {}
    
    if (title !== undefined) updateData.title = sanitizeTextOnly(title)
    if (description !== undefined) {
      if (description === null || description === '') {
        updateData.description = description === '' ? '' : null
      } else {
        updateData.description = sanitizeString(description)
      }
    }
    if (type !== undefined) updateData.type = type
    if (priority !== undefined) updateData.priority = priority
    if (tags !== undefined) updateData.tags = JSON.stringify(tags) // Converter array para JSON string
    if (finalAssigneeEmail !== undefined) updateData.assigneeEmail = finalAssigneeEmail
    if (environment !== undefined) updateData.environment = environment
    
    // Se o cenário está bloqueado, não permitir mudar o status para PASSED ou FAILED
    // Apenas permitir mudanças se estiver desbloqueando (mudando de BLOQUEADO para outro status)
    if (status !== undefined) {
      const currentStatus = scenarioWithSteps?.status
      if (isBlocked && String(currentStatus) === 'BLOQUEADO' && status !== 'BLOQUEADO') {
        // Se está bloqueado e tentando mudar para outro status, não permitir
        // O status só pode mudar quando as etapas não estiverem mais bloqueadas
        throw new AppError('Não é possível alterar o status de um cenário bloqueado. Desbloqueie as etapas primeiro.', 400)
      }
      updateData.status = status
    }

    // Atualizar o cenário
    const updatedScenario = await prisma.testScenario.update({
      where: { id: scenarioId },
      data: updateData,
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        },
        package: {
          select: {
            id: true,
            title: true,
            release: true
          }
        }
      }
    })

    // Atualizar passos se fornecidos
    if (steps && steps.length > 0) {
      // Deletar passos existentes
      await prisma.testScenarioStep.deleteMany({
        where: { scenarioId: scenarioId }
      })

      // Criar novos passos
      await prisma.testScenarioStep.createMany({
        data: steps.map((step, index) => ({
          scenarioId: scenarioId,
          action: sanitizeString(step.action),
          expected: sanitizeString(step.expected),
          stepOrder: index + 1
        }))
      })

      // Buscar o cenário atualizado com os novos passos
      const finalScenario = await prisma.testScenario.findUnique({
        where: { id: scenarioId },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' }
          },
          package: {
            select: {
              id: true,
              title: true,
              release: true
            }
          }
        }
      })

      // Verificar se todas as etapas estão bloqueadas e atualizar status do cenário
      if (finalScenario && finalScenario.steps.length > 0) {
        const allStepsBlocked = finalScenario.steps.every(step => step.status === 'BLOCKED')
        const currentStatus = finalScenario.status

        if (allStepsBlocked && String(currentStatus) !== 'BLOQUEADO') {
          // Atualizar status do cenário para BLOQUEADO
          await prisma.testScenario.update({
            where: { id: scenarioId },
            data: { status: 'BLOQUEADO' as ScenarioStatus }
          })
          // Atualizar o objeto retornado
          finalScenario.status = 'BLOQUEADO' as ScenarioStatus
        } else if (!allStepsBlocked && String(currentStatus) === 'BLOQUEADO') {
          // Se não está mais bloqueado, reverter para EXECUTED
          await prisma.testScenario.update({
            where: { id: scenarioId },
            data: { status: ScenarioStatus.EXECUTED }
          })
          // Atualizar o objeto retornado
          finalScenario.status = ScenarioStatus.EXECUTED
        }
      }

      return {
        ...finalScenario,
        tags: finalScenario?.tags ? JSON.parse(finalScenario.tags) : []
      }
    }

    return {
      ...updatedScenario,
      tags: JSON.parse(updatedScenario.tags || '[]')
    }
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      logger.error('Error in updateScenarioInPackage:', error)
    }
    throw error
  }
}
