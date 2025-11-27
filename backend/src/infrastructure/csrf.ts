import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'

/**
 * Rotas críticas que sempre requerem CSRF token, mesmo com Bearer token
 * Estas são operações que podem causar danos significativos se executadas sem autorização explícita
 */
const CRITICAL_ROUTES = [
  // Exclusões
  /\/api\/users\/\d+\/delete/i,
  /\/api\/users\/\d+$/i, // DELETE /api/users/:id
  /\/api\/projects\/\d+$/i, // DELETE /api/projects/:id
  /\/api\/scenarios\/\d+$/i, // DELETE /api/scenarios/:id
  /\/api\/packages\/\d+$/i, // DELETE /api/packages/:id
  /\/api\/bugs\/\d+$/i, // DELETE /api/bugs/:id
  /\/api\/members\/\d+$/i, // DELETE /api/members/:id
  
  // Mudanças de senha
  /\/api\/reset-password/i,
  /\/api\/users\/\d+\/password/i,
  
  // Operações críticas de projeto
  /\/api\/projects\/\d+\/delete/i,
  /\/api\/projects\/\d+\/members\/\d+\/remove/i,
]

/**
 * Verifica se a rota atual é uma rota crítica
 */
function isCriticalRoute(path: string): boolean {
  return CRITICAL_ROUTES.some(pattern => pattern.test(path))
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Em ambiente de teste, pular validação CSRF
  if (process.env.NODE_ENV === 'test') {
    return next()
  }

  // Rotas públicas de autenticação (sem prefixo /api porque routers estão montados em /api)
  const publicAuthRoutePaths = [
    '/login',
    '/register',
    '/request-password-reset',
    '/reset-password',
    '/refresh-token'
  ]
  
  // Verificar req.path (sem prefixo /api quando router está montado)
  // e também req.originalUrl para cobrir diferentes cenários
  const pathToCheck = req.path
  const originalUrlToCheck = req.originalUrl?.split('?')[0] // Remover query string
  
  // Verificar se a rota atual é uma rota pública de autenticação
  const isPublicAuthRoute = publicAuthRoutePaths.some(route => 
    pathToCheck === route || 
    pathToCheck.startsWith(route + '/') ||
    originalUrlToCheck?.endsWith(route) ||
    originalUrlToCheck?.includes(route)
  )
  
  if (isPublicAuthRoute) {
    return next()
  }

  // Para APIs REST com JWT, verificar se há token CSRF no header
  const csrfToken = req.headers['x-csrf-token'] || req.body?.csrfToken

  // Verificar se está usando método seguro (JWT Bearer token)
  const authHeader = req.headers.authorization || ''
  const hasBearerToken = authHeader.startsWith('Bearer ')

  // Verificar se é uma rota crítica
  const isCritical = isCriticalRoute(req.path)
  if (isCritical) {
    if (!csrfToken) {
      throw new AppError('CSRF token requerido para esta operação crítica', 403)
    }
    return next()
  }

  // Para rotas não críticas, se tiver Bearer token, considerar seguro
  // (JWT já protege contra CSRF em APIs REST quando usado corretamente)
  if (hasBearerToken) {
    return next()
  }

  // Se não tiver Bearer token e for método de modificação de estado,
  // requerer token CSRF
  const isStateChangingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
  
  if (isStateChangingMethod && !csrfToken) {
    throw new AppError('CSRF token requerido para esta operação', 403)
  }

  next()
}

export default csrfProtection
