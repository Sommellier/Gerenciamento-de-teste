import PDFDocument from 'pdfkit'
import { prisma } from '../infrastructure/prisma'
import { AppError } from '../utils/AppError'
import crypto from 'crypto'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

export interface ECTData {
  scenario?: any
  package?: any
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
              attachments: true,
              comments: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true }
                  }
                },
                orderBy: { createdAt: 'asc' }
              }
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
    return new Promise(async (resolve, reject) => {
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

        // Gerar conteúdo do PDF - AGUARDAR conclusão antes de finalizar
        await this.generatePDFContent(doc, data)
        
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
    
    // Seção 2 - Etapas (com evidências e comentários)
    await this.generateStepsSection(doc, steps, evidences)
    
    // Rodapé com paginação e hash
    this.generateFooter(doc)
  }

  private generateCoverPage(doc: typeof PDFDocument, scenario: any, project: any, testador?: any, aprovador?: any) {
    // Título principal - centralizado
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#2D3748')
       .text('RELATÓRIO DE EXECUÇÃO DE CENÁRIO DE TESTE', 0, 100, { align: 'center', width: doc.page.width })

    // Informações do projeto e cenário
    doc.fontSize(12)
    let y = 200

    // PROJETO
    doc.font('Helvetica-Bold')
       .text('PROJETO:', 50, y)
    doc.font('Helvetica')
       .text(project?.name || 'Não informado', 130, y)
    y += 30

    // CENÁRIO
    doc.font('Helvetica-Bold')
       .text('CENÁRIO:', 50, y)
    doc.font('Helvetica')
       .text(scenario?.title || 'Não informado', 130, y)
    y += 30

    // ID
    doc.font('Helvetica-Bold')
       .text('ID:', 50, y)
    doc.font('Helvetica')
       .text(scenario?.id?.toString() || 'Não informado', 130, y)
    y += 30

    // STATUS
    doc.font('Helvetica-Bold')
       .text('STATUS:', 50, y)
    doc.font('Helvetica')
       .text(this.getStatusLabel(scenario?.status || ''), 130, y)
    y += 30

    // TIPO
    doc.font('Helvetica-Bold')
       .text('TIPO:', 50, y)
    doc.font('Helvetica')
       .text(this.getTypeLabel(scenario?.type || ''), 130, y)
    y += 30

    // PRIORIDADE
    doc.font('Helvetica-Bold')
       .text('PRIORIDADE:', 50, y)
    doc.font('Helvetica')
       .text(this.getPriorityLabel(scenario?.priority || ''), 130, y)
    y += 30

    // TESTADOR
    if (testador) {
      doc.font('Helvetica-Bold')
         .text('TESTADOR:', 50, y)
      doc.font('Helvetica')
         .text(`${testador.name || 'Não informado'} (${testador.email || 'Não informado'})`, 130, y)
      y += 30
    }

    // APROVADOR
    if (aprovador) {
      doc.font('Helvetica-Bold')
         .text('APROVADOR:', 50, y)
      doc.font('Helvetica')
         .text(`${aprovador.name || 'Não informado'} (${aprovador.email || 'Não informado'})`, 130, y)
      y += 30
    }

    // DATA/HORA - usar data de criação do cenário se disponível, senão data atual
    doc.font('Helvetica-Bold')
       .text('DATA/HORA:', 50, y)
    doc.font('Helvetica')
    const dateTime = scenario?.createdAt 
      ? new Date(scenario.createdAt).toLocaleString('pt-BR')
      : new Date().toLocaleString('pt-BR')
    doc.text(dateTime, 130, y)

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

  private async generateStepsSection(doc: typeof PDFDocument, steps: any[], evidences: any[]) {
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#2D3748')
       .text('2. ETAPAS DE TESTE', 0, 50, { align: 'center', width: doc.page.width })

    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#4A5568')

    let y = 100

    for (const step of steps) {
      // Filtrar evidências da etapa (usado tanto para cálculo quanto para processamento)
      const stepEvidences = evidences.filter(evidence => evidence.stepNumber === step.stepOrder)
      
      // Calcular altura aproximada da etapa antes de adicionar
      let estimatedHeight = 200 // Altura base da etapa
      
      // Altura dos textos
      if (step.action) {
        estimatedHeight += Math.ceil((step.action.length || 0) / 65) * 15 + 40
      }
      if (step.expected) {
        estimatedHeight += Math.ceil((step.expected.length || 0) / 65) * 15 + 40
      }
      if (step.actualResult) {
        estimatedHeight += Math.ceil((step.actualResult.length || 0) / 65) * 15 + 40
      }
      
      // Altura dos comentários
      if (step.comments && step.comments.length > 0) {
        estimatedHeight += 25 // Título
        step.comments.forEach((comment: any) => {
          estimatedHeight += Math.ceil((comment.text?.length || 0) / 65) * 15 + 30
        })
      }
      
      // Altura das evidências (imagens)
      const imageEvidences = stepEvidences.filter(e => e.mimeType && e.mimeType.startsWith('image/'))
      estimatedHeight += imageEvidences.length > 0 ? 30 : 0 // Título EVIDÊNCIAS
      
      // Verificar se precisa de nova página ANTES de adicionar a etapa completa
      if (y > 650 || (y + estimatedHeight > 700)) {
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
      y += 20
      // Calcular altura do texto (aproximadamente 15px por linha, ~65 caracteres por linha)
      const actionLines = Math.ceil((step.action?.length || 0) / 65)
      const actionHeight = Math.max(20, actionLines * 15)
      doc.font('Helvetica')
         .text(step.action, 70, y, { width: 450 })
      y += actionHeight + 20

      // Verificar paginação após ação
      if (y > 700) {
        doc.addPage()
        y = 50
      }

      // Resultado esperado
      doc.font('Helvetica-Bold')
         .text('RESULTADO ESPERADO:', 70, y)
      y += 20
      const expectedLines = Math.ceil((step.expected?.length || 0) / 65)
      const expectedHeight = Math.max(20, expectedLines * 15)
      doc.font('Helvetica')
         .text(step.expected, 70, y, { width: 450 })
      y += expectedHeight + 20

      // Verificar paginação após resultado esperado
      if (y > 700) {
        doc.addPage()
        y = 50
      }

      // Resultado obtido (se existir)
      if (step.actualResult) {
        doc.font('Helvetica-Bold')
           .text('RESULTADO OBTIDO:', 70, y)
        y += 20
        const actualLines = Math.ceil((step.actualResult?.length || 0) / 65)
        const actualHeight = Math.max(20, actualLines * 15)
        doc.font('Helvetica')
           .text(step.actualResult, 70, y, { width: 450 })
        y += actualHeight + 20
        
        // Verificar paginação após resultado obtido
        if (y > 700) {
          doc.addPage()
          y = 50
        }
      }

      // Status
      doc.font('Helvetica-Bold')
         .text('STATUS:', 70, y)
      doc.font('Helvetica')
         .text(this.getStepStatusLabel(step.status), 70, y + 20)
      y += 50

      // Comentários da etapa
      if (step.comments && step.comments.length > 0) {
        // Verificar paginação antes de comentários
        if (y > 680) {
          doc.addPage()
          y = 50
        }
        
        doc.font('Helvetica-Bold')
           .text('COMENTÁRIOS:', 70, y)
        y += 25

        for (const comment of step.comments) {
          // Verificar paginação antes de cada comentário
          if (y > 680) {
            doc.addPage()
            y = 50
          }
          
          const userName = comment.user?.name || 'Usuário desconhecido'
          const commentDate = comment.createdAt ? new Date(comment.createdAt).toLocaleString('pt-BR') : ''
          
          doc.font('Helvetica-Bold')
             .fontSize(10)
             .text(`${userName} - ${commentDate}:`, 90, y)
          y += 15
          
          const commentLines = Math.ceil(((comment.text || '').length || 0) / 65)
          const commentHeight = Math.max(15, commentLines * 15)
          doc.font('Helvetica')
             .fontSize(11)
             .text(comment.text || '', 90, y, { width: 450 })
          y += commentHeight + 10
        }
        y += 10
      }

      // Evidências da etapa (stepEvidences já foi declarado no início do loop)
      if (stepEvidences.length > 0) {
        // Verificar paginação antes de adicionar evidências
        if (y > 680) {
          doc.addPage()
          y = 50
        }
        
        doc.fontSize(12)
        doc.font('Helvetica-Bold')
           .text('EVIDÊNCIAS:', 70, y)
        y += 25

        for (const evidence of stepEvidences) {
          // Incluir imagem se for imagem - OBRIGATÓRIO para todas as imagens
          if (evidence.mimeType && evidence.mimeType.startsWith('image/')) {
            try {
              // Caminho do arquivo - a URL vem como /uploads/evidences/filename
              let imagePath = evidence.url || ''
              
              // Extrair o nome do arquivo da URL ou usar filename diretamente
              let filename = ''
              
              // Primeiro tentar extrair da URL
              if (imagePath) {
                // Remove qualquer prefixo de caminho
                filename = imagePath.replace(/^.*uploads\/evidences\//, '')
                filename = filename.replace(/^.*\//, '') // Remove qualquer caminho restante
              }
              
              // Se não conseguir extrair da URL, usar o filename diretamente
              if (!filename || filename === imagePath) {
                if (evidence.filename) {
                  filename = evidence.filename
                } else {
                  throw new Error(`Não foi possível determinar o nome do arquivo da evidência`)
                }
              }
              
              // Construir caminho completo do arquivo
              const fullPath = path.join(process.cwd(), 'uploads', 'evidences', filename)
              
              // Verificar se arquivo existe
              if (fs.existsSync(fullPath)) {
                y += 10
                
                // Obter metadados da imagem para calcular dimensões
                const imageMetadata = await sharp(fullPath).metadata()
                const originalWidth = imageMetadata.width || 450
                const originalHeight = imageMetadata.height || 200
                
                // Calcular altura proporcional para largura máxima de 450px
                const maxWidth = 450
                const aspectRatio = originalHeight / originalWidth
                const targetHeight = Math.min(originalHeight, maxWidth * aspectRatio)
                
                // Redimensionar imagem se necessário (max 450px de largura)
                const imageBuffer = await sharp(fullPath)
                  .resize(maxWidth, Math.round(targetHeight), { 
                    withoutEnlargement: true,
                    fit: 'inside'
                  })
                  .toBuffer()
                
                // Verificar se precisa de nova página para a imagem ANTES de adicionar
                const imageHeightOnPage = Math.round(targetHeight)
                if (y + imageHeightOnPage > 700) {
                  doc.addPage()
                  y = 50
                }
                
                // Incluir imagem no PDF
                try {
                  doc.image(imageBuffer, 90, y, {
                    fit: [maxWidth, imageHeightOnPage],
                    align: 'left'
                  })
                } catch (imgError: any) {
                  try {
                    doc.image(imageBuffer, 90, y, { width: maxWidth })
                  } catch (imgError2: any) {
                    doc.image(imageBuffer, 90, y)
                  }
                }
                
                y += imageHeightOnPage + 15
              } else {
                doc.font('Helvetica')
                   .fontSize(9)
                   .fillColor('#E53E3E')
                   .text(`  [Imagem não encontrada]`, 90, y)
                y += 15
              }
            } catch (error: any) {
              doc.font('Helvetica')
                 .fontSize(9)
                 .fillColor('#E53E3E')
                 .text(`  [Erro ao carregar imagem]`, 90, y)
              y += 15
            }
          }
          
          y += 10
        }
        y += 10
      }

      // Linha separadora
      doc.strokeColor('#E2E8F0')
         .lineWidth(1)
         .moveTo(50, y)
         .lineTo(550, y)
         .stroke()
      y += 20
    }

    // Nova página
    doc.addPage()
  }

  protected generateFooter(doc: typeof PDFDocument) {
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

  protected getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'CREATED': 'Criado',
      'EXECUTED': 'Executado',
      'PASSED': 'Aprovado',
      'FAILED': 'Reprovado'
    }
    return labels[status] || status
  }

  protected getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'FUNCTIONAL': 'Funcional',
      'REGRESSION': 'Regressão',
      'SMOKE': 'Smoke',
      'E2E': 'End-to-End'
    }
    return labels[type] || type
  }

  protected getPriorityLabel(priority: string): string {
    if (!priority) return 'Não informado'
    
    const labels: Record<string, string> = {
      'LOW': 'Baixa',
      'MEDIUM': 'Média',
      'HIGH': 'Alta',
      'CRITICAL': 'Crítica',
      'Ética': 'Ética', // Mantém valores já existentes no banco
      'ÉTICA': 'Ética'
    }
    return labels[priority.toUpperCase()] || labels[priority] || priority
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
      // Se o relatório tem scenarioId, verificar acesso ao cenário
      if (report.scenarioId !== null) {
        const hasAccess = await this.checkScenarioAccess(report.scenarioId, userId)
        if (!hasAccess) {
          throw new AppError('Acesso negado ao relatório', 403)
        }
      }
      // Se scenarioId é null, pode ser um relatório de pacote - permitir acesso

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
