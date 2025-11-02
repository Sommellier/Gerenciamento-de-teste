import { prisma } from '../../../infrastructure/prisma'
import { approveReport } from '../../../application/use-cases/reports/approveReport.use-case'
import { AppError } from '../../../utils/AppError'
import { Role, ScenarioType, Priority, ScenarioStatus } from '@prisma/client'

describe('approveReport', () => {
  let projectId: number
  let scenarioId: number
  let packageId: number
  let reportId: number
  let ownerId: number
  let approverId: number
  let aprovadorId: number

  beforeEach(async () => {
    // Criar usuário owner
    const owner = await prisma.user.create({
      data: {
        name: 'Owner User',
        email: `owner_${Date.now()}@example.com`,
        password: 'password123'
      }
    })
    ownerId = owner.id

    // Criar usuário aprovador (aprovador do cenário)
    const aprovador = await prisma.user.create({
      data: {
        name: 'Aprovador User',
        email: `aprovador_${Date.now()}@example.com`,
        password: 'password123'
      }
    })
    aprovadorId = aprovador.id
    approverId = aprovadorId

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: ownerId
      }
    })
    projectId = project.id

    // Criar pacote
    const testPackage = await prisma.testPackage.create({
      data: {
        title: 'Test Package',
        description: 'Test Package Description',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        release: '2024-01',
        projectId: projectId
      }
    })
    packageId = testPackage.id

    // Criar cenário com aprovador
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Test Scenario',
        description: 'Test Description',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        status: ScenarioStatus.CREATED,
        projectId,
        packageId,
        aprovadorId: aprovadorId
      }
    })
    scenarioId = scenario.id

    // Criar relatório
    const report = await prisma.testReport.create({
      data: {
        fileName: 'test-report.pdf',
        fileSize: 1024 * 1024,
        mimeType: 'application/pdf',
        checksum: 'test-checksum-' + Date.now(),
        content: Buffer.from('fake pdf content'),
        scenarioId: scenarioId
      }
    })
    reportId = report.id
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.testReportApproval.deleteMany({
      where: { report: { id: reportId } }
    })
    await prisma.testReport.deleteMany({
      where: {
        OR: [
          { scenario: { projectId } },
          { package: { projectId } }
        ]
      }
    })
    await prisma.testScenario.deleteMany({
      where: { projectId }
    })
    await prisma.testPackage.deleteMany({
      where: { projectId }
    })
    await prisma.project.deleteMany({
      where: { id: projectId }
    })
    await prisma.user.deleteMany({
      where: { id: { in: [ownerId, aprovadorId] } }
    })
  })

  describe('approveReport - casos de sucesso', () => {
    it('aprova relatório quando owner aprova', async () => {
      const result = await approveReport({
        reportId,
        approverId: ownerId
      })

      expect(result.approval).toMatchObject({
        reportId,
        status: 'APPROVED',
        approvedBy: ownerId
      })
      expect(result.approval.approver).toMatchObject({
        id: ownerId,
        name: 'Owner User'
      })
      expect(result.approval.comment).toBeNull()
    })

    it('aprova relatório quando aprovador do cenário aprova', async () => {
      const result = await approveReport({
        reportId,
        approverId: aprovadorId
      })

      expect(result.approval).toMatchObject({
        reportId,
        status: 'APPROVED',
        approvedBy: aprovadorId
      })
      expect(result.approval.approver).toMatchObject({
        id: aprovadorId,
        name: 'Aprovador User'
      })
    })

    it('aprova relatório com comentário', async () => {
      const comment = 'Relatório aprovado com sucesso'

      const result = await approveReport({
        reportId,
        approverId: ownerId,
        comment
      })

      expect(result.approval.comment).toBe(comment)
      expect(result.approval.status).toBe('APPROVED')
    })

    it('atualiza status do cenário para APPROVED quando aprova relatório', async () => {
      // Verificar status antes
      const scenarioBefore = await prisma.testScenario.findUnique({
        where: { id: scenarioId }
      })
      expect(scenarioBefore?.status).toBe(ScenarioStatus.CREATED)

      await approveReport({
        reportId,
        approverId: ownerId
      })

      // Verificar status depois
      const scenarioAfter = await prisma.testScenario.findUnique({
        where: { id: scenarioId }
      })
      expect(scenarioAfter?.status).toBe(ScenarioStatus.APPROVED)
    })

    it('calcula hash do arquivo corretamente', async () => {
      const result = await approveReport({
        reportId,
        approverId: ownerId
      })

      expect(result.approval.fileHash).toBeDefined()
      expect(typeof result.approval.fileHash).toBe('string')
      expect(result.approval.fileHash.length).toBeGreaterThan(0)
    })

    it('inclui relatório no retorno', async () => {
      const result = await approveReport({
        reportId,
        approverId: ownerId
      })

      expect(result.approval.report).toBeDefined()
      expect(result.approval.report.id).toBe(reportId)
      expect(result.approval.report.fileName).toBe('test-report.pdf')
    })

    it('funciona com relatório de pacote', async () => {
      // Criar relatório de pacote (sem cenário)
      const packageReport = await prisma.testReport.create({
        data: {
          fileName: 'package-report.pdf',
          fileSize: 1024 * 1024,
          mimeType: 'application/pdf',
          checksum: 'package-checksum-' + Date.now(),
          content: Buffer.from('fake pdf content'),
          packageId: packageId
        }
      })

      const result = await approveReport({
        reportId: packageReport.id,
        approverId: ownerId
      })

      expect(result.approval.reportId).toBe(packageReport.id)
      expect(result.approval.status).toBe('APPROVED')

      // Limpar
      await prisma.testReportApproval.delete({
        where: { reportId: packageReport.id }
      })
      await prisma.testReport.delete({ where: { id: packageReport.id } })
    })
  })

  describe('approveReport - casos de erro', () => {
    it('rejeita quando relatório não existe', async () => {
      await expect(approveReport({
        reportId: 99999,
        approverId: ownerId
      })).rejects.toThrow(new AppError('Relatório não encontrado', 404))
    })

    it('rejeita quando relatório já foi aprovado', async () => {
      // Aprovar relatório primeira vez
      await approveReport({
        reportId,
        approverId: ownerId
      })

      // Tentar aprovar novamente
      await expect(approveReport({
        reportId,
        approverId: ownerId
      })).rejects.toThrow(new AppError('Relatório já foi aprovado ou reprovado', 400))
    })

    it('rejeita quando relatório já foi reprovado', async () => {
      // Reprovar relatório
      await prisma.testReportApproval.create({
        data: {
          reportId,
          status: 'REJECTED',
          approvedBy: ownerId,
          fileHash: 'hash'
        }
      })

      // Tentar aprovar
      await expect(approveReport({
        reportId,
        approverId: ownerId
      })).rejects.toThrow(new AppError('Relatório já foi aprovado ou reprovado', 400))
    })

    it('rejeita quando usuário não é owner nem aprovador', async () => {
      // Criar usuário sem permissão
      const unauthorizedUser = await prisma.user.create({
        data: {
          name: 'Unauthorized User',
          email: `unauthorized_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      await expect(approveReport({
        reportId,
        approverId: unauthorizedUser.id
      })).rejects.toThrow(new AppError('Apenas o dono do projeto ou o aprovador do cenário podem aprovar este relatório', 403))

      // Limpar
      await prisma.user.delete({ where: { id: unauthorizedUser.id } })
    })

    it('rejeita quando relatório não tem projeto associado', async () => {
      // Criar relatório sem cenário e sem pacote
      const orphanReport = await prisma.testReport.create({
        data: {
          fileName: 'orphan-report.pdf',
          fileSize: 1024 * 1024,
          mimeType: 'application/pdf',
          checksum: 'orphan-checksum-' + Date.now(),
          content: Buffer.from('fake pdf content')
        }
      })

      await expect(approveReport({
        reportId: orphanReport.id,
        approverId: ownerId
      })).rejects.toThrow(new AppError('Projeto não encontrado para este relatório', 404))

      // Limpar
      await prisma.testReport.delete({ where: { id: orphanReport.id } })
    })

    it('rejeita quando reportId é inválido', async () => {
      await expect(approveReport({
        reportId: -1,
        approverId: ownerId
      })).rejects.toThrow()
    })

    it('rejeita quando reportId é zero', async () => {
      await expect(approveReport({
        reportId: 0,
        approverId: ownerId
      })).rejects.toThrow()
    })

    it('rejeita quando approverId é inválido', async () => {
      await expect(approveReport({
        reportId,
        approverId: -1
      })).rejects.toThrow()
    })
  })

  describe('approveReport - casos especiais', () => {
    it('funciona com comentário vazio (retorna null)', async () => {
      const result = await approveReport({
        reportId,
        approverId: ownerId,
        comment: ''
      })

      expect(result.approval.status).toBe('APPROVED')
      // Quando comment é string vazia, o código usa || null, então retorna null
      expect(result.approval.comment).toBeNull()
    })

    it('funciona com comentário longo', async () => {
      const longComment = 'A'.repeat(1000)

      const result = await approveReport({
        reportId,
        approverId: ownerId,
        comment: longComment
      })

      expect(result.approval.comment).toBe(longComment)
    })

    it('funciona com relatório de tamanho grande', async () => {
      // Criar relatório grande
      const largeReport = await prisma.testReport.create({
        data: {
          fileName: 'large-report.pdf',
          fileSize: 10 * 1024 * 1024, // 10MB
          mimeType: 'application/pdf',
          checksum: 'large-checksum-' + Date.now(),
          content: Buffer.alloc(10 * 1024 * 1024),
          scenarioId: scenarioId
        }
      })

      const result = await approveReport({
        reportId: largeReport.id,
        approverId: ownerId
      })

      expect(result.approval.status).toBe('APPROVED')
      expect(result.approval.fileHash).toBeDefined()

      // Limpar
      await prisma.testReportApproval.delete({
        where: { reportId: largeReport.id }
      })
      await prisma.testReport.delete({ where: { id: largeReport.id } })
    })

    it('calcula hash diferente para conteúdos diferentes', async () => {
      // Criar dois relatórios com conteúdos diferentes
      const report1 = await prisma.testReport.create({
        data: {
          fileName: 'report1.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          checksum: 'checksum1-' + Date.now(),
          content: Buffer.from('content1'),
          scenarioId: scenarioId
        }
      })

      const report2 = await prisma.testReport.create({
        data: {
          fileName: 'report2.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          checksum: 'checksum2-' + Date.now() + 1,
          content: Buffer.from('content2'),
          scenarioId: scenarioId
        }
      })

      const result1 = await approveReport({
        reportId: report1.id,
        approverId: ownerId
      })

      const result2 = await approveReport({
        reportId: report2.id,
        approverId: ownerId
      })

      expect(result1.approval.fileHash).not.toBe(result2.approval.fileHash)

      // Limpar
      await prisma.testReportApproval.deleteMany({
        where: { reportId: { in: [report1.id, report2.id] } }
      })
      await prisma.testReport.deleteMany({
        where: { id: { in: [report1.id, report2.id] } }
      })
    })

    it('não atualiza status de cenário quando relatório é de pacote', async () => {
      // Criar relatório de pacote
      const packageReport = await prisma.testReport.create({
        data: {
          fileName: 'package-report.pdf',
          fileSize: 1024 * 1024,
          mimeType: 'application/pdf',
          checksum: 'package-checksum-' + Date.now(),
          content: Buffer.from('fake pdf content'),
          packageId: packageId
        }
      })

      await approveReport({
        reportId: packageReport.id,
        approverId: ownerId
      })

      // Verificar que cenário não foi atualizado
      const scenario = await prisma.testScenario.findUnique({
        where: { id: scenarioId }
      })
      expect(scenario?.status).toBe(ScenarioStatus.CREATED)

      // Limpar
      await prisma.testReportApproval.delete({
        where: { reportId: packageReport.id }
      })
      await prisma.testReport.delete({ where: { id: packageReport.id } })
    })
  })

  describe('approveReport - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const result = await approveReport({
        reportId,
        approverId: ownerId
      })

      expect(result).toHaveProperty('approval')
      expect(result.approval).toHaveProperty('id')
      expect(result.approval).toHaveProperty('reportId')
      expect(result.approval).toHaveProperty('status')
      expect(result.approval).toHaveProperty('approvedBy')
      expect(result.approval).toHaveProperty('approvedAt')
      expect(result.approval).toHaveProperty('fileHash')
      expect(result.approval).toHaveProperty('approver')
      expect(result.approval).toHaveProperty('report')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await approveReport({
        reportId,
        approverId: ownerId
      })

      expect(typeof result.approval.id).toBe('number')
      expect(typeof result.approval.reportId).toBe('number')
      expect(typeof result.approval.status).toBe('string')
      expect(typeof result.approval.approvedBy).toBe('number')
      expect(result.approval.approvedAt).toBeInstanceOf(Date)
      expect(typeof result.approval.fileHash).toBe('string')
      expect(typeof result.approval.approver).toBe('object')
      expect(typeof result.approval.report).toBe('object')
    })
  })

  describe('approveReport - integração com banco de dados', () => {
    it('cria aprovação no banco de dados', async () => {
      // Verificar que não existe aprovação antes
      const approvalBefore = await prisma.testReportApproval.findUnique({
        where: { reportId }
      })
      expect(approvalBefore).toBeNull()

      await approveReport({
        reportId,
        approverId: ownerId
      })

      // Verificar que aprovação foi criada
      const approvalAfter = await prisma.testReportApproval.findUnique({
        where: { reportId }
      })
      expect(approvalAfter).toBeTruthy()
      expect(approvalAfter?.status).toBe('APPROVED')
      expect(approvalAfter?.approvedBy).toBe(ownerId)
    })

    it('salva hash do arquivo corretamente', async () => {
      const result = await approveReport({
        reportId,
        approverId: ownerId
      })

      const approval = await prisma.testReportApproval.findUnique({
        where: { reportId }
      })

      expect(approval?.fileHash).toBe(result.approval.fileHash)
      expect(approval?.fileHash).toBeDefined()
    })

    it('salva comentário quando fornecido', async () => {
      const comment = 'Comentário de aprovação'

      await approveReport({
        reportId,
        approverId: ownerId,
        comment
      })

      const approval = await prisma.testReportApproval.findUnique({
        where: { reportId }
      })

      expect(approval?.comment).toBe(comment)
    })
  })
})

