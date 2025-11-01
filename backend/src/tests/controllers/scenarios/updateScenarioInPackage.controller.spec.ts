import { updateScenarioInPackageController } from '../../../controllers/scenarios/updateScenarioInPackage.controller'
import { AppError } from '../../../utils/AppError'

// Mock do use case
jest.mock('../../../application/use-cases/scenarios/updateScenarioInPackage.use-case', () => ({
  updateScenarioInPackage: jest.fn()
}))

describe('updateScenarioInPackageController', () => {
  let mockUpdateScenario: any
  let req: any
  let res: any
  let next: any

  beforeEach(() => {
    mockUpdateScenario = require('../../../application/use-cases/scenarios/updateScenarioInPackage.use-case').updateScenarioInPackage
    
    req = {
      params: {
        scenarioId: '1',
        packageId: '2',
        projectId: '3'
      },
      body: {
        title: 'Test Title',
        description: 'Test Description'
      },
      user: { id: 1 }
    }
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }
    
    next = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('validações de entrada', () => {
    it('deve rejeitar quando não há usuário autenticado', async () => {
      req.user = undefined
      
      await updateScenarioInPackageController(req as any, res as any, next)
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Não autenticado'
      }))
    })

    it('deve rejeitar IDs inválidos (NaN)', async () => {
      req.params.scenarioId = 'invalid'
      req.params.packageId = 'invalid'
      req.params.projectId = 'invalid'
      
      await updateScenarioInPackageController(req as any, res as any, next)
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'IDs inválidos'
      }))
    })

    it('deve rejeitar quando scenarioId é NaN', async () => {
      req.params.scenarioId = 'invalid'
      req.params.packageId = '2'
      req.params.projectId = '3'
      
      await updateScenarioInPackageController(req as any, res as any, next)
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'IDs inválidos'
      }))
    })

    it('deve rejeitar quando packageId é NaN', async () => {
      req.params.scenarioId = '1'
      req.params.packageId = 'invalid'
      req.params.projectId = '3'
      
      await updateScenarioInPackageController(req as any, res as any, next)
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'IDs inválidos'
      }))
    })

    it('deve rejeitar quando projectId é NaN', async () => {
      req.params.scenarioId = '1'
      req.params.packageId = '2'
      req.params.projectId = 'invalid'
      
      await updateScenarioInPackageController(req as any, res as any, next)
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'IDs inválidos'
      }))
    })
  })

  describe('tratamento de assigneeEmail', () => {
    it('deve extrair email de objeto assigneeEmail com propriedade value', async () => {
      req.body.assigneeEmail = { value: 'test@example.com' }
      
      mockUpdateScenario.mockResolvedValue({
        id: 1,
        title: 'Updated Title'
      })
      
      await updateScenarioInPackageController(req as any, res as any, next)
      
      expect(mockUpdateScenario).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeEmail: 'test@example.com'
        })
      )
    })

    it('deve extrair email de objeto assigneeEmail com propriedade email', async () => {
      req.body.assigneeEmail = { email: 'test@example.com' }
      
      mockUpdateScenario.mockResolvedValue({
        id: 1,
        title: 'Updated Title'
      })
      
      await updateScenarioInPackageController(req as any, res as any, next)
      
      expect(mockUpdateScenario).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeEmail: 'test@example.com'
        })
      )
    })

    it('deve tratar assigneeEmail como null quando objeto não tem value ou email', async () => {
      req.body.assigneeEmail = { something: 'else' }
      
      mockUpdateScenario.mockResolvedValue({
        id: 1,
        title: 'Updated Title'
      })
      
      await updateScenarioInPackageController(req as any, res as any, next)
      
      expect(mockUpdateScenario).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeEmail: null
        })
      )
    })

    it('deve passar assigneeEmail como string normalmente', async () => {
      req.body.assigneeEmail = 'test@example.com'
      
      mockUpdateScenario.mockResolvedValue({
        id: 1,
        title: 'Updated Title'
      })
      
      await updateScenarioInPackageController(req as any, res as any, next)
      
      expect(mockUpdateScenario).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeEmail: 'test@example.com'
        })
      )
    })
  })

  describe('sucesso', () => {
    it('deve atualizar cenário com sucesso', async () => {
      const mockScenario = {
        id: 1,
        title: 'Updated Title',
        description: 'Updated Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        status: 'CREATED'
      }
      
      mockUpdateScenario.mockResolvedValue(mockScenario)
      
      await updateScenarioInPackageController(req as any, res as any, next)
      
      expect(mockUpdateScenario).toHaveBeenCalledWith({
        scenarioId: 1,
        packageId: 2,
        projectId: 3,
        title: 'Test Title',
        description: 'Test Description',
        assigneeEmail: undefined
      })
      
      expect(res.json).toHaveBeenCalledWith({
        message: 'Cenário atualizado com sucesso',
        scenario: mockScenario
      })
    })

    it('deve converter IDs de string para número corretamente', async () => {
      req.params.scenarioId = '10'
      req.params.packageId = '20'
      req.params.projectId = '30'
      
      mockUpdateScenario.mockResolvedValue({ id: 10 })
      
      await updateScenarioInPackageController(req as any, res as any, next)
      
      expect(mockUpdateScenario).toHaveBeenCalledWith(
        expect.objectContaining({
          scenarioId: 10,
          packageId: 20,
          projectId: 30
        })
      )
    })
  })

  describe('tratamento de erros', () => {
    it('deve passar erros para next', async () => {
      const error = new Error('Test error')
      mockUpdateScenario.mockRejectedValue(error)
      
      await updateScenarioInPackageController(req as any, res as any, next)
      
      expect(next).toHaveBeenCalledWith(error)
    })

    it('deve passar AppError para next', async () => {
      const error = new AppError('Test error', 400)
      mockUpdateScenario.mockRejectedValue(error)
      
      await updateScenarioInPackageController(req as any, res as any, next)
      
      expect(next).toHaveBeenCalledWith(error)
    })
  })
})

