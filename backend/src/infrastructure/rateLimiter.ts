import rateLimit from 'express-rate-limit'

// Verificar se está em desenvolvimento
const isDevelopment = process.env.NODE_ENV !== 'production'

// Ajustar limites baseado no ambiente
// Em desenvolvimento, limites mais altos para evitar bloqueios durante testes
// Em produção, limites aumentados para suportar uso em faculdade (múltiplos usuários no mesmo IP)
const loginMax = isDevelopment ? 20 : 15 // 20 em dev, 15 em produção (proteção contra brute force, mas permite uso legítimo)
const registerMax = isDevelopment ? 20 : 50 // 20 em dev, 50 em produção (permite turma inteira se registrar)
const uploadMax = isDevelopment ? 100 : 100 // 100 em dev, 100 em produção (alunos fazendo upload de evidências)
const inviteMax = isDevelopment ? 50 : 30 // 50 em dev, 30 em produção (professor convidando turma)
const publicMax = isDevelopment ? 500 : 200 // 500 em dev, 200 em produção (rotas públicas)

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

