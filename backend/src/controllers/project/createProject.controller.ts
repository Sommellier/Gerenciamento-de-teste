import { Request, Response, NextFunction } from 'express'
import { createProject } from '../../application/use-cases/projetos/createProject.use-case'

export const createProjectController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = (req as any).user?.id
    
    if (!ownerId) {
      res.status(401).json({ message: 'Não autenticado' })
      return
    }

    const { name, description } = req.body ?? {}
    
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'Nome do projeto é obrigatório' })
      return
    }

    const project = await createProject({
      ownerId: Number(ownerId), // Garantir que seja number
      name: String(name),
      description: description == null ? undefined : String(description),
    })

    res.status(201).json(project) 
  } catch (err: any) {
    next(err)
  }
}
