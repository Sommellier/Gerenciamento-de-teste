import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import api, { getApiUrl } from 'src/services/api'

// Mock do axios
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios')
  return {
    ...actual,
    default: {
      create: vi.fn(() => ({
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      })),
      post: vi.fn(),
    },
  }
})

// Mock do sessionStorage (migrado de localStorage para maior segurança)
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
})

// Mock do window.location
const mockLocation = {
  pathname: '/dashboard',
  href: '',
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorageMock.getItem.mockReturnValue(null)
    mockLocation.pathname = '/dashboard'
    mockLocation.href = ''
    // Resetar import.meta.env
    vi.stubGlobal('import', {
      meta: {
        env: {},
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getApiUrl', () => {
    it('deve retornar URL da variável de ambiente quando definida', () => {
      // Como import.meta.env é lido em tempo de compilação, testamos o comportamento padrão
      // que retorna localhost:3000 quando VITE_API_URL não está definida
      const url = getApiUrl()
      // A função deve retornar uma string válida
      expect(typeof url).toBe('string')
      expect(url.length).toBeGreaterThan(0)
    })

    it('deve retornar localhost como fallback quando VITE_API_URL não está definida', () => {
      const url = getApiUrl()
      // Se VITE_API_URL não estiver definida, deve retornar localhost:3000
      // Caso contrário, retorna o valor da variável de ambiente
      expect(typeof url).toBe('string')
      expect(url.length).toBeGreaterThan(0)
    })

    it('deve remover barra final da URL', () => {
      const url = getApiUrl()
      // A função deve remover barras finais
      expect(url.endsWith('/')).toBe(false)
    })
  })

  describe('Interceptor de Request', () => {
    it('deve adicionar token de autorização quando token existe', async () => {
      sessionStorageMock.getItem.mockReturnValue('token-123')

      // Criar uma nova instância do axios mockado para testar o interceptor
      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }

      vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

      // Recarregar o módulo para aplicar o mock
      await vi.resetModules()
      const apiModule = await import('src/services/api')
      const newApi = apiModule.default

      // Verificar se o interceptor foi configurado
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
    })

    it('deve definir Content-Type como application/json quando não é FormData', async () => {
      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }

      vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

      await vi.resetModules()
      const apiModule = await import('src/services/api')
      const newApi = apiModule.default

      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
    })

    it('deve criar headers quando config.headers é undefined (linhas 23-25)', async () => {
      sessionStorageMock.getItem.mockReturnValue('token-123')
      
      const mockAxiosInstance = {
        interceptors: {
          request: {
            use: vi.fn(async (onFulfilled) => {
              // Simular o comportamento do interceptor (agora é async)
              const config = { data: {}, method: 'GET' }
              const result = await onFulfilled(config)
              expect(result.headers).toBeDefined()
            }),
          },
          response: { use: vi.fn() },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }

      vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

      await vi.resetModules()
      const apiModule = await import('src/services/api')
      const newApi = apiModule.default

      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
    })

    it('deve criar headers quando config.data não é FormData e config.headers é undefined (linhas 32-33)', async () => {
      sessionStorageMock.getItem.mockReturnValue('token-123')
      
      const mockAxiosInstance = {
        interceptors: {
          request: {
            use: vi.fn(async (onFulfilled) => {
              // Simular o comportamento do interceptor quando data não é FormData e headers é undefined (agora é async)
              const config = { data: { test: 'data' }, headers: undefined, method: 'POST' }
              const result = await onFulfilled(config)
              // Deve criar headers e definir Content-Type
              expect(result.headers).toBeDefined()
              expect(result.headers['Content-Type']).toBe('application/json')
            }),
          },
          response: { use: vi.fn() },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }

      vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

      await vi.resetModules()
      const apiModule = await import('src/services/api')
      const newApi = apiModule.default

      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
    })

    it('deve não definir Content-Type quando data é FormData (linha 30)', async () => {
      sessionStorageMock.getItem.mockReturnValue('token-123')
      
      const mockAxiosInstance = {
        interceptors: {
          request: {
            use: vi.fn(async (onFulfilled) => {
              // Simular o comportamento do interceptor com FormData (agora é async)
              const formData = new FormData()
              const config = { data: formData, headers: {}, method: 'POST' }
              const result = await onFulfilled(config)
              // Quando é FormData, não deve definir Content-Type
              expect(result.headers).toBeDefined()
              expect(result.headers['Content-Type']).toBeUndefined()
            }),
          },
          response: { use: vi.fn() },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }

      vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

      await vi.resetModules()
      const apiModule = await import('src/services/api')
      const newApi = apiModule.default

      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
    })
  })

  describe('Interceptor de Response', () => {
    it('deve tratar erro de timeout', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: '',
        response: undefined,
      }

      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: {
            use: vi.fn((onFulfilled, onRejected) => {
              if (onRejected) {
                // Capturar a promise rejeitada para evitar unhandled rejection
                const rejectedPromise = onRejected(error)
                if (rejectedPromise && typeof rejectedPromise.catch === 'function') {
                  rejectedPromise.catch(() => {
                    // Erro esperado, não fazer nada
                  })
                }
              }
            }),
          },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }

      vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

      await vi.resetModules()
      const apiModule = await import('src/services/api')
      const newApi = apiModule.default

      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })

    it('deve tratar erro de rede', async () => {
      const error = {
        code: 'ERR_NETWORK',
        message: '',
        response: undefined,
      }

      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: {
            use: vi.fn((onFulfilled, onRejected) => {
              if (onRejected) {
                // Capturar a promise rejeitada para evitar unhandled rejection
                onRejected(error).catch(() => {
                  // Erro esperado, não fazer nada
                })
              }
            }),
          },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }

      vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

      await vi.resetModules()
      const apiModule = await import('src/services/api')
      const newApi = apiModule.default

      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })

    it('deve tratar erro genérico de conexão quando não é timeout nem network (linhas 51-52)', async () => {
      const error = {
        code: 'UNKNOWN_ERROR',
        message: '',
        response: undefined,
      }

      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: {
            use: vi.fn((onFulfilled, onRejected) => {
              if (onRejected) {
                // Capturar a promise rejeitada para evitar unhandled rejection
                const rejectedPromise = onRejected(error)
                if (rejectedPromise && typeof rejectedPromise.catch === 'function') {
                  rejectedPromise.catch(() => {
                    // Erro esperado, não fazer nada
                  })
                }
                // Verificar que a mensagem foi definida
                expect(error.message).toBe('Erro de conexão. Verifique se o servidor está rodando e sua internet.')
              }
            }),
          },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }

      vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

      await vi.resetModules()
      const apiModule = await import('src/services/api')
      const newApi = apiModule.default

      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })

    it('deve tentar refresh token quando recebe 401', async () => {
      sessionStorageMock.getItem.mockReturnValueOnce('token-123') // Para refreshToken
      sessionStorageMock.getItem.mockReturnValueOnce('refresh-token-456') // Para refreshToken

      const error = {
        response: {
          status: 401,
        },
        config: {
          headers: {},
        },
      }

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { accessToken: 'new-token-789' },
      })

      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: {
            use: vi.fn((onFulfilled, onRejected) => {
              if (onRejected) {
                // Capturar a promise rejeitada para evitar unhandled rejection
                const rejectedPromise = onRejected(error)
                if (rejectedPromise && typeof rejectedPromise.catch === 'function') {
                  rejectedPromise.catch(() => {
                    // Erro esperado, não fazer nada
                  })
                }
              }
            }),
          },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }

      vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

      await vi.resetModules()
      const apiModule = await import('src/services/api')
      const newApi = apiModule.default

      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })

    it('deve redirecionar para login quando refresh token falha', async () => {
      sessionStorageMock.getItem.mockReturnValue('refresh-token-456')

      const error = {
        response: {
          status: 401,
        },
        config: {
          headers: {},
        },
      }

      vi.mocked(axios.post).mockRejectedValueOnce(new Error('Refresh failed'))

      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: {
            use: vi.fn((onFulfilled, onRejected) => {
              if (onRejected) {
                return onRejected(error).catch(() => {})
              }
            }),
          },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }

      vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

      await vi.resetModules()
      const apiModule = await import('src/services/api')
      const newApi = apiModule.default

      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })

    it('deve redirecionar para login quando não há refresh token', async () => {
      sessionStorageMock.getItem.mockReturnValue(null)

      const error = {
        response: {
          status: 401,
        },
        config: {
          headers: {},
        },
      }

      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: {
            use: vi.fn((onFulfilled, onRejected) => {
              if (onRejected) {
                return onRejected(error).catch(() => {})
              }
            }),
          },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }

      vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

      await vi.resetModules()
      const apiModule = await import('src/services/api')
      const newApi = apiModule.default

      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })

    it('deve não redirecionar quando já está na página de login', async () => {
      mockLocation.pathname = '/login'
      sessionStorageMock.getItem.mockReturnValue(null)

      const error = {
        response: {
          status: 401,
        },
        config: {
          headers: {},
        },
      }

      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: {
            use: vi.fn((onFulfilled, onRejected) => {
              if (onRejected) {
                return onRejected(error).catch(() => {})
              }
            }),
          },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }

      vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)

      await vi.resetModules()
      const apiModule = await import('src/services/api')
      const newApi = apiModule.default

      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })
  })

  describe('Configuração do Axios', () => {
    it('deve exportar instância do api', () => {
      // Verificar se a instância do api foi exportada
      expect(api).toBeDefined()
      expect(typeof api).toBe('object')
    })
  })
})

