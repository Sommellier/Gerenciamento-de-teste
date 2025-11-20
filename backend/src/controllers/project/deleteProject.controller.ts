// src/controllers/project/deleteProject.controller.ts
import { RequestHandler } from 'express'
import { deleteProject } from '../../application/use-cases/projects/deleteProject.use-case'

export const deleteProjectController: RequestHandler = async (req, res, next) => {
  try {
    const rawId = String(req.params.id ?? '')
    const projectId = Number(rawId)

    // @ts-expect-error user via middleware de teste
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
