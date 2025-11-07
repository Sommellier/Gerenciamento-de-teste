import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scenarioService } from 'src/services/scenario.service'
import type { TestScenario, ScenarioExecution, ScenarioEvidence, ScenarioListResponse } from 'src/services/scenario.service'
import api from 'src/services/api'

// Mock do api
vi.mock('src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Scenario Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPackageScenarios', () => {
    it('deve obter cenários do pacote sem filtros', async () => {
      const mockResponse: ScenarioListResponse = {
        message: 'Cenários obtidos com sucesso',
        data: {
          scenarios: [],
          pagination: {
            page: 1,
            pageSize: 10,
            total: 0,
            totalPages: 0,
          },
        },
      }

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockResponse })

      const result = await scenarioService.getPackageScenarios(1)

      expect(api.get).toHaveBeenCalledWith('/packages/1/scenarios?')
      expect(result).toEqual(mockResponse)
    })

    it('deve obter cenários do pacote com filtros', async () => {
      const mockScenarios: TestScenario[] = [
        {
          id: 1,
          title: 'Scenario 1',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          projectId: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          steps: [],
        },
      ]

      const mockResponse: ScenarioListResponse = {
        message: 'Cenários obtidos com sucesso',
        data: {
          scenarios: mockScenarios,
          pagination: {
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1,
          },
        },
      }

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockResponse })

      const result = await scenarioService.getPackageScenarios(1, {
        status: 'CREATED',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        page: 1,
        pageSize: 10,
      })

      expect(api.get).toHaveBeenCalledWith('/packages/1/scenarios?status=CREATED&type=FUNCTIONAL&priority=HIGH&page=1&pageSize=10')
      expect(result).toEqual(mockResponse)
      expect(result.data.scenarios).toHaveLength(1)
    })

    it('deve ignorar filtros vazios', async () => {
      const mockResponse: ScenarioListResponse = {
        message: 'Cenários obtidos com sucesso',
        data: {
          scenarios: [],
          pagination: {
            page: 1,
            pageSize: 10,
            total: 0,
            totalPages: 0,
          },
        },
      }

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockResponse })

      const result = await scenarioService.getPackageScenarios(1, {
        status: undefined,
        q: '',
        page: 1,
      })

      expect(api.get).toHaveBeenCalledWith('/packages/1/scenarios?page=1')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('createScenario', () => {
    it('deve criar cenário com sucesso', async () => {
      const scenarioData = {
        title: 'New Scenario',
        description: 'New Description',
        type: 'FUNCTIONAL' as const,
        priority: 'HIGH' as const,
        steps: [
          { order: 1, action: 'Action 1', expected: 'Expected 1' },
        ],
        projectId: 1,
      }

      const mockScenario: TestScenario = {
        id: 1,
        ...scenarioData,
        status: 'CREATED',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        steps: scenarioData.steps.map((step, index) => ({
          id: index + 1,
          ...step,
        })),
      }

      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          message: 'Cenário criado com sucesso',
          scenario: mockScenario,
        },
      })

      const result = await scenarioService.createScenario(1, scenarioData)

      expect(api.post).toHaveBeenCalledWith('/projects/1/packages/1/scenarios', scenarioData)
      expect(result.scenario).toEqual(mockScenario)
      expect(result.message).toBe('Cenário criado com sucesso')
    })

    it('deve criar cenário com campos opcionais', async () => {
      const scenarioData = {
        title: 'New Scenario',
        type: 'FUNCTIONAL' as const,
        priority: 'HIGH' as const,
        steps: [],
        projectId: 1,
        testadorId: 1,
        aprovadorId: 2,
      }

      const mockScenario: TestScenario = {
        id: 1,
        ...scenarioData,
        status: 'CREATED',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        steps: [],
      }

      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          message: 'Cenário criado com sucesso',
          scenario: mockScenario,
        },
      })

      const result = await scenarioService.createScenario(1, scenarioData)

      expect(api.post).toHaveBeenCalledWith('/projects/1/packages/1/scenarios', scenarioData)
      expect(result.scenario).toEqual(mockScenario)
    })
  })

  describe('getScenarioById', () => {
    it('deve obter cenário por ID com sucesso', async () => {
      const mockScenario: TestScenario = {
        id: 1,
        title: 'Scenario 1',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        status: 'CREATED',
        projectId: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        steps: [],
      }

      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          message: 'Cenário obtido com sucesso',
          scenario: mockScenario,
        },
      })

      const result = await scenarioService.getScenarioById(1)

      expect(api.get).toHaveBeenCalledWith('/scenarios/1')
      expect(result.scenario).toEqual(mockScenario)
      expect(result.message).toBe('Cenário obtido com sucesso')
    })
  })

  describe('updateScenario', () => {
    it('deve atualizar cenário com sucesso', async () => {
      const updateData = {
        title: 'Updated Scenario',
        description: 'Updated Description',
        priority: 'MEDIUM' as const,
      }

      const mockScenario: TestScenario = {
        id: 1,
        title: 'Updated Scenario',
        description: 'Updated Description',
        type: 'FUNCTIONAL',
        priority: 'MEDIUM',
        status: 'CREATED',
        projectId: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        steps: [],
      }

      vi.mocked(api.put).mockResolvedValueOnce({
        data: {
          message: 'Cenário atualizado com sucesso',
          scenario: mockScenario,
        },
      })

      const result = await scenarioService.updateScenario(1, updateData)

      expect(api.put).toHaveBeenCalledWith('/scenarios/1', updateData)
      expect(result.scenario).toEqual(mockScenario)
      expect(result.message).toBe('Cenário atualizado com sucesso')
    })
  })

  describe('deleteScenario', () => {
    it('deve deletar cenário com sucesso', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({
        data: {
          message: 'Cenário deletado com sucesso',
        },
      })

      const result = await scenarioService.deleteScenario(1)

      expect(api.delete).toHaveBeenCalledWith('/scenarios/1')
      expect(result.message).toBe('Cenário deletado com sucesso')
    })
  })

  describe('executeScenario', () => {
    it('deve executar cenário com sucesso', async () => {
      const executionData = {
        status: 'PASSED' as const,
        notes: 'Execução bem-sucedida',
      }

      const mockExecution: ScenarioExecution = {
        id: 1,
        status: 'PASSED',
        runNumber: 1,
        notes: 'Execução bem-sucedida',
        executedAt: '2024-01-01T00:00:00Z',
        userId: 1,
        user: {
          id: 1,
          name: 'User 1',
          email: 'user1@example.com',
        },
      }

      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          message: 'Cenário executado com sucesso',
          execution: mockExecution,
        },
      })

      const result = await scenarioService.executeScenario(1, executionData)

      expect(api.post).toHaveBeenCalledWith('/scenarios/1/executions', executionData)
      expect(result.execution).toEqual(mockExecution)
      expect(result.message).toBe('Cenário executado com sucesso')
    })

    it('deve executar cenário sem notas', async () => {
      const executionData = {
        status: 'FAILED' as const,
      }

      const mockExecution: ScenarioExecution = {
        id: 1,
        status: 'FAILED',
        runNumber: 1,
        executedAt: '2024-01-01T00:00:00Z',
        userId: 1,
        user: {
          id: 1,
          name: 'User 1',
          email: 'user1@example.com',
        },
      }

      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          message: 'Cenário executado com sucesso',
          execution: mockExecution,
        },
      })

      const result = await scenarioService.executeScenario(1, executionData)

      expect(api.post).toHaveBeenCalledWith('/scenarios/1/executions', executionData)
      expect(result.execution.status).toBe('FAILED')
    })
  })

  describe('duplicateScenario', () => {
    it('deve duplicar cenário com sucesso', async () => {
      const mockScenario: TestScenario = {
        id: 2,
        title: 'Scenario 1 (Copy)',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        status: 'CREATED',
        projectId: 1,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        steps: [],
      }

      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          message: 'Cenário duplicado com sucesso',
          scenario: mockScenario,
        },
      })

      const result = await scenarioService.duplicateScenario(1)

      expect(api.post).toHaveBeenCalledWith('/scenarios/1/duplicate')
      expect(result.scenario).toEqual(mockScenario)
      expect(result.message).toBe('Cenário duplicado com sucesso')
    })
  })

  describe('uploadEvidence', () => {
    it('deve fazer upload de evidência com sucesso', async () => {
      const mockFile = new File(['content'], 'evidence.txt', { type: 'text/plain' })
      const mockEvidence: ScenarioEvidence = {
        id: 1,
        filename: 'evidence.txt',
        originalName: 'evidence.txt',
        mimeType: 'text/plain',
        size: 7,
        storageUrl: '/uploads/evidence.txt',
        checksum: 'abc123',
        scenarioId: 1,
        uploadedBy: 1,
        uploadedByUser: {
          id: 1,
          name: 'User 1',
          email: 'user1@example.com',
        },
        createdAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          message: 'Evidência enviada com sucesso',
          evidence: mockEvidence,
        },
      })

      const result = await scenarioService.uploadEvidence(1, mockFile)

      expect(api.post).toHaveBeenCalledWith(
        '/scenarios/1/evidences',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      expect(result.evidence).toEqual(mockEvidence)
      expect(result.message).toBe('Evidência enviada com sucesso')
    })
  })

  describe('exportScenariosToCSV', () => {
    it('deve exportar cenários para CSV com sucesso', async () => {
      const mockBlob = new Blob(['CSV content'], { type: 'text/csv' })

      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockBlob,
      })

      const result = await scenarioService.exportScenariosToCSV(1)

      expect(api.get).toHaveBeenCalledWith('/packages/1/scenarios/export.csv', {
        responseType: 'blob',
      })
      expect(result).toBeInstanceOf(Blob)
    })
  })

  describe('generateScenarioReport', () => {
    it('deve gerar relatório PDF com sucesso', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' })

      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockBlob,
      })

      const result = await scenarioService.generateScenarioReport(1)

      expect(api.get).toHaveBeenCalledWith('/packages/1/scenarios/report.pdf', {
        responseType: 'blob',
      })
      expect(result).toBeInstanceOf(Blob)
    })
  })
})

