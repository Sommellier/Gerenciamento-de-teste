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
    'ADMIN': 'warning',
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

