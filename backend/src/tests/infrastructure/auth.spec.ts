import 'dotenv/config'
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { auth, authWithRateLimit } from '../../infrastructure/auth'
import { userLimiter } from '../../infrastructure/rateLimiter'

// Mock do rate limiter
jest.mock('../../infrastructure/rateLimiter', () => ({
  userLimiter: jest.fn((req, res, next) => next())
}))

// Mock do console.log para evitar logs durante os testes
const originalConsoleLog = console.log
beforeAll(() => {
  console.log = jest.fn()
})

afterAll(() => {
  console.log = originalConsoleLog
})

describe('auth middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/test',
      headers: {}
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    mockNext = jest.fn()
    
    // Limpar mocks
    jest.clearAllMocks()
  })

  describe('successful authentication', () => {
    it('deve autenticar com token válido', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const token = jwt.sign({ userId: 123 }, secret, { expiresIn: '1h' })
      
      mockReq.headers = { authorization: `Bearer ${token}` }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect((mockReq as any).user).toEqual({ id: 123 })
    })

    it('deve autenticar com token válido contendo email', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const token = jwt.sign({ userId: 456, email: 'test@example.com' }, secret, { expiresIn: '1h' })
      
      mockReq.headers = { authorization: `Bearer ${token}` }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect((mockReq as any).user).toEqual({ id: 456 })
    })
  })

  describe('authentication failures', () => {
    it('deve rejeitar quando não há header de autorização', () => {
      mockReq.headers = {}

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Não autenticado' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('deve rejeitar quando header de autorização está vazio', () => {
      mockReq.headers = { authorization: '' }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Não autenticado' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('deve rejeitar quando esquema não é Bearer', () => {
      mockReq.headers = { authorization: 'Basic token123' }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Não autenticado' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('deve rejeitar quando esquema é Bearer mas não há token', () => {
      mockReq.headers = { authorization: 'Bearer' }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Não autenticado' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('deve rejeitar quando JWT_SECRET não está configurado', () => {
      const originalSecret = process.env.JWT_SECRET
      delete process.env.JWT_SECRET

      mockReq.headers = { authorization: 'Bearer token123' }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'JWT secret not configured' })
      expect(mockNext).not.toHaveBeenCalled()

      // Restaurar o secret
      process.env.JWT_SECRET = originalSecret
    })

    it('deve rejeitar token inválido', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token inválido' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('deve rejeitar token expirado', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const expiredToken = jwt.sign({ userId: 123 }, secret, { expiresIn: '-1h' })
      
      mockReq.headers = { authorization: `Bearer ${expiredToken}` }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token inválido' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('deve rejeitar quando payload não tem userId', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const token = jwt.sign({ email: 'test@example.com' }, secret, { expiresIn: '1h' })
      
      mockReq.headers = { authorization: `Bearer ${token}` }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token inválido' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('deve rejeitar quando userId não é um número inteiro', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const token = jwt.sign({ userId: 'not-a-number' }, secret, { expiresIn: '1h' })
      
      mockReq.headers = { authorization: `Bearer ${token}` }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token inválido' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('deve rejeitar quando userId é um número decimal', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const token = jwt.sign({ userId: 123.45 }, secret, { expiresIn: '1h' })
      
      mockReq.headers = { authorization: `Bearer ${token}` }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token inválido' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('deve rejeitar quando userId é null', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const token = jwt.sign({ userId: null }, secret, { expiresIn: '1h' })
      
      mockReq.headers = { authorization: `Bearer ${token}` }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token inválido' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('deve rejeitar quando userId é undefined', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const token = jwt.sign({}, secret, { expiresIn: '1h' })
      
      mockReq.headers = { authorization: `Bearer ${token}` }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token inválido' })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('case sensitivity', () => {
    it('deve aceitar Bearer em maiúsculas', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const token = jwt.sign({ userId: 123 }, secret, { expiresIn: '1h' })
      
      mockReq.headers = { authorization: `BEARER ${token}` }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect((mockReq as any).user).toEqual({ id: 123 })
    })

    it('deve aceitar Bearer em minúsculas', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const token = jwt.sign({ userId: 123 }, secret, { expiresIn: '1h' })
      
      mockReq.headers = { authorization: `bearer ${token}` }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect((mockReq as any).user).toEqual({ id: 123 })
    })
  })

  describe('edge cases', () => {
    it('deve lidar com múltiplos espaços no header', () => {
      mockReq.headers = { authorization: 'Bearer  token123' }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Não autenticado' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('deve lidar com token que contém espaços', () => {
      mockReq.headers = { authorization: 'Bearer token with spaces' }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token inválido' })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('token type validation', () => {
    it('deve rejeitar token com type diferente de access', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const token = jwt.sign({ userId: 123, type: 'refresh' }, secret, { expiresIn: '1h' })
      
      mockReq.headers = { authorization: `Bearer ${token}` }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Tipo de token inválido' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('deve aceitar token com type access', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const token = jwt.sign({ userId: 123, type: 'access' }, secret, { expiresIn: '1h' })
      
      mockReq.headers = { authorization: `Bearer ${token}` }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect((mockReq as any).user).toEqual({ id: 123 })
    })

    it('deve aceitar token sem type (compatibilidade)', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const token = jwt.sign({ userId: 123 }, secret, { expiresIn: '1h' })
      
      mockReq.headers = { authorization: `Bearer ${token}` }

      auth(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect((mockReq as any).user).toEqual({ id: 123 })
    })
  })

  describe('authWithRateLimit', () => {
    it('deve autenticar e aplicar rate limit quando token é válido', () => {
      const secret = process.env.JWT_SECRET || 'test-secret'
      const token = jwt.sign({ userId: 123 }, secret, { expiresIn: '1h' })
      
      mockReq.headers = { authorization: `Bearer ${token}` }

      authWithRateLimit(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect((mockReq as any).user).toEqual({ id: 123 })
      expect(userLimiter).toHaveBeenCalled()
    })

    it('deve rejeitar e não aplicar rate limit quando token é inválido', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' }

      authWithRateLimit(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token inválido' })
      expect(mockNext).not.toHaveBeenCalled()
      expect(userLimiter).not.toHaveBeenCalled()
    })

    it('deve rejeitar e não aplicar rate limit quando não há token', () => {
      mockReq.headers = {}

      authWithRateLimit(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Não autenticado' })
      expect(mockNext).not.toHaveBeenCalled()
      expect(userLimiter).not.toHaveBeenCalled()
    })
  })
})