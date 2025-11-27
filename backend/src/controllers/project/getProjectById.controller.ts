import { Request, Response } from 'express'
import { getProjectById } from '../../application/use-cases/projects/getProjectById.use-case'
import { validateId } from '../../utils/validation'

type AuthenticatedRequest = Request & { user?: { id: number } }

export async function getProjectByIdController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const requesterId = req.user?.id
  if (!requesterId) { res.status(401).json({ message: 'Não autenticado' }); return }
  
  try {
    const projectId = validateId(req.params.id, 'ID do projeto')

    const project = await getProjectById({ projectId, requesterId })
    res.status(200).json(project)
  } catch (err: any) {
    const status = err?.statusCode || 400
    res.status(status).json({ message: err?.message || 'Erro ao buscar projeto' })
  }
}
