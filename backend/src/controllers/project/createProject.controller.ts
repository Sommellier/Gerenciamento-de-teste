// src/controllers/project/createProject.controller.ts
import { RequestHandler } from 'express'
import { createProject } from '../../application/use-cases/projetos/createProject.use-case'

export const createProjectController: RequestHandler = async (req, res, next) => {
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
      ownerId,
      name: String(name),
      description: description == null ? undefined : String(description),
    })

    res.status(201).json(project) 
  } catch (err) {
    next(err as any)
  }
}
