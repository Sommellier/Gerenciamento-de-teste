import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

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
  status?: 'CREATED' | 'EXECUTED' | 'PASSED' | 'FAILED'
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

    // Preparar dados para atualização
    const updateData: any = {}
    
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (type !== undefined) updateData.type = type
    if (priority !== undefined) updateData.priority = priority
    if (tags !== undefined) updateData.tags = JSON.stringify(tags) // Converter array para JSON string
    if (finalAssigneeEmail !== undefined) updateData.assigneeEmail = finalAssigneeEmail
    if (environment !== undefined) updateData.environment = environment
    if (status !== undefined) updateData.status = status

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
          action: step.action,
          expected: step.expected,
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
      console.error('Error in updateScenarioInPackage:', error)
    }
    throw error
  }
}
