// src/router/index.ts
import { createMemoryHistory, createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import routes from './routes'

function isLoggedIn(): boolean {
  return !!sessionStorage.getItem('token') // Usar sessionStorage para maior segurança
}

export default function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach((to) => {
    const authed = isLoggedIn()

    // bloqueia telas do app se não estiver logado
    if (to.meta.requiresAuth && !authed) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    // se já está logado, evita voltar para telas públicas
    const publicNames = ['login', 'register', 'forgot', 'reset']
    if (authed && publicNames.includes(String(to.name))) {
      return { name: 'dashboard' }
    }
  })

  return Router
}
