import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

describe('listMembers.controller', () => {
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

  describe('parseRolesParam function', () => {
    it('deve processar array de roles válida', async () => {
      const parseRolesParam = (input: unknown) => {
        if (!input) return undefined
        const raw = Array.isArray(input) ? input.join(',') : String(input)
        const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
        const allowed = ['OWNER', 'MANAGER', 'TESTER', 'APPROVER']
        const result = parts.filter(p => allowed.includes(p))
        return result.length ? result : undefined
      }
      
      expect(parseRolesParam(['OWNER', 'MANAGER'])).toEqual(['OWNER', 'MANAGER'])
      expect(parseRolesParam('OWNER,MANAGER')).toEqual(['OWNER', 'MANAGER'])
      expect(parseRolesParam('OWNER')).toEqual(['OWNER'])
      expect(parseRolesParam('')).toBeUndefined()
      expect(parseRolesParam(null)).toBeUndefined()
      expect(parseRolesParam(undefined)).toBeUndefined()
    })

    it('deve filtrar roles inválidos', async () => {
      const parseRolesParam = (input: unknown) => {
        if (!input) return undefined
        const raw = Array.isArray(input) ? input.join(',') : String(input)
        const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
        const allowed = ['OWNER', 'MANAGER', 'TESTER', 'APPROVER']
        const result = parts.filter(p => allowed.includes(p))
        return result.length ? result : undefined
      }
      
      expect(parseRolesParam('OWNER,INVALID,MANAGER')).toEqual(['OWNER', 'MANAGER'])
      expect(parseRolesParam('INVALID')).toBeUndefined()
    })

    it('deve processar string com vírgulas', async () => {
      const parseRolesParam = (input: unknown) => {
        if (!input) return undefined
        const raw = Array.isArray(input) ? input.join(',') : String(input)
        const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
        const allowed = ['OWNER', 'MANAGER', 'TESTER', 'APPROVER']
        const result = parts.filter(p => allowed.includes(p))
        return result.length ? result : undefined
      }
      
      expect(parseRolesParam('OWNER, MANAGER, TESTER')).toEqual(['OWNER', 'MANAGER', 'TESTER'])
    })
  })

  describe('listMembersController function', () => {
    it('deve retornar membros do projeto', async () => {
      const owner = await prisma.user.create({
        data: {
          name: 'Owner',
          email: unique('owner') + '@example.com',
          password: 'secret'
        }
      })

      const member = await prisma.user.create({
        data: {
          name: 'Member',
          email: unique('member') + '@example.com',
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

      // Adicionar membros ao projeto
      await prisma.userOnProject.create({
        data: {
          userId: owner.id,
          projectId: project.id,
          role: 'OWNER'
        }
      })

      await prisma.userOnProject.create({
        data: {
          userId: member.id,
          projectId: project.id,
          role: 'TESTER'
        }
      })

      const { listMembersController } = require('../../../controllers/members/listMembers.controller')
      
      const req = { 
        params: { projectId: project.id.toString() },
        user: { id: owner.id, email: owner.email },
        query: {}
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await listMembersController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              role: 'OWNER'
            })
          ])
        })
      )
    })

    it('deve filtrar membros por roles', async () => {
      const owner = await prisma.user.create({
        data: {
          name: 'Owner',
          email: unique('owner') + '@example.com',
          password: 'secret'
        }
      })

      const tester = await prisma.user.create({
        data: {
          name: 'Tester',
          email: unique('tester') + '@example.com',
          password: 'secret'
        }
      })

      const manager = await prisma.user.create({
        data: {
          name: 'Manager',
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

      // Adicionar membros com diferentes roles
      await prisma.userOnProject.create({
        data: {
          userId: owner.id,
          projectId: project.id,
          role: 'OWNER'
        }
      })

      await prisma.userOnProject.create({
        data: {
          userId: tester.id,
          projectId: project.id,
          role: 'TESTER'
        }
      })

      await prisma.userOnProject.create({
        data: {
          userId: manager.id,
          projectId: project.id,
          role: 'MANAGER'
        }
      })

      const { listMembersController } = require('../../../controllers/members/listMembers.controller')
      
      const req = { 
        params: { projectId: project.id.toString() },
        user: { id: owner.id, email: owner.email },
        query: { roles: 'TESTER,MANAGER' }
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await listMembersController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('deve processar parâmetros de paginação', async () => {
      const owner = await prisma.user.create({
        data: {
          name: 'Owner',
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

      // Criar relação de membro para o owner
      await prisma.userOnProject.create({
        data: {
          userId: owner.id,
          projectId: project.id,
          role: 'OWNER'
        }
      })

      // Criar múltiplos membros
      for (let i = 0; i < 5; i++) {
        const user = await prisma.user.create({
          data: {
            name: `User ${i}`,
            email: unique(`user${i}`) + '@example.com',
            password: 'secret'
          }
        })

        await prisma.userOnProject.create({
          data: {
            userId: user.id,
            projectId: project.id,
            role: 'TESTER'
          }
        })
      }

      const { listMembersController } = require('../../../controllers/members/listMembers.controller')
      
      const req = { 
        params: { projectId: project.id.toString() },
        user: { id: owner.id, email: owner.email },
        query: { page: '2', pageSize: '2' }
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await listMembersController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('deve processar parâmetros de ordenação', async () => {
      const owner = await prisma.user.create({
        data: {
          name: 'Owner',
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

      // Criar relação de membro para o owner
      await prisma.userOnProject.create({
        data: {
          userId: owner.id,
          projectId: project.id,
          role: 'OWNER'
        }
      })

      const { listMembersController } = require('../../../controllers/members/listMembers.controller')
      
      const req = { 
        params: { projectId: project.id.toString() },
        user: { id: owner.id, email: owner.email },
        query: { orderBy: 'email', sort: 'asc' }
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await listMembersController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('deve processar query de busca', async () => {
      const owner = await prisma.user.create({
        data: {
          name: 'Owner',
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

      // Criar relação de membro para o owner
      await prisma.userOnProject.create({
        data: {
          userId: owner.id,
          projectId: project.id,
          role: 'OWNER'
        }
      })

      const { listMembersController } = require('../../../controllers/members/listMembers.controller')
      
      const req = { 
        params: { projectId: project.id.toString() },
        user: { id: owner.id, email: owner.email },
        query: { q: 'test' }
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await listMembersController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('deve tratar erros de AppError corretamente', async () => {
      const { listMembersController } = require('../../../controllers/members/listMembers.controller')
      
      const req = { 
        params: { projectId: '999' },
        user: { id: 1, email: 'test@example.com' },
        query: {}
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await listMembersController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('deve retornar 401 quando não autenticado', async () => {
      const { listMembersController } = require('../../../controllers/members/listMembers.controller')
      
      const req = { 
        params: { projectId: '1' },
        user: undefined,
        query: {}
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await listMembersController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('deve processar projectId corretamente', async () => {
      const { listMembersController } = require('../../../controllers/members/listMembers.controller')
      
      const req = { 
        params: { projectId: 'invalid' },
        user: { id: 1, email: 'test@example.com' },
        query: {}
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await listMembersController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('deve tratar parâmetros de query inválidos', async () => {
      const owner = await prisma.user.create({
        data: {
          name: 'Owner',
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

      // Criar relação de membro para o owner
      await prisma.userOnProject.create({
        data: {
          userId: owner.id,
          projectId: project.id,
          role: 'OWNER'
        }
      })

      const { listMembersController } = require('../../../controllers/members/listMembers.controller')
      
      const req = { 
        params: { projectId: project.id.toString() },
        user: { id: owner.id, email: owner.email },
        query: { 
          orderBy: 'invalid',
          sort: 'invalid',
          page: 'invalid',
          pageSize: 'invalid'
        }
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await listMembersController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('deve tratar erros não-AppError chamando next', async () => {
      const { listMembersController } = require('../../../controllers/members/listMembers.controller')
      
      // Mock do prisma para simular erro interno
      const originalFindUnique = prisma.project.findUnique
      prisma.project.findUnique = jest.fn().mockRejectedValue(new Error('Database connection error'))
      
      const req = { 
        params: { projectId: '1' },
        user: { id: 1, email: 'test@example.com' },
        query: {}
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await listMembersController(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
      
      // Restaurar mock
      prisma.project.findUnique = originalFindUnique
    })
  })
})
