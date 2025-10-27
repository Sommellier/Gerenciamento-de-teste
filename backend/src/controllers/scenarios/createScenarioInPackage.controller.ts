import type { Request, Response, NextFunction } from 'express'
import { createScenarioInPackage } from '../../application/use-cases/scenarios/createScenarioInPackage.use-case'
import { AppError } from '../../utils/AppError'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export const createScenarioInPackageController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { packageId, projectId } = req.params
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
      testadorId,
      aprovadorId
    } = req.body

    // Temporariamente desabilitado para debug
    // if (!req.user?.id) {
    //   throw new AppError('Não autenticado', 401)
    // }

    // Validações básicas - type agora é opcional, será herdado do pacote
    // steps também é opcional agora
    if (!title || !priority) {
      throw new AppError('Campos obrigatórios: title, priority', 400)
    }

    // Validação dos IDs
    const parsedPackageId = Number(packageId)
    const parsedProjectId = Number(projectId)
    
    if (isNaN(parsedPackageId) || isNaN(parsedProjectId)) {
      throw new AppError('IDs inválidos', 400)
    }

    // Tratar assigneeEmail se for um objeto
    let finalAssigneeEmail = assigneeEmail
    if (typeof assigneeEmail === 'object' && assigneeEmail !== null) {
      finalAssigneeEmail = assigneeEmail.value || assigneeEmail.email || null
    }

    const scenario = await createScenarioInPackage({
      packageId: parsedPackageId,
      projectId: parsedProjectId,
      title,
      description,
      type,
      priority,
      tags: tags || [],
      steps,
      assigneeId,
      assigneeEmail: finalAssigneeEmail,
      environment,
      testadorId: testadorId ? Number(testadorId) : undefined,
      aprovadorId: aprovadorId ? Number(aprovadorId) : undefined
    })

    res.status(201).json({
      message: 'Cenário criado com sucesso no pacote',
      scenario
    })
  } catch (err: any) {
    next(err)
  }
}
