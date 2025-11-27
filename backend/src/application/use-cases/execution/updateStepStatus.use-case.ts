import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { PackageStatus, ScenarioStatus } from '@prisma/client'
import { logger } from '../../../utils/logger'
import { sanitizeString } from '../../../utils/validation'

interface UpdateStepStatusInput {
  stepId: number
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'BLOCKED'
  actualResult?: string
  userId: number
}

/**
 * Verifica se um cenário está bloqueado (todas as etapas estão bloqueadas)
 */
async function isScenarioBlocked(scenarioId: number): Promise<boolean> {
  const scenario = await prisma.testScenario.findUnique({
    where: { id: scenarioId },
    include: {
      steps: true
    }
  })

  if (!scenario || scenario.steps.length === 0) {
    return false
  }

  // Um cenário está bloqueado se todas as etapas estão bloqueadas
  return scenario.steps.every(step => step.status === 'BLOCKED')
}

/**
 * Verifica se um pacote está bloqueado (todos os cenários estão bloqueados)
 */
async function isPackageBlocked(packageId: number): Promise<boolean> {
  const testPackage = await prisma.testPackage.findUnique({
    where: { id: packageId },
    include: {
      scenarios: {
        include: {
          steps: true
        }
      }
    }
  })

  if (!testPackage || testPackage.scenarios.length === 0) {
    return false
  }

  // Um pacote está bloqueado se todos os cenários estão bloqueados
  // Verificar primeiro pelo status do cenário (mais eficiente)
  // Se o status não estiver atualizado, verificar pelas etapas
  return testPackage.scenarios.every(scenario => {
    // Se o cenário já tem status BLOQUEADO, está bloqueado
    if (String(scenario.status) === 'BLOQUEADO') {
      return true
    }
    
    // Caso contrário, verificar se todas as etapas estão bloqueadas
    if (scenario.steps.length === 0) {
      return false
    }
    return scenario.steps.every(step => step.status === 'BLOCKED')
  })
}

/**
 * Atualiza o status do pacote baseado no status dos cenários
 */
async function updatePackageStatusIfNeeded(packageId: number): Promise<void> {
  const testPackage = await prisma.testPackage.findUnique({
    where: { id: packageId }
  })

  if (!testPackage) {
    return
  }

  // Verificar se o pacote está bloqueado
  const isBlocked = await isPackageBlocked(packageId)

  if (isBlocked && String(testPackage.status) !== 'BLOQUEADO') {
    // Atualizar status do pacote para BLOQUEADO
    await prisma.testPackage.update({
      where: { id: packageId },
      data: { status: 'BLOQUEADO' as PackageStatus }
    })
  } else if (!isBlocked && String(testPackage.status) === 'BLOQUEADO') {
    // Se não está mais bloqueado, reverter para EM_TESTE (se estava em teste)
    // ou manter o status atual se não estava em teste
    await prisma.testPackage.update({
      where: { id: packageId },
      data: { status: PackageStatus.EM_TESTE }
    })
  }
}

export async function updateStepStatus({
  stepId,
  status,
  actualResult,
  userId
}: UpdateStepStatusInput) {
  try {
    // Verificar se a etapa existe
    const step = await prisma.testScenarioStep.findUnique({
      where: { id: stepId },
      include: {
        scenario: {
          select: {
            id: true,
            packageId: true
          }
        }
      }
    })

    if (!step) {
      throw new AppError('Etapa não encontrada', 404)
    }

    // Atualizar status da etapa
    const updatedStep = await prisma.testScenarioStep.update({
      where: { id: stepId },
      data: {
        status,
        actualResult: actualResult ? sanitizeString(actualResult) : step.actualResult
      }
    })

    // Aguardar um pouco para garantir que a atualização foi persistida
    // e recarregar o cenário com todas as etapas atualizadas
    const scenarioWithSteps = await prisma.testScenario.findUnique({
      where: { id: step.scenario.id },
      include: {
        steps: true
      }
    })

    // Verificar e atualizar status do cenário se necessário
    // Usar os dados recarregados para verificação precisa
    let scenarioBlocked = false
    if (scenarioWithSteps && scenarioWithSteps.steps.length > 0) {
      scenarioBlocked = scenarioWithSteps.steps.every(step => step.status === 'BLOCKED')
    }

    // Usar o status do cenário recarregado
    const currentScenarioStatus = scenarioWithSteps?.status

    if (scenarioWithSteps) {
      if (scenarioBlocked && String(currentScenarioStatus) !== 'BLOQUEADO') {
        // Atualizar status do cenário para BLOQUEADO
        await prisma.testScenario.update({
          where: { id: step.scenario.id },
          data: { status: 'BLOQUEADO' as ScenarioStatus }
        })
        logger.debug(`[updateStepStatus] Cenário ${step.scenario.id} atualizado para BLOQUEADO`)
      } else if (!scenarioBlocked && String(currentScenarioStatus) === 'BLOQUEADO') {
        // Se não está mais bloqueado, reverter para EXECUTED
        await prisma.testScenario.update({
          where: { id: step.scenario.id },
          data: { status: ScenarioStatus.EXECUTED }
        })
        logger.debug(`[updateStepStatus] Cenário ${step.scenario.id} atualizado de BLOQUEADO para EXECUTED`)
      }
    }

    // Se o cenário tem um pacote associado, verificar e atualizar status do pacote
    if (step.scenario.packageId) {
      await updatePackageStatusIfNeeded(step.scenario.packageId)
    }

    return updatedStep
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      logger.error('Error in updateStepStatus:', error)
    }
    throw error
  }
}

