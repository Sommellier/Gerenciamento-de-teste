import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import api from 'src/services/api'

// Mock do api
vi.mock('src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

// Importar tipos
import type {
  ProjectDetails,
  ProjectMember,
  TestPackage,
} from 'src/services/project-details.service'

// Importar funções normalmente (para testes com USE_MOCK = false)
import {
  getProjectDetails,
  createTestPackage,
  getProjectMembers,
  getAvailableReleases,
} from 'src/services/project-details.service'

describe('project-details.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getProjectDetails', () => {
    it('deve buscar detalhes do projeto com sucesso', async () => {
      const mockProjectDetails: ProjectDetails = {
        id: 1,
        name: 'Projeto Teste',
        description: 'Descrição do projeto',
        ownerId: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        members: [],
        metrics: {
          created: 10,
          executed: 8,
          passed: 6,
          failed: 2,
        },
        testPackages: [],
        scenarios: [],
        scenarioMetrics: {
          created: 20,
          executed: 15,
          passed: 12,
          failed: 3,
        },
      }

      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockProjectDetails,
      } as any)

      const result = await getProjectDetails(1)

      expect(api.get).toHaveBeenCalledWith('/projects/1/details', {
        params: { release: undefined },
      })
      expect(result).toEqual(mockProjectDetails)
    })

    it('deve buscar detalhes do projeto com release específica', async () => {
      const mockProjectDetails: ProjectDetails = {
        id: 1,
        name: 'Projeto Teste',
        description: 'Descrição do projeto',
        ownerId: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        members: [],
        metrics: {
          created: 5,
          executed: 4,
          passed: 3,
          failed: 1,
        },
        testPackages: [],
        scenarios: [],
        scenarioMetrics: {
          created: 10,
          executed: 8,
          passed: 6,
          failed: 2,
        },
      }

      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockProjectDetails,
      } as any)

      const result = await getProjectDetails(1, '2024-09')

      expect(api.get).toHaveBeenCalledWith('/projects/1/details', {
        params: { release: '2024-09' },
      })
      expect(result).toEqual(mockProjectDetails)
    })

    it('deve tratar erro ao buscar detalhes do projeto', async () => {
      const error = new Error('Erro ao buscar detalhes')
      vi.mocked(api.get).mockRejectedValueOnce(error)

      await expect(getProjectDetails(1)).rejects.toThrow('Erro ao buscar detalhes')
      expect(api.get).toHaveBeenCalledWith('/projects/1/details', {
        params: { release: undefined },
      })
    })
  })

  describe('createTestPackage', () => {
    it('deve criar pacote de teste com sucesso', async () => {
      const newPackage: Omit<TestPackage, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
        title: 'Novo Pacote',
        description: 'Descrição do pacote',
        type: 'Functional',
        priority: 'High',
        tags: ['test'],
        steps: [
          { id: 1, action: 'Ação 1', expected: 'Resultado 1' },
        ],
        release: '2024-09',
      }

      const mockResponse = {
        testPackage: {
          ...newPackage,
          id: 1,
          status: 'Created' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      }

      vi.mocked(api.post).mockResolvedValueOnce({
        data: mockResponse,
      } as any)

      const result = await createTestPackage(1, newPackage)

      expect(api.post).toHaveBeenCalledWith('/projects/1/packages', newPackage)
      expect(result).toEqual(mockResponse.testPackage)
    })

    it('deve tratar erro ao criar pacote de teste', async () => {
      const newPackage: Omit<TestPackage, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
        title: 'Novo Pacote',
        type: 'Functional',
        priority: 'High',
        tags: [],
        steps: [],
        release: '2024-09',
      }

      const error = new Error('Erro ao criar pacote')
      vi.mocked(api.post).mockRejectedValueOnce(error)

      await expect(createTestPackage(1, newPackage)).rejects.toThrow('Erro ao criar pacote')
      expect(api.post).toHaveBeenCalledWith('/projects/1/packages', newPackage)
    })
  })

  describe('getProjectMembers', () => {
    it('deve buscar membros do projeto com sucesso (formato items)', async () => {
      const mockResponse = {
        items: [
          {
            id: 1,
            user: {
              id: 1,
              name: 'Usuário 1',
              email: 'user1@example.com',
              avatar: '/avatar1.jpg',
            },
            role: 'OWNER',
          },
          {
            id: 2,
            user: {
              id: 2,
              name: 'Usuário 2',
              email: 'user2@example.com',
            },
            role: 'MANAGER',
          },
        ],
      }

      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockResponse,
      } as any)

      const result = await getProjectMembers(1)

      expect(api.get).toHaveBeenCalledWith('/projects/1/members')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 1,
        name: 'Usuário 1',
        email: 'user1@example.com',
        role: 'OWNER',
        avatar: '/avatar1.jpg',
      })
      expect(result[1]).toEqual({
        id: 2,
        name: 'Usuário 2',
        email: 'user2@example.com',
        role: 'MANAGER',
      })
    })

    it('deve buscar membros do projeto com sucesso (formato array direto)', async () => {
      const mockResponse = [
        {
          userId: 1,
          name: 'Usuário 1',
          email: 'user1@example.com',
          role: 'OWNER',
          avatar: '/avatar1.jpg',
        },
        {
          userId: 2,
          name: 'Usuário 2',
          email: 'user2@example.com',
          role: 'MANAGER',
        },
      ]

      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockResponse,
      } as any)

      const result = await getProjectMembers(1)

      expect(api.get).toHaveBeenCalledWith('/projects/1/members')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 1,
        name: 'Usuário 1',
        email: 'user1@example.com',
        role: 'OWNER',
        avatar: '/avatar1.jpg',
      })
      expect(result[1]).toEqual({
        id: 2,
        name: 'Usuário 2',
        email: 'user2@example.com',
        role: 'MANAGER',
      })
    })

    it('deve buscar membros do projeto com formato misto', async () => {
      const mockResponse = {
        items: [
          {
            id: 1,
            name: 'Usuário 1',
            email: 'user1@example.com',
            role: 'OWNER',
            avatar: '/avatar1.jpg',
          },
          {
            user: {
              id: 2,
              name: 'Usuário 2',
              email: 'user2@example.com',
            },
            role: 'MANAGER',
          },
        ],
      }

      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockResponse,
      } as any)

      const result = await getProjectMembers(1)

      expect(api.get).toHaveBeenCalledWith('/projects/1/members')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 1,
        name: 'Usuário 1',
        email: 'user1@example.com',
        role: 'OWNER',
        avatar: '/avatar1.jpg',
      })
      expect(result[1]).toEqual({
        id: 2,
        name: 'Usuário 2',
        email: 'user2@example.com',
        role: 'MANAGER',
      })
    })

    it('deve tratar membros sem avatar', async () => {
      const mockResponse = {
        items: [
          {
            id: 1,
            user: {
              id: 1,
              name: 'Usuário 1',
              email: 'user1@example.com',
            },
            role: 'OWNER',
          },
        ],
      }

      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockResponse,
      } as any)

      const result = await getProjectMembers(1)

      expect(result[0]).not.toHaveProperty('avatar')
    })

    it('deve tratar erro ao buscar membros', async () => {
      const error = new Error('Erro ao buscar membros')
      vi.mocked(api.get).mockRejectedValueOnce(error)

      await expect(getProjectMembers(1)).rejects.toThrow('Erro ao buscar membros')
      expect(api.get).toHaveBeenCalledWith('/projects/1/members')
    })

    it('deve tratar resposta vazia', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: { items: [] },
      } as any)

      const result = await getProjectMembers(1)

      expect(result).toEqual([])
    })
  })

  describe('getAvailableReleases', () => {
    it('deve buscar releases disponíveis com sucesso', async () => {
      const mockReleases = ['2024-09', '2024-08', '2024-07', '2024-06']

      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockReleases,
      } as any)

      const result = await getAvailableReleases(1)

      expect(api.get).toHaveBeenCalledWith('/projects/1/releases')
      expect(result).toEqual(mockReleases)
      expect(result).toHaveLength(4)
    })

    it('deve retornar array vazio quando não há releases', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: [],
      } as any)

      const result = await getAvailableReleases(1)

      expect(api.get).toHaveBeenCalledWith('/projects/1/releases')
      expect(result).toEqual([])
    })

    it('deve tratar erro ao buscar releases', async () => {
      const error = new Error('Erro ao buscar releases')
      vi.mocked(api.get).mockRejectedValueOnce(error)

      await expect(getAvailableReleases(1)).rejects.toThrow('Erro ao buscar releases')
      expect(api.get).toHaveBeenCalledWith('/projects/1/releases')
    })
  })

})
