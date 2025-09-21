import type { Request, Response, NextFunction } from 'express'
import { createScenario } from '../../application/use-cases/scenarios/createScenario.use-case'
import { AppError } from '../../utils/AppError'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function createScenarioController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { projectId } = req.params
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
      release
    } = req.body

    if (!req.user?.id) {
      throw new AppError('Não autenticado', 401)
    }

    // Validações básicas
    if (!title || !type || !priority || !steps || !release) {
      throw new AppError('Campos obrigatórios: title, type, priority, steps, release', 400)
    }

    const scenario = await createScenario({
      projectId: Number(projectId),
      title,
      description,
      type,
      priority,
      tags: tags || [],
      steps,
      assigneeId,
      assigneeEmail,
      environment,
      release
    })

    res.status(201).json({
      message: 'Cenário criado com sucesso',
      scenario
    })
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message })
    } else {
      next(err)
    }
  }
}
