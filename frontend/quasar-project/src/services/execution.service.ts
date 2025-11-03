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
  metadata?: Record<string, unknown>
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
    const response = await api.post<{ comment: StepComment }>(`/steps/${stepId}/comments`, {
      text,
      mentions
    })
    return response.data.comment
  }

  async getStepComments(stepId: number): Promise<StepComment[]> {
    const response = await api.get<{ comments: StepComment[] }>(`/steps/${stepId}/comments`)
    return response.data.comments
  }

  // Anexos/Evidências
  async uploadStepAttachment(stepId: number, file: File): Promise<StepAttachment> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<{ attachment: StepAttachment }>(`/steps/${stepId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data.attachment
  }

  async getStepAttachments(stepId: number): Promise<StepAttachment[]> {
    const response = await api.get<{ attachments: StepAttachment[] }>(`/steps/${stepId}/attachments`)
    return response.data.attachments
  }

  async deleteStepAttachment(stepId: number, attachmentId: number): Promise<void> {
    await api.delete(`/steps/${stepId}/attachments/${attachmentId}`)
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
    const response = await api.post<{ bug: Bug }>(`/scenarios/${scenarioId}/bugs`, data)
    return response.data.bug
  }

  async getBugs(scenarioId: number): Promise<Bug[]> {
    const response = await api.get<{ bugs: Bug[] }>(`/scenarios/${scenarioId}/bugs`)
    return response.data.bugs
  }

  async getPackageBugs(projectId: number, packageId: number): Promise<Bug[]> {
    const response = await api.get<{ bugs: Bug[] }>(`/projects/${projectId}/packages/${packageId}/bugs`)
    return response.data.bugs
  }

  async updateBug(bugId: number, data: Partial<{ title: string; description?: string; severity: string; status: string }>): Promise<Bug> {
    const response = await api.put<{ bug: Bug }>(`/bugs/${bugId}`, data)
    return response.data.bug
  }

  async deleteBug(bugId: number): Promise<void> {
    await api.delete(`/bugs/${bugId}`)
  }

  // Anexos de bugs
  async uploadBugAttachment(bugId: number, file: File): Promise<StepAttachment> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<{ attachment: StepAttachment }>(`/bugs/${bugId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data.attachment
  }

  // Atualizar status da etapa
  async updateStepStatus(stepId: number, status: string, actualResult?: string): Promise<unknown> {
    const response = await api.put<{ step: unknown }>(`/execution/steps/${stepId}/status`, {
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
    metadata?: Record<string, unknown>
  ): Promise<ExecutionHistory> {
    const response = await api.post<{ history: ExecutionHistory }>(`/scenarios/${scenarioId}/history`, {
      action,
      description,
      metadata
    })
    return response.data.history
  }

  async getHistory(scenarioId: number): Promise<ExecutionHistory[]> {
    const response = await api.get<{ history: ExecutionHistory[] }>(`/scenarios/${scenarioId}/history`)
    return response.data.history
  }
}

export const executionService = new ExecutionService()

