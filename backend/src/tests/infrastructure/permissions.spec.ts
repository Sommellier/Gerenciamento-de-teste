import 'dotenv/config'
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../infrastructure/prisma'
import { AppError } from '../../utils/AppError'
import { requirePermission, requireAnyPermission, requireProjectAccess } from '../../infrastructure/permissions'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

describe('permissions middleware', () => {
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.userOnProject.deleteMany(),
      prisma.project.deleteMany(),
      prisma.user.deleteMany()
    ])
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('requirePermission', () => {
    let mockReq: any
    let mockRes: Response
    let mockNext: NextFunction

    beforeEach(() => {
      mockReq = {
        user: { id: 1 },
        params: {},
        body: {}
      }
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any
      mockNext = jest.fn()
    })

    it('deve permitir acesso quando usuário é OWNER', async () => {
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Owner User',
          email: unique('owner') + '@example.com',
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

      mockReq.user = { id: user.id }
      mockReq.params = { projectId: project.id.toString() }

      const middleware = requirePermission('create_package')
      await middleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.userRole).toBe('OWNER')
    })

    it('deve permitir acesso quando usuário tem permissão específica', async () => {
      // Criar usuário e projeto
      const owner = await prisma.user.create({
        data: {
          name: 'Owner User',
          email: unique('owner') + '@example.com',
          password: 'secret'
        }
      })

      const manager = await prisma.user.create({
        data: {
          name: 'Manager User',
          email: unique('manager') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: owner.id
        }
      })

      // Adicionar usuário como MANAGER
      await prisma.userOnProject.create({
        data: {
          userId: manager.id,
          projectId: project.id,
          role: 'MANAGER'
        }
      })

      mockReq.user = { id: manager.id }
      mockReq.params = { projectId: project.id.toString() }

      const middleware = requirePermission('create_package')
      await middleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.userRole).toBe('MANAGER')
    })

    it('deve negar acesso quando usuário não tem permissão', async () => {
      // Criar usuário e projeto
      const owner = await prisma.user.create({
        data: {
          name: 'Owner User',
          email: unique('owner') + '@example.com',
          password: 'secret'
        }
      })

      const tester = await prisma.user.create({
        data: {
          name: 'Tester User',
          email: unique('tester') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: owner.id
        }
      })

      // Adicionar usuário como TESTER
      await prisma.userOnProject.create({
        data: {
          userId: tester.id,
          projectId: project.id,
          role: 'TESTER'
        }
      })

      mockReq.user = { id: tester.id }
      mockReq.params = { projectId: project.id.toString() }

      const middleware = requirePermission('delete_package') // TESTER não tem essa permissão
      await middleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Permissão negada',
          statusCode: 403
        })
      )
    })

    it('deve negar acesso quando usuário não está autenticado', async () => {
      mockReq.user = undefined

      const middleware = requirePermission('create_package')
      await middleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Não autenticado',
          statusCode: 401
        })
      )
    })

    it('deve permitir acesso quando não há projectId', async () => {
      mockReq.params = {}
      mockReq.body = {}

      const middleware = requirePermission('create_package')
      await middleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('deve usar projectId do body quando não está nos params', async () => {
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Owner User',
          email: unique('owner') + '@example.com',
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

      mockReq.user = { id: user.id }
      mockReq.params = {}
      mockReq.body = { projectId: project.id.toString() }

      const middleware = requirePermission('create_package')
      await middleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.userRole).toBe('OWNER')
    })

    it('deve tratar usuário como APPROVER quando não é membro nem owner', async () => {
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Random User',
          email: unique('random') + '@example.com',
          password: 'secret'
        }
      })

      const owner = await prisma.user.create({
        data: {
          name: 'Owner User',
          email: unique('owner') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: owner.id
        }
      })

      mockReq.user = { id: user.id }
      mockReq.params = { projectId: project.id.toString() }

      const middleware = requirePermission('comment') // APPROVER tem essa permissão
      await middleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.userRole).toBe('APPROVER')
    })
  })

  describe('requireAnyPermission', () => {
    let mockReq: any
    let mockRes: Response
    let mockNext: NextFunction

    beforeEach(() => {
      mockReq = {
        user: { id: 1 },
        params: {},
        body: {}
      }
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any
      mockNext = jest.fn()
    })

    it('deve permitir acesso quando usuário tem pelo menos uma das permissões', async () => {
      // Criar usuário e projeto
      const owner = await prisma.user.create({
        data: {
          name: 'Owner User',
          email: unique('owner') + '@example.com',
          password: 'secret'
        }
      })

      const tester = await prisma.user.create({
        data: {
          name: 'Tester User',
          email: unique('tester') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: owner.id
        }
      })

      // Adicionar usuário como TESTER
      await prisma.userOnProject.create({
        data: {
          userId: tester.id,
          projectId: project.id,
          role: 'TESTER'
        }
      })

      mockReq.user = { id: tester.id }
      mockReq.params = { projectId: project.id.toString() }

      const middleware = requireAnyPermission('execute_scenario', 'delete_package') // TESTER tem execute_scenario
      await middleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.userRole).toBe('TESTER')
    })

    it('deve negar acesso quando usuário não tem nenhuma das permissões', async () => {
      // Criar usuário e projeto
      const owner = await prisma.user.create({
        data: {
          name: 'Owner User',
          email: unique('owner') + '@example.com',
          password: 'secret'
        }
      })

      const approver = await prisma.user.create({
        data: {
          name: 'Approver User',
          email: unique('approver') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: owner.id
        }
      })

      // Adicionar usuário como APPROVER
      await prisma.userOnProject.create({
        data: {
          userId: approver.id,
          projectId: project.id,
          role: 'APPROVER'
        }
      })

      mockReq.user = { id: approver.id }
      mockReq.params = { projectId: project.id.toString() }

      const middleware = requireAnyPermission('create_package', 'delete_package') // APPROVER não tem essas permissões
      await middleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Permissão negada',
          statusCode: 403
        })
      )
    })

    it('deve negar acesso quando usuário não está autenticado', async () => {
      mockReq.user = undefined

      const middleware = requireAnyPermission('create_package', 'delete_package')
      await middleware(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Não autenticado',
          statusCode: 401
        })
      )
    })
  })

  describe('requireProjectAccess', () => {
    let mockReq: any
    let mockRes: Response
    let mockNext: NextFunction

    beforeEach(() => {
      mockReq = {
        user: { id: 1 },
        params: {},
        body: {}
      }
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any
      mockNext = jest.fn()
    })

    it('deve permitir acesso quando usuário é owner do projeto', async () => {
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Owner User',
          email: unique('owner') + '@example.com',
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

      mockReq.user = { id: user.id }
      mockReq.params = { projectId: project.id.toString() }

      await requireProjectAccess(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('deve permitir acesso quando usuário é membro do projeto', async () => {
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Member User',
          email: unique('member') + '@example.com',
          password: 'secret'
        }
      })

      const owner = await prisma.user.create({
        data: {
          name: 'Owner User',
          email: unique('owner') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: owner.id
        }
      })

      // Adicionar usuário como membro
      await prisma.userOnProject.create({
        data: {
          userId: user.id,
          projectId: project.id,
          role: 'TESTER'
        }
      })

      mockReq.user = { id: user.id }
      mockReq.params = { projectId: project.id.toString() }

      await requireProjectAccess(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('deve negar acesso quando usuário não é membro nem owner', async () => {
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Random User',
          email: unique('random') + '@example.com',
          password: 'secret'
        }
      })

      const owner = await prisma.user.create({
        data: {
          name: 'Owner User',
          email: unique('owner') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: owner.id
        }
      })

      mockReq.user = { id: user.id }
      mockReq.params = { projectId: project.id.toString() }

      await requireProjectAccess(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Acesso negado ao projeto',
          statusCode: 403
        })
      )
    })

    it('deve negar acesso quando usuário não está autenticado', async () => {
      mockReq.user = undefined

      await requireProjectAccess(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Não autenticado',
          statusCode: 401
        })
      )
    })

    it('deve permitir acesso quando não há projectId', async () => {
      mockReq.params = {}
      mockReq.body = {}

      await requireProjectAccess(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('deve usar projectId do body quando não está nos params', async () => {
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Owner User',
          email: unique('owner') + '@example.com',
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

      mockReq.user = { id: user.id }
      mockReq.params = {}
      mockReq.body = { projectId: project.id.toString() }

      await requireProjectAccess(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })
})
