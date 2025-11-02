import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { PackageStatus } from '@prisma/client'

interface CreateScenarioInPackageInput {
  packageId: number
  projectId: number
  title: string
  description?: string
  type?: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E' // Opcional agora, será herdado do pacote
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  tags: string[]
  steps: Array<{
    action: string
    expected: string
  }>
  assigneeId?: number
  assigneeEmail?: string
  environment?: 'DEV' | 'QA' | 'STAGING' | 'PROD'
  testadorId?: number
  aprovadorId?: number
}

export async function createScenarioInPackage({
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
  testadorId,
  aprovadorId
}: CreateScenarioInPackageInput) {
  try {
    // Verificar se o pacote existe e pertence ao projeto
    const testPackage = await prisma.testPackage.findFirst({
      where: {
        id: packageId,
        projectId: projectId
      }
    })

    if (!testPackage) {
      throw new AppError('Pacote não encontrado', 404)
    }

    // Bloquear criação de cenários quando o pacote está aprovado
    if (testPackage.status === PackageStatus.APROVADO) {
      throw new AppError('Não é possível criar cenários em um pacote aprovado', 403)
    }

    // Herdar o tipo do pacote se não foi fornecido
    const finalType = type || testPackage.type

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

    // Steps são opcionais agora - podem ser adicionados depois
    // if (!steps || steps.length === 0) {
    //   throw new AppError('Cenário deve ter pelo menos um passo', 400)
    // }

    // Validar testadorId se fornecido
    if (testadorId) {
      const testador = await prisma.user.findUnique({
        where: { id: testadorId }
      })

      if (!testador) {
        throw new AppError('Testador não encontrado', 404)
      }

      // Verificar se o testador é membro do projeto
      const isMember = await prisma.userOnProject.findFirst({
        where: {
          userId: testadorId,
          projectId: projectId
        }
      })

      if (!isMember) {
        throw new AppError('Testador deve ser membro do projeto', 400)
      }
    }

    // Validar aprovadorId se fornecido
    if (aprovadorId) {
      const aprovador = await prisma.user.findUnique({
        where: { id: aprovadorId }
      })

      if (!aprovador) {
        throw new AppError('Aprovador não encontrado', 404)
      }

      // Verificar se o aprovador é membro do projeto
      const isMember = await prisma.userOnProject.findFirst({
        where: {
          userId: aprovadorId,
          projectId: projectId
        }
      })

      if (!isMember) {
        throw new AppError('Aprovador deve ser membro do projeto', 400)
      }
    }

    // Criar o cenário dentro do pacote
    const scenario = await prisma.testScenario.create({
      data: {
        title,
        description,
        type: finalType as any, // Usar o tipo herdado do pacote se não fornecido
        priority: priority as any,
        tags: JSON.stringify(tags), // Converter array para JSON string
        projectId,
        packageId, // Associar ao pacote
        testadorId: testadorId || null,
        aprovadorId: aprovadorId || null,
        ...(steps && steps.length > 0 && {
          steps: {
            create: steps.map((step, index) => ({
              action: step.action,
              expected: step.expected,
              stepOrder: index + 1
            }))
          }
        })
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        },
        testador: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        aprovador: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return {
      ...scenario,
      tags: JSON.parse(scenario.tags || '[]')
    }
  } catch (error) {
    console.error('Error in createScenarioInPackage:', error)
    throw error
  }
}
