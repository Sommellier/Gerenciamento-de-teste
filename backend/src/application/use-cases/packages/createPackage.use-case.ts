import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { logger } from '../../../utils/logger'
import { sanitizeTextOnly, sanitizeString } from '../../../utils/validation'

interface CreatePackageInput {
  projectId: number
  title: string
  description?: string
  type: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  tags: string[]
  assigneeId?: number
  assigneeEmail?: string
  environment?: 'DEV' | 'QA' | 'STAGING' | 'PROD'
  release: string
}

export async function createPackage({
  projectId,
  title,
  description,
  type,
  priority,
  tags,
  assigneeId,
  assigneeEmail,
  environment,
  release
}: CreatePackageInput) {
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

    // Validar formato da release (YYYY-MM ou YYYY-MM-DD)
    const releaseRegex = /^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?$/
    if (!releaseRegex.test(release)) {
      throw new AppError('Formato de release inválido. Use YYYY-MM ou YYYY-MM-DD', 400)
    }

    // Criar o pacote
    const testPackage = await prisma.testPackage.create({
      data: {
        title: sanitizeTextOnly(title),
        description: description ? sanitizeString(description) : null,
        type: type as any,
        priority: priority as any,
        tags: JSON.stringify(tags), // Converter array para JSON string
        assigneeEmail: finalAssigneeEmail || null,
        environment: environment ? environment as any : null,
        release,
        projectId
      }
    })

    return {
      ...testPackage,
      tags: JSON.parse(testPackage.tags || '[]')
    }
  } catch (error) {
    // Apenas logar erros inesperados, não AppErrors esperados
    if (!(error instanceof AppError)) {
      logger.error('Error in createPackage:', error)
    }
    throw error
  }
}
