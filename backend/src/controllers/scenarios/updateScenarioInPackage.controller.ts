import type { Request, Response, NextFunction } from 'express'
import { updateScenarioInPackage } from '../../application/use-cases/scenarios/updateScenarioInPackage.use-case'
import { AppError } from '../../utils/AppError'

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

    // Validação dos IDs
    const parsedScenarioId = Number(scenarioId)
    const parsedPackageId = Number(packageId)
    const parsedProjectId = Number(projectId)
    
    if (isNaN(parsedScenarioId) || isNaN(parsedPackageId) || isNaN(parsedProjectId)) {
      throw new AppError('IDs inválidos', 400)
    }

    // Tratar assigneeEmail se for um objeto
    let finalAssigneeEmail = assigneeEmail
    if (typeof assigneeEmail === 'object' && assigneeEmail !== null) {
      finalAssigneeEmail = assigneeEmail.value || assigneeEmail.email || null
    }

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
    next(err)
  }
}
