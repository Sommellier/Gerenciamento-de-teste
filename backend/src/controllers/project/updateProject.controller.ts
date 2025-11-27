import { Request, Response } from 'express'
import { updateProject } from '../../application/use-cases/projects/updateProject.use-case'
import { validateId } from '../../utils/validation'

type AuthenticatedRequest = Request & { user?: { id: number } }

export async function updateProjectController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const requesterId = req.user?.id
  if (!requesterId) { res.status(401).json({ message: 'Não autenticado' }); return }
  
  try {
    const projectId = validateId(req.params.id, 'ID do projeto')

  const { name, description } = req.body ?? {}

    const project = await updateProject({ projectId, requesterId, name, description })
    res.status(200).json(project)
  } catch (err: any) {
    // Verificar tanto statusCode quanto status para compatibilidade
    let status = err?.statusCode || err?.status || 500
    
    // Se status não é numérico, usar 500 mas preservar mensagem
    if (typeof status !== 'number' || !Number.isFinite(status)) {
      status = 500
    }
    
    // Garantir que status está no range válido do Express (100-599)
    if (status < 100 || status > 599) {
      status = 500
    }
    
    res.status(status).json({ message: err?.message || 'Internal server error' })
  }
}
