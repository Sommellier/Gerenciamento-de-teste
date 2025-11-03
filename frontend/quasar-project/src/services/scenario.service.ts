import api from './api'

// Tipos TypeScript para cenários
export interface ScenarioStep {
  id?: number
  order: number
  action: string
  dataInput?: string
  expected: string
  checkpoint?: string
}

export interface TestScenario {
  id: number
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
  owner?: {
    id: number
    name: string
    email: string
  }
  dueDate?: string
  preconditions?: string[]
  status: 'CREATED' | 'EXECUTED' | 'PASSED' | 'FAILED' | 'BLOCKED'
  packageId?: number
  projectId: number
  steps: ScenarioStep[]
  executions?: ScenarioExecution[]
  evidences?: ScenarioEvidence[]
  createdAt: string
  updatedAt: string
}

export interface ScenarioExecution {
  id: number
  status: 'PASSED' | 'FAILED' | 'BLOCKED'
  runNumber: number
  notes?: string
  executedAt: string
  userId: number
  user: {
    id: number
    name: string
    email: string
  }
  evidences?: ScenarioEvidence[]
}

export interface ScenarioEvidence {
  id: number
  filename: string
  originalName: string
  mimeType: string
  size: number
  storageUrl: string
  checksum: string
  scenarioId?: number
  executionId?: number
  uploadedBy: number
  uploadedByUser: {
    id: number
    name: string
    email: string
  }
  createdAt: string
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
  dueDate?: string
  preconditions?: string[]
  steps: ScenarioStep[]
}

export interface ScenarioFilters {
  status?: 'CREATED' | 'EXECUTED' | 'PASSED' | 'FAILED' | 'BLOCKED'
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

export interface ScenarioListResponse {
  message: string
  data: {
    scenarios: TestScenario[]
    pagination: {
      page: number
      pageSize: number
      total: number
      totalPages: number
    }
  }
}

class ScenarioService {
  // Obter cenários de um pacote
  async getPackageScenarios(packageId: number, filters: ScenarioFilters = {}): Promise<ScenarioListResponse> {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })

    const response = await api.get(`/packages/${packageId}/scenarios?${params}`)
    return response.data as ScenarioListResponse
  }

  // Criar novo cenário
  async createScenario(
    packageId: number,
    data: CreateScenarioData & { projectId: number; testadorId?: number; aprovadorId?: number }
  ): Promise<{ message: string; scenario: TestScenario }> {
    const projectId = data.projectId
    const response = await api.post(`/projects/${projectId}/packages/${packageId}/scenarios`, data)
    return response.data as { message: string; scenario: TestScenario }
  }

  // Obter cenário por ID
  async getScenarioById(scenarioId: number): Promise<{ message: string; scenario: TestScenario }> {
    const response = await api.get(`/scenarios/${scenarioId}`)
    return response.data as { message: string; scenario: TestScenario }
  }

  // Atualizar cenário
  async updateScenario(scenarioId: number, data: Partial<CreateScenarioData>): Promise<{ message: string; scenario: TestScenario }> {
    const response = await api.put(`/scenarios/${scenarioId}`, data)
    return response.data as { message: string; scenario: TestScenario }
  }

  // Deletar cenário
  async deleteScenario(scenarioId: number): Promise<{ message: string }> {
    const response = await api.delete(`/scenarios/${scenarioId}`)
    return response.data as { message: string }
  }

  // Executar cenário
  async executeScenario(scenarioId: number, data: { status: 'PASSED' | 'FAILED' | 'BLOCKED'; notes?: string }): Promise<{ message: string; execution: ScenarioExecution }> {
    const response = await api.post(`/scenarios/${scenarioId}/executions`, data)
    return response.data as { message: string; execution: ScenarioExecution }
  }

  // Duplicar cenário
  async duplicateScenario(scenarioId: number): Promise<{ message: string; scenario: TestScenario }> {
    const response = await api.post(`/scenarios/${scenarioId}/duplicate`)
    return response.data as { message: string; scenario: TestScenario }
  }

  // Upload de evidência
  async uploadEvidence(scenarioId: number, file: File): Promise<{ message: string; evidence: ScenarioEvidence }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post(`/scenarios/${scenarioId}/evidences`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data as { message: string; evidence: ScenarioEvidence }
  }

  // Exportar cenários para CSV
  async exportScenariosToCSV(packageId: number): Promise<Blob> {
    const response = await api.get(`/packages/${packageId}/scenarios/export.csv`, {
      responseType: 'blob'
    })
    return response.data as Blob
  }

  // Gerar relatório PDF
  async generateScenarioReport(packageId: number): Promise<Blob> {
    const response = await api.get(`/packages/${packageId}/scenarios/report.pdf`, {
      responseType: 'blob'
    })
    return response.data as Blob
  }
}

export const scenarioService = new ScenarioService()