import api from './api'

const USE_MOCK = false

export interface ProjectMember {
  id: number
  name: string
  email: string
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'TESTER' | 'APPROVER'
  avatar?: string
}

export interface TestPackage {
  id: number
  title: string
  description?: string
  type: 'Functional' | 'Regression' | 'Smoke' | 'E2E'
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  tags: string[]
  steps: Array<{
    id: number
    action: string
    expected: string
  }>
  assigneeEmail?: string
  environment?: 'Dev' | 'QA' | 'Staging' | 'Prod'
  release: string
  status: 'Created' | 'Executed' | 'Passed' | 'Failed'
  createdAt: string
  updatedAt: string
}

export interface ProjectMetrics {
  created: number
  executed: number
  passed: number
  failed: number
}

export interface ProjectDetails {
  id: number
  name: string
  description?: string
  ownerId: number
  createdAt: string
  updatedAt: string
  members: ProjectMember[]
  metrics: ProjectMetrics
  testPackages: TestPackage[]
  scenarios: TestPackage[]
  scenarioMetrics: ProjectMetrics
}

// Mock data
const mockMembers: ProjectMember[] = [
  {
    id: 1,
    name: 'Richard Schmitz Riedo',
    email: 'richardriedo87@gmail.com',
    role: 'OWNER',
    avatar: '/uploads/avatars/avatar_2154_1758221175381_85udk0e64e.jpg'
  },
  {
    id: 2,
    name: 'João Silva',
    email: 'joao.silva@example.com',
    role: 'ADMIN'
  },
  {
    id: 3,
    name: 'Maria Santos',
    email: 'maria.santos@example.com',
    role: 'MANAGER'
  },
  {
    id: 4,
    name: 'Pedro Costa',
    email: 'pedro.costa@example.com',
    role: 'TESTER'
  },
  {
    id: 5,
    name: 'Ana Oliveira',
    email: 'ana.oliveira@example.com',
    role: 'APPROVER'
  }
]

const mockTestPackages: TestPackage[] = [
  {
    id: 1,
    title: 'Login com credenciais válidas',
    description: 'Teste de login com usuário e senha corretos',
    type: 'Functional',
    priority: 'High',
    tags: ['login', 'authentication'],
    steps: [
      { id: 1, action: 'Acessar página de login', expected: 'Página carrega corretamente' },
      { id: 2, action: 'Inserir email válido', expected: 'Campo aceita o email' },
      { id: 3, action: 'Inserir senha válida', expected: 'Campo aceita a senha' },
      { id: 4, action: 'Clicar em Entrar', expected: 'Usuário é redirecionado para dashboard' }
    ],
    assigneeEmail: 'joao.silva@example.com',
    environment: 'QA',
    release: '2024-09',
    status: 'Passed',
    createdAt: '2024-09-15T10:00:00Z',
    updatedAt: '2024-09-15T10:30:00Z'
  },
  {
    id: 2,
    title: 'Validação de campos obrigatórios',
    description: 'Verificar se campos obrigatórios são validados',
    type: 'Regression',
    priority: 'Medium',
    tags: ['validation', 'forms'],
    steps: [
      { id: 1, action: 'Deixar campo nome vazio', expected: 'Mensagem de erro aparece' },
      { id: 2, action: 'Deixar campo email vazio', expected: 'Mensagem de erro aparece' }
    ],
    assigneeEmail: 'maria.santos@example.com',
    environment: 'Dev',
    release: '2024-09',
    status: 'Failed',
    createdAt: '2024-09-14T14:00:00Z',
    updatedAt: '2024-09-14T15:00:00Z'
  }
]

const mockMetrics: ProjectMetrics = {
  created: 15,
  executed: 12,
  passed: 8,
  failed: 4
}

const mockScenarioMetrics: ProjectMetrics = {
  created: 25,
  executed: 20,
  passed: 15,
  failed: 5
}

// Service functions
export async function getProjectDetails(projectId: number, release?: string): Promise<ProjectDetails> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const filteredTestPackages = release 
      ? mockTestPackages.filter(p => p.release === release)
      : mockTestPackages
    
    const metrics = release 
      ? {
          created: filteredTestPackages.length,
          executed: filteredTestPackages.filter(p => p.status !== 'Created').length,
          passed: filteredTestPackages.filter(p => p.status === 'Passed').length,
          failed: filteredTestPackages.filter(p => p.status === 'Failed').length
        }
      : mockMetrics

    return {
      id: projectId,
      name: `Projeto ${projectId}`,
      description: 'Descrição do projeto de testes',
      ownerId: 1,
      createdAt: '2024-09-01T00:00:00Z',
      updatedAt: '2024-09-18T00:00:00Z',
      members: mockMembers,
      metrics,
      testPackages: filteredTestPackages,
      scenarios: filteredTestPackages, // Usando os mesmos dados por enquanto
      scenarioMetrics: mockScenarioMetrics
    }
  }

  // Real API call
  try {
    const response = await api.get(`/projects/${projectId}/details`, {
      params: { release }
    })
    console.log('API Response:', response.data)
    return response.data as ProjectDetails
  } catch (error) {
    console.error('Erro ao buscar detalhes do projeto:', error)
    throw error
  }
}

export async function createTestPackage(projectId: number, testPackage: Omit<TestPackage, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<TestPackage> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const newTestPackage: TestPackage = {
      ...testPackage,
      id: Date.now(),
      status: 'Created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    mockTestPackages.push(newTestPackage)
    return newTestPackage
  }

  // Real API call
  const response = await api.post(`/projects/${projectId}/packages`, testPackage)
  return (response.data as { testPackage: TestPackage }).testPackage
}

export async function getProjectMembers(projectId: number): Promise<ProjectMember[]> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return mockMembers
  }

  // Real API call
  const response = await api.get(`/projects/${projectId}/members`)
  
  // A API retorna { items: [...] }
  const items = response.data.items || response.data
  
  // Mapear para o formato esperado
  return items.map((item: any) => ({
    id: item.user?.id || item.userId,
    name: item.user?.name || item.name,
    email: item.user?.email || item.email,
    role: item.role,
    avatar: item.user?.avatar || item.avatar
  }))
}

export async function getAvailableReleases(projectId: number): Promise<string[]> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return ['2024-09', '2024-08', '2024-07', '2024-06']
  }

  // Real API call
  const response = await api.get(`/projects/${projectId}/releases`)
  return response.data as string[]
}
