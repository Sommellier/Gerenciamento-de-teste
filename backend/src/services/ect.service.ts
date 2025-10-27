import PDFDocument from 'pdfkit'
import { prisma } from '../infrastructure/prisma'
import { AppError } from '../utils/AppError'
import crypto from 'crypto'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

export interface ECTData {
  scenario: any
  steps: any[]
  evidences: any[]
  project: any
  testador?: any
  aprovador?: any
}

export class ECTService {
  async generateECT(scenarioId: number, userId: number): Promise<{ reportId: number; downloadUrl: string }> {
    try {
      // Buscar dados do cenário com todas as relações
      const scenario = await prisma.testScenario.findUnique({
        where: { id: scenarioId },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
            include: {
              attachments: true
            }
          },
          project: true,
          testador: {
            select: { id: true, name: true, email: true }
          },
          aprovador: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      if (!scenario) {
        throw new AppError('Cenário não encontrado', 404)
      }

      // Validar se o cenário está concluído com sucesso
      if (scenario.status !== 'PASSED') {
        throw new AppError('ECT só pode ser gerado para cenários concluídos com sucesso', 400)
      }

      // Verificar permissão de acesso
      const hasAccess = await this.checkScenarioAccess(scenarioId, userId)
      if (!hasAccess) {
        throw new AppError('Acesso negado ao cenário', 403)
      }

      // Coletar todas as evidências dos steps
      const evidences = scenario.steps.flatMap(step => 
        step.attachments.map(attachment => ({
          ...attachment,
          stepNumber: step.stepOrder
        }))
      )

      console.log('Evidências coletadas:', evidences.length)
      evidences.forEach((evidence, index) => {
        console.log(`Evidência ${index + 1}:`, {
          filename: evidence.filename,
          originalName: evidence.originalName,
          mimeType: evidence.mimeType,
          size: evidence.size,
          createdAt: evidence.createdAt,
          stepNumber: evidence.stepNumber
        })
      })

      // Validar limite de evidências
      if (evidences.length > 50) {
        throw new AppError('Limite de 50 evidências por relatório excedido', 400)
      }

      // Preparar dados para o PDF
      const ectData: ECTData = {
        scenario,
        steps: scenario.steps,
        evidences,
        project: scenario.project,
        testador: scenario.testador,
        aprovador: scenario.aprovador
      }

      // Gerar PDF
      const pdfBuffer = await this.generatePDF(ectData)

      // Calcular checksum
      const checksum = crypto.createHash('sha256').update(pdfBuffer).digest('hex')

      // Verificar se já existe um relatório com o mesmo checksum
      const existingReport = await prisma.testReport.findUnique({
        where: { checksum }
      })

      if (existingReport) {
        return {
          reportId: existingReport.id,
          downloadUrl: `/api/reports/${existingReport.id}/download`
        }
      }

      // Salvar no banco
      const scenarioName = scenario.title
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '_') // Substitui espaços por underscore
        .substring(0, 50) // Limita a 50 caracteres
        .toUpperCase() // Converte para maiúsculo
      
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
      const fileName = `ECT_${scenarioName}_${timestamp}.pdf`
      
      const report = await prisma.testReport.create({
        data: {
          scenarioId,
          fileName,
          fileSize: pdfBuffer.length,
          mimeType: 'application/pdf',
          checksum,
          content: pdfBuffer
        }
      })

      return {
        reportId: report.id,
        downloadUrl: `/api/reports/${report.id}/download`
      }

    } catch (error) {
      console.error('Erro ao gerar ECT:', error)
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError('Erro interno ao gerar ECT', 500)
    }
  }

