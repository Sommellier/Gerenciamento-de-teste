/**
 * Funções utilitárias compartilhadas para reduzir duplicação de código
 */

/**
 * Gera iniciais a partir de um nome
 * @param name - Nome completo ou email
 * @returns Iniciais (ex: "João Silva" -> "JS" ou "Maria" -> "MA" ou "A" -> "A")
 */
export function getInitials(name: string | undefined): string {
  if (!name) return '?'
  const parts = name.split(' ').filter(p => p.length > 0)
  if (parts.length === 0) return '?'
  
  const first = parts[0]
  if (!first || first.length === 0) return '?'
  const firstChar = first[0]
  if (!firstChar) return '?'
  
  // Se tiver apenas uma palavra, retorna as duas primeiras letras (ou a primeira se tiver apenas uma)
  if (parts.length === 1) {
    if (first.length >= 2) {
      return first.substring(0, 2).toUpperCase()
    }
    return firstChar.toUpperCase()
  }
  
  // Se tiver duas ou mais palavras, tenta pegar a primeira letra da segunda palavra
  if (parts.length >= 2) {
    const second = parts[1]
    if (second && second.length > 0 && second[0]) {
      return (firstChar + second[0]).toUpperCase()
    }
  }
  
  // Fallback: retorna a primeira letra
  return firstChar.toUpperCase()
}

/**
 * Formata uma data para exibição
 * @param date - Data em string, Date ou undefined
 * @param includeTime - Se deve incluir hora (padrão: false)
 * @returns Data formatada em pt-BR ou 'N/A' se inválida
 */
export function formatDate(date: string | Date | undefined, includeTime = false): string {
  if (!date) return 'N/A'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) return 'N/A'
    
    if (includeTime) {
      return dateObj.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return 'N/A'
  }
}

/**
 * Retorna uma cor baseada no ID do membro (para avatares)
 * @param memberId - ID do membro
 * @returns Nome da cor do Quasar
 */
export function getMemberColor(memberId: number): string {
  const colors: string[] = ['primary', 'secondary', 'accent', 'positive', 'info', 'warning', 'negative']
  const index = memberId % colors.length
  const color = colors[index]
  return color || 'primary'
}

/**
 * Retorna uma cor baseada no papel (role) do membro
 * @param role - Papel do membro (OWNER, MANAGER, TESTER, etc.)
 * @returns Nome da cor do Quasar
 */
export function getRoleColor(role: string): string {
  const roleColors: Record<string, string> = {
    'OWNER': 'primary',
    'MANAGER': 'info',
    'TESTER': 'positive',
    'APPROVER': 'teal'
  }
  return roleColors[role] || 'grey'
}

/**
 * Retorna uma cor baseada no status do bug
 * @param status - Status do bug
 * @returns Nome da cor do Quasar
 */
export function getBugStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'OPEN': 'negative',
    'IN_PROGRESS': 'warning',
    'RESOLVED': 'positive',
    'CLOSED': 'grey'
  }
  return statusColors[status] || 'grey'
}

/**
 * Retorna o label traduzido para o status do bug
 * @param status - Status do bug
 * @returns Label traduzido
 */
export function getBugStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'OPEN': 'Aberto',
    'IN_PROGRESS': 'Em Progresso',
    'RESOLVED': 'Resolvido',
    'CLOSED': 'Fechado'
  }
  return labels[status] || status
}

/**
 * Retorna o label traduzido para o tipo de cenário
 * @param type - Tipo do cenário
 * @returns Label traduzido
 */
export function getScenarioTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'FUNCTIONAL': 'Funcional',
    'REGRESSION': 'Regressão',
    'SMOKE': 'Smoke',
    'INTEGRATION': 'Integração',
    'E2E': 'End-to-End'
  }
  return labels[type] || type
}

/**
 * Retorna o label traduzido para o status de execução
 * @param status - Status de execução
 * @returns Label traduzido
 */
export function getStatusTranslation(status: string): string {
  const translations: Record<string, string> = {
    'PASSED': 'Concluído',
    'FAILED': 'Reprovado',
    'BLOCKED': 'Bloqueado',
    'PENDING': 'Pendente'
  }
  return translations[status] || status
}

/**
 * Retorna uma cor baseada no tipo de pacote
 * @param type - Tipo do pacote
 * @returns Nome da cor do Quasar
 */
export function getTypeColor(type: string | undefined): string {
  if (!type) return 'grey'
  const colors: Record<string, string> = {
    'FUNCTIONAL': 'primary',
    'REGRESSION': 'warning',
    'SMOKE': 'info',
    'INTEGRATION': 'positive',
    'E2E': 'accent'
  }
  return colors[type] || 'grey'
}

/**
 * Cria uma regra de validação obrigatória
 * @param fieldName - Nome do campo para mensagem de erro
 * @returns Array com função de validação
 */
export function createRequiredRule(fieldName: string) {
  return [(val: number | string | null | undefined) => !!val || `${fieldName} é obrigatório`]
}

/**
 * Extrai o valor de uma opção de select (pode ser objeto com value ou string)
 * @param val - Valor que pode ser objeto com propriedade 'value' ou string
 * @returns String com o valor extraído
 */
