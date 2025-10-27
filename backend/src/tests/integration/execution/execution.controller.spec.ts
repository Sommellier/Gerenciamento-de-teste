import 'dotenv/config'
import { ExecutionController } from '../../../controllers/execution/execution.controller'
import { AppError } from '../../../utils/AppError'
import { prisma } from '../../../infrastructure/prisma'

// Mock dos use cases
jest.mock('../../../application/use-cases/execution/addStepComment.use-case')
jest.mock('../../../application/use-cases/execution/getStepComments.use-case')
jest.mock('../../../application/use-cases/execution/uploadStepAttachment.use-case')
jest.mock('../../../application/use-cases/execution/getStepAttachments.use-case')
jest.mock('../../../application/use-cases/execution/updateStepStatus.use-case')
jest.mock('../../../application/use-cases/execution/createBug.use-case')
jest.mock('../../../application/use-cases/execution/getBugs.use-case')
jest.mock('../../../application/use-cases/execution/getPackageBugs.use-case')
jest.mock('../../../application/use-cases/execution/updateBug.use-case')
jest.mock('../../../application/use-cases/execution/deleteBug.use-case')
jest.mock('../../../application/use-cases/execution/registerExecutionHistory.use-case')
jest.mock('../../../application/use-cases/execution/getExecutionHistory.use-case')

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

