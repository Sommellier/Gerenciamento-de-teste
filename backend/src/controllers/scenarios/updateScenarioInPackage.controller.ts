import type { Request, Response, NextFunction } from 'express'
import { updateScenarioInPackage } from '../../application/use-cases/scenarios/updateScenarioInPackage.use-case'
import { AppError } from '../../utils/AppError'
import { validateId } from '../../utils/validation'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export const updateScenarioInPackageController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { scenarioId, packageId, projectId } = req.params
    const {
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
    } = req.body

    if (!req.user?.id) {
      throw new AppError('Não autenticado', 401)
    }

    // Validação dos IDs - capturar apenas erros de validação de ID
    let parsedScenarioId: number
    let parsedPackageId: number
    let parsedProjectId: number
    
    try {
      parsedScenarioId = validateId(scenarioId, 'ID do cenário')
      parsedPackageId = validateId(packageId, 'ID do pacote')
      parsedProjectId = validateId(projectId, 'ID do projeto')
    } catch (err: any) {
      // Se for erro de validação de ID, lançar mensagem genérica esperada pelos testes
      if (err instanceof AppError && err.statusCode === 400 && err.message.includes('inválido')) {
        next(new AppError('IDs inválidos', 400))
        return
      }
      // Se não for erro de validação de ID, propagar o erro original
      next(err)
      return
    }

    // Tratar assigneeEmail se for um objeto
    let finalAssigneeEmail = assigneeEmail
    if (typeof assigneeEmail === 'object' && assigneeEmail !== null) {
      finalAssigneeEmail = assigneeEmail.value || assigneeEmail.email || null
    }

    try {
      const scenario = await updateScenarioInPackage({
        scenarioId: parsedScenarioId,
        packageId: parsedPackageId,
        projectId: parsedProjectId,
        title,
        description,
        type,
        priority,
        tags,
        steps,
        assigneeId,
        assigneeEmail: finalAssigneeEmail,
        environment,
        status
      })

      res.json({
        message: 'Cenário atualizado com sucesso',
        scenario
      })
    } catch (err: any) {
      // Erros do use-case devem ser propagados sem modificação
      next(err)
    }
  } catch (err: any) {
    next(err)
  }
}
