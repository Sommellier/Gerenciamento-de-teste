import rateLimit from 'express-rate-limit'

// Verificar se está em desenvolvimento
const isDevelopment = process.env.NODE_ENV !== 'production'

// Ajustar limites baseado no ambiente
// Em desenvolvimento, limites mais altos para evitar bloqueios durante testes
const generalMax = isDevelopment ? 1000 : 100 // 1000 em dev, 100 em produção
const loginMax = isDevelopment ? 20 : 5 // 20 em dev, 5 em produção
const uploadMax = isDevelopment ? 100 : 20 // 100 em dev, 20 em produção
const inviteMax = isDevelopment ? 50 : 10 // 50 em dev, 10 em produção
const publicMax = isDevelopment ? 500 : 50 // 500 em dev, 50 em produção

// Rate limiter geral para todas as rotas
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: generalMax,
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiter mais rigoroso para login
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: loginMax,
  message: 'Muitas tentativas de login falhadas. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // não conta requisições bem-sucedidas
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
  message: 'Limite de criação de convites excedido. Tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiter para requisições sem autenticação
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: publicMax,
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
})

