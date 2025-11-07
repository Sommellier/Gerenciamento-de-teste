import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

describe('getPackageDetails.controller', () => {
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

  describe('getPackageDetailsController function', () => {
    it('deve retornar detalhes do pacote com sucesso', async () => {
      const { getPackageDetailsController } = require('../../../controllers/packages/getPackageDetails.controller')
      
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
          projectId: project.id.toString(), 
          packageId: testPackage.id.toString() 
        },
        user: { id: user.id }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageDetailsController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: testPackage.id,
          title: 'Test Package',
          description: 'Test Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId: project.id,
          release: '1.0.0'
        })
      )
    })

    it('deve retornar erro 401 quando usuário não está autenticado', async () => {
      const { getPackageDetailsController } = require('../../../controllers/packages/getPackageDetails.controller')
      
      const req = {
        params: { projectId: '1', packageId: '1' },
        user: undefined
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageDetailsController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ message: 'Não autenticado' })
    })

    it('deve retornar erro 400 quando projectId está ausente', async () => {
      const { getPackageDetailsController } = require('../../../controllers/packages/getPackageDetails.controller')
      
      const req = {
        params: { packageId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageDetailsController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Parâmetros obrigatórios: projectId e packageId' 
      })
    })

    it('deve retornar erro 400 quando packageId está ausente', async () => {
      const { getPackageDetailsController } = require('../../../controllers/packages/getPackageDetails.controller')
      
      const req = {
        params: { projectId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageDetailsController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Parâmetros obrigatórios: projectId e packageId' 
      })
    })

    it('deve retornar erro 400 quando ambos projectId e packageId estão ausentes', async () => {
      const { getPackageDetailsController } = require('../../../controllers/packages/getPackageDetails.controller')
      
      const req = {
        params: {},
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageDetailsController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Parâmetros obrigatórios: projectId e packageId' 
      })
    })

    it('deve tratar erros do use case corretamente', async () => {
      const { getPackageDetailsController } = require('../../../controllers/packages/getPackageDetails.controller')
      
      const req = {
        params: { projectId: '999', packageId: '999' },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageDetailsController(req, res, next)

      // Quando o pacote não existe, o use-case retorna 404 (AppError esperado)
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Pacote não encontrado' 
      })
    })

    it('deve tratar erros não-AppError corretamente', async () => {
      const { getPackageDetailsController } = require('../../../controllers/packages/getPackageDetails.controller')
      
      // Mock do use case para retornar um erro que não seja AppError
      const originalGetPackageDetails = require('../../../application/use-cases/packages/getPackageDetails.use-case').getPackageDetails
      const mockGetPackageDetails = jest.fn().mockRejectedValueOnce(new Error('Database connection failed'))
      
      // Substituir temporariamente o use case
      require('../../../application/use-cases/packages/getPackageDetails.use-case').getPackageDetails = mockGetPackageDetails

      const req = {
        params: { projectId: '1', packageId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageDetailsController(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
      
      // Restaurar o use case original
      require('../../../application/use-cases/packages/getPackageDetails.use-case').getPackageDetails = originalGetPackageDetails
    })

    it('deve processar parâmetros numéricos corretamente', async () => {
      const { getPackageDetailsController } = require('../../../controllers/packages/getPackageDetails.controller')
      
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
          projectId: project.id.toString(), 
          packageId: testPackage.id.toString() 
        },
        user: { id: user.id }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageDetailsController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('deve tratar erros não-AppError chamando next', async () => {
      const { getPackageDetailsController } = require('../../../controllers/packages/getPackageDetails.controller')
      
      // Mock do use case para retornar um erro que não seja AppError
      const originalGetPackageDetails = require('../../../application/use-cases/packages/getPackageDetails.use-case').getPackageDetails
      const mockGetPackageDetails = jest.fn().mockRejectedValueOnce(new Error('Database connection failed'))
      
      // Substituir temporariamente o use case
      require('../../../application/use-cases/packages/getPackageDetails.use-case').getPackageDetails = mockGetPackageDetails

      const req = {
        params: { projectId: '1', packageId: '1' },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await getPackageDetailsController(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
      
      // Restaurar o use case original
      require('../../../application/use-cases/packages/getPackageDetails.use-case').getPackageDetails = originalGetPackageDetails
    })
  })
})
