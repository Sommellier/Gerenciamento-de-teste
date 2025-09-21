import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface CreateScenarioInput {
  projectId: number
  title: string
  description?: string
  type: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  tags: string[]
  steps: Array<{
    action: string
    expected: string
  }>
  assigneeId?: number
  assigneeEmail?: string
  environment?: 'DEV' | 'QA' | 'STAGING' | 'PROD'
  release: string
}

export async function createScenario({
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
  release
}: CreateScenarioInput) {
  try {
    // Verificar se o projeto existe
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      throw new AppError('Projeto não encontrado', 404)
    }

    // Determinar o email do responsável
    let finalAssigneeEmail = assigneeEmail

    // Extrair o ID real se assigneeId for um objeto
    let actualAssigneeId = assigneeId
    if (assigneeId && typeof assigneeId === 'object' && 'value' in assigneeId) {
      actualAssigneeId = (assigneeId as any).value
      finalAssigneeEmail = (assigneeId as any).email || assigneeEmail
    }

    if (actualAssigneeId && !finalAssigneeEmail) {
      // Se assigneeId foi fornecido, buscar o email do usuário
      const user = await prisma.user.findUnique({
        where: { id: actualAssigneeId }
      })

      if (!user) {
        throw new AppError('Usuário responsável não encontrado', 404)
      }

      finalAssigneeEmail = user.email
    } else if (finalAssigneeEmail && !actualAssigneeId) {
      // Se assigneeEmail foi fornecido, validar se o usuário existe
      const user = await prisma.user.findUnique({
        where: { email: finalAssigneeEmail }
      })

      if (!user) {
        throw new AppError('Usuário responsável não encontrado', 404)
      }
    }

    // Validar formato da release (YYYY-MM)
    const releaseRegex = /^\d{4}-\d{2}$/
    if (!releaseRegex.test(release)) {
      throw new AppError('Formato de release inválido. Use YYYY-MM', 400)
    }

    // Validar se há pelo menos um passo
    if (!steps || steps.length === 0) {
      throw new AppError('Cenário deve ter pelo menos um passo', 400)
    }

    // Criar o cenário com os passos
    const scenario = await prisma.testScenario.create({
      data: {
        title,
        description,
        type: type as any,
        priority: priority as any,
        tags,
        assigneeEmail: finalAssigneeEmail,
        environment: environment as any,
        release,
        projectId,
        steps: {
          create: steps.map((step, index) => ({
            action: step.action,
            expected: step.expected,
            stepOrder: index + 1
          }))
        }
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        }
      }
    })

    return scenario
  } catch (error) {
    console.error('Error in createScenario:', error)
    throw error
  }
}
