import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from 'src/services/api'
import { projectService, createProject, getProjectReleases, getProjectMembers, addRelease } from 'src/services/project.service'

// Mock do api
vi.mock('src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('project.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createProject', () => {
    it('deve criar projeto com sucesso', async () => {
      const mockProject = {
        id: 1,
        ownerId: 1,
        name: 'Novo Projeto',
        description: 'Descrição do projeto',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(api.post).mockResolvedValueOnce({ data: mockProject })

      const result = await projectService.createProject({
        name: 'Novo Projeto',
        description: 'Descrição do projeto',
      })

      expect(api.post).toHaveBeenCalledWith('/projects', {
        name: 'Novo Projeto',
        description: 'Descrição do projeto',
      })
      expect(result).toEqual(mockProject)
    })

    it('deve criar projeto com description null', async () => {
      const mockProject = {
        id: 1,
        ownerId: 1,
        name: 'Novo Projeto',
        description: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(api.post).mockResolvedValueOnce({ data: mockProject })

      const result = await projectService.createProject({
        name: 'Novo Projeto',
        description: null,
      })

      expect(api.post).toHaveBeenCalledWith('/projects', {
        name: 'Novo Projeto',
        description: null,
      })
      expect(result).toEqual(mockProject)
    })
  })

  describe('getProjectReleases', () => {
    it('deve buscar releases com sucesso', async () => {
      const mockReleases = ['2024-09', '2024-08', '2024-07']

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockReleases })

      const result = await projectService.getProjectReleases(1)

      expect(api.get).toHaveBeenCalledWith('/projects/1/releases')
      expect(result).toEqual(mockReleases)
    })
  })

  describe('getProjectMembers', () => {
    it('deve buscar membros quando response.data é array (linha 55)', async () => {
      const mockMembers = [
        {
          id: 1,
          name: 'João Silva',
          email: 'joao@example.com',
          role: 'OWNER',
        },
        {
          id: 2,
          name: 'Maria Santos',
          email: 'maria@example.com',
          role: 'ADMIN',
        },
      ]

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockMembers })

      const result = await projectService.getProjectMembers(1)

      expect(api.get).toHaveBeenCalledWith('/projects/1/members')
      expect(result).toEqual(mockMembers)
    })

    it('deve buscar membros quando response.data tem items (linha 55)', async () => {
      const mockResponse = {
        items: [
          {
            id: 1,
            name: 'João Silva',
            email: 'joao@example.com',
            role: 'OWNER',
          },
        ],
      }

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockResponse })

      const result = await projectService.getProjectMembers(1)

      expect(api.get).toHaveBeenCalledWith('/projects/1/members')
      expect(result).toEqual(mockResponse.items)
    })

    it('deve retornar array vazio quando data não é array e não tem items (linha 55)', async () => {
      const mockResponse = {}

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockResponse })

      const result = await projectService.getProjectMembers(1)

      expect(api.get).toHaveBeenCalledWith('/projects/1/members')
      expect(result).toEqual([])
    })
  })

  describe('addRelease', () => {
    it('deve adicionar release quando não existe na lista', () => {
      const releases = ['2024-09', '2024-08']
      const result = projectService.addRelease(releases, '2024-10')

      expect(result).toEqual(['2024-10', '2024-09', '2024-08'])
    })

    it('deve não adicionar release quando já existe na lista', () => {
      const releases = ['2024-09', '2024-08']
      const result = projectService.addRelease(releases, '2024-09')

      expect(result).toEqual(releases)
    })

    it('deve ordenar releases em ordem decrescente', () => {
      const releases = ['2024-08', '2024-10']
      const result = projectService.addRelease(releases, '2024-09')

      expect(result).toEqual(['2024-10', '2024-09', '2024-08'])
    })
  })

  describe('Funções de conveniência', () => {
    it('deve exportar createProject', () => {
      expect(createProject).toBeDefined()
      expect(typeof createProject).toBe('function')
    })

    it('deve exportar getProjectReleases', () => {
      expect(getProjectReleases).toBeDefined()
      expect(typeof getProjectReleases).toBe('function')
    })

    it('deve exportar getProjectMembers', () => {
      expect(getProjectMembers).toBeDefined()
      expect(typeof getProjectMembers).toBe('function')
    })

    it('deve exportar addRelease', () => {
      expect(addRelease).toBeDefined()
      expect(typeof addRelease).toBe('function')
    })
  })
})

