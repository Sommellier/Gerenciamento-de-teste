import { describe, it, expect } from 'vitest'
import routes from 'src/router/routes'
import type { RouteRecordRaw } from 'vue-router'

describe('Router Routes', () => {
  describe('Estrutura de Rotas', () => {
    it('deve exportar array de rotas', () => {
      expect(Array.isArray(routes)).toBe(true)
      expect(routes.length).toBeGreaterThan(0)
    })

    it('deve ter rota principal com layout', () => {
      const mainRoute = routes.find(route => route.path === '/')
      expect(mainRoute).toBeDefined()
      expect(mainRoute?.component).toBeDefined()
    })

    it('deve ter rota catch-all para 404', () => {
      const catchAllRoute = routes.find(route => route.path === '/:catchAll(.*)*')
      expect(catchAllRoute).toBeDefined()
      expect(catchAllRoute?.component).toBeDefined()
    })
  })

  describe('Rotas Públicas', () => {
    const mainRoute = routes.find(route => route.path === '/') as RouteRecordRaw
    const publicRoutes = mainRoute?.children?.filter(
      route => !route.meta?.requiresAuth
    ) || []

    it('deve ter rota de login', () => {
      const loginRoute = publicRoutes.find(route => route.name === 'login')
      expect(loginRoute).toBeDefined()
      expect(loginRoute?.path).toBe('login')
      expect(loginRoute?.component).toBeDefined()
    })

    it('deve ter rota de registro', () => {
      const registerRoute = publicRoutes.find(route => route.name === 'register')
      expect(registerRoute).toBeDefined()
      expect(registerRoute?.path).toBe('register')
      expect(registerRoute?.component).toBeDefined()
    })

    it('deve ter rota de esqueci senha', () => {
      const forgotRoute = publicRoutes.find(route => route.name === 'forgot')
      expect(forgotRoute).toBeDefined()
      expect(forgotRoute?.path).toBe('forgot-password')
      expect(forgotRoute?.component).toBeDefined()
    })

    it('deve ter rota de resetar senha', () => {
      const resetRoute = publicRoutes.find(route => route.name === 'reset')
      expect(resetRoute).toBeDefined()
      expect(resetRoute?.path).toBe('reset-password')
      expect(resetRoute?.component).toBeDefined()
    })

    it('deve ter redirecionamento da rota raiz para login', () => {
      const rootRedirect = mainRoute?.children?.find(route => route.path === '')
      expect(rootRedirect).toBeDefined()
      expect(rootRedirect?.redirect).toEqual({ name: 'login' })
    })
  })

  describe('Rotas Protegidas', () => {
    const mainRoute = routes.find(route => route.path === '/') as RouteRecordRaw
    const protectedRoutes = mainRoute?.children?.filter(
      route => route.meta?.requiresAuth === true
    ) || []

    it('deve ter rota de dashboard protegida', () => {
      const dashboardRoute = protectedRoutes.find(route => route.name === 'dashboard')
      expect(dashboardRoute).toBeDefined()
      expect(dashboardRoute?.path).toBe('dashboard')
      expect(dashboardRoute?.meta?.requiresAuth).toBe(true)
      expect(dashboardRoute?.component).toBeDefined()
    })

    it('deve ter rota de convites protegida', () => {
      const invitesRoute = protectedRoutes.find(route => route.name === 'invites')
      expect(invitesRoute).toBeDefined()
      expect(invitesRoute?.path).toBe('invites')
      expect(invitesRoute?.meta?.requiresAuth).toBe(true)
      expect(invitesRoute?.component).toBeDefined()
    })

    it('deve ter rotas de projetos protegidas', () => {
      const projectsRoute = protectedRoutes.find(route => route.name === 'projects')
      const projectCreateRoute = protectedRoutes.find(route => route.name === 'project-create')
      const projectDetailsRoute = protectedRoutes.find(route => route.name === 'project-details')
      const projectEditRoute = protectedRoutes.find(route => route.name === 'project-edit')

      expect(projectsRoute).toBeDefined()
      expect(projectsRoute?.meta?.requiresAuth).toBe(true)

      expect(projectCreateRoute).toBeDefined()
      expect(projectCreateRoute?.meta?.requiresAuth).toBe(true)

      expect(projectDetailsRoute).toBeDefined()
      expect(projectDetailsRoute?.meta?.requiresAuth).toBe(true)

      expect(projectEditRoute).toBeDefined()
      expect(projectEditRoute?.meta?.requiresAuth).toBe(true)
    })

    it('deve ter rotas de cenários protegidas', () => {
      const scenariosRoute = protectedRoutes.find(route => route.name === 'scenarios')
      const createScenarioRoute = protectedRoutes.find(route => route.name === 'create-scenario')

      expect(scenariosRoute).toBeDefined()
      expect(scenariosRoute?.meta?.requiresAuth).toBe(true)

      expect(createScenarioRoute).toBeDefined()
      expect(createScenarioRoute?.meta?.requiresAuth).toBe(true)
    })

    it('deve ter rotas de pacotes protegidas', () => {
      const packagesRoute = protectedRoutes.find(route => route.name === 'packages')
      const packageDetailsRoute = protectedRoutes.find(route => route.name === 'package-details')
      const packageScenariosRoute = protectedRoutes.find(route => route.name === 'package-scenarios')
      const createPackageRoute = protectedRoutes.find(route => route.name === 'create-package')
      const editPackageRoute = protectedRoutes.find(route => route.name === 'edit-package')

      expect(packagesRoute).toBeDefined()
      expect(packagesRoute?.meta?.requiresAuth).toBe(true)

      expect(packageDetailsRoute).toBeDefined()
      expect(packageDetailsRoute?.meta?.requiresAuth).toBe(true)

      expect(packageScenariosRoute).toBeDefined()
      expect(packageScenariosRoute?.meta?.requiresAuth).toBe(true)

      expect(createPackageRoute).toBeDefined()
      expect(createPackageRoute?.meta?.requiresAuth).toBe(true)

      expect(editPackageRoute).toBeDefined()
      expect(editPackageRoute?.meta?.requiresAuth).toBe(true)
    })

    it('deve ter rotas de execução de cenário protegidas', () => {
      const scenarioDetailsRoute = protectedRoutes.find(route => route.name === 'scenario-details')
      const scenarioExecutionRoute = protectedRoutes.find(route => route.name === 'scenario-execution')

      expect(scenarioDetailsRoute).toBeDefined()
      expect(scenarioDetailsRoute?.meta?.requiresAuth).toBe(true)

      expect(scenarioExecutionRoute).toBeDefined()
      expect(scenarioExecutionRoute?.meta?.requiresAuth).toBe(true)
    })

    it('deve ter rota de perfil protegida', () => {
      const profileRoute = protectedRoutes.find(route => route.name === 'profile')
      expect(profileRoute).toBeDefined()
      expect(profileRoute?.path).toBe('profile')
      expect(profileRoute?.meta?.requiresAuth).toBe(true)
      expect(profileRoute?.component).toBeDefined()
    })
  })

  describe('Parâmetros de Rota', () => {
    const mainRoute = routes.find(route => route.path === '/') as RouteRecordRaw
    const allRoutes = mainRoute?.children || []

    it('deve ter rota de detalhes de projeto com parâmetro projectId', () => {
      const projectDetailsRoute = allRoutes.find(route => route.name === 'project-details')
      expect(projectDetailsRoute).toBeDefined()
      expect(projectDetailsRoute?.path).toBe('projects/:projectId')
    })

    it('deve ter rota de edição de projeto com parâmetro id', () => {
      const projectEditRoute = allRoutes.find(route => route.name === 'project-edit')
      expect(projectEditRoute).toBeDefined()
      expect(projectEditRoute?.path).toBe('projects/:id/edit')
    })

    it('deve ter rota de detalhes de pacote com parâmetros projectId e packageId', () => {
      const packageDetailsRoute = allRoutes.find(route => route.name === 'package-details')
      expect(packageDetailsRoute).toBeDefined()
      expect(packageDetailsRoute?.path).toBe('projects/:projectId/packages/:packageId')
    })

    it('deve ter rota de edição de pacote com parâmetros projectId e packageId', () => {
      const editPackageRoute = allRoutes.find(route => route.name === 'edit-package')
      expect(editPackageRoute).toBeDefined()
      expect(editPackageRoute?.path).toBe('projects/:projectId/packages/:packageId/edit')
    })

    it('deve ter rota de detalhes de cenário com parâmetros projectId, packageId e scenarioId', () => {
      const scenarioDetailsRoute = allRoutes.find(route => route.name === 'scenario-details')
      expect(scenarioDetailsRoute).toBeDefined()
      expect(scenarioDetailsRoute?.path).toBe('projects/:projectId/packages/:packageId/scenarios/:scenarioId')
    })

    it('deve ter rota de execução de cenário com parâmetros projectId, packageId e scenarioId', () => {
      const scenarioExecutionRoute = allRoutes.find(route => route.name === 'scenario-execution')
      expect(scenarioExecutionRoute).toBeDefined()
      expect(scenarioExecutionRoute?.path).toBe('projects/:projectId/packages/:packageId/scenarios/:scenarioId/execute')
    })
  })

  describe('Componentes Lazy Loading', () => {
    const mainRoute = routes.find(route => route.path === '/') as RouteRecordRaw
    const allRoutes = mainRoute?.children || []

    it('deve ter componentes carregados dinamicamente', () => {
      const routesWithComponents = allRoutes.filter(route => route.component)
      
      routesWithComponents.forEach(route => {
        if (route.component) {
          // Verificar se é uma função (lazy loading) ou um componente
          expect(
            typeof route.component === 'function' || 
            typeof route.component === 'object'
          ).toBe(true)
        }
      })
    })

    it('deve ter rota 404 com componente carregado dinamicamente', () => {
      const catchAllRoute = routes.find(route => route.path === '/:catchAll(.*)*')
      expect(catchAllRoute?.component).toBeDefined()
      
      if (catchAllRoute?.component) {
        expect(
          typeof catchAllRoute.component === 'function' || 
          typeof catchAllRoute.component === 'object'
        ).toBe(true)
      }
    })
  })

  describe('Nomes de Rotas', () => {
    const mainRoute = routes.find(route => route.path === '/') as RouteRecordRaw
    const allRoutes = mainRoute?.children || []

    it('deve ter nomes únicos para todas as rotas', () => {
      const routeNames = allRoutes
        .map(route => route.name)
        .filter(Boolean) as string[]

      const uniqueNames = new Set(routeNames)
      expect(uniqueNames.size).toBe(routeNames.length)
    })

    it('deve ter nomes descritivos para rotas principais', () => {
      const routeNames = allRoutes
        .map(route => route.name)
        .filter(Boolean) as string[]

      expect(routeNames).toContain('login')
      expect(routeNames).toContain('register')
      expect(routeNames).toContain('dashboard')
      expect(routeNames).toContain('projects')
      expect(routeNames).toContain('packages')
      expect(routeNames).toContain('profile')
    })
  })
})

