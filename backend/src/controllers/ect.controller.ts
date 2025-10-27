import { Request, Response, NextFunction } from 'express'
import { ECTService } from '../services/ect.service'
import { AppError } from '../utils/AppError'

const ectService = new ECTService()

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

      console.log('Gerando ECT para cenário:', scenarioId, 'usuário:', userId)

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

      console.log('Download de relatório:', reportId, 'usuário:', userId)

      const result = await ectService.downloadReport(reportId, userId)

      console.log('Relatório encontrado:', {
        fileName: result.fileName,
        mimeType: result.mimeType,
        bufferSize: result.buffer.length
      })

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
}
