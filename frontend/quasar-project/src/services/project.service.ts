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

// Serviços
export const projectService = {
  // Buscar releases de um projeto
  async getProjectReleases(projectId: number): Promise<string[]> {
    console.log('Fetching releases for project:', projectId)
    const response = await api.get(`/projects/${projectId}/releases-debug`)
    console.log('Releases response:', response.data)
    return response.data
  },

  // Buscar membros de um projeto
  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    console.log('Fetching members for project:', projectId)
    const response = await api.get(`/projects/${projectId}/members-debug`)
    console.log('Members response:', response.data)
    return response.data.items || response.data
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
export const getProjectReleases = projectService.getProjectReleases
export const getProjectMembers = projectService.getProjectMembers
export const addRelease = projectService.addRelease

export default projectService
