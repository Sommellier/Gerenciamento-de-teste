import type { Request, Response, NextFunction } from 'express'
import { createPackage } from '../../application/use-cases/packages/createPackage.use-case'
import { AppError } from '../../utils/AppError'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export async function createPackageController(
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

    // Validação do projectId
    const parsedProjectId = Number(projectId)
    if (isNaN(parsedProjectId)) {
      throw new AppError('ID do projeto inválido', 400)
    }

    // Validações básicas
    if (!title || !type || !priority || !release) {
      throw new AppError('Campos obrigatórios: title, type, priority, release', 400)
    }

    const testPackage = await createPackage({
      projectId: parsedProjectId,
      title,
      description,
      type,
      priority,
      tags: tags || [],
      assigneeId,
      assigneeEmail,
      environment,
      release
    })

    res.status(201).json({
      message: 'Pacote criado com sucesso',
      testPackage
    })
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message })
    } else {
      next(err)
    }
  }
}
