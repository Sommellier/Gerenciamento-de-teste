import { Request, Response, NextFunction } from 'express'
import { deleteProject } from '../../application/use-cases/projetos/deleteProject.use-case'

export async function deleteProjectController(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = Number(req.params.id)
    if (!Number.isFinite(projectId)) {
      return res.status(400).json({ message: 'Parâmetro inválido: id' })
    }

    const requesterId = (req as any).user?.id 
    if (!requesterId) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

    await deleteProject({ projectId, requesterId })
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}
