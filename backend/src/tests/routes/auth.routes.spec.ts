import 'dotenv/config'
import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import authRouter from '../../routes/auth.routes'

// Mock do rate limiter
jest.mock('../../infrastructure/rateLimiter', () => ({
  publicLimiter: (_req: any, _res: any, next: any) => next(),
  loginLimiter: (_req: any, _res: any, next: any) => next(),
  registerLimiter: (_req: any, _res: any, next: any) => next(),
  uploadLimiter: (_req: any, _res: any, next: any) => next(),
  inviteLimiter: (_req: any, _res: any, next: any) => next(),
}))

describe('auth.routes', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
  let app: express.Express

  beforeEach(() => {
    // Garantir que o JWT_SECRET está configurado
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'test-secret'
    }

    // Criar uma nova instância do Express para cada teste
    app = express()
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    
    // Montar apenas o router de auth
    app.use(authRouter)

    // Error handler para capturar erros
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status = err?.statusCode || err?.status || 500
      res.status(status).json({ 
        message: err?.message || 'Internal Server Error' 
      })
    })
  })

  afterEach(() => {
    // Restaurar JWT_SECRET após cada teste que pode tê-lo alterado
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'test-secret'
    }
  })

  describe('POST /refresh-token', () => {
    it('deve gerar novo access token com refresh token válido', async () => {
      // Criar um refresh token válido
      const refreshToken = jwt.sign(
        { userId: 123, email: 'test@example.com', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      const response = await request(app)
        .post('/refresh-token')
        .send({ refreshToken })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('accessToken')
      expect(typeof response.body.accessToken).toBe('string')

      // Verificar que o access token é válido
      const decoded = jwt.verify(response.body.accessToken, JWT_SECRET) as any
      expect(decoded.userId).toBe(123)
      expect(decoded.email).toBe('test@example.com')
      expect(decoded.type).toBe('access')
    })

    it('deve retornar 400 quando refresh token não é fornecido', async () => {
      const response = await request(app)
        .post('/refresh-token')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Refresh token é obrigatório')
    })

    it('deve retornar 400 quando refresh token está vazio', async () => {
      const response = await request(app)
        .post('/refresh-token')
        .send({ refreshToken: '' })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Refresh token é obrigatório')
    })

    it('deve retornar 401 quando refresh token é inválido', async () => {
      const response = await request(app)
        .post('/refresh-token')
        .send({ refreshToken: 'invalid-token' })

      expect(response.status).toBe(401)
      expect(response.body.message).toBe('Token inválido')
    })

    it('deve retornar 401 quando token não é do tipo refresh', async () => {
      // Criar um access token em vez de refresh token
      const accessToken = jwt.sign(
        { userId: 123, email: 'test@example.com', type: 'access' },
        JWT_SECRET,
        { expiresIn: '1h' }
      )

      const response = await request(app)
        .post('/refresh-token')
        .send({ refreshToken: accessToken })

      expect(response.status).toBe(401)
      expect(response.body.message).toBe('Token inválido')
    })

    it('deve retornar 401 quando refresh token está expirado', async () => {
      // Criar um refresh token expirado
      const expiredToken = jwt.sign(
        { userId: 123, email: 'test@example.com', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      )

      const response = await request(app)
        .post('/refresh-token')
        .send({ refreshToken: expiredToken })

      expect(response.status).toBe(401)
      expect(response.body.message).toBe('Refresh token expirado')
    })

    it('deve retornar 500 quando JWT_SECRET não está configurado', async () => {
      const originalSecret = process.env.JWT_SECRET
      
      // Remover JWT_SECRET temporariamente
      delete process.env.JWT_SECRET

      // Criar uma nova instância do app com JWT_SECRET ausente
      const testApp = express()
      testApp.use(express.json())
      testApp.use(express.urlencoded({ extended: true }))
      testApp.use(authRouter)
      testApp.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        const status = err?.statusCode || err?.status || 500
        res.status(status).json({ 
          message: err?.message || 'Internal Server Error' 
        })
      })
      
      const refreshToken = jwt.sign(
        { userId: 123, email: 'test@example.com', type: 'refresh' },
        'temporary-secret',
        { expiresIn: '7d' }
      )

      const response = await request(testApp)
        .post('/refresh-token')
        .send({ refreshToken })

      expect(response.status).toBe(500)
      expect(response.body.message).toBe('JWT secret not configured')

      // Restaurar o secret
      process.env.JWT_SECRET = originalSecret
    })

    it('deve criar access token válido com expiração de 1h', async () => {
      const refreshToken = jwt.sign(
        { userId: 456, email: 'user@example.com', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      const response = await request(app)
        .post('/refresh-token')
        .send({ refreshToken })

      expect(response.status).toBe(200)
      const decoded = jwt.verify(response.body.accessToken, JWT_SECRET) as any
      
      // Verificar expiração (deve expirar em aproximadamente 1 hora)
      expect(decoded.exp).toBeDefined()
      const expirationTime = decoded.exp * 1000 // converter para milliseconds
      const now = Date.now()
      const timeUntilExpiry = expirationTime - now
      
      // Deve expirar em aproximadamente 1 hora (3600000 ms)
      expect(timeUntilExpiry).toBeGreaterThan(3500000) // ~58 minutos
      expect(timeUntilExpiry).toBeLessThan(3700000) // ~62 minutos
    })

    it('deve retornar 401 quando refresh token é malformado', async () => {
      const response = await request(app)
        .post('/refresh-token')
        .send({ refreshToken: 'Bearer invalid' })

      expect(response.status).toBe(401)
      expect(response.body.message).toBe('Token inválido')
    })

    it('deve preservar userId e email do refresh token no novo access token', async () => {
      const refreshToken = jwt.sign(
        { userId: 789, email: 'preserve@example.com', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      const response = await request(app)
        .post('/refresh-token')
        .send({ refreshToken })

      const decoded = jwt.verify(response.body.accessToken, JWT_SECRET) as any
      expect(decoded.userId).toBe(789)
      expect(decoded.email).toBe('preserve@example.com')
    })
  })
})

