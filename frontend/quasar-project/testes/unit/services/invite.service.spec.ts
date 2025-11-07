import { describe, it, expect, vi, beforeEach } from 'vitest'
import { inviteService } from 'src/services/invite.service'
import type { Invite, ListInvitesResponse, AcceptInviteResponse, DeclineInviteResponse } from 'src/services/invite.service'
import api from 'src/services/api'

// Mock do api
vi.mock('src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('Invite Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listUserInvites', () => {
    it('deve listar convites sem parâmetros', async () => {
      const mockResponse: ListInvitesResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      }

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockResponse })

      const result = await inviteService.listUserInvites()

      expect(api.get).toHaveBeenCalledWith('/invites')
      expect(result).toEqual(mockResponse)
    })

    it('deve listar convites com parâmetros de status', async () => {
      const mockResponse: ListInvitesResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      }

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockResponse })

      const result = await inviteService.listUserInvites({ status: ['PENDING', 'ACCEPTED'] })

      // URLSearchParams codifica vírgula como %2C
      expect(api.get).toHaveBeenCalledWith('/invites?status=PENDING%2CACCEPTED')
      expect(result).toEqual(mockResponse)
    })

    it('deve listar convites com parâmetro de busca', async () => {
      const mockResponse: ListInvitesResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      }

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockResponse })

      const result = await inviteService.listUserInvites({ q: 'test@example.com' })

      expect(api.get).toHaveBeenCalledWith('/invites?q=test%40example.com')
      expect(result).toEqual(mockResponse)
    })

    it('deve listar convites com parâmetros de paginação', async () => {
      const mockResponse: ListInvitesResponse = {
        items: [],
        total: 0,
        page: 2,
        pageSize: 20,
        totalPages: 0,
      }

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockResponse })

      const result = await inviteService.listUserInvites({ page: 2, pageSize: 20 })

      expect(api.get).toHaveBeenCalledWith('/invites?page=2&pageSize=20')
      expect(result).toEqual(mockResponse)
    })

    it('deve listar convites com parâmetros de ordenação', async () => {
      const mockResponse: ListInvitesResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      }

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockResponse })

      const result = await inviteService.listUserInvites({ orderBy: 'createdAt', sort: 'desc' })

      expect(api.get).toHaveBeenCalledWith('/invites?orderBy=createdAt&sort=desc')
      expect(result).toEqual(mockResponse)
    })

    it('deve listar convites com todos os parâmetros', async () => {
      const mockInvites: Invite[] = [
        {
          id: 1,
          projectId: 1,
          email: 'test@example.com',
          role: 'TESTER',
          status: 'PENDING',
          token: 'token-123',
          createdAt: '2024-01-01T00:00:00Z',
          expiresAt: '2024-01-08T00:00:00Z',
          project: {
            id: 1,
            name: 'Project 1',
          },
          invitedBy: {
            id: 1,
            name: 'User 1',
            email: 'user1@example.com',
          },
        },
      ]

      const mockResponse: ListInvitesResponse = {
        items: mockInvites,
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      }

      vi.mocked(api.get).mockResolvedValueOnce({ data: mockResponse })

      const result = await inviteService.listUserInvites({
        status: ['PENDING'],
        q: 'test',
        page: 1,
        pageSize: 10,
        orderBy: 'createdAt',
        sort: 'desc',
      })

      expect(api.get).toHaveBeenCalledWith('/invites?status=PENDING&q=test&page=1&pageSize=10&orderBy=createdAt&sort=desc')
      expect(result).toEqual(mockResponse)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].email).toBe('test@example.com')
    })
  })

  describe('acceptInvite', () => {
    it('deve aceitar convite com sucesso', async () => {
      const mockResponse: AcceptInviteResponse = {
        id: 1,
        projectId: 1,
        email: 'test@example.com',
        role: 'TESTER',
        status: 'ACCEPTED',
        acceptedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(api.post).mockResolvedValueOnce({ data: mockResponse })

      const result = await inviteService.acceptInvite('token-123')

      expect(api.post).toHaveBeenCalledWith('/invites/token-123/accept')
      expect(result).toEqual(mockResponse)
      expect(result.status).toBe('ACCEPTED')
    })
  })

  describe('declineInvite', () => {
    it('deve recusar convite com sucesso', async () => {
      const mockResponse: DeclineInviteResponse = {
        id: 1,
        projectId: 1,
        email: 'test@example.com',
        role: 'TESTER',
        status: 'DECLINED',
        declinedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(api.post).mockResolvedValueOnce({ data: mockResponse })

      const result = await inviteService.declineInvite('token-123')

      expect(api.post).toHaveBeenCalledWith('/invites/token-123/decline')
      expect(result).toEqual(mockResponse)
      expect(result.status).toBe('DECLINED')
    })
  })

  describe('acceptInviteById', () => {
    it('deve lançar erro indicando que o método não está implementado', () => {
      // O método não é async, então não usamos await
      expect(() => {
        void inviteService.acceptInviteById(1)
      }).toThrow('Método não implementado - use acceptInvite com token')
    })
  })

  describe('declineInviteById', () => {
    it('deve lançar erro indicando que o método não está implementado', () => {
      // O método não é async, então não usamos await
      expect(() => {
        void inviteService.declineInviteById(1)
      }).toThrow('Método não implementado - use declineInvite com token')
    })
  })
})

