import api from './api'

export interface ECTGenerationResponse {
  message: string
  reportId: number
  downloadUrl: string
}

export const ectService = {
  // Gerar ECT para um cenário
  async generateECT(scenarioId: number): Promise<ECTGenerationResponse> {
    try {
      console.log('Gerando ECT para cenário:', scenarioId)
      const response = await api.post<ECTGenerationResponse>(`/scenarios/${scenarioId}/ect`)
      console.log('ECT gerado com sucesso:', response.data)
      return response.data
    } catch (error: unknown) {
      console.error('Erro ao gerar ECT:', error)
      interface AxiosError {
        response?: {
          data?: {
            message?: string
          }
        }
      }
      const axiosError = error && typeof error === 'object' && 'response' in error
        ? error as AxiosError
        : undefined
      throw new Error(axiosError?.response?.data?.message || 'Erro ao gerar ECT')
    }
  },

  // Download de relatório
  async downloadReport(reportId: number): Promise<void> {
    try {
      console.log('Baixando relatório:', reportId)
      const response = await api.get<Blob>(`/reports/${reportId}/download`, {
        responseType: 'blob'
      })

      // Criar URL para download
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      
      // Criar link temporário para download
      const link = document.createElement('a')
      link.href = url
      
      // Extrair nome do arquivo do header Content-Disposition
      const contentDisposition = response.headers['content-disposition']
      let fileName = `ECT-${reportId}.pdf`
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/)
        if (fileNameMatch) {
          fileName = fileNameMatch[1]
        }
      }
      
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Limpar URL
      window.URL.revokeObjectURL(url)
      
      console.log('Download iniciado:', fileName)
    } catch (error: unknown) {
      console.error('Erro ao baixar relatório:', error)
      interface AxiosError {
        response?: {
          data?: {
            message?: string
          }
        }
      }
      const axiosError = error && typeof error === 'object' && 'response' in error
        ? error as AxiosError
        : undefined
      throw new Error(axiosError?.response?.data?.message || 'Erro ao baixar relatório')
    }
  },

  // Aprovar relatório ECT
  async approveReport(reportId: number, comment?: string): Promise<unknown> {
    try {
      console.log('Aprovando relatório:', reportId)
      const response = await api.post(`/reports/${reportId}/approve`, { comment })
      console.log('Relatório aprovado com sucesso:', response.data)
      return response.data
    } catch (error: unknown) {
      console.error('Erro ao aprovar relatório:', error)
      interface AxiosError {
        response?: {
          data?: {
            message?: string
          }
        }
      }
      const axiosError = error && typeof error === 'object' && 'response' in error
        ? error as AxiosError
        : undefined
      throw new Error(axiosError?.response?.data?.message || 'Erro ao aprovar relatório')
    }
  },

  // Reprovar relatório ECT
  async rejectReport(reportId: number, comment: string): Promise<unknown> {
    try {
      console.log('Reprovando relatório:', reportId)
      const response = await api.post(`/reports/${reportId}/reject`, { comment })
      console.log('Relatório reprovado com sucesso:', response.data)
      return response.data
    } catch (error: unknown) {
      console.error('Erro ao reprovar relatório:', error)
      interface AxiosError {
        response?: {
          data?: {
            message?: string
          }
        }
      }
      const axiosError = error && typeof error === 'object' && 'response' in error
        ? error as AxiosError
        : undefined
      throw new Error(axiosError?.response?.data?.message || 'Erro ao reprovar relatório')
    }
  }
}
