// Schemas de validação para cenários de teste
// Implementação sem Zod para compatibilidade

// Enums para validação
export const ScenarioTypeEnum = ['FUNCTIONAL', 'REGRESSION', 'SMOKE', 'E2E'] as const
export const PriorityEnum = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export const SeverityEnum = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export const EnvironmentEnum = ['DEV', 'QA', 'STAGING', 'PROD'] as const
export const ScenarioStatusEnum = ['CREATED', 'EXECUTED', 'PASSED', 'FAILED', 'APPROVED', 'REPROVED'] as const
export const ExecutionResultEnum = ['PASSED', 'FAILED', 'BLOCKED'] as const

// Interfaces TypeScript
export interface ScenarioStep {
  order: number
  action: string
  dataInput?: string
  expected: string
  checkpoint?: string
}

export interface CreateScenarioData {
  title: string
  description?: string
  type: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  module?: string
  environment?: 'DEV' | 'QA' | 'STAGING' | 'PROD'
  requirementIds?: string[]
  tags?: string[]
  ownerUserId?: number
  testadorId?: number
  aprovadorId?: number
  dueDate?: string
  preconditions?: string[]
  status?: 'CREATED' | 'EXECUTED' | 'PASSED' | 'FAILED' | 'APPROVED' | 'REPROVED'
  steps?: ScenarioStep[] // Agora é opcional
}

export interface UpdateScenarioData extends Partial<CreateScenarioData> {
  id: number
}

export interface ExecuteScenarioData {
  status: 'PASSED' | 'FAILED' | 'BLOCKED'
  notes?: string
}

export interface ScenarioFilters {
  status?: 'CREATED' | 'EXECUTED' | 'PASSED' | 'FAILED' | 'APPROVED' | 'REPROVED'
  type?: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  tag?: string
  owner?: number
  q?: string
  page?: number
  pageSize?: number
  sort?: 'title' | 'priority' | 'status' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface EvidenceUpload {
  filename: string
  originalName: string
  mimeType: string
  size: number
  storageUrl: string
  checksum: string
}

// Funções de validação simples
export function validateCreateScenarioData(data: any): CreateScenarioData {
  if (!data.title || typeof data.title !== 'string' || data.title.length === 0) {
    throw new Error('Título é obrigatório')
  }
  
  if (!data.type || !ScenarioTypeEnum.includes(data.type)) {
    throw new Error('Tipo é obrigatório e deve ser válido')
  }
  
  if (!data.priority || !PriorityEnum.includes(data.priority)) {
    throw new Error('Prioridade é obrigatória e deve ser válida')
  }
  
  // Steps são opcionais agora - podem ser adicionados depois
  if (data.steps) {
    if (!Array.isArray(data.steps)) {
      throw new Error('Steps deve ser um array')
    }
    
    if (data.steps.length > 50) {
      throw new Error('Máximo de 50 passos permitidos')
    }
    
    // Validar steps se fornecidos
    data.steps.forEach((step: any, index: number) => {
      if (!step.action || typeof step.action !== 'string' || step.action.length === 0) {
        throw new Error(`Ação do passo ${index + 1} é obrigatória`)
      }
      
      if (!step.expected || typeof step.expected !== 'string' || step.expected.length === 0) {
        throw new Error(`Resultado esperado do passo ${index + 1} é obrigatório`)
      }
      
      if (step.order !== undefined && step.order !== index + 1) {
        throw new Error(`Ordem do passo ${index + 1} deve ser ${index + 1}`)
      }
    })
  }
  
  return data as CreateScenarioData
}

export function validateExecuteScenarioData(data: any): ExecuteScenarioData {
  if (!data.status || !ExecutionResultEnum.includes(data.status)) {
    throw new Error('Status é obrigatório e deve ser válido')
  }
  
  return data as ExecuteScenarioData
}

export function validateScenarioFilters(data: any): ScenarioFilters {
  const filters: ScenarioFilters = {
    page: data.page ? parseInt(data.page) : 1,
    pageSize: data.pageSize ? parseInt(data.pageSize) : 20,
    sort: data.sort || 'createdAt',
    sortOrder: data.sortOrder || 'desc'
  }
  
  if (data.status && ScenarioStatusEnum.includes(data.status)) {
    filters.status = data.status
  }
  
  if (data.type && ScenarioTypeEnum.includes(data.type)) {
    filters.type = data.type
  }
  
  if (data.priority && PriorityEnum.includes(data.priority)) {
    filters.priority = data.priority
  }
  
  if (data.tag && typeof data.tag === 'string') {
    filters.tag = data.tag
  }
  
  if (data.owner && !isNaN(parseInt(data.owner))) {
    filters.owner = parseInt(data.owner)
  }
  
  if (data.q && typeof data.q === 'string') {
    filters.q = data.q
  }
  
  return filters
}
