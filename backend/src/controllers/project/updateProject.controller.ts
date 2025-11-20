import { Request, Response } from 'express'
import { updateProject } from '../../application/use-cases/projects/updateProject.use-case'

type AuthenticatedRequest = Request & { user?: { id: number } }

export async function updateProjectController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const requesterId = req.user?.id
  const projectId = Number(req.params.id)

  if (!requesterId) { res.status(401).json({ message: 'Não autenticado' }); return }
  if (!Number.isFinite(projectId)) { res.status(400).json({ message: 'Parâmetro inválido: id' }); return }

  const { name, description } = req.body ?? {}

  try {
    const project = await updateProject({ projectId, requesterId, name, description })
    res.status(200).json(project)
  } catch (err: any) {
    const status = Number.isFinite(err?.status) ? err.status : 500
    res.status(status).json({ message: err?.message || 'Internal server error' })
  }
}
