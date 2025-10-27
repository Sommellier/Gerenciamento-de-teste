// src/tests/integration/profile/getProfile.controller.spec.ts
import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { getProfileController } from '../../../controllers/profile/getProfile.controller'
import { AppError } from '../../../utils/AppError'
import * as getProfileUC from '../../../application/use-cases/profile/getProfile.use-case'

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

describe('getProfile.controller', () => {
  let user: any
  let authToken: string

  beforeAll(async () => {
    app = express()
    app.use(express.json())
    app.get('/profile', auth, getProfileController)
    app.use(errorHandler)

    // Criar usuário para teste
    user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: unique('test@example.com'),
        password: 'password123'
      }
    })

    authToken = tokenFor(user.id)
  })

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.user.deleteMany({
      where: { id: user.id }
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /profile', () => {
    it('retorna perfil do usuário autenticado com sucesso', async () => {
      const mockProfile = {
        id: user.id,
        name: 'Test User',
        email: user.email,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      jest.spyOn(getProfileUC, 'getProfile').mockResolvedValue(mockProfile)

      const response = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual({
        id: user.id,
        name: 'Test User',
        email: user.email,
        avatar: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
      expect(getProfileUC.getProfile).toHaveBeenCalledWith(user.id)
    })

    it('retorna 401 quando usuário não está autenticado', async () => {
      const response = await request(app)
        .get('/profile')
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token não fornecido'
      })
      expect(getProfileUC.getProfile).not.toHaveBeenCalled()
    })

    it('retorna 401 quando token é inválido', async () => {
      const response = await request(app)
        .get('/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
      expect(getProfileUC.getProfile).not.toHaveBeenCalled()
    })

    it('trata AppError do use case', async () => {
      jest.spyOn(getProfileUC, 'getProfile').mockRejectedValue(new AppError('Usuário não encontrado', 404))

      const response = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body).toEqual({
        message: 'Usuário não encontrado'
      })
      expect(getProfileUC.getProfile).toHaveBeenCalledWith(user.id)
    })

    it('trata erro genérico do use case', async () => {
      jest.spyOn(getProfileUC, 'getProfile').mockRejectedValue(new Error('Erro interno'))

      const response = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)

      expect(response.body).toEqual({
        error: 'Erro interno',
        message: 'Erro interno'
      })
      expect(getProfileUC.getProfile).toHaveBeenCalledWith(user.id)
    })

    it('retorna perfil com dados completos', async () => {
      const mockProfile = {
        id: user.id,
        name: 'Test User',
        email: user.email,
        avatar: 'https://example.com/avatar.jpg',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z')
      }

      jest.spyOn(getProfileUC, 'getProfile').mockResolvedValue(mockProfile)

      const response = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual({
        id: user.id,
        name: 'Test User',
        email: user.email,
        avatar: 'https://example.com/avatar.jpg',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z'
      })
      expect(getProfileUC.getProfile).toHaveBeenCalledWith(user.id)
    })

    it('retorna perfil com dados mínimos', async () => {
      const mockProfile = {
        id: user.id,
        name: 'Test User',
        email: user.email,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      jest.spyOn(getProfileUC, 'getProfile').mockResolvedValue(mockProfile)

      const response = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual({
        id: user.id,
        name: 'Test User',
        email: user.email,
        avatar: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
      expect(getProfileUC.getProfile).toHaveBeenCalledWith(user.id)
    })
  })
})
