// src/tests/infrastructure/auth.spec.ts
import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { auth } from '../../infrastructure/auth'

const unique = (p: string) =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

function tokenFor(id: number, email?: string) {
  const secret = process.env.JWT_SECRET || 'test-secret'
  return jwt.sign({ userId: id, email }, secret, { expiresIn: '1h' })
}

function invalidToken() {
  return 'invalid-token'
}

function expiredToken(id: number) {
  const secret = process.env.JWT_SECRET || 'test-secret'
  return jwt.sign({ userId: id }, secret, { expiresIn: '-1h' })
}

function tokenWithInvalidPayload() {
  const secret = process.env.JWT_SECRET || 'test-secret'
  return jwt.sign({ invalidField: 'invalid' }, secret, { expiresIn: '1h' })
}

function tokenWithNonIntegerUserId() {
  const secret = process.env.JWT_SECRET || 'test-secret'
  return jwt.sign({ userId: 'not-a-number' }, secret, { expiresIn: '1h' })
}

function tokenWithMissingUserId() {
  const secret = process.env.JWT_SECRET || 'test-secret'
  return jwt.sign({ email: 'test@example.com' }, secret, { expiresIn: '1h' })
}

let app: express.Express

describe('auth middleware', () => {
  beforeAll(() => {
    app = express()
    app.use(express.json())
    
    // Rota protegida para testar o middleware
    app.get('/protected', auth, (req: any, res) => {
      res.json({ 
        message: 'Acesso autorizado',
        userId: req.user?.id 
      })
    })
    
    // Rota para testar sem auth
    app.get('/public', (req, res) => {
      res.json({ message: 'Acesso público' })
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /protected', () => {
    it('permite acesso com token válido', async () => {
      const validToken = tokenFor(123, 'test@example.com')

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)

      expect(response.body).toEqual({
        message: 'Acesso autorizado',
        userId: 123
      })
    })

    it('permite acesso com token válido sem email', async () => {
      const validToken = tokenFor(456)

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)

      expect(response.body).toEqual({
        message: 'Acesso autorizado',
        userId: 456
      })
    })

    it('rejeita acesso sem token', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401)

      expect(response.body).toEqual({
        message: 'Não autenticado'
      })
    })

    it('rejeita acesso com header Authorization vazio', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', '')
        .expect(401)

      expect(response.body).toEqual({
        message: 'Não autenticado'
      })
    })

    it('rejeita acesso com scheme inválido (não Bearer)', async () => {
      const validToken = tokenFor(123)

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Basic ${validToken}`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Não autenticado'
      })
    })

    it('aceita acesso com scheme em maiúsculo (BEARER)', async () => {
      const validToken = tokenFor(123)

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `BEARER ${validToken}`)
        .expect(200)

      expect(response.body).toEqual({
        message: 'Acesso autorizado',
        userId: 123
      })
    })

    it('rejeita acesso com token inválido', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${invalidToken()}`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
    })

    it('rejeita acesso com token expirado', async () => {
      const expiredTokenValue = expiredToken(123)

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredTokenValue}`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
    })

    it('rejeita acesso com payload inválido (sem userId)', async () => {
      const invalidPayloadToken = tokenWithInvalidPayload()

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${invalidPayloadToken}`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
    })

    it('rejeita acesso com userId não inteiro', async () => {
      const nonIntegerToken = tokenWithNonIntegerUserId()

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${nonIntegerToken}`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
    })

    it('rejeita acesso com userId ausente', async () => {
      const missingUserIdToken = tokenWithMissingUserId()

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${missingUserIdToken}`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
    })

    it('rejeita acesso com userId null', async () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const nullUserIdToken = jwt.sign({ userId: null }, secret, { expiresIn: '1h' })

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${nullUserIdToken}`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
    })

    it('rejeita acesso com userId undefined', async () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const undefinedUserIdToken = jwt.sign({ userId: undefined }, secret, { expiresIn: '1h' })

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${undefinedUserIdToken}`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
    })

    it('rejeita acesso com userId 0', async () => {
      const zeroUserIdToken = tokenFor(0)

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${zeroUserIdToken}`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
    })

    it('aceita acesso com userId negativo', async () => {
      const negativeUserIdToken = tokenFor(-1)

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${negativeUserIdToken}`)
        .expect(200)

      expect(response.body).toEqual({
        message: 'Acesso autorizado',
        userId: -1
      })
    })

    it('rejeita acesso com userId decimal', async () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const decimalUserIdToken = jwt.sign({ userId: 123.45 }, secret, { expiresIn: '1h' })

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${decimalUserIdToken}`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
    })
  })

  describe('JWT_SECRET não configurado', () => {
    let originalSecret: string | undefined

    beforeAll(() => {
      originalSecret = process.env.JWT_SECRET
      delete process.env.JWT_SECRET
    })

    afterAll(() => {
      if (originalSecret !== undefined) {
        process.env.JWT_SECRET = originalSecret
      }
    })

    it('retorna erro 500 quando JWT_SECRET não está configurado', async () => {
      const validToken = tokenFor(123)

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(500)

      expect(response.body).toEqual({
        message: 'JWT secret not configured'
      })
    })
  })

  describe('GET /public', () => {
    it('permite acesso sem autenticação', async () => {
      const response = await request(app)
        .get('/public')
        .expect(200)

      expect(response.body).toEqual({
        message: 'Acesso público'
      })
    })
  })

  describe('Diferentes métodos HTTP', () => {
    beforeAll(() => {
      app.post('/protected', auth, (req: any, res) => {
        res.json({ message: 'POST autorizado', userId: req.user?.id })
      })
      
      app.put('/protected', auth, (req: any, res) => {
        res.json({ message: 'PUT autorizado', userId: req.user?.id })
      })
      
      app.delete('/protected', auth, (req: any, res) => {
        res.json({ message: 'DELETE autorizado', userId: req.user?.id })
      })
    })

    it('funciona com POST', async () => {
      const validToken = tokenFor(789)

      const response = await request(app)
        .post('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)

      expect(response.body).toEqual({
        message: 'POST autorizado',
        userId: 789
      })
    })

    it('funciona com PUT', async () => {
      const validToken = tokenFor(101)

      const response = await request(app)
        .put('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)

      expect(response.body).toEqual({
        message: 'PUT autorizado',
        userId: 101
      })
    })

    it('funciona com DELETE', async () => {
      const validToken = tokenFor(202)

      const response = await request(app)
        .delete('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)

      expect(response.body).toEqual({
        message: 'DELETE autorizado',
        userId: 202
      })
    })
  })

  describe('Casos extremos de header Authorization', () => {
    it('aceita acesso com espaço extra no header', async () => {
      const validToken = tokenFor(123)

      const response = await request(app)
        .get('/protected')
        .set('Authorization', ` Bearer ${validToken}`)
        .expect(200)

      expect(response.body).toEqual({
        message: 'Acesso autorizado',
        userId: 123
      })
    })

    it('rejeita acesso com múltiplos espaços', async () => {
      const validToken = tokenFor(123)

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer  ${validToken}`)
        .expect(401)

      expect(response.body).toEqual({
        message: 'Não autenticado'
      })
    })

    it('rejeita acesso com token vazio', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer ')
        .expect(401)

      expect(response.body).toEqual({
        message: 'Não autenticado'
      })
    })

    it('rejeita acesso com apenas Bearer', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer')
        .expect(401)

      expect(response.body).toEqual({
        message: 'Não autenticado'
      })
    })
  })
})
