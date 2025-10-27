import api from './api'

export interface PackageStep {
  id: number
  action: string
  expected: string
  stepOrder: number
}

export interface ScenarioStep {
  id: number
  action: string
  expected: string
  stepOrder: number
}

export interface TestScenario {
  id: number
  title: string
  description?: string
  type: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  tags: string[]
  assigneeEmail?: string
  environment?: 'DEV' | 'QA' | 'STAGING' | 'PROD'
  release: string
  status?: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
  createdAt: string
  updatedAt: string
  steps: ScenarioStep[]
}

export interface TestPackage {
  id: number
  title: string
  description?: string
  type: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  tags: string[]
  assigneeEmail?: string
  environment?: 'DEV' | 'QA' | 'STAGING' | 'PROD'
  release: string
  status?: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
  createdAt: string
  updatedAt: string
  steps: PackageStep[]
  project: {
    id: number
    name: string
    description?: string
  }
  scenarios: TestScenario[]
  metrics: {
    totalScenarios: number
    totalSteps: number
    packageSteps: number
    scenariosByType: Record<string, number>
    scenariosByPriority: Record<string, number>
  }
}

class PackageService {
  /**
   * Busca detalhes de um pacote específico
   */
  async getPackageDetails(projectId: number, packageId: number): Promise<TestPackage> {
    const response = await api.get<TestPackage>(`/projects/${projectId}/packages/${packageId}`)
    return response.data
  }

  /**
   * Lista todos os pacotes de um projeto
   */
  async getProjectPackages(projectId: number, release?: string): Promise<TestPackage[]> {
    const params = release ? `?release=${release}` : ''
    const response = await api.get<{ packages: TestPackage[] }>(`/projects/${projectId}/packages${params}`)
    return response.data.packages
  }

  /**
   * Cria um novo pacote de teste
   */
  async createPackage(projectId: number, packageData: {
    title: string
    description?: string
    type: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E'
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    tags: string[]
    assigneeEmail?: string
    environment?: 'DEV' | 'QA' | 'STAGING' | 'PROD'
    release: string
    steps?: Array<{ action: string; expected: string }>
  }): Promise<TestPackage> {
    const response = await api.post<{ testPackage: TestPackage }>(`/projects/${projectId}/packages-debug`, packageData)
    return response.data.testPackage
  }

  /**
   * Atualiza um pacote existente
   */
  async updatePackage(projectId: number, packageId: number, packageData: Partial<{
    title: string
    description: string
    type: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E'
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    tags: string[]
    assigneeEmail: string
    environment: 'DEV' | 'QA' | 'STAGING' | 'PROD'
    release: string
    status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
    steps: Array<{ action: string; expected: string }>
  }>): Promise<TestPackage> {
    const response = await api.put<{ testPackage: TestPackage }>(`/projects/${projectId}/packages/${packageId}`, packageData)
    return response.data.testPackage
  }

  /**
   * Deleta um pacote
   */
  async deletePackage(projectId: number, packageId: number): Promise<void> {
    await api.delete(`/projects/${projectId}/packages/${packageId}`)
  }

  /**
   * Executa um pacote (marca como executado)
   */
  async executePackage(packageId: number): Promise<void> {
    // Por enquanto, apenas simula a execução
    // Em uma implementação real, isso marcaria o pacote como executado
    console.log('Executing package:', packageId)
  }
}

export const packageService = new PackageService()

// Exportações individuais para compatibilidade
export const getPackageDetails = packageService.getPackageDetails.bind(packageService)
export const getProjectPackages = packageService.getProjectPackages.bind(packageService)
export const createPackage = packageService.createPackage.bind(packageService)
export const updatePackage = packageService.updatePackage.bind(packageService)
export const deletePackage = packageService.deletePackage.bind(packageService)
export const executePackage = packageService.executePackage.bind(packageService)