// src/tests/integration/scenarios/getProjectScenarios.controller.spec.ts
import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { getProjectScenariosController } from '../../../controllers/scenarios/getProjectScenarios.controller'
import { AppError } from '../../../utils/AppError'
import * as getProjectScenariosUC from '../../../application/use-cases/scenarios/getProjectScenarios.use-case'

const unique = (p: string) =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

function tokenFor(id: number) {
  const secret = process.env.JWT_SECRET || 'test-secret'
  return jwt.sign({ id }, secret, { expiresIn: '1h' })
}

const auth: express.RequestHandler = (req, res, next) => {
  const header = req.headers.authorization || ''
  const [, token] = header.split(' ')
  if (!token) {
    res.status(401).json({ message: 'Token não fornecido' })
    return
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'test-secret'
    ) as { id: number }
    ;(req as any).user = { id: payload.id }
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido' })
  }
}

const errorHandler: express.ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message })
  } else {
    res.status(500).json({ 
      error: err.message || 'Internal Server Error',
      message: err.message || 'Internal Server Error'
    })
  }
}

let app: express.Express

describe('getProjectScenarios.controller', () => {
  let user: any
  let project: any
  let authToken: string

  beforeAll(async () => {
    app = express()
    app.use(express.json())
    app.get('/projects/:projectId/scenarios', auth, getProjectScenariosController)
    app.use(errorHandler)

    // Criar usuário e projeto para os testes
    user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: unique('test@example.com'),
        password: 'password123'
      }
    })

    project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: user.id
      }
    })

    authToken = tokenFor(user.id)
  })

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.project.deleteMany({
      where: { id: project.id }
    })
    await prisma.user.deleteMany({
      where: { id: user.id }
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /projects/:projectId/scenarios', () => {
    it('retorna cenários do projeto com sucesso', async () => {
      const mockScenarios = {
        items: [
          {
            id: 1,
            title: 'Test Scenario 1',
            description: 'Description 1',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            status: 'CREATED',
            projectId: project.id,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 2,
            title: 'Test Scenario 2',
            description: 'Description 2',
            type: 'REGRESSION',
            priority: 'MEDIUM',
            status: 'EXECUTED',
            projectId: project.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1
      } as any

      jest.spyOn(getProjectScenariosUC, 'getProjectScenarios').mockResolvedValue(mockScenarios)

      const response = await request(app)
        .get(`/projects/${project.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual({
        items: [
          {
            id: 1,
            title: 'Test Scenario 1',
            description: 'Description 1',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            status: 'CREATED',
            projectId: project.id,
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          },
          {
            id: 2,
            title: 'Test Scenario 2',
            description: 'Description 2',
            type: 'REGRESSION',
            priority: 'MEDIUM',
            status: 'EXECUTED',
            projectId: project.id,
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          }
        ],
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1
      })
      expect(getProjectScenariosUC.getProjectScenarios).toHaveBeenCalledWith({
        projectId: project.id,
        release: undefined
      })
    })

    it('retorna cenários com release específica', async () => {
      const mockScenarios = {
        items: [
          {
            id: 1,
            title: 'Test Scenario 1',
            description: 'Description 1',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            status: 'CREATED',
            projectId: project.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1
      } as any

      jest.spyOn(getProjectScenariosUC, 'getProjectScenarios').mockResolvedValue(mockScenarios)

      const response = await request(app)
        .get(`/projects/${project.id}/scenarios?release=2024-01`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.total).toBe(1)
      expect(getProjectScenariosUC.getProjectScenarios).toHaveBeenCalledWith({
        projectId: project.id,
        release: '2024-01'
      })
    })

    it('retorna lista vazia quando não há cenários', async () => {
      const mockScenarios = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0
      } as any

      jest.spyOn(getProjectScenariosUC, 'getProjectScenarios').mockResolvedValue(mockScenarios)

      const response = await request(app)
        .get(`/projects/${project.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0
      })
      expect(getProjectScenariosUC.getProjectScenarios).toHaveBeenCalledWith({
        projectId: project.id,
        release: undefined
      })
    })

    it('retorna 401 quando usuário não está autenticado', async () => {
      const response = await request(app)
        .get(`/projects/${project.id}/scenarios`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token não fornecido'
      })
      expect(getProjectScenariosUC.getProjectScenarios).not.toHaveBeenCalled()
    })

    it('retorna 401 quando token é inválido', async () => {
      const response = await request(app)
        .get(`/projects/${project.id}/scenarios`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
      expect(getProjectScenariosUC.getProjectScenarios).not.toHaveBeenCalled()
    })

    it('trata AppError do use case', async () => {
      jest.spyOn(getProjectScenariosUC, 'getProjectScenarios').mockRejectedValue(new AppError('Projeto não encontrado', 404))

      const response = await request(app)
        .get(`/projects/${project.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body).toEqual({
        message: 'Projeto não encontrado'
      })
      expect(getProjectScenariosUC.getProjectScenarios).toHaveBeenCalledWith({
        projectId: project.id,
        release: undefined
      })
    })

    it('trata erro genérico do use case', async () => {
      jest.spyOn(getProjectScenariosUC, 'getProjectScenarios').mockRejectedValue(new Error('Erro interno'))

      const response = await request(app)
        .get(`/projects/${project.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)

      expect(response.body).toEqual({
        error: 'Erro interno',
        message: 'Erro interno'
      })
      expect(getProjectScenariosUC.getProjectScenarios).toHaveBeenCalledWith({
        projectId: project.id,
        release: undefined
      })
    })

    it('trata projectId inválido', async () => {
      jest.spyOn(getProjectScenariosUC, 'getProjectScenarios').mockRejectedValue(new AppError('Projeto não encontrado', 404))

      const response = await request(app)
        .get('/projects/invalid/scenarios')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body).toEqual({
        message: 'Projeto não encontrado'
      })
      expect(getProjectScenariosUC.getProjectScenarios).toHaveBeenCalledWith({
        projectId: NaN,
        release: undefined
      })
    })

    it('retorna cenários com paginação', async () => {
      const mockScenarios = {
        items: [
          {
            id: 1,
            title: 'Test Scenario 1',
            description: 'Description 1',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            status: 'CREATED',
            projectId: project.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        total: 15,
        page: 1,
        pageSize: 10,
        totalPages: 2
      } as any

      jest.spyOn(getProjectScenariosUC, 'getProjectScenarios').mockResolvedValue(mockScenarios)

      const response = await request(app)
        .get(`/projects/${project.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.total).toBe(15)
      expect(response.body.totalPages).toBe(2)
      expect(getProjectScenariosUC.getProjectScenarios).toHaveBeenCalledWith({
        projectId: project.id,
        release: undefined
      })
    })
  })
})