describe('ExecutionController', () => {
  let controller: ExecutionController

  beforeEach(async () => {
    jest.clearAllMocks()
    controller = new ExecutionController()
    
    // Limpar banco de dados
    await prisma.$transaction([
      prisma.scenarioExecutionHistory.deleteMany(),
      prisma.bug.deleteMany(),
      prisma.stepAttachment.deleteMany(),
      prisma.stepComment.deleteMany(),
      prisma.testScenarioStep.deleteMany(),
      prisma.testScenario.deleteMany(),
      prisma.testPackage.deleteMany(),
      prisma.project.deleteMany(),
      prisma.user.deleteMany()
    ])
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('addComment', () => {
    it('deve adicionar comentário com sucesso', async () => {
      const { addStepComment } = require('../../../application/use-cases/execution/addStepComment.use-case')
      const mockComment = { id: 1, text: 'Test comment', stepId: 1, userId: 1 }
      addStepComment.mockResolvedValue(mockComment)

      const req = {
        params: { stepId: '1' },
        user: { id: 1 },
        body: { text: 'Test comment', mentions: [] }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.addComment(req, res, next)

      expect(addStepComment).toHaveBeenCalledWith({
        stepId: 1,
        text: 'Test comment',
        mentions: [],
        userId: 1
      })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comentário adicionado com sucesso',
        comment: mockComment
      })
    })

    it('deve retornar erro quando texto está vazio', async () => {
      const req = {
        params: { stepId: '1' },
        user: { id: 1 },
        body: { text: '', mentions: [] }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.addComment(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(AppError))
    })

    it('deve usar fallback quando usuário não está autenticado', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: unique('test') + '@example.com',
          password: 'secret'
        }
      })

      const { addStepComment } = require('../../../application/use-cases/execution/addStepComment.use-case')
      const mockComment = { id: 1, text: 'Test comment', stepId: 1, userId: user.id }
      addStepComment.mockResolvedValue(mockComment)

      const req = {
        params: { stepId: '1' },
        user: undefined,
        body: { text: 'Test comment', mentions: [] }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.addComment(req, res, next)

      expect(addStepComment).toHaveBeenCalledWith({
        stepId: 1,
        text: 'Test comment',
        mentions: [],
        userId: user.id
      })
    })
  })

  describe('getComments', () => {
    it('deve recuperar comentários com sucesso', async () => {
      const { getStepComments } = require('../../../application/use-cases/execution/getStepComments.use-case')
      const mockComments = [{ id: 1, text: 'Comment 1' }, { id: 2, text: 'Comment 2' }]
      getStepComments.mockResolvedValue(mockComments)

      const req = {
        params: { stepId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.getComments(req, res, next)

      expect(getStepComments).toHaveBeenCalledWith({ stepId: 1, userId: 1 })
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comentários recuperados com sucesso',
        comments: mockComments
      })
    })

    it('deve tratar erro do use case', async () => {
      const { getStepComments } = require('../../../application/use-cases/execution/getStepComments.use-case')
      const mockError = new AppError('Erro ao buscar comentários', 500)
      getStepComments.mockRejectedValue(mockError)

      const req = {
        params: { stepId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.getComments(req, res, next)

      expect(next).toHaveBeenCalledWith(mockError)
    })
  })

  describe('uploadAttachment', () => {
    it('deve fazer upload de anexo com sucesso', async () => {
      const { uploadStepAttachment } = require('../../../application/use-cases/execution/uploadStepAttachment.use-case')
      const mockAttachment = { id: 1, fileName: 'test.jpg', stepId: 1 }
      uploadStepAttachment.mockResolvedValue(mockAttachment)

      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test')
      }

      const req = {
        params: { stepId: '1' },
        user: { id: 1 },
        file: mockFile
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.uploadAttachment(req, res, next)

      expect(uploadStepAttachment).toHaveBeenCalledWith({
        stepId: 1,
        file: mockFile,
        userId: 1
      })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Evidência anexada com sucesso',
        attachment: mockAttachment
      })
    })

    it('deve retornar erro quando arquivo não é fornecido', async () => {
      const req = {
        params: { stepId: '1' },
        user: { id: 1 },
        file: undefined
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.uploadAttachment(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(AppError))
    })
  })

  describe('getAttachments', () => {
    it('deve recuperar anexos com sucesso', async () => {
      const { getStepAttachments } = require('../../../application/use-cases/execution/getStepAttachments.use-case')
      const mockAttachments = [{ id: 1, fileName: 'test1.jpg' }, { id: 2, fileName: 'test2.jpg' }]
      getStepAttachments.mockResolvedValue(mockAttachments)

      const req = {
        params: { stepId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.getAttachments(req, res, next)

      expect(getStepAttachments).toHaveBeenCalledWith({ stepId: 1, userId: 1 })
      expect(res.json).toHaveBeenCalledWith({
        message: 'Anexos recuperados com sucesso',
        attachments: mockAttachments
      })
    })
  })

  describe('updateStepStatusHandler', () => {
    it('deve atualizar status da etapa com sucesso', async () => {
      const { updateStepStatus } = require('../../../application/use-cases/execution/updateStepStatus.use-case')
      const mockStep = { id: 1, status: 'PASSED', actualResult: 'Success' }
      updateStepStatus.mockResolvedValue(mockStep)

      const req = {
        params: { stepId: '1' },
        user: { id: 1 },
        body: { status: 'PASSED', actualResult: 'Success' }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.updateStepStatusHandler(req, res, next)

      expect(updateStepStatus).toHaveBeenCalledWith({
        stepId: 1,
        status: 'PASSED',
        actualResult: 'Success',
        userId: 1
      })
      expect(res.json).toHaveBeenCalledWith({
        message: 'Status da etapa atualizado com sucesso',
        step: mockStep
      })
    })

    it('deve retornar erro quando status não é fornecido', async () => {
      const req = {
        params: { stepId: '1' },
        user: { id: 1 },
        body: { actualResult: 'Success' }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.updateStepStatusHandler(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(AppError))
    })
  })

  describe('createBug', () => {
    it('deve criar bug com sucesso', async () => {
      const { createBug } = require('../../../application/use-cases/execution/createBug.use-case')
      const mockBug = { id: 1, title: 'Test Bug', severity: 'HIGH' }
      createBug.mockResolvedValue(mockBug)

      const req = {
        params: { scenarioId: '1' },
        user: { id: 1 },
        body: { title: 'Test Bug', description: 'Bug description', severity: 'HIGH' }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.createBug(req, res, next)

      expect(createBug).toHaveBeenCalledWith({
        scenarioId: 1,
        title: 'Test Bug',
        description: 'Bug description',
        severity: 'HIGH',
        relatedStepId: undefined,
        userId: 1
      })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bug criado com sucesso',
        bug: mockBug
      })
    })

    it('deve retornar erro quando título está vazio', async () => {
      const req = {
        params: { scenarioId: '1' },
        user: { id: 1 },
        body: { title: '', description: 'Bug description', severity: 'HIGH' }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.createBug(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(AppError))
    })

    it('deve retornar erro quando gravidade é inválida', async () => {
      const req = {
        params: { scenarioId: '1' },
        user: { id: 1 },
        body: { title: 'Test Bug', description: 'Bug description', severity: 'INVALID' }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.createBug(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(AppError))
    })
  })

  describe('registerHistory', () => {
    it('deve registrar histórico com sucesso', async () => {
      const { registerExecutionHistory } = require('../../../application/use-cases/execution/registerExecutionHistory.use-case')
      const mockHistory = { id: 1, action: 'TEST_STARTED', description: 'Test started' }
      registerExecutionHistory.mockResolvedValue(mockHistory)

      const req = {
        params: { scenarioId: '1' },
        user: { id: 1 },
        body: { action: 'TEST_STARTED', description: 'Test started', metadata: {} }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.registerHistory(req, res, next)

      expect(registerExecutionHistory).toHaveBeenCalledWith({
        scenarioId: 1,
        action: 'TEST_STARTED',
        description: 'Test started',
        metadata: {},
        userId: 1
      })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Histórico registrado com sucesso',
        history: mockHistory
      })
    })

    it('deve retornar erro quando ação está vazia', async () => {
      const req = {
        params: { scenarioId: '1' },
        user: { id: 1 },
        body: { action: '', description: 'Test started', metadata: {} }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.registerHistory(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(AppError))
    })
  })

  describe('getHistory', () => {
    it('deve recuperar histórico com sucesso', async () => {
      const { getExecutionHistory } = require('../../../application/use-cases/execution/getExecutionHistory.use-case')
      const mockHistory = [{ id: 1, action: 'TEST_STARTED' }, { id: 2, action: 'TEST_COMPLETED' }]
      getExecutionHistory.mockResolvedValue(mockHistory)

      const req = {
        params: { scenarioId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.getHistory(req, res, next)

      expect(getExecutionHistory).toHaveBeenCalledWith({ scenarioId: 1, userId: 1 })
      expect(res.json).toHaveBeenCalledWith({
        message: 'Histórico recuperado com sucesso',
        history: mockHistory
      })
    })
  })

  describe('getScenarioBugs', () => {
    it('deve recuperar bugs do cenário com sucesso', async () => {
      const { getBugs } = require('../../../application/use-cases/execution/getBugs.use-case')
      const mockBugs = [{ id: 1, title: 'Bug 1' }, { id: 2, title: 'Bug 2' }]
      getBugs.mockResolvedValue(mockBugs)

      const req = {
        params: { scenarioId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.getScenarioBugs(req, res, next)

      expect(getBugs).toHaveBeenCalledWith({ scenarioId: 1, userId: 1 })
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bugs recuperados com sucesso',
        bugs: mockBugs
      })
    })
  })

  describe('getPackageBugsHandler', () => {
    it('deve recuperar bugs do pacote com sucesso', async () => {
      const { getPackageBugs } = require('../../../application/use-cases/execution/getPackageBugs.use-case')
      const mockBugs = [{ id: 1, title: 'Package Bug 1' }]
      getPackageBugs.mockResolvedValue(mockBugs)

      const req = {
        params: { packageId: '1', projectId: '2' },
        user: { id: 1 }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.getPackageBugsHandler(req, res, next)

      expect(getPackageBugs).toHaveBeenCalledWith({ packageId: 1, projectId: 2, userId: 1 })
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bugs do pacote recuperados com sucesso',
        bugs: mockBugs
      })
    })
  })

  describe('updateBugHandler', () => {
    it('deve atualizar bug com sucesso', async () => {
      const { updateBug } = require('../../../application/use-cases/execution/updateBug.use-case')
      const mockBug = { id: 1, title: 'Updated Bug', severity: 'MEDIUM' }
      updateBug.mockResolvedValue(mockBug)

      const req = {
        params: { bugId: '1' },
        user: { id: 1 },
        body: { title: 'Updated Bug', description: 'Updated description', severity: 'MEDIUM', status: 'OPEN' }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.updateBugHandler(req, res, next)

      expect(updateBug).toHaveBeenCalledWith({
        bugId: 1,
        title: 'Updated Bug',
        description: 'Updated description',
        severity: 'MEDIUM',
        status: 'OPEN',
        userId: 1
      })
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bug atualizado com sucesso',
        bug: mockBug
      })
    })
  })

  describe('deleteBugHandler', () => {
    it('deve deletar bug com sucesso', async () => {
      const { deleteBug } = require('../../../application/use-cases/execution/deleteBug.use-case')
      const mockResult = { message: 'Bug deletado com sucesso' }
      deleteBug.mockResolvedValue(mockResult)

      const req = {
        params: { bugId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.deleteBugHandler(req, res, next)

      expect(deleteBug).toHaveBeenCalledWith({ bugId: 1, userId: 1 })
      expect(res.json).toHaveBeenCalledWith(mockResult)
    })

    it('deve tratar erro do use case', async () => {
      const { deleteBug } = require('../../../application/use-cases/execution/deleteBug.use-case')
      const mockError = new AppError('Bug não encontrado', 404)
      deleteBug.mockRejectedValue(mockError)

      const req = {
        params: { bugId: '999' },
        user: { id: 1 }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.deleteBugHandler(req, res, next)

      expect(next).toHaveBeenCalledWith(mockError)
    })
  })

  describe('Casos de erro para cobertura', () => {
    it('deve tratar erro quando não há usuários no sistema', async () => {
      // Limpar todos os usuários para simular o cenário
      await prisma.user.deleteMany()

      const req = {
        params: { stepId: '1' },
        user: undefined,
        body: { text: 'Test comment', mentions: [] }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.addComment(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(AppError))
      expect(next.mock.calls[0][0].message).toBe('Nenhum usuário encontrado no sistema')
    })

    it('deve tratar erro no uploadAttachment', async () => {
      const { uploadStepAttachment } = require('../../../application/use-cases/execution/uploadStepAttachment.use-case')
      const mockError = new AppError('Erro no upload', 500)
      uploadStepAttachment.mockRejectedValue(mockError)

      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test')
      }

      const req = {
        params: { stepId: '1' },
        user: { id: 1 },
        file: mockFile
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.uploadAttachment(req, res, next)

      expect(next).toHaveBeenCalledWith(mockError)
    })

    it('deve tratar erro no getAttachments', async () => {
      const { getStepAttachments } = require('../../../application/use-cases/execution/getStepAttachments.use-case')
      const mockError = new AppError('Erro ao buscar anexos', 500)
      getStepAttachments.mockRejectedValue(mockError)

      const req = {
        params: { stepId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.getAttachments(req, res, next)

      expect(next).toHaveBeenCalledWith(mockError)
    })

    it('deve tratar erro no getHistory', async () => {
      const { getExecutionHistory } = require('../../../application/use-cases/execution/getExecutionHistory.use-case')
      const mockError = new AppError('Erro ao buscar histórico', 500)
      getExecutionHistory.mockRejectedValue(mockError)

      const req = {
        params: { scenarioId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.getHistory(req, res, next)

      expect(next).toHaveBeenCalledWith(mockError)
    })

    it('deve tratar erro no getScenarioBugs', async () => {
      const { getBugs } = require('../../../application/use-cases/execution/getBugs.use-case')
      const mockError = new AppError('Erro ao buscar bugs', 500)
      getBugs.mockRejectedValue(mockError)

      const req = {
        params: { scenarioId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.getScenarioBugs(req, res, next)

      expect(next).toHaveBeenCalledWith(mockError)
    })

    it('deve tratar erro no getPackageBugsHandler', async () => {
      const { getPackageBugs } = require('../../../application/use-cases/execution/getPackageBugs.use-case')
      const mockError = new AppError('Erro ao buscar bugs do pacote', 500)
      getPackageBugs.mockRejectedValue(mockError)

      const req = {
        params: { packageId: '1', projectId: '2' },
        user: { id: 1 }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.getPackageBugsHandler(req, res, next)

      expect(next).toHaveBeenCalledWith(mockError)
    })

    it('deve tratar erro no updateBugHandler', async () => {
      const { updateBug } = require('../../../application/use-cases/execution/updateBug.use-case')
      const mockError = new AppError('Erro ao atualizar bug', 500)
      updateBug.mockRejectedValue(mockError)

      const req = {
        params: { bugId: '1' },
        user: { id: 1 },
        body: { title: 'Updated Bug', description: 'Updated description', severity: 'MEDIUM', status: 'OPEN' }
      } as any

      const res = {
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.updateBugHandler(req, res, next)

      expect(next).toHaveBeenCalledWith(mockError)
    })
  })
})
