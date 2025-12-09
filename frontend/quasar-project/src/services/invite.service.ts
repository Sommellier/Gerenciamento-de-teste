import api from './api'

export interface Invite {
  id: number
  projectId: number
  email: string
  role: 'OWNER' | 'MANAGER' | 'TESTER' | 'APPROVER'
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
  token: string | null // Token pode ser null em casos de dados inconsistentes
  createdAt: string
  expiresAt: string
  acceptedAt?: string | null
  declinedAt?: string | null
  project: {
    id: number
    name: string
  }
  invitedBy: {
    id: number
    name: string
    email: string
  }
}

export interface ListInvitesParams {
  status?: string[]
  q?: string
  page?: number
  pageSize?: number
  orderBy?: 'createdAt' | 'expiresAt' | 'status'
  sort?: 'asc' | 'desc'
}

export interface ListInvitesResponse {
  items: Invite[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AcceptInviteResponse {
  id: number
  projectId: number
  email: string
  role: string
  status: string
  acceptedAt: string
}

export interface DeclineInviteResponse {
  id: number
  projectId: number
  email: string
  role: string
  status: string
  declinedAt: string
}

class InviteService {
  /**
   * Lista todos os convites do usuário logado
   */
  async listUserInvites(params: ListInvitesParams = {}): Promise<ListInvitesResponse> {
    const queryParams = new URLSearchParams()
    
    if (params.status && params.status.length > 0) {
      queryParams.append('status', params.status.join(','))
    }
    if (params.q) {
      queryParams.append('q', params.q)
    }
    if (params.page) {
      queryParams.append('page', params.page.toString())
    }
    if (params.pageSize) {
      queryParams.append('pageSize', params.pageSize.toString())
    }
    if (params.orderBy) {
      queryParams.append('orderBy', params.orderBy)
    }
    if (params.sort) {
      queryParams.append('sort', params.sort)
    }

    const queryString = queryParams.toString()
    const url = queryString ? `/invites?${queryString}` : '/invites'
    
    const response = await api.get<ListInvitesResponse>(url)
    return response.data
  }

  /**
   * Aceita um convite usando o token
   */
  async acceptInvite(token: string): Promise<AcceptInviteResponse> {
    const response = await api.post<AcceptInviteResponse>(`/invites/${token}/accept`)
    return response.data
  }

  /**
   * Recusa um convite usando o token
   */
  async declineInvite(token: string): Promise<DeclineInviteResponse> {
    const response = await api.post<DeclineInviteResponse>(`/invites/${token}/decline`)
    return response.data
  }

  /**
   * Aceita um convite usando o ID (para uso interno)
   */
  acceptInviteById(_inviteId: number): Promise<AcceptInviteResponse> {
    // Primeiro precisamos obter o token do convite
    // Por enquanto, vamos simular - em uma implementação real,
    // você precisaria de um endpoint que retorne o token ou aceite por ID
    void _inviteId // Marcar como usado explicitamente
    throw new Error('Método não implementado - use acceptInvite com token')
  }

  /**
   * Recusa um convite usando o ID (para uso interno)
   */
  declineInviteById(_inviteId: number): Promise<DeclineInviteResponse> {
    // Primeiro precisamos obter o token do convite
    // Por enquanto, vamos simular - em uma implementação real,
    // você precisaria de um endpoint que retorne o token ou aceite por ID
    void _inviteId // Marcar como usado explicitamente
    throw new Error('Método não implementado - use declineInvite com token')
  }
}

export const inviteService = new InviteService()
