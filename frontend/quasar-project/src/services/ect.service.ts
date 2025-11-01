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
    } catch (error: any) {
      console.error('Erro ao gerar ECT:', error)
      throw new Error(error.response?.data?.message || 'Erro ao gerar ECT')
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
    } catch (error: any) {
      console.error('Erro ao baixar relatório:', error)
      throw new Error(error.response?.data?.message || 'Erro ao baixar relatório')
    }
  }
}
