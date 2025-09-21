// src/tests/integration/scenarios/getProjectMetrics.controller.spec.ts
import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { getProjectMetricsController } from '../../../controllers/scenarios/getProjectMetrics.controller'
import { AppError } from '../../../utils/AppError'
import * as getProjectMetricsUC from '../../../application/use-cases/scenarios/getProjectMetrics.use-case'

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

describe('getProjectMetrics.controller', () => {
  let user: any
  let project: any
  let authToken: string

  beforeAll(async () => {
    app = express()
    app.use(express.json())
    app.get('/projects/:projectId/metrics', auth, getProjectMetricsController)
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

  describe('GET /projects/:projectId/metrics', () => {
    it('retorna métricas do projeto com sucesso', async () => {
      const mockMetrics = {
        created: 5,
        executed: 3,
        passed: 2,
        failed: 1
      }

      jest.spyOn(getProjectMetricsUC, 'getProjectMetrics').mockResolvedValue(mockMetrics)

      const response = await request(app)
        .get(`/projects/${project.id}/metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual(mockMetrics)
      expect(getProjectMetricsUC.getProjectMetrics).toHaveBeenCalledWith({
        projectId: project.id,
        release: undefined
      })
    })

    it('retorna métricas com release específica', async () => {
      const mockMetrics = {
        created: 3,
        executed: 2,
        passed: 1,
        failed: 1
      }

      jest.spyOn(getProjectMetricsUC, 'getProjectMetrics').mockResolvedValue(mockMetrics)

      const response = await request(app)
        .get(`/projects/${project.id}/metrics?release=2024-01`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual(mockMetrics)
      expect(getProjectMetricsUC.getProjectMetrics).toHaveBeenCalledWith({
        projectId: project.id,
        release: '2024-01'
      })
    })

    it('retorna 401 quando usuário não está autenticado', async () => {
      const response = await request(app)
        .get(`/projects/${project.id}/metrics`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token não fornecido'
      })
      expect(getProjectMetricsUC.getProjectMetrics).not.toHaveBeenCalled()
    })

    it('retorna 401 quando token é inválido', async () => {
      const response = await request(app)
        .get(`/projects/${project.id}/metrics`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
      expect(getProjectMetricsUC.getProjectMetrics).not.toHaveBeenCalled()
    })

    it('trata AppError do use case', async () => {
      jest.spyOn(getProjectMetricsUC, 'getProjectMetrics').mockRejectedValue(new AppError('Projeto não encontrado', 404))

      const response = await request(app)
        .get(`/projects/${project.id}/metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body).toEqual({
        message: 'Projeto não encontrado'
      })
      expect(getProjectMetricsUC.getProjectMetrics).toHaveBeenCalledWith({
        projectId: project.id,
        release: undefined
      })
    })

    it('trata erro genérico do use case', async () => {
      jest.spyOn(getProjectMetricsUC, 'getProjectMetrics').mockRejectedValue(new Error('Erro interno'))

      const response = await request(app)
        .get(`/projects/${project.id}/metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)

      expect(response.body).toEqual({
        error: 'Erro interno',
        message: 'Erro interno'
      })
      expect(getProjectMetricsUC.getProjectMetrics).toHaveBeenCalledWith({
        projectId: project.id,
        release: undefined
      })
    })

    it('trata projectId inválido', async () => {
      jest.spyOn(getProjectMetricsUC, 'getProjectMetrics').mockRejectedValue(new AppError('Projeto não encontrado', 404))

      const response = await request(app)
        .get('/projects/invalid/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body).toEqual({
        message: 'Projeto não encontrado'
      })
      expect(getProjectMetricsUC.getProjectMetrics).toHaveBeenCalledWith({
        projectId: NaN,
        release: undefined
      })
    })

    it('retorna métricas vazias', async () => {
      const mockMetrics = {
        created: 0,
        executed: 0,
        passed: 0,
        failed: 0
      }

      jest.spyOn(getProjectMetricsUC, 'getProjectMetrics').mockResolvedValue(mockMetrics)

      const response = await request(app)
        .get(`/projects/${project.id}/metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual(mockMetrics)
      expect(getProjectMetricsUC.getProjectMetrics).toHaveBeenCalledWith({
        projectId: project.id,
        release: undefined
      })
    })
  })
})

