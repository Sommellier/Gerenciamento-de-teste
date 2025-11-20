import { Request, Response } from 'express'
import { getProjectById } from '../../application/use-cases/projects/getProjectById.use-case'

type AuthenticatedRequest = Request & { user?: { id: number } }

export async function getProjectByIdController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const requesterId = req.user?.id
  const projectId = Number(req.params.id)

  if (!requesterId) { res.status(401).json({ message: 'Não autenticado' }); return }
  if (!Number.isFinite(projectId)) { res.status(400).json({ message: 'Parâmetro inválido: id' }); return }

  const project = await getProjectById({ projectId, requesterId })
  res.status(200).json(project)
}
