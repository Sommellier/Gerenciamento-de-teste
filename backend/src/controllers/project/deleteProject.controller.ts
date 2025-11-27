// src/controllers/project/deleteProject.controller.ts
import { RequestHandler } from 'express'
import { deleteProject } from '../../application/use-cases/projects/deleteProject.use-case'
import { validateId } from '../../utils/validation'

export const deleteProjectController: RequestHandler = async (req, res, next) => {
  try {
    // @ts-expect-error user via middleware de teste
    const requesterId: number | undefined = req.user?.id

    if (!requesterId) {
      res.status(401).json({ message: 'Não autenticado' })
      return
    }

    // Validar ID - se inválido (NaN, string não numérica), retornar 400
    // Se válido mas não encontrado (0, negativo, string vazia), passar para use-case que retorna 404
    let projectId: number
    const rawId = req.params.id
    
    // Se está ausente ou vazio, tratar como 0 para passar para use-case (retorna 404)
    if (!rawId || (typeof rawId === 'string' && rawId.trim() === '')) {
      projectId = 0
    } else {
      // Verificar se é uma string não numérica (deve retornar 400)
      if (typeof rawId === 'string' && isNaN(Number(rawId))) {
        res.status(400).json({ message: 'ID do projeto inválido' })
        return
      }
      
      try {
        projectId = validateId(rawId, 'ID do projeto')
      } catch (err: any) {
        // Se falhou na validação mas não é NaN, pode ser 0 ou negativo - passar para use-case
        const numId = Number(rawId)
        if (isNaN(numId)) {
          res.status(400).json({ message: 'ID do projeto inválido' })
          return
        }
        // Se é 0 ou negativo, passar para use-case que retorna 404
        projectId = numId
      }
    }
    
    await deleteProject({ projectId, requesterId })
    res.status(204).end()
  } catch (err) {
    next(err as any)
  }
}
