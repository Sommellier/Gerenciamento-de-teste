import { Request, Response, NextFunction } from 'express'
import { ECTService } from '../services/ect.service'
import { AppError } from '../utils/AppError'
import { approveReport } from '../application/use-cases/reports/approveReport.use-case'
import { rejectReport } from '../application/use-cases/reports/rejectReport.use-case'

const ectService = new ECTService()

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export class ECTController {
  // POST /api/scenarios/:id/ect
  async generateECT(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const scenarioId = parseInt(req.params.id)
      const userId = (req as any).user?.id

      if (isNaN(scenarioId)) {
        throw new AppError('ID do cenário inválido', 400)
      }

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401)
      }

      const result = await ectService.generateECT(scenarioId, userId)

      res.json({
        message: 'ECT gerado com sucesso',
        reportId: result.reportId,
        downloadUrl: result.downloadUrl
      })
    } catch (error) {
      console.error('Erro ao gerar ECT:', error)
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message })
        return
      }
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }

  // GET /api/reports/:id/download
  async downloadReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reportId = parseInt(req.params.id)
      const userId = (req as any).user?.id

      if (isNaN(reportId)) {
        throw new AppError('ID do relatório inválido', 400)
      }

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401)
      }

      const result = await ectService.downloadReport(reportId, userId)

      // Configurar headers para download
      res.setHeader('Content-Type', result.mimeType)
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`)
      res.setHeader('Content-Length', result.buffer.length)

      res.send(result.buffer)
    } catch (error) {
      console.error('Erro ao baixar relatório:', error)
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message })
        return
      }
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }

  // POST /api/reports/:id/approve
  async approveReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reportId = parseInt(req.params.id)
      const userId = req.user?.id
      const { comment } = req.body

      if (isNaN(reportId)) {
        throw new AppError('ID do relatório inválido', 400)
      }

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401)
      }

      const result = await approveReport({
        reportId,
        approverId: userId,
        comment
      })

      res.status(200).json({
        message: 'Relatório aprovado com sucesso',
        approval: result.approval
      })
    } catch (error) {
      console.error('🔴 [ECTController.approveReport] Erro ao aprovar relatório:', error)
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message })
        return
      }
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }

  // POST /api/reports/:id/reject
  async rejectReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reportId = parseInt(req.params.id)
      const userId = req.user?.id
      const { comment } = req.body

      if (isNaN(reportId)) {
        throw new AppError('ID do relatório inválido', 400)
      }

      if (!userId) {
        throw new AppError('Usuário não autenticado', 401)
      }

      if (!comment || comment.trim().length === 0) {
        throw new AppError('Comentário é obrigatório para reprovação', 400)
      }

      const result = await rejectReport({
        reportId,
        rejectorId: userId,
        comment: comment.trim()
      })

      res.status(200).json({
        message: 'Relatório reprovado com sucesso',
        approval: result.approval
      })
    } catch (error) {
      console.error('🔴 [ECTController.rejectReport] Erro ao reprovar relatório:', error)
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message })
        return
      }
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }
}
