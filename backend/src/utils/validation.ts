import { AppError } from './AppError'

// Validações genéricas reutilizáveis

/**
 * Valida se uma string é um email válido
 */
export function validateEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new AppError('Email é obrigatório', 400)
  }
  
  const normalizedEmail = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(normalizedEmail)) {
    throw new AppError('Email inválido', 400)
  }
  
  return normalizedEmail
}

/**
 * Valida se uma string tem tamanho mínimo
 */
export function validateMinLength(value: string, minLength: number, fieldName: string): string {
  if (!value || typeof value !== 'string') {
    throw new AppError(`${fieldName} é obrigatório`, 400)
  }
  
  const trimmed = value.trim()
  if (trimmed.length < minLength) {
    throw new AppError(`${fieldName} deve ter pelo menos ${minLength} caracteres`, 400)
  }
  
  return trimmed
}

/**
 * Valida um ID numérico
 */
export function validateId(id: any, fieldName: string = 'ID'): number {
  const num = Number(id)
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError(`${fieldName} inválido`, 400)
  }
  return num
}

/**
 * Valida se um valor está em um conjunto de valores permitidos
 */
export function validateEnum<T extends string>(
  value: any, 
  allowedValues: readonly T[], 
  fieldName: string
): T {
  if (!value || !allowedValues.includes(value as T)) {
    throw new AppError(`${fieldName} deve ser um dos seguintes valores: ${allowedValues.join(', ')}`, 400)
  }
  return value as T
}

/**
 * Valida campos opcionais
 */
export function validateOptionalString(value: any, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new AppError(`${fieldName} deve ser uma string`, 400)
  }
  return value.trim() || undefined
}

/**
 * Valida array com tamanho máximo
 */
export function validateArray<T>(
  value: any, 
  fieldName: string, 
  maxLength: number
): T[] {
  if (!Array.isArray(value)) {
    throw new AppError(`${fieldName} deve ser um array`, 400)
  }
  if (value.length === 0) {
    throw new AppError(`${fieldName} não pode estar vazio`, 400)
  }
  if (value.length > maxLength) {
    throw new AppError(`${fieldName} não pode ter mais de ${maxLength} itens`, 400)
  }
  return value
}

/**
 * Valida página e pageSize para paginação
 */
export function validatePagination(page?: any, pageSize?: any) {
  const safePage = page ? validateId(page, 'page') : 1
  const safePageSize = pageSize ? validateId(pageSize, 'pageSize') : 20
  
  if (safePageSize > 100) {
    throw new AppError('pageSize não pode ser maior que 100', 400)
  }
  
  return { page: safePage, pageSize: safePageSize }
}

/**
 * Sanitiza string para evitar XSS básico
 */
export function sanitizeString(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
}

