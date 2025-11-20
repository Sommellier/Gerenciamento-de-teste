import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/AppError'
import { prisma } from '../../infrastructure/prisma'
import { logger } from '../../utils/logger'
import { addStepComment } from '../../application/use-cases/execution/addStepComment.use-case'
import { getStepComments } from '../../application/use-cases/execution/getStepComments.use-case'
import { uploadStepAttachment } from '../../application/use-cases/execution/uploadStepAttachment.use-case'
import { getStepAttachments } from '../../application/use-cases/execution/getStepAttachments.use-case'
import { updateStepStatus } from '../../application/use-cases/execution/updateStepStatus.use-case'
import { createBug } from '../../application/use-cases/execution/createBug.use-case'
import { getBugs } from '../../application/use-cases/execution/getBugs.use-case'
import { getPackageBugs } from '../../application/use-cases/execution/getPackageBugs.use-case'
import { updateBug } from '../../application/use-cases/execution/updateBug.use-case'
import { deleteBug } from '../../application/use-cases/execution/deleteBug.use-case'
import { registerExecutionHistory } from '../../application/use-cases/execution/registerExecutionHistory.use-case'
import { getExecutionHistory } from '../../application/use-cases/execution/getExecutionHistory.use-case'
import { deleteStepAttachment } from '../../application/use-cases/execution/deleteStepAttachment.use-case'
import { uploadBugAttachment as uploadBugAttachmentUseCase } from '../../application/use-cases/execution/uploadBugAttachment.use-case'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

// Helper function to get valid userId
async function getValidUserId(req: AuthenticatedRequest): Promise<number> {
  if (req.user?.id) {
    return req.user.id
  }
  // Buscar primeiro usuário do banco como fallback
  const firstUser = await prisma.user.findFirst()
  if (!firstUser) {
    throw new AppError('Nenhum usuário encontrado no sistema', 500)
  }
  return firstUser.id
}

export class ExecutionController {
  // POST /steps/:stepId/comments
  async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const stepId = parseInt(req.params.stepId)
      const userId = await getValidUserId(req)
      const { text, mentions } = req.body

      if (!text || text.trim().length === 0) {
        throw new AppError('Texto do comentário é obrigatório', 400)
      }

      const comment = await addStepComment({
        stepId,
        text,
        mentions,
        userId
      })

