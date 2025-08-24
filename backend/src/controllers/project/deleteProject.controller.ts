// src/controllers/project/deleteProject.controller.ts
import { RequestHandler } from 'express'
import { deleteProject } from '../../application/use-cases/projetos/deleteProject.use-case'

export const deleteProjectController: RequestHandler = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id)
    // @ts-expect-error: user ad-hoc via middleware de teste
    const requesterId: number | undefined = req.user?.id

    if (!Number.isFinite(projectId)) {
      res.status(400).json({ message: 'Parâmetro inválido: id' })
      return
    }
    if (!requesterId) {
      res.status(401).json({ message: 'Não autenticado' })
      return
    }

    await deleteProject({ projectId, requesterId })
    res.status(204).end()           
  } catch (err) {
    next(err as any)
  }
}
