import api from './api'

export interface StepComment {
  id: number
  text: string
  mentions: number[]
  user: {
    id: number
    name: string
    email: string
    avatar?: string
  }
  createdAt: string
  updatedAt: string
}

export interface StepAttachment {
  id: number
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  uploader: {
    id: number
    name: string
    email: string
    avatar?: string
  }
  createdAt: string
}

export interface Bug {
  id: number
  title: string
  description?: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  relatedStepId?: number
  creator: {
    id: number
    name: string
    email: string
    avatar?: string
  }
  createdAt: string
  updatedAt: string
}

export interface ExecutionHistory {
  id: number
  action: string
  description?: string
  metadata?: any
  user: {
    id: number
    name: string
    email: string
    avatar?: string
  }
  createdAt: string
}

class ExecutionService {
  // Comentários
  async addStepComment(stepId: number, text: string, mentions?: number[]): Promise<StepComment> {
    const response = await api.post(`/steps/${stepId}/comments`, {
      text,
      mentions
    })
    return response.data.comment
  }

  async getStepComments(stepId: number): Promise<StepComment[]> {
    const response = await api.get(`/steps/${stepId}/comments`)
    return response.data.comments
  }

  // Anexos/Evidências
  async uploadStepAttachment(stepId: number, file: File): Promise<StepAttachment> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post(`/steps/${stepId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data.attachment
  }

  async getStepAttachments(stepId: number): Promise<StepAttachment[]> {
    const response = await api.get(`/steps/${stepId}/attachments`)
    return response.data.attachments
  }

  // Bugs
  async createBug(
    scenarioId: number,
    data: {
      title: string
      description?: string
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      relatedStepId?: number
    }
  ): Promise<Bug> {
    const response = await api.post(`/scenarios/${scenarioId}/bugs`, data)
    return response.data.bug
  }

  async getBugs(scenarioId: number): Promise<Bug[]> {
    const response = await api.get(`/scenarios/${scenarioId}/bugs`)
    return response.data.bugs
  }

  async getPackageBugs(projectId: number, packageId: number): Promise<Bug[]> {
    const response = await api.get(`/projects/${projectId}/packages/${packageId}/bugs`)
    return response.data.bugs
  }

  async updateBug(bugId: number, data: Partial<{ title: string; description?: string; severity: string; status: string }>): Promise<Bug> {
    const response = await api.put(`/bugs/${bugId}`, data)
    return response.data.bug
  }

  async deleteBug(bugId: number): Promise<void> {
    await api.delete(`/bugs/${bugId}`)
  }

  // Atualizar status da etapa
  async updateStepStatus(stepId: number, status: string, actualResult?: string): Promise<any> {
    const response = await api.put(`/execution/steps/${stepId}/status`, {
      status,
      actualResult
    })
    return response.data.step
  }

  // Histórico
  async registerHistory(
    scenarioId: number,
    action: string,
    description?: string,
    metadata?: any
  ): Promise<ExecutionHistory> {
    const response = await api.post(`/scenarios/${scenarioId}/history`, {
      action,
      description,
      metadata
    })
    return response.data.history
  }

  async getHistory(scenarioId: number): Promise<ExecutionHistory[]> {
    const response = await api.get(`/scenarios/${scenarioId}/history`)
    return response.data.history
  }
}

export const executionService = new ExecutionService()

