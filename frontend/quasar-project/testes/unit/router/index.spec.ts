import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'
import createRouterInstance from 'src/router/index'

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

// Mock das variáveis de ambiente
const originalEnv = process.env

describe('Router Index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorageMock.getItem.mockReturnValue(null)
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Criação do Router', () => {
    it('deve criar router com histórico correto no ambiente cliente', () => {
      process.env.SERVER = undefined
      process.env.VUE_ROUTER_MODE = 'history'
      process.env.VUE_ROUTER_BASE = '/'

      const router = createRouterInstance()

      expect(router).toBeDefined()
      expect(router.getRoutes().length).toBeGreaterThan(0)
    })

    it('deve criar router com hash history quando VUE_ROUTER_MODE não é history', () => {
      process.env.SERVER = undefined
      process.env.VUE_ROUTER_MODE = 'hash'
      process.env.VUE_ROUTER_BASE = '/'

      const router = createRouterInstance()

      expect(router).toBeDefined()
      expect(router.getRoutes().length).toBeGreaterThan(0)
    })

    it('deve criar router com memory history no ambiente servidor', () => {
      process.env.SERVER = 'true'
      process.env.VUE_ROUTER_MODE = 'history'
      process.env.VUE_ROUTER_BASE = '/'

      const router = createRouterInstance()

      expect(router).toBeDefined()
      expect(router.getRoutes().length).toBeGreaterThan(0)
    })

    it('deve configurar scrollBehavior corretamente', async () => {
      process.env.SERVER = undefined
      process.env.VUE_ROUTER_MODE = 'history'
      process.env.VUE_ROUTER_BASE = '/'

      const router = createRouterInstance()
      const scrollBehavior = router.options.scrollBehavior

      if (scrollBehavior) {
        const result = scrollBehavior({} as any, {} as any, {} as any)
        expect(result).toEqual({ left: 0, top: 0 })
      }
    })
  })

  describe('Guarda de Navegação (beforeEach)', () => {
    beforeEach(() => {
      process.env.SERVER = undefined
      process.env.VUE_ROUTER_MODE = 'history'
      process.env.VUE_ROUTER_BASE = '/'
    })

    it('deve redirecionar para login quando não autenticado e acessa rota protegida', async () => {
      sessionStorageMock.getItem.mockReturnValue(null) // Não autenticado

      const router = createRouterInstance()
      await router.push('/dashboard')

      expect(router.currentRoute.value.name).toBe('login')
      expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
    })

    it('deve permitir acesso a rota protegida quando autenticado', async () => {
      sessionStorageMock.getItem.mockReturnValue('token-123') // Autenticado

      const router = createRouterInstance()
      await router.push('/dashboard')

      expect(router.currentRoute.value.name).toBe('dashboard')
    })

    it('deve redirecionar para dashboard quando autenticado tenta acessar login', async () => {
      sessionStorageMock.getItem.mockReturnValue('token-123') // Autenticado

      const router = createRouterInstance()
      await router.push('/login')

      expect(router.currentRoute.value.name).toBe('dashboard')
    })

    it('deve redirecionar para dashboard quando autenticado tenta acessar register', async () => {
      sessionStorageMock.getItem.mockReturnValue('token-123') // Autenticado

      const router = createRouterInstance()
      await router.push('/register')

      expect(router.currentRoute.value.name).toBe('dashboard')
    })

    it('deve redirecionar para dashboard quando autenticado tenta acessar forgot-password', async () => {
      sessionStorageMock.getItem.mockReturnValue('token-123') // Autenticado

      const router = createRouterInstance()
      await router.push('/forgot-password')

      expect(router.currentRoute.value.name).toBe('dashboard')
    })

    it('deve redirecionar para dashboard quando autenticado tenta acessar reset-password', async () => {
      sessionStorageMock.getItem.mockReturnValue('token-123') // Autenticado

      const router = createRouterInstance()
      await router.push('/reset-password')

      expect(router.currentRoute.value.name).toBe('dashboard')
    })

    it('deve permitir acesso a rotas públicas quando não autenticado', async () => {
      sessionStorageMock.getItem.mockReturnValue(null) // Não autenticado

      const router = createRouterInstance()
      await router.push('/login')

      expect(router.currentRoute.value.name).toBe('login')
    })

    it('deve preservar query params no redirecionamento', async () => {
      sessionStorageMock.getItem.mockReturnValue(null) // Não autenticado

      const router = createRouterInstance()
      await router.push({ path: '/dashboard', query: { tab: 'settings' } })

      expect(router.currentRoute.value.name).toBe('login')
      expect(router.currentRoute.value.query.redirect).toBe('/dashboard?tab=settings')
    })

    it('deve permitir acesso a rota protegida com query params quando autenticado', async () => {
      sessionStorageMock.getItem.mockReturnValue('token-123') // Autenticado

      const router = createRouterInstance()
      await router.push({ path: '/projects/1', query: { tab: 'packages' } })

      expect(router.currentRoute.value.name).toBe('project-details')
      expect(router.currentRoute.value.params.projectId).toBe('1')
      expect(router.currentRoute.value.query.tab).toBe('packages')
    })
  })

  describe('Função isLoggedIn', () => {
    it('deve retornar true quando token existe no sessionStorage', async () => {
      sessionStorageMock.getItem.mockReturnValue('token-123')

      const router = createRouterInstance()
      // A função isLoggedIn é chamada durante a navegação
      await router.push('/dashboard')

      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('token')
      expect(router.currentRoute.value.name).toBe('dashboard')
    })

    it('deve retornar false quando token não existe no sessionStorage', async () => {
      sessionStorageMock.getItem.mockReturnValue(null)

      const router = createRouterInstance()
      // Quando não há token, o router redireciona para login
      await router.push('/dashboard')

      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('token')
      expect(router.currentRoute.value.name).toBe('login')
    })

    it('deve retornar false quando token é string vazia', async () => {
      sessionStorageMock.getItem.mockReturnValue('')

      const router = createRouterInstance()
      // String vazia deve ser tratada como não autenticado
      await router.push('/dashboard')

      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('token')
      expect(router.currentRoute.value.name).toBe('login')
    })
  })

  describe('Rotas', () => {
    beforeEach(() => {
      process.env.SERVER = undefined
      process.env.VUE_ROUTER_MODE = 'history'
      process.env.VUE_ROUTER_BASE = '/'
    })

    it('deve ter todas as rotas definidas', () => {
      const router = createRouterInstance()
      const routes = router.getRoutes()

      const routeNames = routes.map(route => route.name).filter(Boolean)

      // Verificar se rotas principais existem
      expect(routeNames).toContain('login')
      expect(routeNames).toContain('register')
      expect(routeNames).toContain('forgot')
      expect(routeNames).toContain('reset')
      expect(routeNames).toContain('dashboard')
      expect(routeNames).toContain('projects')
      expect(routeNames).toContain('packages')
      expect(routeNames).toContain('profile')
    })

    it('deve ter rota catch-all para 404', () => {
      const router = createRouterInstance()
      const routes = router.getRoutes()

      const catchAllRoute = routes.find(route => route.path === '/:catchAll(.*)*')
      expect(catchAllRoute).toBeDefined()
    })

    it('deve redirecionar rota raiz para login', async () => {
      sessionStorageMock.getItem.mockReturnValue(null)

      const router = createRouterInstance()
      await router.push('/')

      expect(router.currentRoute.value.name).toBe('login')
    })
  })
})

