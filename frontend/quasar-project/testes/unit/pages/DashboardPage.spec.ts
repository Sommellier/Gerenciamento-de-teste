import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from 'pages/DashboardPage.vue'

const mockNotify = vi.fn()
const mockDialog = vi.fn()
const mockPush = vi.fn()
const mockBack = vi.fn()

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock do Quasar
vi.mock('quasar', () => ({
  useQuasar: () => ({
    notify: mockNotify,
    dialog: mockDialog,
  }),
}))

// Mock do Vue Router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: DashboardPage },
    { path: '/projects', component: { template: '<div>Projects</div>' } },
    { path: '/create-project', component: { template: '<div>Create Project</div>' } },
    { path: '/invites', component: { template: '<div>Invites</div>' } },
    { path: '/profile', component: { template: '<div>Profile</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } },
  ],
})

router.push = mockPush
router.back = mockBack

// Mock do sessionStorage (migrado de localStorage para maior segurança)
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
})

describe('DashboardPage', () => {
  let wrapper: ReturnType<typeof mount>

  const createWrapper = () => {
    return mount(DashboardPage, {
      global: {
        plugins: [router],
        mocks: {
          $q: {
            notify: mockNotify,
            dialog: mockDialog,
          },
        },
        stubs: {
          'q-btn-dropdown': {
            template: `
              <div class="q-btn-dropdown">
                <button @click="toggleMenu" class="dropdown-trigger">
                  <slot name="label"></slot>
                </button>
                <div v-if="showMenu" class="dropdown-menu">
                  <slot></slot>
                </div>
              </div>
            `,
            data() {
              return { showMenu: false }
            },
            methods: {
              toggleMenu() {
                this.showMenu = !this.showMenu
              },
            },
          },
          'q-list': {
            template: '<div class="q-list"><slot /></div>',
          },
          'q-item': {
            template: '<div class="q-item" @click="$attrs.onClick"><slot /></div>',
            props: ['clickable'],
          },
          'q-item-section': {
            template: '<div class="q-item-section"><slot /></div>',
            props: ['avatar'],
          },
          'q-item-label': {
            template: '<div class="q-item-label"><slot /></div>',
          },
          'q-icon': {
            template: '<span class="q-icon" v-bind="$attrs"></span>',
            props: ['name', 'size', 'color'],
          },
          'q-separator': {
            template: '<div class="q-separator"></div>',
            props: ['dark'],
          },
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.removeItem.mockClear()
    mockDialog.mockReturnValue({
      onOk: (callback: () => void) => {
        callback()
      },
    })
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Bem-vindo ao QA Manager')
      expect(wrapper.html()).toContain('Ver Projetos')
      expect(wrapper.html()).toContain('Criar Projeto')
      expect(wrapper.html()).toContain('Ver Convites')
    })

    it('deve renderizar o menu de perfil', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('.profile-icon-container').exists()).toBe(true)
    })

    it('deve renderizar os cards principais', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('.projects-card').exists()).toBe(true)
      expect(wrapper.find('.create-card').exists()).toBe(true)
      expect(wrapper.find('.invites-card').exists()).toBe(true)
    })
  })

  describe('Navegação', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('deve navegar para projetos quando clicar no card de projetos', async () => {
      const projectsCard = wrapper.find('.projects-card')
      await projectsCard.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/projects')
    })

    it('deve navegar para criar projeto quando clicar no card de criar', async () => {
      const createCard = wrapper.find('.create-card')
      await createCard.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/create-project')
    })

    it('deve navegar para convites quando clicar no card de convites', async () => {
      const invitesCard = wrapper.find('.invites-card')
      await invitesCard.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/invites')
    })

    it('deve navegar para perfil quando clicar em "Ver Perfil"', async () => {
      await wrapper.vm.goToProfile()
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/profile')
    })
  })

  describe('Logout', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('deve abrir dialog de confirmação ao clicar em logout', async () => {
      await wrapper.vm.handleLogout()
      await wrapper.vm.$nextTick()
      
      expect(mockDialog).toHaveBeenCalledWith({
        title: 'Confirmar Logout',
        message: 'Tem certeza que deseja desconectar-se?',
        persistent: true,
        ok: {
          label: 'Desconectar',
          color: 'primary',
        },
        cancel: {
          label: 'Cancelar',
          color: 'grey',
          flat: true,
        },
      })
    })

    it('deve fazer logout quando confirmar', async () => {
      let onOkCallback: (() => void) | null = null
      
      mockDialog.mockReturnValue({
        onOk: (callback: () => void) => {
          onOkCallback = callback
        },
      })
      
      await wrapper.vm.handleLogout()
      await wrapper.vm.$nextTick()
      
      if (onOkCallback) {
        onOkCallback()
        await wrapper.vm.$nextTick()
        
        expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('token')
        expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('refreshToken')
        expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('user')
        expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('csrfToken')
        expect(mockPush).toHaveBeenCalledWith('/login')
        expect(mockNotify).toHaveBeenCalledWith({
          type: 'positive',
          message: 'Desconectado com sucesso!',
          position: 'top',
        })
      }
    })

    it('não deve fazer logout quando cancelar', async () => {
      mockDialog.mockReturnValue({
        onOk: () => {
          // Não chamar callback
        },
      })
      
      await wrapper.vm.handleLogout()
      await wrapper.vm.$nextTick()
      
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Funções auxiliares', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('deve chamar goToProjects corretamente', async () => {
      await wrapper.vm.goToProjects()
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/projects')
    })

    it('deve chamar goToCreate corretamente', async () => {
      await wrapper.vm.goToCreate()
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/create-project')
    })

    it('deve chamar goToInvites corretamente', async () => {
      await wrapper.vm.goToInvites()
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/invites')
    })

    it('deve chamar goToProfile corretamente', async () => {
      await wrapper.vm.goToProfile()
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/profile')
    })
  })
})

