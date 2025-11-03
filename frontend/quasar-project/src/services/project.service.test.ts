// @ts-expect-error - vitest types are available but TypeScript can't find them in this context
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { projectService } from './project.service'
import api from './api'

// Mock da API
vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

// Tipos para mocks
interface MockApiResponse<T> {
  data: T
}

type MockedApiPost = {
  mockResolvedValue: (value: MockApiResponse<unknown>) => void
}

type MockedApiGet = {
  mockResolvedValue: (value: MockApiResponse<unknown>) => void
}

// Helper functions to avoid unbound method errors
const getPostMock = (): MockedApiPost & { mock: { calls: unknown[][] } } => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  return (api.post as unknown as MockedApiPost & { mock: { calls: unknown[][] } })
}

const getGetMock = (): MockedApiGet & { mock: { calls: unknown[][] } } => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  return (api.get as unknown as MockedApiGet & { mock: { calls: unknown[][] } })
}

describe('projectService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProject', () => {
    it('deve criar projeto com sucesso', async () => {
      const mockProject = {
        id: 1,
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }

      ;(api.post as unknown as MockedApiPost).mockResolvedValue({ data: mockProject })

      const result = await projectService.createProject({
        name: 'Test Project',
        description: 'Test Description',
      })

      expect(result).toEqual(mockProject)
      const postMock = getPostMock()
      expect(postMock.mock.calls[0]?.[0]).toBe('/projects')
      expect(postMock.mock.calls[0]?.[1]).toEqual({
        name: 'Test Project',
        description: 'Test Description',
      })
    })

    it('deve criar projeto sem descrição', async () => {
      const mockProject = {
        id: 2,
        name: 'Minimal Project',
        description: null,
        ownerId: 1,
        createdAt: '2024-01-02',
        updatedAt: '2024-01-02',
      }

      ;(api.post as unknown as MockedApiPost).mockResolvedValue({ data: mockProject })

      const result = await projectService.createProject({
        name: 'Minimal Project',
        description: null,
      })

      expect(result.description).toBeNull()
    })
  })

  describe('getProjectReleases', () => {
    it('deve buscar releases do projeto', async () => {
      const mockReleases = ['v1.0', 'v1.1', 'v2.0']

      ;(api.get as unknown as MockedApiGet).mockResolvedValue({ data: mockReleases })

      const result = await projectService.getProjectReleases(1)

      expect(result).toEqual(mockReleases)
      const getMock = getGetMock()
      expect(getMock.mock.calls[0]?.[0]).toBe('/projects/1/releases')
    })

    it('deve retornar array vazio quando não há releases', async () => {
      ;(api.get as unknown as MockedApiGet).mockResolvedValue({ data: [] })

      const result = await projectService.getProjectReleases(1)

      expect(result).toEqual([])
    })
  })

  describe('getProjectMembers', () => {
    it('deve retornar membros do projeto com items', async () => {
      const mockMembers = {
        items: [
          { id: 1, name: 'Alice', email: 'alice@test.com', role: 'MANAGER' },
          { id: 2, name: 'Bob', email: 'bob@test.com', role: 'TESTER' },
        ],
      }

      ;(api.get as unknown as MockedApiGet).mockResolvedValue({ data: mockMembers })

      const result = await projectService.getProjectMembers(1)

      expect(result).toHaveLength(2)
      expect(result[0]?.name).toBe('Alice')
    })

    it('deve retornar membros do projeto como array direto', async () => {
      const mockMembers = [
        { id: 1, name: 'Alice', email: 'alice@test.com', role: 'MANAGER' },
      ]

      ;(api.get as unknown as MockedApiGet).mockResolvedValue({ data: mockMembers })

      const result = await projectService.getProjectMembers(1)

      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('Alice')
    })

    it('deve retornar array vazio quando não há membros', async () => {
      ;(api.get as unknown as MockedApiGet).mockResolvedValue({ data: { items: [] } })

      const result = await projectService.getProjectMembers(1)

      expect(result).toEqual([])
    })
  })

  describe('addRelease', () => {
    it('deve adicionar release à lista', () => {
      const releases = ['v1.0', 'v1.1']
      const result = projectService.addRelease(releases, 'v2.0')

      expect(result).toEqual(['v2.0', 'v1.1', 'v1.0'])
    })

    it('não deve adicionar release duplicada', () => {
      const releases = ['v1.0', 'v1.1']
      const result = projectService.addRelease(releases, 'v1.0')

      expect(result).toEqual(releases)
      expect(result).toHaveLength(2)
    })

    it('deve ordenar releases em ordem decrescente', () => {
      const releases = ['v1.0', 'v3.0', 'v2.0']
      const result = projectService.addRelease(releases, 'v2.5')

      expect(result).toEqual(['v3.0', 'v2.5', 'v2.0', 'v1.0'])
    })
  })
})

