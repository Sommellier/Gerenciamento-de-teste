import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

describe('getPackageMetrics.controller', () => {
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.testScenarioStep.deleteMany(),
      prisma.testScenario.deleteMany(),
      prisma.testPackage.deleteMany(),
      prisma.userOnProject.deleteMany(),
      prisma.project.deleteMany(),
      prisma.user.deleteMany()
    ])
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('getPackageMetricsController function', () => {
    it('deve retornar métricas do pacote com sucesso', async () => {
      const { getPackageMetricsController } = require('../../../controllers/scenarios/getPackageMetrics.controller')
      
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: unique('test') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: user.id
        }
      })

      // Criar pacote
      const testPackage = await prisma.testPackage.create({
        data: {
          title: 'Test Package',
          description: 'Test Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId: project.id,
          release: '1.0.0'
        }
      })

      const req = {
        params: { 
          packageId: testPackage.id.toString(), 
          projectId: project.id.toString() 
        },
        user: { id: user.id }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageMetricsController(req, res, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Métricas do pacote recuperadas com sucesso',
          metrics: expect.any(Object)
        })
      )
    })

    it('deve rejeitar quando usuário não está autenticado', async () => {
      const { getPackageMetricsController } = require('../../../controllers/scenarios/getPackageMetrics.controller')
      
      const req = {
        params: { packageId: '1', projectId: '1' },
        user: undefined
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageMetricsController(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Não autenticado',
          statusCode: 401
        })
      )
    })

    it('deve rejeitar quando packageId é inválido', async () => {
      const { getPackageMetricsController } = require('../../../controllers/scenarios/getPackageMetrics.controller')
      
      const req = {
        params: { packageId: 'invalid', projectId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageMetricsController(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'IDs inválidos',
          statusCode: 400
        })
      )
    })

    it('deve rejeitar quando projectId é inválido', async () => {
      const { getPackageMetricsController } = require('../../../controllers/scenarios/getPackageMetrics.controller')
      
      const req = {
        params: { packageId: '1', projectId: 'invalid' },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageMetricsController(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'IDs inválidos',
          statusCode: 400
        })
      )
    })

    it('deve rejeitar quando ambos IDs são inválidos', async () => {
      const { getPackageMetricsController } = require('../../../controllers/scenarios/getPackageMetrics.controller')
      
      const req = {
        params: { packageId: 'invalid', projectId: 'invalid' },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageMetricsController(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'IDs inválidos',
          statusCode: 400
        })
      )
    })

    it('deve tratar erros do use case corretamente', async () => {
      const { getPackageMetricsController } = require('../../../controllers/scenarios/getPackageMetrics.controller')
      
      const req = {
        params: { packageId: '999', projectId: '999' },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageMetricsController(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})
















