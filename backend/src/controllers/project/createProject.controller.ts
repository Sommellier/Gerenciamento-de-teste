import { Request, Response, NextFunction } from 'express'
import { createProject } from '../../application/use-cases/projetos/createProject.use-case'

export async function createProjectController(req: Request, res: Response, next: NextFunction) {
  try {
    const ownerId = (req as any).user?.id
    if (!ownerId) return res.status(401).json({ message: 'Não autenticado' })

    const { name, description } = req.body ?? {}
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Nome do projeto é obrigatório' })
    }

    const project = await createProject({
      ownerId,
      name,
      description,
    })

    return res.status(201).json(project)
  } catch (err) {
    next(err)
  }
}
