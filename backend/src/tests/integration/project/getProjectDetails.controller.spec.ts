// src/tests/integration/project/getProjectDetails.controller.spec.ts
import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { getProjectDetailsController } from '../../../controllers/project/getProjectDetails.controller'
import { AppError } from '../../../utils/AppError'
import * as getProjectDetailsUC from '../../../application/use-cases/projects/getProjectDetails.use-case'

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

describe('getProjectDetails.controller', () => {
  let user: any
  let project: any
  let authToken: string

  beforeAll(async () => {
    app = express()
    app.use(express.json())
    app.get('/projects/:projectId/details', auth, getProjectDetailsController)
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

  describe('GET /projects/:projectId/details', () => {
    it('retorna detalhes do projeto com sucesso', async () => {
      const mockProjectDetails = {
        id: project.id,
        name: 'Test Project',
        description: 'Test Description',
        ownerId: user.id,
        members: [],
        metrics: {
          created: 0,
          executed: 0,
          passed: 0,
          failed: 0
        },
        availableReleases: [],
        testPackages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      } as any

      jest.spyOn(getProjectDetailsUC, 'getProjectDetails').mockResolvedValue(mockProjectDetails)

      const response = await request(app)
        .get(`/projects/${project.id}/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual({
        id: project.id,
        name: 'Test Project',
        description: 'Test Description',
        ownerId: user.id,
        members: [],
        metrics: {
          created: 0,
          executed: 0,
          passed: 0,
          failed: 0
        },
        availableReleases: [],
        testPackages: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
      expect(getProjectDetailsUC.getProjectDetails).toHaveBeenCalledWith({
        projectId: project.id,
        release: undefined
      })
    })

    it('retorna detalhes do projeto com release específica', async () => {
      const mockProjectDetails = {
        id: project.id,
        name: 'Test Project',
        description: 'Test Description',
        ownerId: user.id,
        members: [],
        metrics: {
          created: 0,
          executed: 0,
          passed: 0,
          failed: 0
        },
        availableReleases: [],
        testPackages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      } as any

      jest.spyOn(getProjectDetailsUC, 'getProjectDetails').mockResolvedValue(mockProjectDetails)

      const response = await request(app)
        .get(`/projects/${project.id}/details?release=2024-01`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual({
        id: project.id,
        name: 'Test Project',
        description: 'Test Description',
        ownerId: user.id,
        members: [],
        metrics: {
          created: 0,
          executed: 0,
          passed: 0,
          failed: 0
        },
        availableReleases: [],
        testPackages: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
      expect(getProjectDetailsUC.getProjectDetails).toHaveBeenCalledWith({
        projectId: project.id,
        release: '2024-01'
      })
    })

    it('retorna 401 quando usuário não está autenticado', async () => {
      const response = await request(app)
        .get(`/projects/${project.id}/details`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token não fornecido'
      })
      expect(getProjectDetailsUC.getProjectDetails).not.toHaveBeenCalled()
    })

    it('retorna 401 quando token é inválido', async () => {
      const response = await request(app)
        .get(`/projects/${project.id}/details`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
      expect(getProjectDetailsUC.getProjectDetails).not.toHaveBeenCalled()
    })

    it('trata AppError do use case', async () => {
      jest.spyOn(getProjectDetailsUC, 'getProjectDetails').mockRejectedValue(new AppError('Projeto não encontrado', 404))

      const response = await request(app)
        .get(`/projects/${project.id}/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body).toEqual({
        message: 'Projeto não encontrado'
      })
      expect(getProjectDetailsUC.getProjectDetails).toHaveBeenCalledWith({
        projectId: project.id,
        release: undefined
      })
    })

    it('trata erro genérico do use case', async () => {
      jest.spyOn(getProjectDetailsUC, 'getProjectDetails').mockRejectedValue(new Error('Erro interno'))

      const response = await request(app)
        .get(`/projects/${project.id}/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)

      expect(response.body).toEqual({
        error: 'Erro interno',
        message: 'Erro interno'
      })
      expect(getProjectDetailsUC.getProjectDetails).toHaveBeenCalledWith({
        projectId: project.id,
        release: undefined
      })
    })

    it('trata projectId inválido', async () => {
      jest.spyOn(getProjectDetailsUC, 'getProjectDetails').mockRejectedValue(new AppError('Projeto não encontrado', 404))

      const response = await request(app)
        .get('/projects/invalid/details')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body).toEqual({
        message: 'Projeto não encontrado'
      })
      expect(getProjectDetailsUC.getProjectDetails).toHaveBeenCalledWith({
        projectId: NaN,
        release: undefined
      })
    })

    it('retorna detalhes com dados completos', async () => {
      const mockProjectDetails = {
        id: project.id,
        name: 'Test Project',
        description: 'Test Description',
        ownerId: user.id,
        members: [
          {
            id: 1,
            name: 'Member 1',
            email: 'member1@example.com',
            avatar: null,
            role: 'TESTER' as any
          }
        ],
        metrics: {
          created: 2,
          executed: 1,
          passed: 1,
          failed: 0
        },
        availableReleases: ['2024-01', '2024-02'],
        testPackages: [
          {
            id: 1,
            title: 'Test Package 1',
            description: 'Description 1',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            steps: []
          }
        ],
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z')
      } as any

      jest.spyOn(getProjectDetailsUC, 'getProjectDetails').mockResolvedValue(mockProjectDetails)

      const response = await request(app)
        .get(`/projects/${project.id}/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual({
        id: project.id,
        name: 'Test Project',
        description: 'Test Description',
        ownerId: user.id,
        members: [
          {
            id: 1,
            name: 'Member 1',
            email: 'member1@example.com',
            avatar: null,
            role: 'TESTER' as any
          }
        ],
        metrics: {
          created: 2,
          executed: 1,
          passed: 1,
          failed: 0
        },
        availableReleases: ['2024-01', '2024-02'],
        testPackages: [
          {
            id: 1,
            title: 'Test Package 1',
            description: 'Description 1',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            steps: []
          }
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z'
      })
      expect(getProjectDetailsUC.getProjectDetails).toHaveBeenCalledWith({
        projectId: project.id,
        release: undefined
      })
    })
  })
})
