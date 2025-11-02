import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

interface UpdatePackageInput {
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
  release?: string
  status?: 'CREATED' | 'EXECUTED' | 'PASSED' | 'FAILED'
}

export async function updatePackage({
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
  release,
  status
}: UpdatePackageInput) {
  try {
    // Verificar se o pacote existe e pertence ao projeto
    const existingPackage = await prisma.testPackage.findFirst({
      where: {
        id: packageId,
        projectId: projectId
      }
    })

    if (!existingPackage) {
      throw new AppError('Pacote não encontrado', 404)
    }

    // RB2.2: Bloquear edições quando pacote está CONCLUIDO ou APROVADO
    if (existingPackage.status === 'CONCLUIDO' || existingPackage.status === 'APROVADO') {
      throw new AppError('Pacote não pode ser editado quando está concluído ou aprovado', 403)
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

    // Validar formato da release se fornecida
    if (release !== undefined && release !== null) {
      if (release === '') {
        throw new AppError('Formato de release inválido. Use YYYY-MM-DD', 400)
      }
      
      const releaseRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/
      if (!releaseRegex.test(release)) {
        throw new AppError('Formato de release inválido. Use YYYY-MM-DD', 400)
      }
      
      // Validar se o mês é válido (01-12)
      const [, month] = release.split('-')
      const monthNum = parseInt(month, 10)
      if (monthNum < 1 || monthNum > 12) {
        throw new AppError('Formato de release inválido. Use YYYY-MM-DD', 400)
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
    if (release !== undefined) updateData.release = release
    if (status !== undefined) updateData.status = status

    // Atualizar o pacote
    const updatedPackage = await prisma.testPackage.update({
      where: { id: packageId },
      data: updateData,
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        }
      }
    })

    // Atualizar passos se fornecidos
    if (steps && steps.length > 0) {
      // Deletar passos existentes
      await prisma.testPackageStep.deleteMany({
        where: { packageId: packageId }
      })

      // Criar novos passos
      await prisma.testPackageStep.createMany({
        data: steps.map((step, index) => ({
          packageId: packageId,
          action: step.action,
          expected: step.expected,
          stepOrder: index + 1
        }))
      })

      // Buscar o pacote atualizado com os novos passos
      return await prisma.testPackage.findUnique({
        where: { id: packageId },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' }
          }
        }
      })
    }

    return {
      ...updatedPackage,
      tags: JSON.parse(updatedPackage.tags || '[]')
    }
  } catch (error) {
    console.error('Error in updatePackage:', error)
    throw error
  }
}
