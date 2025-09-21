// src/tests/integration/scenarios/getProjectReleases.controller.spec.ts
import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { getProjectReleasesController } from '../../../controllers/scenarios/getProjectReleases.controller'
import { AppError } from '../../../utils/AppError'
import * as getProjectReleasesUC from '../../../application/use-cases/scenarios/getProjectReleases.use-case'

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

describe('getProjectReleases.controller', () => {
  let user: any
  let project: any
  let authToken: string

  beforeAll(async () => {
    app = express()
    app.use(express.json())
    app.get('/projects/:projectId/releases', auth, getProjectReleasesController)
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

  describe('GET /projects/:projectId/releases', () => {
    it('retorna releases do projeto com sucesso', async () => {
      const mockReleases = ['2024-01', '2024-02', '2024-03']

      jest.spyOn(getProjectReleasesUC, 'getProjectReleases').mockResolvedValue(mockReleases)

      const response = await request(app)
        .get(`/projects/${project.id}/releases`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual(mockReleases)
      expect(getProjectReleasesUC.getProjectReleases).toHaveBeenCalledWith({
        projectId: project.id
      })
    })

    it('retorna lista vazia quando não há releases', async () => {
      const mockReleases: string[] = []

      jest.spyOn(getProjectReleasesUC, 'getProjectReleases').mockResolvedValue(mockReleases)

      const response = await request(app)
        .get(`/projects/${project.id}/releases`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual([])
      expect(getProjectReleasesUC.getProjectReleases).toHaveBeenCalledWith({
        projectId: project.id
      })
    })

    it('retorna 401 quando usuário não está autenticado', async () => {
      const response = await request(app)
        .get(`/projects/${project.id}/releases`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token não fornecido'
      })
      expect(getProjectReleasesUC.getProjectReleases).not.toHaveBeenCalled()
    })

    it('retorna 401 quando token é inválido', async () => {
      const response = await request(app)
        .get(`/projects/${project.id}/releases`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
      expect(getProjectReleasesUC.getProjectReleases).not.toHaveBeenCalled()
    })

    it('trata AppError do use case', async () => {
      jest.spyOn(getProjectReleasesUC, 'getProjectReleases').mockRejectedValue(new AppError('Projeto não encontrado', 404))

      const response = await request(app)
        .get(`/projects/${project.id}/releases`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body).toEqual({
        message: 'Projeto não encontrado'
      })
      expect(getProjectReleasesUC.getProjectReleases).toHaveBeenCalledWith({
        projectId: project.id
      })
    })

    it('trata erro genérico do use case', async () => {
      jest.spyOn(getProjectReleasesUC, 'getProjectReleases').mockRejectedValue(new Error('Erro interno'))

      const response = await request(app)
        .get(`/projects/${project.id}/releases`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)

      expect(response.body).toEqual({
        error: 'Erro interno',
        message: 'Erro interno'
      })
      expect(getProjectReleasesUC.getProjectReleases).toHaveBeenCalledWith({
        projectId: project.id
      })
    })

    it('trata projectId inválido', async () => {
      jest.spyOn(getProjectReleasesUC, 'getProjectReleases').mockRejectedValue(new AppError('Projeto não encontrado', 404))

      const response = await request(app)
        .get('/projects/invalid/releases')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body).toEqual({
        message: 'Projeto não encontrado'
      })
      expect(getProjectReleasesUC.getProjectReleases).toHaveBeenCalledWith({
        projectId: NaN
      })
    })

    it('retorna releases ordenadas', async () => {
      const mockReleases = ['2024-03', '2024-01', '2024-02']

      jest.spyOn(getProjectReleasesUC, 'getProjectReleases').mockResolvedValue(mockReleases)

      const response = await request(app)
        .get(`/projects/${project.id}/releases`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual(mockReleases)
      expect(getProjectReleasesUC.getProjectReleases).toHaveBeenCalledWith({
        projectId: project.id
      })
    })
  })
})

