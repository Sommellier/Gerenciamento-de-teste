import { Request, Response } from 'express'
import { ScenarioService } from '../../services/scenario.service'
import { 
  CreateScenarioData, 
  UpdateScenarioData, 
  ExecuteScenarioData, 
  ScenarioFilters,
  validateCreateScenarioData,
  validateExecuteScenarioData,
  validateScenarioFilters
} from '../../schemas/scenario.schema'
import { AppError } from '../../utils/AppError'
import { logger } from '../../utils/logger'
import { validateId, validatePagination } from '../../utils/validation'

const scenarioService = new ScenarioService()

export class ScenarioController {
  // GET /packages/:packageId/scenarios
  async getPackageScenarios(req: Request, res: Response) {
    try {
      const packageId = validateId(req.params.packageId, 'ID do pacote')
      const userId = (req as any).user?.id
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autenticado' })
      }

      // Validar filtros e paginação
      const { page, pageSize } = validatePagination(req.query.page, req.query.pageSize, true)
      const filters = validateScenarioFilters({
        ...req.query,
        page,
        pageSize
      })

      const result = await scenarioService.getPackageScenarios(packageId, filters, userId)

      res.json({
        message: 'Cenários recuperados com sucesso',
        data: result
      })
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message })
      }
      logger.error('Erro ao buscar cenários:', error)
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }

  // POST /packages/:packageId/scenarios
  async createScenario(req: Request, res: Response) {
    try {
      const packageId = validateId(req.params.packageId, 'ID do pacote')
      const userId = (req as any).user?.id
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autenticado' })
      }

      // Validar dados de entrada
      const scenarioData = validateCreateScenarioData(req.body)

      const scenario = await scenarioService.createScenario(packageId, scenarioData, userId)

      res.status(201).json({
        message: 'Cenário criado com sucesso',
        scenario
      })
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message })
      }
      if (error instanceof Error && error.message.includes('obrigatório')) {
        return res.status(400).json({ message: error.message })
      }
      logger.error('Erro ao criar cenário:', error)
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }

  // GET /scenarios/:id
  async getScenarioById(req: Request, res: Response) {
    try {
      const scenarioId = validateId(req.params.id, 'ID do cenário')
      const userId = (req as any).user?.id
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autenticado' })
      }

      const scenario = await scenarioService.getScenarioById(scenarioId, userId)

      res.json({
        message: 'Cenário recuperado com sucesso',
        scenario
      })
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message })
      }
      logger.error('Erro ao buscar cenário:', error)
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }

  // PUT /scenarios/:id
  async updateScenario(req: Request, res: Response) {
    try {
      const scenarioId = validateId(req.params.id, 'ID do cenário')
      const userId = (req as any).user?.id
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autenticado' })
      }

      // Para updates, não validamos campos obrigatórios - aceitar updates parciais
      const updateData: any = {
        id: scenarioId
      }

      // Adicionar apenas os campos fornecidos
      if (req.body.title !== undefined) updateData.title = req.body.title
      if (req.body.description !== undefined) updateData.description = req.body.description
      if (req.body.type !== undefined) updateData.type = req.body.type
      if (req.body.priority !== undefined) updateData.priority = req.body.priority
      if (req.body.status !== undefined) updateData.status = req.body.status
      if (req.body.tags !== undefined) updateData.tags = req.body.tags
      if (req.body.steps !== undefined) updateData.steps = req.body.steps
      if (req.body.testadorId !== undefined) updateData.testadorId = req.body.testadorId
      if (req.body.aprovadorId !== undefined) updateData.aprovadorId = req.body.aprovadorId

      const scenario = await scenarioService.updateScenario(scenarioId, updateData, userId)

      res.json({
        message: 'Cenário atualizado com sucesso',
        scenario
      })
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message })
      }
      logger.error('Erro ao atualizar cenário:', error)
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }

  // DELETE /scenarios/:id
  async deleteScenario(req: Request, res: Response) {
    try {
      const scenarioId = validateId(req.params.id, 'ID do cenário')
      const userId = (req as any).user?.id
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autenticado' })
      }

      const result = await scenarioService.deleteScenario(scenarioId, userId)

      res.json(result)
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message })
      }
      logger.error('Erro ao deletar cenário:', error)
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }

  // POST /scenarios/:id/executions
  async executeScenario(req: Request, res: Response) {
    try {
      const scenarioId = validateId(req.params.id, 'ID do cenário')
      const userId = (req as any).user?.id
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autenticado' })
      }

      // Validar dados de entrada
      const executionData = validateExecuteScenarioData(req.body)

      const execution = await scenarioService.executeScenario(scenarioId, executionData, userId)

      res.status(201).json({
        message: 'Execução registrada com sucesso',
        execution
      })
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message })
      }
      if (error instanceof Error && error.message.includes('obrigatório')) {
        return res.status(400).json({ message: error.message })
      }
      logger.error('Erro ao executar cenário:', error)
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }

  // POST /scenarios/:id/duplicate
  async duplicateScenario(req: Request, res: Response) {
    try {
      const scenarioId = validateId(req.params.id, 'ID do cenário')
      const userId = (req as any).user?.id
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autenticado' })
      }

      const duplicatedScenario = await scenarioService.duplicateScenario(scenarioId, userId)

      res.status(201).json({
        message: 'Cenário duplicado com sucesso',
        scenario: duplicatedScenario
      })
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message })
      }
      logger.error('Erro ao duplicar cenário:', error)
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }

  // POST /scenarios/:id/evidences
  async uploadEvidence(req: Request, res: Response) {
    try {
      const scenarioId = validateId(req.params.id, 'ID do cenário')
      const userId = (req as any).user?.id
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autenticado' })
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Arquivo não fornecido' })
      }

      const evidence = await scenarioService.uploadEvidence(scenarioId, req.file, userId)

      res.status(201).json({
        message: 'Evidência enviada com sucesso',
        evidence
      })
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message })
      }
      logger.error('Erro ao enviar evidência:', error)
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }

  // GET /packages/:packageId/scenarios/export.csv
  async exportScenariosToCSV(req: Request, res: Response) {
    try {
      const packageId = validateId(req.params.packageId, 'ID do pacote')
      const userId = (req as any).user?.id
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autenticado' })
      }

      const csvContent = await scenarioService.exportScenariosToCSV(packageId, userId)

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="cenarios-pacote-${packageId}.csv"`)
      res.send(csvContent)
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message })
      }
      logger.error('Erro ao exportar cenários:', error)
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }

  // GET /packages/:packageId/scenarios/report.pdf
  async generateScenarioReport(req: Request, res: Response) {
    try {
      const packageId = validateId(req.params.packageId, 'ID do pacote')
      const userId = (req as any).user?.id
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autenticado' })
      }

      // Por enquanto, retornar um PDF simples
      // Em produção, usar uma biblioteca como puppeteer ou jsPDF
      const packageAccess = await scenarioService.checkPackageAccess(packageId, userId)
      if (!packageAccess) {
        return res.status(403).json({ message: 'Acesso negado ao pacote' })
      }

      const scenarios = await scenarioService.getPackageScenarios(packageId, {
        page: 1,
        pageSize: 1000,
        sort: 'title',
        sortOrder: 'asc'
      }, userId)

      // Gerar PDF simples (placeholder)
      const pdfContent = `Relatório de Cenários de Teste - Pacote ${packageId}
      
Total de cenários: ${scenarios.scenarios.length}

${scenarios.scenarios.map((s: any) => 
  `${s.id} - ${s.title} (${s.type}) - ${s.status}`
).join('\n')}`

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-cenarios-${packageId}.pdf"`)
      res.send(pdfContent)
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message })
      }
      logger.error('Erro ao gerar relatório:', error)
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }
}
