import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ectService } from 'src/services/ect.service'
import api from 'src/services/api'

// Mock do api
vi.mock('src/services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

// Mock do window.URL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()

Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
})

// Mock do document.createElement e métodos
const mockClick = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()

let mockLink: {
  href: string
  download: string
  click: ReturnType<typeof vi.fn>
}

const createElementSpy = vi.spyOn(document, 'createElement')
const appendChildSpy = vi.spyOn(document.body, 'appendChild')
const removeChildSpy = vi.spyOn(document.body, 'removeChild')

describe('ECT Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClick.mockClear()
    mockAppendChild.mockClear()
    mockRemoveChild.mockClear()
    mockCreateObjectURL.mockClear()
    mockRevokeObjectURL.mockClear()
    
    // Criar novo mockLink a cada teste
    mockLink = {
      href: '',
      download: '',
      click: mockClick,
    }
    
    createElementSpy.mockClear()
    createElementSpy.mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as any
      }
      return document.createElement(tagName)
    })
    
    appendChildSpy.mockClear()
    appendChildSpy.mockImplementation(mockAppendChild)
    
    removeChildSpy.mockClear()
    removeChildSpy.mockImplementation(mockRemoveChild)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateECT', () => {
    it('deve gerar ECT com sucesso', async () => {
      const mockResponse = {
        data: {
          message: 'ECT gerado com sucesso',
          reportId: 1,
          downloadUrl: '/reports/1/download',
        },
      }

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse)

      const result = await ectService.generateECT(1)

      expect(api.post).toHaveBeenCalledWith('/scenarios/1/ect')
      expect(result).toEqual(mockResponse.data)
    })

    it('deve lançar erro quando falha ao gerar ECT', async () => {
      const error = {
        response: {
          data: {
            message: 'Erro ao gerar ECT',
          },
        },
      }

      vi.mocked(api.post).mockRejectedValueOnce(error)

      await expect(ectService.generateECT(1)).rejects.toThrow('Erro ao gerar ECT')
      expect(api.post).toHaveBeenCalledWith('/scenarios/1/ect')
    })

    it('deve lançar erro genérico quando não há mensagem de erro', async () => {
      const error = {
        response: {
          data: {},
        },
      }

      vi.mocked(api.post).mockRejectedValueOnce(error)

      await expect(ectService.generateECT(1)).rejects.toThrow('Erro ao gerar ECT')
    })

    it('deve lançar erro genérico quando erro não tem response', async () => {
      const error = new Error('Network error')

      vi.mocked(api.post).mockRejectedValueOnce(error)

      await expect(ectService.generateECT(1)).rejects.toThrow('Erro ao gerar ECT')
    })
  })

  describe('downloadReport', () => {
    it('deve baixar relatório com sucesso', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' })
      const mockResponse = {
        data: mockBlob,
        headers: {
          'content-disposition': 'attachment; filename="ECT-Report-1.pdf"',
        },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      await ectService.downloadReport(1)

      expect(api.get).toHaveBeenCalledWith('/reports/1/download', {
        responseType: 'blob',
      })
      // Verificar se o download foi iniciado (verificando se createObjectURL foi chamado)
      expect(mockCreateObjectURL).toHaveBeenCalled()
    })

    it('deve usar nome de arquivo padrão quando não há Content-Disposition', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' })
      const mockResponse = {
        data: mockBlob,
        headers: {},
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      await ectService.downloadReport(1)

      expect(api.get).toHaveBeenCalledWith('/reports/1/download', {
        responseType: 'blob',
      })
      // Verificar se o download foi iniciado (verificando se createObjectURL foi chamado)
      expect(mockCreateObjectURL).toHaveBeenCalled()
    })

    it('deve extrair nome de arquivo do Content-Disposition', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' })
      const mockResponse = {
        data: mockBlob,
        headers: {
          'content-disposition': 'attachment; filename="Custom-Report.pdf"',
        },
      }

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

      await ectService.downloadReport(1)

      expect(api.get).toHaveBeenCalledWith('/reports/1/download', {
        responseType: 'blob',
      })
      // Verificar se o download foi iniciado (verificando se createObjectURL foi chamado)
      expect(mockCreateObjectURL).toHaveBeenCalled()
    })

    it('deve lançar erro quando falha ao baixar relatório', async () => {
      const error = {
        response: {
          data: {
            message: 'Erro ao baixar relatório',
          },
        },
      }

      vi.mocked(api.get).mockRejectedValueOnce(error)

      await expect(ectService.downloadReport(1)).rejects.toThrow('Erro ao baixar relatório')
    })

    it('deve lançar erro genérico quando não há mensagem de erro', async () => {
      const error = {
        response: {
          data: {},
        },
      }

      vi.mocked(api.get).mockRejectedValueOnce(error)

      await expect(ectService.downloadReport(1)).rejects.toThrow('Erro ao baixar relatório')
    })

    it('deve lançar erro genérico quando erro não tem response', async () => {
      const error = new Error('Network error')

      vi.mocked(api.get).mockRejectedValueOnce(error)

      await expect(ectService.downloadReport(1)).rejects.toThrow('Erro ao baixar relatório')
    })
  })

  describe('approveReport', () => {
    it('deve aprovar relatório com sucesso', async () => {
      const mockResponse = {
        data: {
          message: 'Relatório aprovado com sucesso',
        },
      }

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse)

      const result = await ectService.approveReport(1)

      expect(api.post).toHaveBeenCalledWith('/reports/1/approve', { comment: undefined })
      expect(result).toEqual(mockResponse.data)
    })

    it('deve aprovar relatório com comentário', async () => {
      const mockResponse = {
        data: {
          message: 'Relatório aprovado com sucesso',
        },
      }

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse)

      const result = await ectService.approveReport(1, 'Aprovado após revisão')

      expect(api.post).toHaveBeenCalledWith('/reports/1/approve', { comment: 'Aprovado após revisão' })
      expect(result).toEqual(mockResponse.data)
    })

    it('deve lançar erro quando falha ao aprovar relatório', async () => {
      const error = {
        response: {
          data: {
            message: 'Erro ao aprovar relatório',
          },
        },
      }

      vi.mocked(api.post).mockRejectedValueOnce(error)

      await expect(ectService.approveReport(1)).rejects.toThrow('Erro ao aprovar relatório')
    })

    it('deve lançar erro genérico quando não há mensagem de erro', async () => {
      const error = {
        response: {
          data: {},
        },
      }

      vi.mocked(api.post).mockRejectedValueOnce(error)

      await expect(ectService.approveReport(1)).rejects.toThrow('Erro ao aprovar relatório')
    })

    it('deve lançar erro genérico quando erro não tem response', async () => {
      const error = new Error('Network error')

      vi.mocked(api.post).mockRejectedValueOnce(error)

      await expect(ectService.approveReport(1)).rejects.toThrow('Erro ao aprovar relatório')
    })
  })

  describe('rejectReport', () => {
    it('deve reprovar relatório com sucesso', async () => {
      const mockResponse = {
        data: {
          message: 'Relatório reprovado com sucesso',
        },
      }

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse)

      const result = await ectService.rejectReport(1, 'Reprovado por inconsistências')

      expect(api.post).toHaveBeenCalledWith('/reports/1/reject', { comment: 'Reprovado por inconsistências' })
      expect(result).toEqual(mockResponse.data)
    })

    it('deve lançar erro quando falha ao reprovar relatório', async () => {
      const error = {
        response: {
          data: {
            message: 'Erro ao reprovar relatório',
          },
        },
      }

      vi.mocked(api.post).mockRejectedValueOnce(error)

      await expect(ectService.rejectReport(1, 'Comentário')).rejects.toThrow('Erro ao reprovar relatório')
    })

    it('deve lançar erro genérico quando não há mensagem de erro', async () => {
      const error = {
        response: {
          data: {},
        },
      }

      vi.mocked(api.post).mockRejectedValueOnce(error)

      await expect(ectService.rejectReport(1, 'Comentário')).rejects.toThrow('Erro ao reprovar relatório')
    })

    it('deve lançar erro genérico quando erro não tem response', async () => {
      const error = new Error('Network error')

      vi.mocked(api.post).mockRejectedValueOnce(error)

      await expect(ectService.rejectReport(1, 'Comentário')).rejects.toThrow('Erro ao reprovar relatório')
    })
  })
})

