import api from './api'
import logger from '../utils/logger'

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
    logger.log('Creating project:', payload)
    const response = await api.post<Project>('/projects', payload)
    logger.log('Project created:', response.data)
    return response.data
  },

  // Buscar releases de um projeto
  async getProjectReleases(projectId: number): Promise<string[]> {
    logger.log('Fetching releases for project:', projectId)
    const response = await api.get<string[]>(`/projects/${projectId}/releases`)
    logger.log('Releases response:', response.data)
    return response.data
  },

  // Buscar membros de um projeto
  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    logger.log('Fetching members for project:', projectId)
    const response = await api.get<{ items?: ProjectMember[] } | ProjectMember[]>(`/projects/${projectId}/members`)
    logger.log('Members response:', response.data)
    const data = response.data
    return Array.isArray(data) ? data : (data.items || [])
  },

  // Adicionar nova release (simulado - adiciona à lista local)
  addRelease(releases: string[], newRelease: string): string[] {
    if (!releases.includes(newRelease)) {
      return [...releases, newRelease].sort((a, b) => b.localeCompare(a, 'pt-BR', { numeric: true, sensitivity: 'base' }))
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