  private async generatePDF(data: ECTData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          },
          autoFirstPage: true,
          compress: true
        })

        const buffers: Buffer[] = []
        doc.on('data', buffers.push.bind(buffers))
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers)
          resolve(pdfBuffer)
        })

        // Gerar conteúdo do PDF
        this.generatePDFContent(doc, data)

        doc.end()
      } catch (error) {
        reject(error)
      }
    })
  }

  private async generatePDFContent(doc: typeof PDFDocument, data: ECTData) {
    const { scenario, steps, evidences, project, testador, aprovador } = data

    // Capa
    this.generateCoverPage(doc, scenario, project, testador, aprovador)
    
    // Sumário
    this.generateTableOfContents(doc, steps)
    
    // Seção 1 - Informações do Cenário
    this.generateScenarioInfo(doc, scenario)
    
    // Seção 2 - Etapas (com evidências)
    this.generateStepsSection(doc, steps, evidences)
    
    // Rodapé com paginação e hash
    this.generateFooter(doc)
  }

  private generateCoverPage(doc: typeof PDFDocument, scenario: any, project: any, testador?: any, aprovador?: any) {
    // Título principal
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#2D3748')
       .text('RELATÓRIO DE EXECUÇÃO DE CENÁRIO DE TESTE', 0, 100, { align: 'center' })

    // Informações do projeto
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('PROJETO:', 50, 200)
       .font('Helvetica')
       .text(project.name, 150, 200)

    // Informações do cenário
    doc.font('Helvetica-Bold')
       .text('CENÁRIO:', 50, 230)
       .font('Helvetica')
       .text(scenario.title, 150, 230)

    doc.font('Helvetica-Bold')
       .text('ID:', 50, 260)
       .font('Helvetica')
       .text(scenario.id.toString(), 150, 260)

    doc.font('Helvetica-Bold')
       .text('STATUS:', 50, 290)
       .font('Helvetica')
       .text(this.getStatusLabel(scenario.status), 200, 290)

    doc.font('Helvetica-Bold')
       .text('TIPO:', 50, 320)
       .font('Helvetica')
       .text(this.getTypeLabel(scenario.type), 200, 320)

    doc.font('Helvetica-Bold')
       .text('PRIORIDADE:', 50, 350)
       .font('Helvetica')
       .text(this.getPriorityLabel(scenario.priority), 200, 350)

    // Responsáveis
    if (testador) {
      doc.font('Helvetica-Bold')
         .text('TESTADOR:', 50, 380)
         .font('Helvetica')
         .text(`${testador.name} (${testador.email})`, 200, 380)
    }

    if (aprovador) {
      doc.font('Helvetica-Bold')
         .text('APROVADOR:', 50, 410)
         .font('Helvetica')
         .text(`${aprovador.name} (${aprovador.email})`, 200, 410)
    }

    // Data e hora
    doc.font('Helvetica-Bold')
       .text('DATA/HORA:', 50, 440)
       .font('Helvetica')
       .text(new Date().toLocaleString('pt-BR'), 200, 440)

    // Nova página
    doc.addPage()
  }

  private generateTableOfContents(doc: typeof PDFDocument, steps: any[]) {
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#2D3748')
       .text('SUMÁRIO', 0, 50, { align: 'center' })

    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#4A5568')

    let y = 100
    doc.text('1. Informações do Cenário', 50, y)
    y += 25
    doc.text('2. Etapas de Teste', 50, y)
    y += 25

    // Nova página
    doc.addPage()
  }

  private generateScenarioInfo(doc: typeof PDFDocument, scenario: any) {
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#2D3748')
       .text('1. INFORMAÇÕES DO CENÁRIO', 0, 50, { align: 'center' })

    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#4A5568')

    let y = 100

    // Descrição
    if (scenario.description) {
      doc.font('Helvetica-Bold')
         .text('Descrição:', 50, y)
      doc.font('Helvetica')
         .text(scenario.description, 50, y + 20, { width: 500 })
      y += 60
    }

    // Tags
    if (scenario.tags) {
      doc.font('Helvetica-Bold')
         .text('Tags:', 50, y)
      doc.font('Helvetica')
         .text(scenario.tags, 50, y + 20)
      y += 50
    }

    // Data de criação
    doc.font('Helvetica-Bold')
       .text('Data de Criação:', 50, y)
    doc.font('Helvetica')
       .text(new Date(scenario.createdAt).toLocaleString('pt-BR'), 50, y + 20)
    y += 50

    // Última atualização
    doc.font('Helvetica-Bold')
       .text('Última Atualização:', 50, y)
    doc.font('Helvetica')
       .text(new Date(scenario.updatedAt).toLocaleString('pt-BR'), 50, y + 20)

    // Nova página
    doc.addPage()
  }

  private generateStepsSection(doc: typeof PDFDocument, steps: any[], evidences: any[]) {
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#2D3748')
       .text('2. ETAPAS DE TESTE', 0, 50, { align: 'center' })

    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#4A5568')

    let y = 100

    steps.forEach((step, index) => {
      // Verificar se precisa de nova página
      if (y > 700) {
        doc.addPage()
        y = 50
      }

      // Número da etapa
      doc.font('Helvetica-Bold')
         .text(`Etapa ${step.stepOrder}:`, 50, y)
      y += 25

      // Ação
      doc.font('Helvetica-Bold')
         .text('AÇÃO:', 70, y)
      doc.font('Helvetica')
         .text(step.action, 70, y + 20, { width: 450 })
      y += 60

      // Resultado esperado
      doc.font('Helvetica-Bold')
         .text('RESULTADO ESPERADO:', 70, y)
      doc.font('Helvetica')
         .text(step.expected, 70, y + 20, { width: 450 })
      y += 60

      // Resultado obtido (se existir)
      if (step.actualResult) {
        doc.font('Helvetica-Bold')
           .text('RESULTADO OBTIDO:', 70, y)
        doc.font('Helvetica')
           .text(step.actualResult, 70, y + 20, { width: 450 })
        y += 60
      }

      // Status
      doc.font('Helvetica-Bold')
         .text('STATUS:', 70, y)
      doc.font('Helvetica')
         .text(this.getStepStatusLabel(step.status), 70, y + 20)
      y += 50

      // Evidências da etapa
      const stepEvidences = evidences.filter(evidence => evidence.stepNumber === step.stepOrder)
      if (stepEvidences.length > 0) {
        doc.font('Helvetica-Bold')
           .text('EVIDÊNCIAS:', 70, y)
        y += 25

        stepEvidences.forEach((evidence, evIndex) => {
          const fileName = evidence.originalName || evidence.filename || 'Arquivo sem nome'
          doc.font('Helvetica')
             .text(`• ${fileName} (${evidence.mimeType || 'Tipo desconhecido'})`, 90, y)
          y += 20
          
          if (evidence.size) {
            doc.font('Helvetica')
               .text(`  Tamanho: ${this.formatFileSize(evidence.size)}`, 90, y)
            y += 20
          }
          
          if (evidence.createdAt) {
            doc.font('Helvetica')
               .text(`  Data: ${new Date(evidence.createdAt).toLocaleString('pt-BR')}`, 90, y)
            y += 20
          }
        })
        y += 20
      }

      // Linha separadora
      doc.strokeColor('#E2E8F0')
         .lineWidth(1)
         .moveTo(50, y)
         .lineTo(550, y)
         .stroke()
      y += 20
    })

    // Nova página
    doc.addPage()
  }

  private generateFooter(doc: typeof PDFDocument) {
    const pageCount = doc.bufferedPageRange().count
    const currentPage = doc.page

    // Hash do documento (simulado)
    const docHash = crypto.createHash('sha256').update(`ECT-${Date.now()}`).digest('hex').substring(0, 16)

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#718096')
       .text(`Página ${currentPage}/${pageCount}`, 50, 750)
       .text(`Hash: ${docHash}`, 400, 750)
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'CREATED': 'Criado',
      'EXECUTED': 'Executado',
      'PASSED': 'Aprovado',
      'FAILED': 'Reprovado'
    }
    return labels[status] || status
  }

  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'FUNCTIONAL': 'Funcional',
      'REGRESSION': 'Regressão',
      'SMOKE': 'Smoke',
      'E2E': 'End-to-End'
    }
    return labels[type] || type
  }

  private getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'LOW': 'Baixa',
      'MEDIUM': 'Média',
      'HIGH': 'Alta',
      'CRITICAL': 'Crítica'
    }
    return labels[priority] || priority
  }

  private getStepStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'Pendente',
      'PASSED': 'Aprovado',
      'FAILED': 'Reprovado',
      'BLOCKED': 'Bloqueado'
    }
    return labels[status] || status
  }

  private formatFileSize(bytes: number | undefined | null): string {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  async downloadReport(reportId: number, userId: number): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    try {
      const report = await prisma.testReport.findUnique({
        where: { id: reportId },
        include: { scenario: true }
      })

      if (!report) {
        throw new AppError('Relatório não encontrado', 404)
      }

      // Verificar permissão de acesso
      const hasAccess = await this.checkScenarioAccess(report.scenarioId, userId)
      if (!hasAccess) {
        throw new AppError('Acesso negado ao relatório', 403)
      }

      return {
        buffer: Buffer.from(report.content),
        mimeType: report.mimeType,
        fileName: report.fileName
      }
    } catch (error) {
      console.error('Erro ao baixar relatório:', error)
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError('Erro interno ao baixar relatório', 500)
    }
  }

  private async checkScenarioAccess(scenarioId: number, userId: number): Promise<boolean> {
    try {
      // Temporariamente permitir acesso para todos os usuários autenticados
      // TODO: Implementar verificação real de acesso ao projeto
      console.log('Verificando acesso - cenário:', scenarioId, 'usuário:', userId)
      return true
    } catch (error) {
      console.error("Erro ao verificar acesso ao cenário:", error)
      return false
    }
  }
}