      res.status(201).json({
        message: 'Comentário adicionado com sucesso',
        comment
      })
    } catch (err: any) {
      next(err)
    }
  }

  // GET /steps/:stepId/comments
  async getComments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const stepId = parseInt(req.params.stepId)
      const userId = await getValidUserId(req)

      const comments = await getStepComments({ stepId, userId })

      res.json({
        message: 'Comentários recuperados com sucesso',
        comments
      })
    } catch (err: any) {
      next(err)
    }
  }

  // POST /steps/:stepId/attachments
  async uploadAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const stepId = parseInt(req.params.stepId)
      const userId = await getValidUserId(req)

      if (!req.file) {
        throw new AppError('Arquivo não fornecido', 400)
      }

      const attachment = await uploadStepAttachment({
        stepId,
        file: req.file,
        userId
      })

      res.status(201).json({
        message: 'Evidência anexada com sucesso',
        attachment
      })
    } catch (err: any) {
      next(err)
    }
  }

  // GET /steps/:stepId/attachments
  async getAttachments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const stepId = parseInt(req.params.stepId)
      const userId = await getValidUserId(req)

      const attachments = await getStepAttachments({ stepId, userId })

      res.json({
        message: 'Anexos recuperados com sucesso',
        attachments
      })
    } catch (err: any) {
      next(err)
    }
  }

  // DELETE /steps/:stepId/attachments/:attachmentId
  async deleteAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const attachmentId = parseInt(req.params.attachmentId)
      const userId = await getValidUserId(req)

      await deleteStepAttachment({ attachmentId, userId })

      res.json({
        message: 'Anexo excluído com sucesso'
      })
    } catch (err: any) {
      next(err)
    }
  }

  // PUT /steps/:stepId/status
  async updateStepStatusHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const stepId = parseInt(req.params.stepId)
      const userId = await getValidUserId(req)
      const { status, actualResult } = req.body

      logger.log('updateStepStatusHandler - stepId:', stepId, 'status:', status, 'actualResult:', actualResult)

      if (!status) {
        throw new AppError('Status é obrigatório', 400)
      }

      const step = await updateStepStatus({
        stepId,
        status,
        actualResult,
        userId
      })

      logger.log('updateStepStatusHandler - Step atualizado:', step)

      res.json({
        message: 'Status da etapa atualizado com sucesso',
        step
      })
    } catch (err: any) {
      logger.error('updateStepStatusHandler - Erro:', err)
      next(err)
    }
  }

  // POST /scenarios/:scenarioId/bugs
  async createBug(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const scenarioId = parseInt(req.params.scenarioId)
      const userId = await getValidUserId(req)
      const { title, description, severity, relatedStepId } = req.body

      if (!title || title.trim().length === 0) {
        throw new AppError('Título do bug é obrigatório', 400)
      }

      if (!severity || !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
        throw new AppError('Gravidade inválida', 400)
      }

      const bug = await createBug({
        scenarioId,
        title,
        description,
        severity,
        relatedStepId: relatedStepId ? parseInt(relatedStepId) : undefined,
        userId
      })

      res.status(201).json({
        message: 'Bug criado com sucesso',
        bug
      })
    } catch (err: any) {
      next(err)
    }
  }

  // POST /scenarios/:scenarioId/history
  async registerHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const scenarioId = parseInt(req.params.scenarioId)
      const userId = await getValidUserId(req)
      const { action, description, metadata } = req.body

      if (!action || action.trim().length === 0) {
        throw new AppError('Ação é obrigatória', 400)
      }

      const history = await registerExecutionHistory({
        scenarioId,
        action,
        description,
        metadata,
        userId
      })

      res.status(201).json({
        message: 'Histórico registrado com sucesso',
        history
      })
    } catch (err: any) {
      next(err)
    }
  }

  // GET /scenarios/:scenarioId/history
  async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const scenarioId = parseInt(req.params.scenarioId)
      const userId = await getValidUserId(req)

      const history = await getExecutionHistory({ scenarioId, userId })

      res.json({
        message: 'Histórico recuperado com sucesso',
        history
      })
    } catch (err: any) {
      next(err)
    }
  }

  // GET /scenarios/:scenarioId/bugs
  async getScenarioBugs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const scenarioId = parseInt(req.params.scenarioId)
      const userId = await getValidUserId(req)

      const bugs = await getBugs({ scenarioId, userId })

      res.json({
        message: 'Bugs recuperados com sucesso',
        bugs
      })
    } catch (err: any) {
      next(err)
    }
  }

  // GET /packages/:packageId/bugs (dentro do contexto de um projeto)
  async getPackageBugsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const packageId = parseInt(req.params.packageId)
      const projectId = parseInt(req.params.projectId)
      const userId = await getValidUserId(req)

      const bugs = await getPackageBugs({ packageId, projectId, userId })

      res.json({
        message: 'Bugs do pacote recuperados com sucesso',
        bugs
      })
    } catch (err: any) {
      next(err)
    }
  }

  // PUT /bugs/:bugId
  async updateBugHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const bugId = parseInt(req.params.bugId)
      const userId = await getValidUserId(req)
      const { title, description, severity, status } = req.body

      const bug = await updateBug({
        bugId,
        title,
        description,
        severity,
        status,
        userId
      })

      res.json({
        message: 'Bug atualizado com sucesso',
        bug
      })
    } catch (err: any) {
      next(err)
    }
  }

  // POST /bugs/:bugId/attachments
  async uploadBugAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const bugId = parseInt(req.params.bugId)
      const userId = await getValidUserId(req)
      const file = req.file

      if (!file) {
        throw new AppError('Arquivo é obrigatório', 400)
      }

      const attachment = await uploadBugAttachmentUseCase({
        bugId,
        file,
        userId
      })

      res.status(201).json({
        message: 'Anexo do bug enviado com sucesso',
        attachment
      })
    } catch (err: any) {
      next(err)
    }
  }

  // DELETE /bugs/:bugId
  async deleteBugHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const bugId = parseInt(req.params.bugId)
      const userId = await getValidUserId(req)

      const result = await deleteBug({ bugId, userId })

      res.json(result)
    } catch (err: any) {
      next(err)
    }
  }
}

