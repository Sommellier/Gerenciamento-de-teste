import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import InvitesPage from 'pages/InvitesPage.vue'
import * as inviteService from 'src/services/invite.service'

const mockNotify = vi.fn()
const mockPush = vi.fn()

// Mock do Quasar
vi.mock('quasar', () => ({
  useQuasar: () => ({
    notify: mockNotify,
  }),
}))

// Mock do Vue Router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/invites', component: InvitesPage },
    { path: '/dashboard', component: { template: '<div>Dashboard</div>' } },
    { path: '/profile', component: { template: '<div>Profile</div>' } },
    { path: '/projects/:id', component: { template: '<div>Project</div>' } },
  ],
})

router.push = mockPush

// Mock do serviço de convites
vi.mock('src/services/invite.service', () => ({
  inviteService: {
    listUserInvites: vi.fn(),
    acceptInvite: vi.fn(),
    declineInvite: vi.fn(),
  },
}))

describe('InvitesPage', () => {
  let wrapper: ReturnType<typeof mount>

  const createWrapper = () => {
    return mount(InvitesPage, {
      global: {
        plugins: [router],
        mocks: {
          $q: {
            notify: mockNotify,
          },
        },
        stubs: {
          'q-page': {
            template: '<div class="q-page"><slot /></div>',
            props: ['class'],
          },
        },
      },
    })
  }

  const mockInvites = [
    {
      id: 1,
      projectId: 1,
      email: 'user@example.com',
      role: 'TESTER' as const,
      status: 'PENDING' as const,
      token: 'token1',
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: '2024-01-08T00:00:00Z',
      project: {
        id: 1,
        name: 'Projeto Teste',
      },
      invitedBy: {
        id: 1,
        name: 'João',
        email: 'joao@example.com',
      },
    },
    {
      id: 2,
      projectId: 2,
      email: 'user@example.com',
      role: 'MANAGER' as const,
      status: 'ACCEPTED' as const,
      token: 'token2',
      createdAt: '2024-01-02T00:00:00Z',
      expiresAt: '2024-01-09T00:00:00Z',
      acceptedAt: '2024-01-03T00:00:00Z',
      project: {
        id: 2,
        name: 'Projeto 2',
      },
      invitedBy: {
        id: 2,
        name: 'Maria',
        email: 'maria@example.com',
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(inviteService.inviteService.listUserInvites).mockResolvedValue({
      items: mockInvites,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })
    vi.mocked(inviteService.inviteService.acceptInvite).mockResolvedValue({
      id: 1,
      projectId: 1,
      email: 'user@example.com',
      role: 'TESTER',
      status: 'ACCEPTED',
      acceptedAt: '2024-01-03T00:00:00Z',
    })
    vi.mocked(inviteService.inviteService.declineInvite).mockResolvedValue({
      id: 1,
      projectId: 1,
      email: 'user@example.com',
      role: 'TESTER',
      status: 'DECLINED',
      declinedAt: '2024-01-03T00:00:00Z',
    })
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(wrapper.html()).toContain('Convites')
      expect(wrapper.html()).toContain('Gerencie convites para projetos')
    })

    it('deve mostrar loading enquanto carrega', async () => {
      vi.mocked(inviteService.inviteService.listUserInvites).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
        }), 100))
      )
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.loading).toBe(true)
      
      await new Promise(resolve => setTimeout(resolve, 150))
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.loading).toBe(false)
    })
  })

  describe('Carregamento de dados', () => {
    it('deve carregar convites ao montar', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(inviteService.inviteService.listUserInvites).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        orderBy: 'createdAt',
        sort: 'desc',
      })
      expect(wrapper.vm.invites).toHaveLength(2)
    })

    it('deve mostrar erro quando falha ao carregar convites', async () => {
      vi.mocked(inviteService.inviteService.listUserInvites).mockRejectedValue(new Error('Erro ao carregar'))
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao carregar convites',
        position: 'top',
      })
    })

    it('deve mostrar estado vazio quando não há convites', async () => {
      vi.mocked(inviteService.inviteService.listUserInvites).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      })
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(wrapper.vm.invites).toHaveLength(0)
      expect(wrapper.html()).toContain('Nenhum convite encontrado')
    })
  })

  describe('Busca e filtros', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve atualizar query de busca', async () => {
      wrapper.vm.searchQuery = 'teste'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.searchQuery).toBe('teste')
    })

    it('deve atualizar filtro de status', async () => {
      wrapper.vm.statusFilter = 'PENDING'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.statusFilter).toBe('PENDING')
    })

    it('deve buscar convites quando query muda', async () => {
      wrapper.vm.searchQuery = 'teste'
      await wrapper.vm.onSearch()
      await wrapper.vm.$nextTick()
      
      expect(inviteService.inviteService.listUserInvites).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'teste',
          page: 1,
        })
      )
    })

    it('deve filtrar por status quando filtro muda', async () => {
      wrapper.vm.statusFilter = 'PENDING'
      await wrapper.vm.onSearch()
      await wrapper.vm.$nextTick()
      
      expect(inviteService.inviteService.listUserInvites).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['PENDING'],
          page: 1,
        })
      )
    })

    it('deve limpar busca', async () => {
      wrapper.vm.searchQuery = 'teste'
      await wrapper.vm.clearSearch()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.searchQuery).toBe('')
      expect(inviteService.inviteService.listUserInvites).toHaveBeenCalled()
    })
  })

  describe('Aceitar convite', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve abrir dialog de confirmação ao aceitar convite', async () => {
      const invite = wrapper.vm.invites[0]
      await wrapper.vm.acceptInvite(invite)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.acceptDialog).toBe(true)
      expect(wrapper.vm.inviteToProcess).toEqual(invite)
    })

    it('deve aceitar convite quando confirmado', async () => {
      const invite = wrapper.vm.invites[0]
      wrapper.vm.inviteToProcess = invite
      wrapper.vm.acceptDialog = true
      
      await wrapper.vm.confirmAccept()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(inviteService.inviteService.acceptInvite).toHaveBeenCalledWith('token1')
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Convite aceito com sucesso!',
        position: 'top',
      })
      expect(wrapper.vm.acceptDialog).toBe(false)
      expect(inviteService.inviteService.listUserInvites).toHaveBeenCalled()
    })

    it('deve mostrar erro quando falha ao aceitar convite', async () => {
      vi.mocked(inviteService.inviteService.acceptInvite).mockRejectedValueOnce(
        Object.assign(new Error('Erro'), {
          response: {
            data: {
              message: 'Convite expirado',
            },
          },
        })
      )
      
      const invite = wrapper.vm.invites[0]
      wrapper.vm.inviteToProcess = invite
      wrapper.vm.acceptDialog = true
      
      await wrapper.vm.confirmAccept()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Convite expirado',
        position: 'top',
      })
    })
  })

  describe('Recusar convite', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve abrir dialog de confirmação ao recusar convite', async () => {
      const invite = wrapper.vm.invites[0]
      await wrapper.vm.declineInvite(invite)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.declineDialog).toBe(true)
      expect(wrapper.vm.inviteToProcess).toEqual(invite)
    })

    it('deve recusar convite quando confirmado', async () => {
      const invite = wrapper.vm.invites[0]
      wrapper.vm.inviteToProcess = invite
      wrapper.vm.declineDialog = true
      
      await wrapper.vm.confirmDecline()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(inviteService.inviteService.declineInvite).toHaveBeenCalledWith('token1')
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'info',
        message: 'Convite recusado',
        position: 'top',
      })
      expect(wrapper.vm.declineDialog).toBe(false)
      expect(inviteService.inviteService.listUserInvites).toHaveBeenCalled()
    })

    it('deve mostrar erro quando falha ao recusar convite', async () => {
      vi.mocked(inviteService.inviteService.declineInvite).mockRejectedValueOnce(
        Object.assign(new Error('Erro'), {
          response: {
            data: {
              message: 'Erro ao recusar convite',
            },
          },
        })
      )
      
      const invite = wrapper.vm.invites[0]
      wrapper.vm.inviteToProcess = invite
      wrapper.vm.declineDialog = true
      
      await wrapper.vm.confirmDecline()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao recusar convite',
        position: 'top',
      })
    })
  })

  describe('Paginação', () => {
    beforeEach(async () => {
      vi.mocked(inviteService.inviteService.listUserInvites).mockResolvedValue({
        items: mockInvites,
        total: 25,
        page: 1,
        pageSize: 20,
        totalPages: 2,
      })
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve navegar para página específica', async () => {
      await wrapper.vm.goToPage(2)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.currentPage).toBe(2)
      expect(inviteService.inviteService.listUserInvites).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      )
    })

    it('deve calcular páginas visíveis corretamente', () => {
      wrapper.vm.currentPage = 1
      wrapper.vm.totalPages = 5
      
      const pages = wrapper.vm.getVisiblePages()
      expect(pages.length).toBeGreaterThan(0)
      expect(pages).toContain(1)
    })
  })

  describe('Navegação', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve navegar para dashboard quando clicar em voltar', async () => {
      await wrapper.vm.goBack()
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('deve navegar para perfil quando clicar em perfil', async () => {
      await wrapper.vm.goToProfile()
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/profile')
    })

    it('deve navegar para projeto quando visualizar projeto', async () => {
      const invite = wrapper.vm.invites[0]
      wrapper.vm.selectedInvite = invite
      wrapper.vm.showMenu = true
      
      await wrapper.vm.viewProject()
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/projects/1')
      expect(wrapper.vm.showMenu).toBe(false)
    })
  })

  describe('Menu de ações', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve abrir menu quando clicar em mais opções', async () => {
      const invite = wrapper.vm.invites[0]
      await wrapper.vm.showInviteMenu(invite)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showMenu).toBe(true)
      expect(wrapper.vm.selectedInvite).toEqual(invite)
    })

    it('deve fechar menu', async () => {
      wrapper.vm.showMenu = true
      wrapper.vm.selectedInvite = wrapper.vm.invites[0]
      
      await wrapper.vm.closeMenu()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showMenu).toBe(false)
      expect(wrapper.vm.selectedInvite).toBeNull()
    })

    it('deve mostrar notificação ao reenviar convite', async () => {
      const invite = wrapper.vm.invites[0]
      wrapper.vm.selectedInvite = invite
      
      await wrapper.vm.resendInvite()
      await wrapper.vm.$nextTick()
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'info',
        message: 'Funcionalidade de reenvio será implementada',
        position: 'top',
      })
      expect(wrapper.vm.showMenu).toBe(false)
    })
  })

  describe('Funções auxiliares', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve formatar data corretamente', () => {
      const date = '2024-01-01T00:00:00Z'
      const formatted = wrapper.vm.formatDate(date)
      
      expect(formatted).toBeTruthy()
      expect(typeof formatted).toBe('string')
    })

    it('deve retornar label de status corretamente', () => {
      expect(wrapper.vm.getStatusLabel('PENDING')).toBe('Pendente')
      expect(wrapper.vm.getStatusLabel('ACCEPTED')).toBe('Aceito')
      expect(wrapper.vm.getStatusLabel('DECLINED')).toBe('Recusado')
      expect(wrapper.vm.getStatusLabel('EXPIRED')).toBe('Expirado')
    })

    it('deve retornar label de role corretamente', () => {
      expect(wrapper.vm.getRoleLabel('OWNER')).toBe('Proprietário')
      expect(wrapper.vm.getRoleLabel('MANAGER')).toBe('Gerente')
      expect(wrapper.vm.getRoleLabel('TESTER')).toBe('Testador')
      expect(wrapper.vm.getRoleLabel('APPROVER')).toBe('Aprovador')
    })
  })

  describe('Atualização de convites', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve recarregar convites quando clicar em atualizar', async () => {
      await wrapper.vm.loadInvites()
      await wrapper.vm.$nextTick()
      
      expect(inviteService.inviteService.listUserInvites).toHaveBeenCalled()
    })
  })
})

