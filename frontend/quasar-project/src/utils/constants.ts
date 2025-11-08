/**
 * Constantes compartilhadas para reduzir duplicação de código
 */

/**
 * Opções de tipo de pacote/cenário
 */
export const TYPE_OPTIONS = [
  { label: 'Funcional', value: 'FUNCTIONAL' },
  { label: 'Regressão', value: 'REGRESSION' },
  { label: 'Smoke', value: 'SMOKE' },
  { label: 'End-to-End', value: 'E2E' }
] as const

/**
 * Opções de prioridade
 */
export const PRIORITY_OPTIONS = [
  { label: 'Baixa', value: 'LOW' },
  { label: 'Média', value: 'MEDIUM' },
  { label: 'Alta', value: 'HIGH' },
  { label: 'Crítica', value: 'CRITICAL' }
] as const

/**
 * Opções de ambiente
 */
export const ENVIRONMENT_OPTIONS = [
  { label: 'Desenvolvimento', value: 'DEV' },
  { label: 'QA', value: 'QA' },
  { label: 'Staging', value: 'STAGING' },
  { label: 'Produção', value: 'PROD' }
] as const

