import { describe, it, expect, vi, beforeEach } from 'vitest'
import { packageService } from 'src/services/package.service'
import type { TestPackage, TestScenario } from 'src/services/package.service'
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

// Mock do console.log
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('Package Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy.mockClear()
  })

  describe('getPackageDetails', () => {
    it('deve obter detalhes do pacote com sucesso', async () => {
      const mockPackage: TestPackage = {
        id: 1,
        title: 'Package 1',
        description: 'Description 1',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: ['tag1'],
        assigneeEmail: 'test@example.com',
        environment: 'DEV',
        release: '1.0.0',
        status: 'CREATED',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        steps: [],
        project: {
          id: 1,
          name: 'Project 1',
        },
        scenarios: [],
        metrics: {
          totalScenarios: 0,
          totalSteps: 0,
          packageSteps: 0,
          scenariosByType: {},
          scenariosByPriority: {},
        },
      }

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockPackage })

      const result = await packageService.getPackageDetails(1, 1)

      expect(api.get).toHaveBeenCalledWith('/projects/1/packages/1')
      expect(result).toEqual(mockPackage)
    })
  })

  describe('getProjectPackages', () => {
    it('deve obter pacotes do projeto sem release', async () => {
      const mockPackages: TestPackage[] = [
        {
          id: 1,
          title: 'Package 1',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          tags: [],
          release: '1.0.0',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          steps: [],
          project: {
            id: 1,
            name: 'Project 1',
          },
          scenarios: [],
          metrics: {
            totalScenarios: 0,
            totalSteps: 0,
            packageSteps: 0,
            scenariosByType: {},
            scenariosByPriority: {},
          },
        },
      ]

      vi.mocked(api.get).mockResolvedValueOnce({ data: { packages: mockPackages } })

      const result = await packageService.getProjectPackages(1)

      expect(api.get).toHaveBeenCalledWith('/projects/1/packages')
      expect(result).toEqual(mockPackages)
    })

    it('deve obter pacotes do projeto com release', async () => {
      const mockPackages: TestPackage[] = [
        {
          id: 1,
          title: 'Package 1',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          tags: [],
          release: '1.0.0',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          steps: [],
          project: {
            id: 1,
            name: 'Project 1',
          },
          scenarios: [],
          metrics: {
            totalScenarios: 0,
            totalSteps: 0,
            packageSteps: 0,
            scenariosByType: {},
            scenariosByPriority: {},
          },
        },
      ]

      vi.mocked(api.get).mockResolvedValueOnce({ data: { packages: mockPackages } })

      const result = await packageService.getProjectPackages(1, '1.0.0')

      expect(api.get).toHaveBeenCalledWith('/projects/1/packages?release=1.0.0')
      expect(result).toEqual(mockPackages)
    })
  })

  describe('createPackage', () => {
    it('deve criar pacote com sucesso', async () => {
      const packageData = {
        title: 'New Package',
        description: 'New Description',
        type: 'FUNCTIONAL' as const,
        priority: 'HIGH' as const,
        tags: ['tag1'],
        assigneeEmail: 'test@example.com',
        environment: 'DEV' as const,
        release: '1.0.0',
        steps: [
          { action: 'Action 1', expected: 'Expected 1' },
        ],
      }

      const mockPackage: TestPackage = {
        id: 1,
        ...packageData,
        status: 'CREATED',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        steps: packageData.steps.map((step, index) => ({
          id: index + 1,
          ...step,
          stepOrder: index + 1,
        })),
        project: {
          id: 1,
          name: 'Project 1',
        },
        scenarios: [],
        metrics: {
          totalScenarios: 0,
          totalSteps: 0,
          packageSteps: packageData.steps.length,
          scenariosByType: {},
          scenariosByPriority: {},
        },
      }

      vi.mocked(api.post).mockResolvedValueOnce({ data: { testPackage: mockPackage } })

      const result = await packageService.createPackage(1, packageData)

      expect(api.post).toHaveBeenCalledWith('/projects/1/packages', packageData)
      expect(result).toEqual(mockPackage)
    })

    it('deve criar pacote sem campos opcionais', async () => {
      const packageData = {
        title: 'New Package',
        type: 'FUNCTIONAL' as const,
        priority: 'MEDIUM' as const,
        tags: [],
        release: '1.0.0',
      }

      const mockPackage: TestPackage = {
        id: 1,
        ...packageData,
        status: 'CREATED',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        steps: [],
        project: {
          id: 1,
          name: 'Project 1',
        },
        scenarios: [],
        metrics: {
          totalScenarios: 0,
          totalSteps: 0,
          packageSteps: 0,
          scenariosByType: {},
          scenariosByPriority: {},
        },
      }

      vi.mocked(api.post).mockResolvedValueOnce({ data: { testPackage: mockPackage } })

      const result = await packageService.createPackage(1, packageData)

      expect(api.post).toHaveBeenCalledWith('/projects/1/packages', packageData)
      expect(result).toEqual(mockPackage)
    })
  })

  describe('updatePackage', () => {
    it('deve atualizar pacote com sucesso', async () => {
      const updateData = {
        title: 'Updated Package',
        description: 'Updated Description',
        tags: ['tag1', 'tag2'],
      }

      const mockPackage: TestPackage = {
        id: 1,
        title: 'Updated Package',
        description: 'Updated Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: ['tag1', 'tag2'],
        release: '1.0.0',
        status: 'IN_PROGRESS',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        steps: [],
        project: {
          id: 1,
          name: 'Project 1',
        },
        scenarios: [],
        metrics: {
          totalScenarios: 0,
          totalSteps: 0,
          packageSteps: 0,
          scenariosByType: {},
          scenariosByPriority: {},
        },
      }

      vi.mocked(api.put).mockResolvedValueOnce({ data: { testPackage: mockPackage } })

      const result = await packageService.updatePackage(1, 1, updateData)

      expect(api.put).toHaveBeenCalledWith('/projects/1/packages/1', updateData)
      expect(result).toEqual(mockPackage)
    })

    it('deve atualizar apenas campos específicos', async () => {
      const updateData = {
        status: 'COMPLETED' as const,
      }

      const mockPackage: TestPackage = {
        id: 1,
        title: 'Package 1',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: [],
        release: '1.0.0',
        status: 'COMPLETED',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        steps: [],
        project: {
          id: 1,
          name: 'Project 1',
        },
        scenarios: [],
        metrics: {
          totalScenarios: 0,
          totalSteps: 0,
          packageSteps: 0,
          scenariosByType: {},
          scenariosByPriority: {},
        },
      }

      vi.mocked(api.put).mockResolvedValueOnce({ data: { testPackage: mockPackage } })

      const result = await packageService.updatePackage(1, 1, updateData)

      expect(api.put).toHaveBeenCalledWith('/projects/1/packages/1', updateData)
      expect(result.status).toBe('COMPLETED')
    })
  })

  describe('deletePackage', () => {
    it('deve deletar pacote com sucesso', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce(undefined)

      await packageService.deletePackage(1, 1)

      expect(api.delete).toHaveBeenCalledWith('/projects/1/packages/1')
    })
  })

  describe('executePackage', () => {
    it('deve executar pacote (simular execução)', () => {
      // A função executePackage não faz nada no momento (implementação futura)
      // Apenas verifica que não lança erro
      expect(() => packageService.executePackage(1)).not.toThrow()
    })
  })

  describe('approvePackage', () => {
    it('deve aprovar pacote com sucesso', async () => {
      const mockPackage: TestPackage = {
        id: 1,
        title: 'Package 1',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: [],
        release: '1.0.0',
        status: 'APROVADO',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        steps: [],
        project: {
          id: 1,
          name: 'Project 1',
        },
        scenarios: [],
        metrics: {
          totalScenarios: 0,
          totalSteps: 0,
          packageSteps: 0,
          scenariosByType: {},
          scenariosByPriority: {},
        },
        approvedBy: {
          id: 1,
          name: 'Approver',
          email: 'approver@example.com',
        },
        approvedAt: '2024-01-02T00:00:00Z',
      }

      vi.mocked(api.post).mockResolvedValueOnce({ data: { package: mockPackage } })

      const result = await packageService.approvePackage(1, 1)

      expect(api.post).toHaveBeenCalledWith('/projects/1/packages/1/approve')
      expect(result).toEqual(mockPackage)
      expect(result.status).toBe('APROVADO')
    })
  })

  describe('rejectPackage', () => {
    it('deve reprovar pacote com sucesso', async () => {
      const mockPackage: TestPackage = {
        id: 1,
        title: 'Package 1',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: [],
        release: '1.0.0',
        status: 'REPROVADO',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        steps: [],
        project: {
          id: 1,
          name: 'Project 1',
        },
        scenarios: [],
        metrics: {
          totalScenarios: 0,
          totalSteps: 0,
          packageSteps: 0,
          scenariosByType: {},
          scenariosByPriority: {},
        },
        rejectedBy: {
          id: 1,
          name: 'Rejecter',
          email: 'rejecter@example.com',
        },
        rejectedAt: '2024-01-02T00:00:00Z',
        rejectionReason: 'Falhas críticas encontradas',
      }

      vi.mocked(api.post).mockResolvedValueOnce({ data: { package: mockPackage } })

      const result = await packageService.rejectPackage(1, 1, 'Falhas críticas encontradas')

      expect(api.post).toHaveBeenCalledWith('/projects/1/packages/1/reject', {
        rejectionReason: 'Falhas críticas encontradas',
      })
      expect(result).toEqual(mockPackage)
      expect(result.status).toBe('REPROVADO')
      expect(result.rejectionReason).toBe('Falhas críticas encontradas')
    })
  })

  describe('sendPackageToTest', () => {
    it('deve reenviar pacote para teste com sucesso', async () => {
      const mockPackage: TestPackage = {
        id: 1,
        title: 'Package 1',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: [],
        release: '1.0.0',
        status: 'EM_TESTE',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        steps: [],
        project: {
          id: 1,
          name: 'Project 1',
        },
        scenarios: [],
        metrics: {
          totalScenarios: 0,
          totalSteps: 0,
          packageSteps: 0,
          scenariosByType: {},
          scenariosByPriority: {},
        },
      }

      vi.mocked(api.post).mockResolvedValueOnce({ data: { package: mockPackage } })

      const result = await packageService.sendPackageToTest(1, 1)

      expect(api.post).toHaveBeenCalledWith('/projects/1/packages/1/send-to-test')
      expect(result).toEqual(mockPackage)
      expect(result.status).toBe('EM_TESTE')
    })
  })
})

