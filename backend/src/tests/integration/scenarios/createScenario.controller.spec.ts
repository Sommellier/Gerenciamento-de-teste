// src/tests/integration/scenarios/createScenario.controller.spec.ts
import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { createScenarioController } from '../../../controllers/scenarios/createScenario.controller'
import { AppError } from '../../../utils/AppError'
import * as createScenarioUC from '../../../application/use-cases/scenarios/createScenario.use-case'

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

describe('createScenario.controller', () => {
  let user: any
  let project: any
  let authToken: string

  beforeAll(async () => {
    app = express()
    app.use(express.json())
    app.post('/projects/:projectId/scenarios', auth, createScenarioController)
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

  describe('POST /projects/:projectId/scenarios', () => {
    const validScenarioData = {
      title: 'Test Scenario',
      description: 'Test Description',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      steps: [
        { action: 'Click button', expected: 'Page loads' }
      ],
      release: '2024-01',
      tags: ['test', 'e2e'],
      environment: 'DEV'
    }

    it('cria cenário com sucesso', async () => {
      const mockScenario = {
        id: 1,
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId: project.id,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any

      jest.spyOn(createScenarioUC, 'createScenario').mockResolvedValue(mockScenario)

      const response = await request(app)
        .post(`/projects/${project.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validScenarioData)
        .expect(201)

      expect(response.body).toEqual({
        message: 'Cenário criado com sucesso',
        scenario: {
          id: 1,
          title: 'Test Scenario',
          description: 'Test Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId: project.id,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      })
      expect(createScenarioUC.createScenario).toHaveBeenCalledWith({
        projectId: project.id,
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: ['test', 'e2e'],
        steps: [{ action: 'Click button', expected: 'Page loads' }],
        assigneeId: undefined,
        assigneeEmail: undefined,
        environment: 'DEV',
        release: '2024-01'
      })
    })

    it('cria cenário com assigneeId', async () => {
      const mockScenario = {
        id: 1,
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId: project.id,
        assigneeId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any

      jest.spyOn(createScenarioUC, 'createScenario').mockResolvedValue(mockScenario)

      const scenarioData = {
        ...validScenarioData,
        assigneeId: user.id
      }

      const response = await request(app)
        .post(`/projects/${project.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scenarioData)
        .expect(201)

      expect(response.body.message).toBe('Cenário criado com sucesso')
      expect(createScenarioUC.createScenario).toHaveBeenCalledWith({
        projectId: project.id,
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: ['test', 'e2e'],
        steps: [{ action: 'Click button', expected: 'Page loads' }],
        assigneeId: user.id,
        assigneeEmail: undefined,
        environment: 'DEV',
        release: '2024-01'
      })
    })

    it('cria cenário com assigneeEmail', async () => {
      const mockScenario = {
        id: 1,
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId: project.id,
        assigneeEmail: 'assignee@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any

      jest.spyOn(createScenarioUC, 'createScenario').mockResolvedValue(mockScenario)

      const scenarioData = {
        ...validScenarioData,
        assigneeEmail: 'assignee@example.com'
      }

      const response = await request(app)
        .post(`/projects/${project.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scenarioData)
        .expect(201)

      expect(response.body.message).toBe('Cenário criado com sucesso')
      expect(createScenarioUC.createScenario).toHaveBeenCalledWith({
        projectId: project.id,
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: ['test', 'e2e'],
        steps: [{ action: 'Click button', expected: 'Page loads' }],
        assigneeId: undefined,
        assigneeEmail: 'assignee@example.com',
        environment: 'DEV',
        release: '2024-01'
      })
    })

    it('retorna 401 quando usuário não está autenticado', async () => {
      const response = await request(app)
        .post(`/projects/${project.id}/scenarios`)
        .send(validScenarioData)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token não fornecido'
      })
      expect(createScenarioUC.createScenario).not.toHaveBeenCalled()
    })

    it('retorna 401 quando token é inválido', async () => {
      const response = await request(app)
        .post(`/projects/${project.id}/scenarios`)
        .set('Authorization', 'Bearer invalid-token')
        .send(validScenarioData)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
      expect(createScenarioUC.createScenario).not.toHaveBeenCalled()
    })

    it('retorna 400 quando campos obrigatórios estão faltando', async () => {
      const invalidData = {
        title: 'Test Scenario',
        // missing type, priority, steps, release
      }

      const response = await request(app)
        .post(`/projects/${project.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400)

      expect(response.body).toEqual({
        message: 'Campos obrigatórios: title, type, priority, steps, release'
      })
      expect(createScenarioUC.createScenario).not.toHaveBeenCalled()
    })

    it('trata AppError do use case', async () => {
      jest.spyOn(createScenarioUC, 'createScenario').mockRejectedValue(new AppError('Projeto não encontrado', 404))

      const response = await request(app)
        .post(`/projects/${project.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validScenarioData)
        .expect(404)

      expect(response.body).toEqual({
        message: 'Projeto não encontrado'
      })
      expect(createScenarioUC.createScenario).toHaveBeenCalledWith({
        projectId: project.id,
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: ['test', 'e2e'],
        steps: [{ action: 'Click button', expected: 'Page loads' }],
        assigneeId: undefined,
        assigneeEmail: undefined,
        environment: 'DEV',
        release: '2024-01'
      })
    })

    it('trata erro genérico do use case', async () => {
      jest.spyOn(createScenarioUC, 'createScenario').mockRejectedValue(new Error('Erro interno'))

      const response = await request(app)
        .post(`/projects/${project.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validScenarioData)
        .expect(500)

      expect(response.body).toEqual({
        error: 'Erro interno',
        message: 'Erro interno'
      })
      expect(createScenarioUC.createScenario).toHaveBeenCalledWith({
        projectId: project.id,
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: ['test', 'e2e'],
        steps: [{ action: 'Click button', expected: 'Page loads' }],
        assigneeId: undefined,
        assigneeEmail: undefined,
        environment: 'DEV',
        release: '2024-01'
      })
    })

    it('trata projectId inválido', async () => {
      jest.spyOn(createScenarioUC, 'createScenario').mockRejectedValue(new AppError('Projeto não encontrado', 404))

      const response = await request(app)
        .post('/projects/invalid/scenarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validScenarioData)
        .expect(404)

      expect(response.body).toEqual({
        message: 'Projeto não encontrado'
      })
      expect(createScenarioUC.createScenario).toHaveBeenCalledWith({
        projectId: NaN,
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: ['test', 'e2e'],
        steps: [{ action: 'Click button', expected: 'Page loads' }],
        assigneeId: undefined,
        assigneeEmail: undefined,
        environment: 'DEV',
        release: '2024-01'
      })
    })
  })
})

