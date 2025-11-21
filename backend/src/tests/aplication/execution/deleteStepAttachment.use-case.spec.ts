import { prisma } from '../../../infrastructure/prisma'
import { deleteStepAttachment } from '../../../application/use-cases/execution/deleteStepAttachment.use-case'
import { AppError } from '../../../utils/AppError'
import { Role, ScenarioType, Priority, ScenarioStatus } from '@prisma/client'
import fs from 'fs'
import path from 'path'

describe('deleteStepAttachment', () => {
  let projectId: number
  let scenarioId: number
  let stepId: number
  let attachmentId: number
  let userId: number
  let ownerId: number
  let managerId: number
  let testerId: number

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

    // Criar usuário manager
    const manager = await prisma.user.create({
      data: {
        name: 'Manager User',
        email: `manager_${Date.now()}@example.com`,
        password: 'password123'
      }
    })
    managerId = manager.id

    // Criar usuário tester
    const tester = await prisma.user.create({
      data: {
        name: 'Tester User',
        email: `tester_${Date.now()}@example.com`,
        password: 'password123'
      }
    })
    testerId = tester.id

    // Criar usuário normal
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `user_${Date.now()}@example.com`,
        password: 'password123'
      }
    })
    userId = user.id

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: ownerId
      }
    })
    projectId = project.id

    // Adicionar manager ao projeto
    await prisma.userOnProject.create({
      data: {
        userId: managerId,
        projectId: projectId,
        role: Role.MANAGER
      }
    })

    // Criar cenário
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Test Scenario',
        description: 'Test Description',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        status: ScenarioStatus.CREATED,
        projectId
      }
    })
    scenarioId = scenario.id

    // Criar etapa
    const step = await prisma.testScenarioStep.create({
      data: {
        action: 'Click login button',
        expected: 'User is logged in',
        stepOrder: 1,
        scenarioId
      }
    })
    stepId = step.id

    // Criar anexo
    const attachment = await prisma.stepAttachment.create({
      data: {
        filename: 'test-attachment.jpg',
        originalName: 'original-attachment.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
        url: '/uploads/evidences/test-attachment.jpg',
        stepId,
        uploadedBy: userId
      }
    })
    attachmentId = attachment.id

    // Criar diretório de uploads se não existir
    const uploadsDir = path.join(process.cwd(), 'uploads', 'evidences')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.stepAttachment.deleteMany({
      where: { stepId }
    })
    await prisma.testScenarioStep.deleteMany({
      where: { scenarioId }
    })
    await prisma.testScenario.deleteMany({
      where: { projectId }
    })
    await prisma.userOnProject.deleteMany({
      where: { projectId }
    })
    await prisma.project.deleteMany({
      where: { id: projectId }
    })
    await prisma.user.deleteMany({
      where: { id: { in: [userId, ownerId, managerId, testerId] } }
    })
  })

  describe('deleteStepAttachment - casos de sucesso', () => {
    it('deleta anexo quando usuário é o uploader', async () => {
      const result = await deleteStepAttachment({
        attachmentId,
        userId
      })

      expect(result).toMatchObject({
        success: true
      })

      // Verificar se o anexo foi deletado
      const deletedAttachment = await prisma.stepAttachment.findUnique({
        where: { id: attachmentId }
      })
      expect(deletedAttachment).toBeNull()
    })

    it('deleta anexo quando usuário é o owner do projeto', async () => {
      // Criar outro anexo feito por outro usuário
      const otherAttachment = await prisma.stepAttachment.create({
        data: {
          filename: 'other-attachment.jpg',
          originalName: 'original-other.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 1024,
          url: '/uploads/evidences/other-attachment.jpg',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await deleteStepAttachment({
        attachmentId: otherAttachment.id,
        userId: ownerId
      })

      expect(result).toMatchObject({
        success: true
      })

      // Verificar se o anexo foi deletado
      const deletedAttachment = await prisma.stepAttachment.findUnique({
        where: { id: otherAttachment.id }
      })
      expect(deletedAttachment).toBeNull()
    })

    it('deleta anexo quando usuário é manager do projeto', async () => {
      // Criar outro anexo feito por outro usuário
      const otherAttachment = await prisma.stepAttachment.create({
        data: {
          filename: 'other-attachment.jpg',
          originalName: 'original-other.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 1024,
          url: '/uploads/evidences/other-attachment.jpg',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await deleteStepAttachment({
        attachmentId: otherAttachment.id,
        userId: managerId
      })

      expect(result).toMatchObject({
        success: true
      })

      // Verificar se o anexo foi deletado
      const deletedAttachment = await prisma.stepAttachment.findUnique({
        where: { id: otherAttachment.id }
      })
      expect(deletedAttachment).toBeNull()
    })

    it('deleta arquivo físico se existir', async () => {
      // Criar arquivo físico
      const filePath = path.join(process.cwd(), 'uploads', 'evidences', 'test-attachment.jpg')
      fs.writeFileSync(filePath, 'fake file content')

      expect(fs.existsSync(filePath)).toBe(true)

      const result = await deleteStepAttachment({
        attachmentId,
        userId
      })

      expect(result).toMatchObject({
        success: true
      })

      // Verificar se o arquivo foi deletado
      expect(fs.existsSync(filePath)).toBe(false)
    })

    it('continua mesmo se arquivo físico não existir', async () => {
      const result = await deleteStepAttachment({
        attachmentId,
        userId
      })

      expect(result).toMatchObject({
        success: true
      })

      // Verificar se o anexo foi deletado do banco
      const deletedAttachment = await prisma.stepAttachment.findUnique({
        where: { id: attachmentId }
      })
      expect(deletedAttachment).toBeNull()
    })

    it('deleta múltiplos anexos', async () => {
      // Criar múltiplos anexos
      const attachments = []
      for (let i = 0; i < 3; i++) {
        const attachment = await prisma.stepAttachment.create({
          data: {
            filename: `attachment-${i}.jpg`,
            originalName: `original-${i}.jpg`,
            mimeType: 'image/jpeg',
            size: 1024 * 1024,
            url: `/uploads/evidences/attachment-${i}.jpg`,
            stepId,
            uploadedBy: userId
          }
        })
        attachments.push(attachment)
      }

      // Deletar todos os anexos
      for (const attachment of attachments) {
        const result = await deleteStepAttachment({
          attachmentId: attachment.id,
          userId
        })
        expect(result).toMatchObject({ success: true })
      }

      // Verificar se todos foram deletados
      const remainingAttachments = await prisma.stepAttachment.findMany({
        where: {
          id: { in: attachments.map(a => a.id) }
        }
      })
      expect(remainingAttachments).toHaveLength(0)
    })
  })

  describe('deleteStepAttachment - casos de erro', () => {
    it('rejeita quando anexo não existe', async () => {
      await expect(deleteStepAttachment({
        attachmentId: 99999,
        userId
      })).rejects.toThrow(new AppError('Anexo não encontrado', 404))
    })

    it('rejeita quando attachmentId é inválido', async () => {
      await expect(deleteStepAttachment({
        attachmentId: -1,
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando attachmentId é zero', async () => {
      await expect(deleteStepAttachment({
        attachmentId: 0,
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando usuário não tem permissão', async () => {
      // Criar outro usuário sem permissão
      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: `other_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      // Criar outro anexo feito por outro usuário
      const otherAttachment = await prisma.stepAttachment.create({
        data: {
          filename: 'other-attachment.jpg',
          originalName: 'original-other.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 1024,
          url: '/uploads/evidences/other-attachment.jpg',
          stepId,
          uploadedBy: userId
        }
      })

      await expect(deleteStepAttachment({
        attachmentId: otherAttachment.id,
        userId: otherUser.id
      })).rejects.toThrow(new AppError('Sem permissão para excluir este anexo', 403))

      // Limpar
      await prisma.stepAttachment.delete({ where: { id: otherAttachment.id } })
      await prisma.user.delete({ where: { id: otherUser.id } })
    })

    it('rejeita quando usuário é apenas tester', async () => {
      // Adicionar tester ao projeto
      await prisma.userOnProject.create({
        data: {
          userId: testerId,
          projectId: projectId,
          role: Role.TESTER
        }
      })

      // Criar outro anexo feito por outro usuário
      const otherAttachment = await prisma.stepAttachment.create({
        data: {
          filename: 'other-attachment.jpg',
          originalName: 'original-other.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 1024,
          url: '/uploads/evidences/other-attachment.jpg',
          stepId,
          uploadedBy: userId
        }
      })

      await expect(deleteStepAttachment({
        attachmentId: otherAttachment.id,
        userId: testerId
      })).rejects.toThrow(new AppError('Sem permissão para excluir este anexo', 403))

      // Limpar
      await prisma.stepAttachment.delete({ where: { id: otherAttachment.id } })
    })

    it('rejeita quando attachmentId é null', async () => {
      await expect(deleteStepAttachment({
        attachmentId: null as any,
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando attachmentId é undefined', async () => {
      await expect(deleteStepAttachment({
        attachmentId: undefined as any,
        userId
      })).rejects.toThrow()
    })
  })

  describe('deleteStepAttachment - casos especiais', () => {
    it('funciona mesmo se houver erro ao deletar arquivo físico (linha 65)', async () => {
      // Criar arquivo físico para garantir que existsSync retorne true
      const filePath = path.join(process.cwd(), 'uploads', 'evidences', 'test-attachment.jpg')
      const uploadsDir = path.join(process.cwd(), 'uploads', 'evidences')
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }
      fs.writeFileSync(filePath, Buffer.from('fake image data'))

      // Mock para simular erro no fs.unlinkSync que é capturado no catch (linha 65)
      const originalUnlinkSync = fs.unlinkSync
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mockar fs.unlinkSync para lançar erro quando chamado
      const unlinkSyncMock = jest.fn(() => {
        throw new Error('Erro ao deletar arquivo')
      })
      fs.unlinkSync = unlinkSyncMock as any

      const result = await deleteStepAttachment({
        attachmentId,
        userId
      })

      expect(result).toMatchObject({
        success: true
      })

      // Verificar que fs.unlinkSync foi chamado (o arquivo existe)
      expect(unlinkSyncMock).toHaveBeenCalled()

      // Verificar que console.error foi chamado (linha 65)
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao deletar arquivo físico:', expect.any(Error))

      // Verificar se o anexo foi deletado do banco mesmo com erro no arquivo
      const deletedAttachment = await prisma.stepAttachment.findUnique({
        where: { id: attachmentId }
      })
      expect(deletedAttachment).toBeNull()

      // Restaurar função original e spy
      fs.unlinkSync = originalUnlinkSync
      consoleSpy.mockRestore()

      // Limpar arquivo se ainda existir
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath)
        } catch (e) {
          // Ignorar erro se arquivo já foi deletado
        }
      }
    })

    it('funciona com anexo que tem caminho de arquivo diferente', async () => {
      const attachment = await prisma.stepAttachment.create({
        data: {
          filename: 'different-path.jpg',
          originalName: 'original-different.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 1024,
          url: '/uploads/evidences/different-path.jpg',
          stepId,
          uploadedBy: userId
        }
      })

      const result = await deleteStepAttachment({
        attachmentId: attachment.id,
        userId
      })

      expect(result).toMatchObject({
        success: true
      })
    })

    it('funciona com anexo de diferentes tipos de arquivo', async () => {
      const fileTypes = [
        { mimeType: 'image/jpeg', filename: 'test.jpg' },
        { mimeType: 'image/png', filename: 'test.png' },
        { mimeType: 'application/pdf', filename: 'test.pdf' }
      ]

      for (const fileType of fileTypes) {
        const attachment = await prisma.stepAttachment.create({
          data: {
            filename: fileType.filename,
            originalName: `original-${fileType.filename}`,
            mimeType: fileType.mimeType,
            size: 1024 * 1024,
            url: `/uploads/evidences/${fileType.filename}`,
            stepId,
            uploadedBy: userId
          }
        })

        const result = await deleteStepAttachment({
          attachmentId: attachment.id,
          userId
        })

        expect(result).toMatchObject({
          success: true
        })
      }
    })

    it('funciona quando usuário não está no projeto mas é o uploader', async () => {
      // Criar usuário fora do projeto
      const externalUser = await prisma.user.create({
        data: {
          name: 'External User',
          email: `external_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      // Criar anexo feito por esse usuário
      const attachment = await prisma.stepAttachment.create({
        data: {
          filename: 'external-attachment.jpg',
          originalName: 'original-external.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 1024,
          url: '/uploads/evidences/external-attachment.jpg',
          stepId,
          uploadedBy: externalUser.id
        }
      })

      const result = await deleteStepAttachment({
        attachmentId: attachment.id,
        userId: externalUser.id
      })

      expect(result).toMatchObject({
        success: true
      })

      // Limpar
      await prisma.user.delete({ where: { id: externalUser.id } })
    })
  })

  describe('deleteStepAttachment - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const result = await deleteStepAttachment({
        attachmentId,
        userId
      })

      expect(result).toHaveProperty('success')
      expect(Object.keys(result)).toHaveLength(1)
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await deleteStepAttachment({
        attachmentId,
        userId
      })

      expect(typeof result.success).toBe('boolean')
      expect(result.success).toBe(true)
    })
  })

  describe('deleteStepAttachment - integração com banco de dados', () => {
    it('remove anexo do banco de dados', async () => {
      // Verificar se anexo existe antes da deleção
      const attachmentBefore = await prisma.stepAttachment.findUnique({
        where: { id: attachmentId }
      })
      expect(attachmentBefore).toBeTruthy()

      // Deletar anexo
      await deleteStepAttachment({
        attachmentId,
        userId
      })

      // Verificar se anexo não existe mais
      const attachmentAfter = await prisma.stepAttachment.findUnique({
        where: { id: attachmentId }
      })
      expect(attachmentAfter).toBeNull()
    })

    it('não afeta outros anexos', async () => {
      // Criar outro anexo
      const otherAttachment = await prisma.stepAttachment.create({
        data: {
          filename: 'other-attachment.jpg',
          originalName: 'original-other.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 1024,
          url: '/uploads/evidences/other-attachment.jpg',
          stepId,
          uploadedBy: userId
        }
      })

      // Deletar anexo original
      await deleteStepAttachment({
        attachmentId,
        userId
      })

      // Verificar se outro anexo ainda existe
      const remainingAttachment = await prisma.stepAttachment.findUnique({
        where: { id: otherAttachment.id }
      })
      expect(remainingAttachment).toBeTruthy()
      expect(remainingAttachment?.filename).toBe('other-attachment.jpg')

      // Limpar
      await prisma.stepAttachment.delete({ where: { id: otherAttachment.id } })
    })

    it('não afeta etapa relacionada', async () => {
      // Deletar anexo
      await deleteStepAttachment({
        attachmentId,
        userId
      })

      // Verificar se etapa ainda existe
      const step = await prisma.testScenarioStep.findUnique({
        where: { id: stepId }
      })
      expect(step).toBeTruthy()
      expect(step?.action).toBe('Click login button')
    })

    it('não afeta cenário relacionado', async () => {
      // Deletar anexo
      await deleteStepAttachment({
        attachmentId,
        userId
      })

      // Verificar se cenário ainda existe
      const scenario = await prisma.testScenario.findUnique({
        where: { id: scenarioId }
      })
      expect(scenario).toBeTruthy()
      expect(scenario?.title).toBe('Test Scenario')
    })
  })
})

