import api from './api'

// Interfaces
export interface ProjectMember {
  id: number
  name: string
  email: string
  avatar?: string
  role: string
}

export interface ProjectReleases {
  releases: string[]
}

// Interfaces para criação de projeto
export interface CreateProjectPayload {
  name: string
  description: string | null
}

export interface Project {
  id: number
  ownerId: number
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

// Serviços
export const projectService = {
  // Criar novo projeto
  async createProject(payload: CreateProjectPayload): Promise<Project> {
    console.log('Creating project:', payload)
    const response = await api.post<Project>('/projects', payload)
    console.log('Project created:', response.data)
    return response.data
  },

  // Buscar releases de um projeto
  async getProjectReleases(projectId: number): Promise<string[]> {
    console.log('Fetching releases for project:', projectId)
    const response = await api.get<string[]>(`/projects/${projectId}/releases`)
    console.log('Releases response:', response.data)
    return response.data as string[]
  },

  // Buscar membros de um projeto
  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    console.log('Fetching members for project:', projectId)
    const response = await api.get<{ items?: ProjectMember[] } | ProjectMember[]>(`/projects/${projectId}/members`)
    console.log('Members response:', response.data)
    const data = response.data as { items?: ProjectMember[] } | ProjectMember[]
    return (Array.isArray(data) ? data : (data.items || [])) as ProjectMember[]
  },

  // Adicionar nova release (simulado - adiciona à lista local)
  addRelease(releases: string[], newRelease: string): string[] {
    if (!releases.includes(newRelease)) {
      return [...releases, newRelease].sort().reverse()
    }
    return releases
  }
}

// Funções de conveniência
export const createProject = projectService.createProject.bind(projectService)
export const getProjectReleases = projectService.getProjectReleases.bind(projectService)
export const getProjectMembers = projectService.getProjectMembers.bind(projectService)
export const addRelease = projectService.addRelease.bind(projectService)

export default projectService
