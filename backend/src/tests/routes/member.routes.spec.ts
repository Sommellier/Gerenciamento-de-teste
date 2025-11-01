import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import express from 'express'
import request from 'supertest'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'

// Mock dos controllers
const mockControllers = {
  addMemberByEmailController: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(201).json({ ok: true, route: 'addMemberByEmail', projectId: req.params.projectId, body: req.body })
  }),
  listMembersController: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'listMembers', projectId: req.params.projectId })
  }),
  updateMemberRoleController: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'updateMemberRole', projectId: req.params.projectId, userId: req.params.userId, body: req.body })
  }),
  removeMemberController: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(204).end()
  })
}

jest.mock('../../controllers/members/addMemberByEmail.controller', () => ({
  addMemberByEmailController: mockControllers.addMemberByEmailController
}))
jest.mock('../../controllers/members/listMembers.controller', () => ({
  listMembersController: mockControllers.listMembersController
}))
jest.mock('../../controllers/members/updateMemberRole.controller', () => ({
  updateMemberRoleController: mockControllers.updateMemberRoleController
}))
jest.mock('../../controllers/members/removeMember.controller', () => ({
  removeMemberController: mockControllers.removeMemberController
}))

// Mock do auth
jest.mock('../../infrastructure/auth', () => ({
  auth: (_req: any, _res: any, next: any) => next(),
}))

// Mock do prisma
jest.mock('../../infrastructure/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn()
    },
    userOnProject: {
      findMany: jest.fn()
    }
  }
}))

import memberRouter from '../../routes/member.routes'
import { prisma } from '../../infrastructure/prisma'

describe('member.routes', () => {
  let app: express.Express

  beforeEach(() => {
    jest.clearAllMocks()
    app = express()
    app.use(express.json())

    app.use(memberRouter)

    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status = Number.isFinite(err?.status) ? err.status : 500
      res.status(status).json({ message: err?.message || 'Internal error' })
    })
  })

  describe('Rotas com autenticação', () => {
    it('POST /projects/:projectId/members/by-email → chama addMemberByEmailController', async () => {
      const res = await request(app)
        .post('/projects/123/members/by-email')
        .send({ email: 'test@example.com', role: 'TESTER' })
      
      expect(res.status).toBe(201)
      expect(res.body).toEqual({ 
        ok: true, 
        route: 'addMemberByEmail', 
        projectId: '123',
        body: { email: 'test@example.com', role: 'TESTER' }
      })
      expect(mockControllers.addMemberByEmailController).toHaveBeenCalledTimes(1)
    })

    it('PUT /projects/:projectId/members/:userId/role → chama updateMemberRoleController', async () => {
      const res = await request(app)
        .put('/projects/123/members/456/role')
        .send({ role: 'MANAGER' })
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ 
        ok: true, 
        route: 'updateMemberRole', 
        projectId: '123',
        userId: '456',
        body: { role: 'MANAGER' }
      })
      expect(mockControllers.updateMemberRoleController).toHaveBeenCalledTimes(1)
    })

    it('DELETE /projects/:projectId/members/:userId → chama removeMemberController', async () => {
      const res = await request(app).delete('/projects/123/members/456')
      
      expect(res.status).toBe(204)
      expect(res.text).toBe('')
      expect(mockControllers.removeMemberController).toHaveBeenCalledTimes(1)
    })
  })

  describe('Rota sem autenticação', () => {
    it('GET /projects/:projectId/members → chama listMembersController', async () => {
      const res = await request(app).get('/projects/123/members')
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true, route: 'listMembers', projectId: '123' })
      expect(mockControllers.listMembersController).toHaveBeenCalledTimes(1)
    })
  })

  describe('Tratamento de erros', () => {
    it('asyncH: se o controller rejeitar, cai no error handler', async () => {
      mockControllers.listMembersController.mockImplementationOnce(async () => {
        const err: any = new Error('Controller error')
        err.status = 400
        throw err
      })

      const res = await request(app).get('/projects/999/members')
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ message: 'Controller error' })
    })

    it('asyncH: se o controller rejeitar sem status, usa 500', async () => {
      mockControllers.listMembersController.mockImplementationOnce(async () => {
        throw new Error('Generic error')
      })

      const res = await request(app).get('/projects/999/members')
      expect(res.status).toBe(500)
      expect(res.body).toEqual({ message: 'Generic error' })
    })
  })
})
