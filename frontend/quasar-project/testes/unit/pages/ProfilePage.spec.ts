import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ProfilePage from 'src/pages/ProfilePage.vue'
import api from 'src/services/api'

// Mock do api
vi.mock('src/services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock do Quasar
const mockNotify = vi.fn()
const mockDialog = {
  onOk: vi.fn((callback) => {
    callback()
    return { onCancel: vi.fn() }
  }),
  onCancel: vi.fn(),
}

vi.mock('quasar', () => ({
  useQuasar: () => ({
    notify: mockNotify,
    dialog: vi.fn(() => mockDialog),
  }),
}))

// Mock do useRouter
const mockPush = vi.fn()

vi.mock('vue-router', async () => {
  const actual = await import('vue-router') as typeof import('vue-router')
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush,
    }),
  }
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/profile', component: ProfilePage },
    { path: '/dashboard', component: { template: '<div>Dashboard</div>' } },
    { path: '/projects', component: { template: '<div>Projects</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } },
  ],
})

describe('ProfilePage', () => {
  let wrapper: VueWrapper<any>
  let mockNotify: ReturnType<typeof vi.fn>

  const mockProfile = {
    id: 1,
    name: 'João Silva',
    email: 'joao@example.com',
    avatar: '/uploads/avatars/avatar.jpg',
    stats: {
      projectsOwned: 5,
      projectsParticipating: 3,
      testExecutions: 10,
    },
  }

  const createWrapper = () => {
    return mount(ProfilePage, {
      global: {
        plugins: [router],
        mocks: {
          $q: {
            notify: mockNotify,
            dialog: vi.fn(() => mockDialog),
          },
        },
        stubs: {
          'q-page': {
            template: '<div class="q-page"><slot /></div>',
          },
          'q-card': {
            template: '<div class="q-card"><slot /></div>',
          },
          'q-card-section': {
            template: '<div class="q-card-section"><slot /></div>',
          },
          'q-card-actions': {
            template: '<div class="q-card-actions" v-bind="$attrs"><slot /></div>',
            props: ['align'],
          },
          'q-btn': {
            template: '<button @click="$attrs.onClick" :type="type" :disabled="loading || disable" class="q-btn" v-bind="$attrs"><slot>{{ label }}</slot></button>',
            props: ['type', 'label', 'color', 'loading', 'flat', 'round', 'icon', 'unelevated', 'size', 'disable', 'dense'],
          },
          'q-form': {
            template: '<form @submit.prevent="$attrs.onSubmit" class="q-form" ref="formRef"><slot /></form>',
            props: ['ref'],
            methods: {
              validate: vi.fn(() => Promise.resolve(true)),
            },
          },
          'q-input': {
            template: `
              <div class="q-input">
                <label v-if="label">{{ label }}</label>
                <input
                  :value="modelValue"
                  @input="handleInput"
                  :type="type"
                  :readonly="readonly"
                  :disabled="disable"
                  v-bind="$attrs"
                />
                <slot name="prepend"></slot>
                <slot name="append"></slot>
                <slot name="hint"></slot>
              </div>
            `,
            props: ['modelValue', 'label', 'type', 'outlined', 'rules', 'hint', 'readonly', 'disable', 'loading', 'autogrow', 'counter', 'maxlength'],
            emits: ['update:modelValue', 'update:visible'],
            methods: {
              handleInput(event: Event) {
                const target = event.target as HTMLInputElement
                this.$emit('update:modelValue', target.value)
              },
            },
          },
          'q-avatar': {
            template: '<div class="q-avatar" v-bind="$attrs"><slot><img v-if="src" :src="src" :alt="alt" /></slot></div>',
            props: ['size', 'src', 'alt'],
          },
          'q-icon': {
            template: '<span class="q-icon" v-bind="$attrs"></span>',
            props: ['name', 'size', 'color'],
          },
          'q-spinner-dots': {
            template: '<div class="q-spinner-dots" v-bind="$attrs"></div>',
            props: ['size', 'color'],
          },
          'q-linear-progress': {
            template: '<div class="q-linear-progress" v-bind="$attrs"></div>',
            props: ['value', 'color'],
          },
          'q-dialog': {
            template: '<div v-if="modelValue" class="q-dialog"><slot /></div>',
            props: ['modelValue'],
            emits: ['update:modelValue'],
          },
          'q-checkbox': {
            template: '<div class="q-checkbox"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" v-bind="$attrs" /><label v-if="label">{{ label }}</label></div>',
            props: ['modelValue', 'label', 'color'],
            emits: ['update:modelValue'],
          },
          'q-tooltip': {
            template: '<div class="q-tooltip"><slot /></div>',
          },
        },
      },
    })
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    mockPush.mockClear()
    // Obter referência ao mock do Quasar
    const quasar = await import('quasar')
    mockNotify = vi.mocked(quasar.useQuasar().notify)
    mockNotify.mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProfile })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.q-page').exists()).toBe(true)
    })

    it('deve exibir estado de carregamento', async () => {
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {}))
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.loading).toBe(true)
    })

    it('deve exibir informações do perfil', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProfile })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.profile).toEqual(mockProfile)
      expect(wrapper.vm.name).toBe('João Silva')
      expect(wrapper.vm.email).toBe('joao@example.com')
    })
  })

  describe('Carregamento de dados', () => {
    it('deve carregar perfil ao montar', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProfile })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(api.get).toHaveBeenCalledWith('/profile')
      expect(wrapper.vm.profile).toEqual(mockProfile)
    })

    it('deve tratar erro ao carregar perfil', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Erro ao carregar'))
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockNotify).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('Navegação', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProfile })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('deve navegar de volta ao clicar em voltar', async () => {
      await wrapper.vm.goBack()
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('deve navegar para projetos', async () => {
      await wrapper.vm.goToProjects()
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects')
    })

    it('deve mostrar notificação ao navegar para execuções', async () => {
      await wrapper.vm.goToExecutions()
      await wrapper.vm.$nextTick()

      expect(mockNotify).toHaveBeenCalledWith({
        type: 'info',
        message: 'Funcionalidade em desenvolvimento',
        position: 'top',
      })
    })
  })

  describe('Edição de perfil', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProfile })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('deve iniciar modo de edição', async () => {
      await wrapper.vm.startEditing()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isEditing).toBe(true)
      expect(wrapper.vm.originalName).toBe('João Silva')
    })

    it('deve cancelar edição', async () => {
      wrapper.vm.isEditing = true
      wrapper.vm.name = 'Nome Alterado'
      wrapper.vm.newPassword = 'senha123'
      wrapper.vm.avatarPreview = 'preview.jpg'

      await wrapper.vm.cancelEdit()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isEditing).toBe(false)
      expect(wrapper.vm.name).toBe('João Silva')
      expect(wrapper.vm.newPassword).toBe('')
      expect(wrapper.vm.avatarPreview).toBe(null)
    })

    it('deve verificar se há alterações', async () => {
      wrapper.vm.isEditing = false
      expect(wrapper.vm.hasChanges).toBe(false)

      wrapper.vm.isEditing = true
      wrapper.vm.name = 'João Silva'
      wrapper.vm.originalName = 'João Silva'
      expect(wrapper.vm.hasChanges).toBe(false)

      wrapper.vm.name = 'Nome Alterado'
      expect(wrapper.vm.hasChanges).toBe(true)
    })

    it('deve salvar alterações do perfil', async () => {
      wrapper.vm.isEditing = true
      wrapper.vm.name = 'Nome Alterado'
      wrapper.vm.originalName = 'João Silva'
      wrapper.vm.profile = { ...mockProfile }
      vi.mocked(api.put).mockResolvedValueOnce({ data: { ...mockProfile, name: 'Nome Alterado' } })
      wrapper.vm.formRef = {
        validate: vi.fn(() => Promise.resolve(true)),
      }

      await wrapper.vm.submitForm()
      await wrapper.vm.$nextTick()

      expect(api.put).toHaveBeenCalledWith('/users/1', {
        name: 'Nome Alterado',
      })
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Perfil atualizado com sucesso!',
        position: 'top',
      })
      expect(wrapper.vm.isEditing).toBe(false)
    })

    it('deve salvar alterações com nova senha', async () => {
      wrapper.vm.isEditing = true
      wrapper.vm.name = 'Nome Alterado'
      wrapper.vm.newPassword = 'senha123'
      wrapper.vm.confirmPassword = 'senha123'
      wrapper.vm.originalName = 'João Silva'
      wrapper.vm.profile = { ...mockProfile }
      vi.mocked(api.put).mockResolvedValueOnce({ data: { ...mockProfile, name: 'Nome Alterado' } })
      wrapper.vm.formRef = {
        validate: vi.fn(() => Promise.resolve(true)),
      }

      await wrapper.vm.submitForm()
      await wrapper.vm.$nextTick()

      expect(api.put).toHaveBeenCalledWith('/users/1', {
        name: 'Nome Alterado',
        password: 'senha123',
      })
    })

    it('deve tratar erro ao salvar perfil', async () => {
      wrapper.vm.isEditing = true
      wrapper.vm.name = 'Nome Alterado'
      wrapper.vm.originalName = 'João Silva'
      wrapper.vm.profile = { ...mockProfile }
      vi.mocked(api.put).mockRejectedValueOnce({ response: { data: { message: 'Erro ao atualizar' } } })
      wrapper.vm.formRef = {
        validate: vi.fn(() => Promise.resolve(true)),
      }

      await wrapper.vm.submitForm()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.errorDialog).toBe(true)
      expect(wrapper.vm.errorText).toBeTruthy()
    })
  })

  describe('Upload de avatar', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProfile })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('deve acionar input de arquivo', async () => {
      const clickSpy = vi.fn()
      wrapper.vm.fileInput = {
        click: clickSpy,
      } as any

      await wrapper.vm.triggerFileInput()

      expect(clickSpy).toHaveBeenCalled()
    })

    it('deve validar tipo de arquivo', async () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' })
      const event = {
        target: {
          files: [file],
        },
      } as any

      await wrapper.vm.handleFileSelect(event)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.uploadError).toBeTruthy()
    })

    it('deve validar tamanho do arquivo', async () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const event = {
        target: {
          files: [largeFile],
        },
      } as any

      await wrapper.vm.handleFileSelect(event)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.uploadError).toBeTruthy()
    })

    it('deve fazer upload de avatar válido', async () => {
      const file = new File([''], 'avatar.jpg', { type: 'image/jpeg' })
      const event = {
        target: {
          files: [file],
        },
      } as any

      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          user: { ...mockProfile, avatar: '/uploads/avatars/new-avatar.jpg' },
        },
      })

      await wrapper.vm.handleFileSelect(event)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(api.post).toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Foto atualizada com sucesso!',
        position: 'top',
      })
    })

    it('deve tratar erro ao fazer upload de avatar', async () => {
      const file = new File([''], 'avatar.jpg', { type: 'image/jpeg' })
      const event = {
        target: {
          files: [file],
        },
      } as any

      vi.mocked(api.post).mockRejectedValueOnce({ response: { data: { message: 'Erro ao fazer upload' } } })

      await wrapper.vm.handleFileSelect(event)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.uploadError).toBeTruthy()
      expect(mockNotify).toHaveBeenCalled()
    })
  })

  describe('Exclusão de conta', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProfile })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('deve abrir diálogo de confirmação', async () => {
      wrapper.vm.showDeleteConfirmDialog = true
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showDeleteConfirmDialog).toBe(true)
    })

    it('deve cancelar exclusão', async () => {
      wrapper.vm.showDeleteConfirmDialog = true
      wrapper.vm.deleteConfirmed = true

      await wrapper.vm.cancelDelete()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showDeleteConfirmDialog).toBe(false)
      expect(wrapper.vm.deleteConfirmed).toBe(false)
    })

    it('deve excluir conta quando confirmado', async () => {
      wrapper.vm.profile = { ...mockProfile }
      wrapper.vm.deleteConfirmed = true
      vi.mocked(api.delete).mockResolvedValueOnce(undefined as any)
      const sessionStorageClearSpy = vi.spyOn(sessionStorage, 'clear')

      await wrapper.vm.deleteAccount()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 2100))

      expect(api.delete).toHaveBeenCalledWith('/users/1')
      expect(sessionStorageClearSpy).toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('deve tratar erro ao excluir conta', async () => {
      wrapper.vm.profile = { ...mockProfile }
      wrapper.vm.deleteConfirmed = true
      vi.mocked(api.delete).mockRejectedValueOnce({ response: { data: { message: 'Erro ao excluir' } } })

      await wrapper.vm.deleteAccount()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.errorDialog).toBe(true)
      expect(wrapper.vm.showDeleteConfirmDialog).toBe(false)
    })
  })

  describe('Funções auxiliares', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProfile })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('deve gerar iniciais corretamente', () => {
      expect(wrapper.vm.getInitials('João Silva')).toBe('JS')
      expect(wrapper.vm.getInitials('Maria')).toBe('M')
      expect(wrapper.vm.getInitials('')).toBe('?')
    })

    it('deve retornar URL do avatar corretamente', () => {
      expect(wrapper.vm.getAvatarUrl('/uploads/avatars/avatar.jpg')).toBeTruthy()
      expect(wrapper.vm.getAvatarUrl('http://example.com/avatar.jpg')).toBe('http://example.com/avatar.jpg')
    })
  })
})