export function getOptionValue(val: unknown): string {
  if (typeof val === 'object' && val !== null && 'value' in val) {
    const option = val as { value: string }
    return option.value
  }
  return typeof val === 'string' ? val : ''
}

/**
 * Valida se uma URL é segura (mesmo domínio ou relativa)
 * @param url - URL a ser validada
 * @param allowedDomains - Lista opcional de domínios permitidos (padrão: apenas mesmo domínio)
 * @returns true se a URL é segura, false caso contrário
 */
export function isValidUrl(url: string, allowedDomains?: string[]): boolean {
  if (!url || typeof url !== 'string') return false
  
  try {
    // URLs relativas são sempre seguras
    if (url.startsWith('/') && !url.startsWith('//')) {
      return true
    }
    
    // Tentar criar objeto URL
    const urlObj = new URL(url, window.location.origin)
    
    // Se não há domínios permitidos especificados, apenas permitir mesmo domínio
    if (!allowedDomains || allowedDomains.length === 0) {
      return urlObj.origin === window.location.origin
    }
    
    // Verificar se o domínio está na lista de permitidos
    return allowedDomains.some(domain => urlObj.origin === domain || urlObj.hostname === domain)
  } catch {
    // Se não conseguir criar URL, considerar inválida
    return false
  }
}

/**
 * Sanitiza nome de arquivo removendo caracteres perigosos
 * @param filename - Nome do arquivo a ser sanitizado
 * @returns Nome do arquivo sanitizado
 */
export function sanitizeFileName(filename: string): string {
  if (!filename || typeof filename !== 'string') return 'file'
  
  // Remover caracteres perigosos: / \ : * ? " < > |
  let sanitized = filename
    .replace(/[/\\:*?"<>|]/g, '')
    .trim()
  
  // Limitar tamanho (255 caracteres é o máximo em muitos sistemas de arquivos)
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'))
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'))
    sanitized = nameWithoutExt.substring(0, 255 - ext.length) + ext
  }
  
  // Se ficou vazio, usar nome padrão
  if (sanitized.length === 0) {
    sanitized = 'file'
  }
  
  return sanitized
}

/**
 * Valida se um redirect é seguro (relativo ou mesmo domínio)
 * @param redirect - URL de redirect a ser validada
 * @returns true se o redirect é seguro, false caso contrário
 */
export function isValidRedirect(redirect: string): boolean {
  if (!redirect || typeof redirect !== 'string') return false
  
  // Apenas permitir caminhos relativos (começam com / mas não com //)
  if (redirect.startsWith('/') && !redirect.startsWith('//')) {
    // Verificar se não contém caracteres perigosos
    if (redirect.includes('javascript:') || redirect.includes('data:') || redirect.includes('vbscript:')) {
      return false
    }
    return true
  }
  
  // Não permitir URLs absolutas externas
  return false
}

/**
 * Valida e converte um ID de route param para número
 * Similar à função validateId() do backend
 * Aceita tipos do Vue Router (LocationQueryValue) além de tipos básicos
 * @param id - ID a ser validado (pode ser string, string[], number, null ou undefined)
 * @returns Número válido ou NaN se inválido
 */
export function validateRouteId(id: string | string[] | (string | null)[] | number | null | undefined): number {
  // Se já é um número válido
  if (typeof id === 'number') {
    if (isNaN(id) || id <= 0 || !Number.isInteger(id)) {
      return NaN
    }
    return id
  }
  
  // Se é null ou undefined, retornar NaN
  if (id === null || id === undefined) {
    return NaN
  }
  
  // Se é array, pegar o primeiro elemento
  if (Array.isArray(id)) {
    if (id.length === 0) {
      return NaN
    }
    // Converter array de LocationQueryValue para string, tratando null
    const first = id[0]
    if (first === null || first === undefined) {
      return NaN
    }
    id = first
  }
  
  // Se é string, tentar converter
  if (typeof id === 'string') {
    if (id.trim() === '') {
      return NaN
    }
    const parsed = Number(id)
    if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      return NaN
    }
    return parsed
  }
  
  // Se chegou aqui, é um tipo não esperado
  return NaN
}

/**
 * Sanitiza mensagens de erro removendo informações sensíveis
 * @param errorMessage - Mensagem de erro a ser sanitizada
 * @returns Mensagem sanitizada
 */
export function sanitizeErrorMessage(errorMessage: string): string {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return 'Erro desconhecido'
  }
  
  // Remover informações sensíveis comuns
  let sanitized = errorMessage
    // Remover caminhos de arquivo
    .replace(/\/[^\s]+\.(js|ts|vue|tsx|jsx)/gi, '[arquivo]')
    // Remover endereços IP
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]')
    // Remover tokens/secrets longos
    .replace(/\b[a-zA-Z0-9]{32,}\b/g, '[token]')
    // Remover stack traces
    .replace(/at\s+[^\n]+/gi, '')
    .replace(/Error:\s*/gi, '')
  
  // Limitar tamanho
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 197) + '...'
  }
  
  return sanitized.trim() || 'Erro desconhecido'
}

