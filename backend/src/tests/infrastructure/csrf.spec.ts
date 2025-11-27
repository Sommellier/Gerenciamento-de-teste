import 'dotenv/config'
import { Request, Response, NextFunction } from 'express'
import { csrfProtection } from '../../infrastructure/csrf'
import { AppError } from '../../utils/AppError'

describe('csrfProtection middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let originalEnv: string | undefined

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/test',
      headers: {},
      body: {}
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    mockNext = jest.fn()
    
    // Limpar mocks
    jest.clearAllMocks()
    
    // Salvar NODE_ENV original
    originalEnv = process.env.NODE_ENV
  })

  afterEach(() => {
    // Restaurar NODE_ENV original
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv
    } else {
      delete process.env.NODE_ENV
    }
  })

  describe('ambiente de teste', () => {
    it('deve pular validação CSRF em ambiente de teste', () => {
      process.env.NODE_ENV = 'test'
      mockReq.method = 'POST'
      mockReq.headers = {}
      mockReq.body = {}

      csrfProtection(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalledTimes(1)
    })
  })

  describe('requisições com Bearer token', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('deve permitir POST com Bearer token', () => {
      mockReq.method = 'POST'
      mockReq.headers = {
        authorization: 'Bearer valid-token'
      }
      mockReq.body = {}

      csrfProtection(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalledTimes(1)
    })

    it('deve permitir PUT com Bearer token', () => {
      mockReq.method = 'PUT'
      mockReq.headers = {
        authorization: 'Bearer valid-token'
      }
      mockReq.body = {}

      csrfProtection(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('deve permitir PATCH com Bearer token', () => {
      mockReq.method = 'PATCH'
      mockReq.headers = {
        authorization: 'Bearer valid-token'
      }
      mockReq.body = {}

      csrfProtection(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('deve permitir DELETE com Bearer token', () => {
      mockReq.method = 'DELETE'
      mockReq.headers = {
        authorization: 'Bearer valid-token'
      }
      mockReq.body = {}

      csrfProtection(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('deve permitir mesmo sem CSRF token quando tem Bearer token', () => {
      mockReq.method = 'POST'
      mockReq.headers = {
        authorization: 'Bearer valid-token'
      }
      mockReq.body = {}

      csrfProtection(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('requisições sem Bearer token', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    describe('métodos de modificação de estado', () => {
      it('deve rejeitar POST sem Bearer token e sem CSRF token', () => {
        mockReq.method = 'POST'
        mockReq.headers = {}
        mockReq.body = {}

        expect(() => {
          csrfProtection(mockReq as Request, mockRes as Response, mockNext)
        }).toThrow('CSRF token requerido para esta operação')

        expect(mockNext).not.toHaveBeenCalled()
      })

      it('deve rejeitar PUT sem Bearer token e sem CSRF token', () => {
        mockReq.method = 'PUT'
        mockReq.headers = {}
        mockReq.body = {}

        expect(() => {
          csrfProtection(mockReq as Request, mockRes as Response, mockNext)
        }).toThrow('CSRF token requerido para esta operação')

        expect(mockNext).not.toHaveBeenCalled()
      })

      it('deve rejeitar PATCH sem Bearer token e sem CSRF token', () => {
        mockReq.method = 'PATCH'
        mockReq.headers = {}
        mockReq.body = {}

        expect(() => {
          csrfProtection(mockReq as Request, mockRes as Response, mockNext)
        }).toThrow('CSRF token requerido para esta operação')

        expect(mockNext).not.toHaveBeenCalled()
      })

      it('deve rejeitar DELETE sem Bearer token e sem CSRF token', () => {
        mockReq.method = 'DELETE'
        mockReq.headers = {}
        mockReq.body = {}

        expect(() => {
          csrfProtection(mockReq as Request, mockRes as Response, mockNext)
        }).toThrow('CSRF token requerido para esta operação')

        expect(mockNext).not.toHaveBeenCalled()
      })

      it('deve permitir POST com CSRF token no header', () => {
        mockReq.method = 'POST'
        mockReq.headers = {
          'x-csrf-token': 'valid-csrf-token'
        }
        mockReq.body = {}

        csrfProtection(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
      })

      it('deve permitir POST com CSRF token no body', () => {
        mockReq.method = 'POST'
        mockReq.headers = {}
        mockReq.body = {
          csrfToken: 'valid-csrf-token'
        }

        csrfProtection(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
      })

      it('deve permitir POST com CSRF token no header mesmo que body esteja vazio', () => {
        mockReq.method = 'POST'
        mockReq.headers = {
          'x-csrf-token': 'valid-csrf-token'
        }
        mockReq.body = {}

        csrfProtection(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
      })

      it('deve priorizar CSRF token do header sobre o body', () => {
        mockReq.method = 'POST'
        mockReq.headers = {
          'x-csrf-token': 'header-token'
        }
        mockReq.body = {
          csrfToken: 'body-token'
        }

        csrfProtection(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
      })
    })

    describe('métodos de leitura', () => {
      it('deve permitir GET sem Bearer token e sem CSRF token', () => {
        mockReq.method = 'GET'
        mockReq.headers = {}
        mockReq.body = {}

        csrfProtection(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
      })

      it('deve permitir HEAD sem Bearer token e sem CSRF token', () => {
        mockReq.method = 'HEAD'
        mockReq.headers = {}
        mockReq.body = {}

        csrfProtection(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
      })

      it('deve permitir OPTIONS sem Bearer token e sem CSRF token', () => {
        mockReq.method = 'OPTIONS'
        mockReq.headers = {}
        mockReq.body = {}

        csrfProtection(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
      })
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

      it('deve lidar com authorization header vazio', () => {
        mockReq.method = 'POST'
        mockReq.headers = {
          authorization: ''
        }
        mockReq.body = {}

        expect(() => {
          csrfProtection(mockReq as Request, mockRes as Response, mockNext)
        }).toThrow('CSRF token requerido para esta operação')

        expect(mockNext).not.toHaveBeenCalled()
      })

      it('deve lidar com authorization header undefined', () => {
        mockReq.method = 'POST'
        mockReq.headers = {}
        mockReq.body = {}

        expect(() => {
          csrfProtection(mockReq as Request, mockRes as Response, mockNext)
        }).toThrow('CSRF token requerido para esta operação')

        expect(mockNext).not.toHaveBeenCalled()
      })

      it('deve lidar com authorization que não começa com Bearer', () => {
        mockReq.method = 'POST'
        mockReq.headers = {
          authorization: 'Basic token123'
        }
        mockReq.body = {}

        expect(() => {
          csrfProtection(mockReq as Request, mockRes as Response, mockNext)
        }).toThrow('CSRF token requerido para esta operação')

        expect(mockNext).not.toHaveBeenCalled()
      })

    it('deve lidar com body undefined', () => {
      mockReq.method = 'POST'
      mockReq.headers = {
        'x-csrf-token': 'valid-token'
      }
      mockReq.body = undefined as any

      // Não deve lançar erro se tiver CSRF token no header
      csrfProtection(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('deve lidar com body null', () => {
      mockReq.method = 'POST'
      mockReq.headers = {
        'x-csrf-token': 'valid-token'
      }
      mockReq.body = null as any

      // Não deve lançar erro se tiver CSRF token no header
      csrfProtection(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('produção', () => {
    it('deve funcionar corretamente em produção', () => {
      process.env.NODE_ENV = 'production'
      mockReq.method = 'POST'
      mockReq.headers = {
        authorization: 'Bearer valid-token'
      }
      mockReq.body = {}

      csrfProtection(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

      it('deve rejeitar em produção sem Bearer token e sem CSRF token', () => {
        process.env.NODE_ENV = 'production'
        mockReq.method = 'POST'
        mockReq.headers = {}
        mockReq.body = {}

        expect(() => {
          csrfProtection(mockReq as Request, mockRes as Response, mockNext)
        }).toThrow('CSRF token requerido para esta operação')

        expect(mockNext).not.toHaveBeenCalled()
      })
  })
})

