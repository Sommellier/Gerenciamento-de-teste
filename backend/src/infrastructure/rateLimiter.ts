import rateLimit from 'express-rate-limit'
import type { Request, Response } from 'express'

// Verificar se está em desenvolvimento
const isDevelopment = process.env.NODE_ENV !== 'production'

// Ajustar limites baseado no ambiente
// Em desenvolvimento, limites muito mais altos para evitar bloqueios durante testes automatizados
// Em produção, limites aumentados para suportar uso em faculdade (múltiplos usuários no mesmo IP)
const loginMax = isDevelopment ? 100 : 12 // 100 em dev (testes), 12 em produção (proteção contra brute force)
const registerMax = isDevelopment ? 200 : 50 // 200 em dev (testes), 50 em produção (permite turma inteira se registrar)
const uploadMax = isDevelopment ? 100 : 100 // 100 em dev, 100 em produção (alunos fazendo upload de evidências)
const inviteMax = isDevelopment ? 50 : 30 // 50 em dev, 30 em produção (professor convidando turma)
const publicMax = isDevelopment ? 1000 : 200 // 1000 em dev (testes), 200 em produção (rotas públicas)
const userMax = isDevelopment ? 500 : 60 // 500 em dev (testes), 60 em produção (60 req/min por usuário autenticado)
const passwordResetMax = isDevelopment ? 50 : 5 // 50 em dev (testes), 5 em produção (5 req/hora por email)

// Rate limiter mais rigoroso para login
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: loginMax,
  message: 'Muitas tentativas de login falhadas. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // não conta requisições bem-sucedidas
})

// Rate limiter para registro de novos usuários (prevenção de spam)
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: registerMax,
  message: 'Muitas tentativas de registro. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiter para upload de arquivos
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: uploadMax,
  message: 'Limite de uploads excedido. Tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiter para criação de convites
export const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: inviteMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response, _next: any, _options: any) => {
    res.status(429).json({
      message: 'Limite de criação de convites excedido. Tente novamente mais tarde.'
    })
  },
})

// Rate limiter para requisições sem autenticação
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: publicMax,
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiter por usuário autenticado
// Útil para ambientes com múltiplos usuários no mesmo IP (faculdade, VPN, proxy)
export const userLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: userMax,
  message: 'Muitas requisições. Tente novamente em alguns instantes.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Desabilitar validação IPv6 para keyGenerator customizado
  keyGenerator: (req: Request): string => {
    // Extrair userId do objeto user adicionado pelo middleware de autenticação
    const user = (req as any).user
    if (user?.id) {
      return `user:${user.id}`
    }
    // Fallback para IP - usar req.ip que já é normalizado pelo Express
    // O Express com trust proxy já normaliza IPv6 corretamente
    return req.ip || 'unknown'
  },
  skipSuccessfulRequests: false, // Conta todas as requisições, bem-sucedidas ou não
})

// Rate limiter para recuperação de senha (por email)
// Previne abuso e spam de emails de recuperação
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: passwordResetMax,
  message: 'Muitas tentativas de recuperação de senha. Tente novamente em 1 hora.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Desabilitar validação IPv6 para keyGenerator customizado
  keyGenerator: (req: Request): string => {
    // Usar email do body como chave, normalizado para lowercase
    const email = req.body?.email
    if (email && typeof email === 'string') {
      return `password-reset:${email.trim().toLowerCase()}`
    }
    // Fallback para IP - usar req.ip que já é normalizado pelo Express
    // O Express com trust proxy já normaliza IPv6 corretamente
    return `password-reset:ip:${req.ip || 'unknown'}`
  },
  skipSuccessfulRequests: false, // Conta todas as requisições para prevenir abuso
})

