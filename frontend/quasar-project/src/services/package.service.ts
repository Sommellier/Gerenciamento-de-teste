import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

// Interfaces
export interface TestPackageStep {
  action: string
  expected: string
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
  status: 'CREATED' | 'EXECUTED' | 'PASSED' | 'FAILED'
  projectId: number
  steps: TestPackageStep[]
  createdAt: string
  updatedAt: string
}

export interface CreatePackageData {
  projectId: number
  title: string
  description?: string
  type: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  tags: string[]
  assigneeEmail?: string
  environment?: 'DEV' | 'QA' | 'STAGING' | 'PROD'
  release: string
}

export interface UpdatePackageData {
  title?: string
  description?: string
  type?: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  tags?: string[]
  assigneeEmail?: string
  environment?: 'DEV' | 'QA' | 'STAGING' | 'PROD'
  release?: string
  status?: 'CREATED' | 'EXECUTED' | 'PASSED' | 'FAILED'
  steps?: TestPackageStep[]
}

// Configuração do Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Serviços
export const packageService = {
  // Criar pacote de teste
  async createPackage(data: CreatePackageData): Promise<TestPackage> {
    const response = await api.post(`/projects/${data.projectId}/packages`, data)
    return response.data.testPackage
  },

  // Listar pacotes de um projeto
  async getProjectPackages(projectId: number, release?: string): Promise<TestPackage[]> {
    const params = release ? { release } : {}
    const response = await api.get(`/projects/${projectId}/packages`, { params })
    return response.data.packages
  },

  // Buscar pacote por ID
  async getPackage(packageId: number): Promise<TestPackage> {
    const response = await api.get(`/packages/${packageId}`)
    return response.data.package
  },

  // Atualizar pacote
  async updatePackage(packageId: number, data: UpdatePackageData): Promise<TestPackage> {
    const response = await api.put(`/packages/${packageId}`, data)
    return response.data.package
  },

  // Deletar pacote
  async deletePackage(packageId: number): Promise<void> {
    await api.delete(`/packages/${packageId}`)
  },

  // Executar pacote (mudar status para EXECUTED)
  async executePackage(packageId: number): Promise<TestPackage> {
    return this.updatePackage(packageId, { status: 'EXECUTED' })
  },

  // Marcar pacote como passou (mudar status para PASSED)
  async markPackageAsPassed(packageId: number): Promise<TestPackage> {
    return this.updatePackage(packageId, { status: 'PASSED' })
  },

  // Marcar pacote como falhou (mudar status para FAILED)
  async markPackageAsFailed(packageId: number): Promise<TestPackage> {
    return this.updatePackage(packageId, { status: 'FAILED' })
  }
}

// Funções de conveniência
export const createPackage = packageService.createPackage
export const getProjectPackages = packageService.getProjectPackages
export const getPackage = packageService.getPackage
export const updatePackage = packageService.updatePackage
export const deletePackage = packageService.deletePackage
export const executePackage = packageService.executePackage
export const markPackageAsPassed = packageService.markPackageAsPassed
export const markPackageAsFailed = packageService.markPackageAsFailed

export default packageService
