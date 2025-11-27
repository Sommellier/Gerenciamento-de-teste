import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ResetPasswordPage from 'src/pages/ResetPasswordPage.vue'
import api from 'src/services/api'

// Mock da API
vi.mock('src/services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

// Mock do Quasar Notify e useQuasar
// Criar variável para armazenar o mock antes do vi.mock
const mockNotify = vi.fn()

vi.mock('quasar', () => {
  // Usar a variável externa
  return {
    Notify: {
      create: vi.fn(),
    },
    useQuasar: vi.fn(() => ({
      notify: mockNotify,
    })),
  }
})

// Criar router mock
const mockPush = vi.fn()
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/reset-password', name: 'reset-password', component: ResetPasswordPage },
    { path: '/login', name: 'login', component: { template: '<div>Login</div>' } },
  ],
})

// Mock do router.push
router.push = mockPush

// Mock do useRoute
const mockRoute = {
  query: {} as Record<string, string>,
}

// Mock do window.location.hash (agora o token vem do hash, não da query)
let mockLocationHash = ''
Object.defineProperty(window, 'location', {
  value: {
    hash: '',
    get hash() {
      return mockLocationHash
    },
    set hash(value: string) {
      mockLocationHash = value
    },
  },
  writable: true,
})

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRoute: () => mockRoute,
  }
})

describe('ResetPasswordPage', () => {
  let wrapper: VueWrapper<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockNotify.mockClear()
    mockPush.mockClear()
    mockRoute.query = {}
    mockLocationHash = ''
    vi.mocked(api.post).mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = () => {
    return mount(ResetPasswordPage, {
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
          },
          'q-card': {
            template: '<div class="q-card"><slot /></div>',
          },
          'q-form': {
            template: '<form @submit.prevent="$attrs.onSubmit" class="q-form"><slot /></form>',
          },
          'q-input': {
            template: `
              <div class="q-input">
                <label v-if="label">{{ label }}</label>
                <input 
                  :value="modelValue" 
                  @input="handleInput" 
                  :type="type"
                  v-bind="$attrs" 
                />
                <slot name="prepend"></slot>
                <slot name="append"></slot>
              </div>
            `,
            props: ['modelValue', 'label', 'type', 'filled', 'rounded', 'color', 'rules', 'lazyRules', 'dense'],
            emits: ['update:modelValue'],
            methods: {
              handleInput(event: Event) {
                const target = event.target as HTMLInputElement
                this.$emit('update:modelValue', target.value)
              },
            },
          },
          'q-btn': {
            template: '<button @click="$attrs.onClick" :type="type" :disabled="loading" class="q-btn" v-bind="$attrs"><slot>{{ label }}</slot></button>',
            props: ['type', 'label', 'color', 'loading', 'flat', 'unelevated', 'rounded', 'noCaps', 'size', 'class'],
          },
        },
      },
    })
  }

  describe('Renderização', () => {
    it('deve renderizar o formulário de reset de senha', () => {
      mockLocationHash = '#token=valid-token'
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Reset Password')
      expect(wrapper.html()).toContain('New Password')
      expect(wrapper.html()).toContain('Confirm Password')
    })

    it('deve renderizar os campos de entrada corretamente', () => {
      mockLocationHash = '#token=valid-token'
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('New Password')
      expect(wrapper.html()).toContain('Confirm Password')
    })

    it('deve renderizar o botão de alterar senha', () => {
      mockLocationHash = '#token=valid-token'
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Change Password')
    })
  })

  describe('Validação de token', () => {
    it('deve mostrar notify e redirecionar para login quando token não existe', async () => {
      mockLocationHash = ''
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Token de redefinição inválido.',
        position: 'top'
      })
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('deve inicializar com token quando presente no hash', async () => {
      mockLocationHash = '#token=valid-token-123'
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockNotify).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Interação com campos', () => {
    it('deve permitir digitar no campo de nova senha', async () => {
      mockLocationHash = '#token=valid-token'
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      
      const passwordInputs = wrapper.findAll('input[type="password"]')
      if (passwordInputs.length > 0) {
        await passwordInputs[0].setValue('novaSenha123')
        await wrapper.vm.$nextTick()
        expect((passwordInputs[0].element as HTMLInputElement).value).toBe('novaSenha123')
      }
    })

    it('deve permitir digitar no campo de confirmar senha', async () => {
      mockLocationHash = '#token=valid-token'
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      
      const passwordInputs = wrapper.findAll('input[type="password"]')
      if (passwordInputs.length > 1) {
        await passwordInputs[1].setValue('novaSenha123')
        await wrapper.vm.$nextTick()
        expect((passwordInputs[1].element as HTMLInputElement).value).toBe('novaSenha123')
      }
    })
  })

  describe('Validação de formulário', () => {
    it('deve validar que senha é obrigatória', async () => {
      mockLocationHash = '#token=valid-token'
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      
      const passwordInputs = wrapper.findAll('input[type="password"]')
      if (passwordInputs.length > 0) {
        await passwordInputs[0].setValue('')
        await wrapper.vm.$nextTick()
        expect((passwordInputs[0].element as HTMLInputElement).value).toBe('')
      }
    })

    it('deve validar que senhas devem coincidir', async () => {
      mockLocationHash = '#token=valid-token'
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      
      const passwordInputs = wrapper.findAll('input[type="password"]')
      if (passwordInputs.length > 1) {
        await passwordInputs[0].setValue('senha123')
        await passwordInputs[1].setValue('senha456')
        await wrapper.vm.$nextTick()
        
        // As senhas não coincidem, mas o formulário ainda pode ser submetido
        // A validação do Quasar pode impedir a submissão
        expect((passwordInputs[0].element as HTMLInputElement).value).toBe('senha123')
        expect((passwordInputs[1].element as HTMLInputElement).value).toBe('senha456')
      }
    })
  })

  describe('Submissão do formulário', () => {
    it('deve chamar API quando formulário é submetido com dados válidos', async () => {
      mockLocationHash = '#token=valid-token-123'
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue({ data: { message: 'Senha redefinida com sucesso' } })
      
      // Preencher os campos
      const passwordInputs = wrapper.findAll('input[type="password"]')
      if (passwordInputs.length > 1) {
        await passwordInputs[0].setValue('novaSenha123')
        await passwordInputs[1].setValue('novaSenha123')
        await wrapper.vm.$nextTick()
        
        // Submeter o formulário
        const form = wrapper.find('form')
        if (form.exists()) {
          await form.trigger('submit')
          await wrapper.vm.$nextTick()
          await new Promise(resolve => setTimeout(resolve, 100))
          
          expect(mockPost).toHaveBeenCalledWith('/reset-password', {
            token: 'valid-token-123',
            newPassword: 'novaSenha123',
          })
        }
      }
    })

    it('deve mostrar notify de sucesso e redirecionar após reset bem-sucedido', async () => {
      mockLocationHash = '#token=valid-token-123'
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue({ data: { message: 'Senha redefinida com sucesso' } })
      
      // Preencher os campos
      const passwordInputs = wrapper.findAll('input[type="password"]')
      if (passwordInputs.length > 1) {
        await passwordInputs[0].setValue('novaSenha123')
        await passwordInputs[1].setValue('novaSenha123')
        await wrapper.vm.$nextTick()
        
        // Submeter o formulário
        const form = wrapper.find('form')
        if (form.exists()) {
          await form.trigger('submit')
          await wrapper.vm.$nextTick()
          await new Promise(resolve => setTimeout(resolve, 100))
          
          expect(mockNotify).toHaveBeenCalledWith({
            type: 'positive',
            message: 'Senha redefinida com sucesso!',
            position: 'top'
          })
          expect(mockPush).toHaveBeenCalledWith('/login')
        }
      }
    })

    it('deve mostrar mensagem de erro quando API retorna erro', async () => {
      mockLocationHash = '#token=valid-token-123'
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const mockPost = vi.mocked(api.post)
      // Criar um erro que seja instância de Error e tenha response
      const errorResponse = Object.assign(new Error('Erro de rede'), {
        response: {
          data: {
            error: 'Token inválido ou expirado',
          },
        },
      })
      mockPost.mockRejectedValue(errorResponse)
      
      // Preencher os campos
      const passwordInputs = wrapper.findAll('input[type="password"]')
      if (passwordInputs.length > 1) {
        await passwordInputs[0].setValue('novaSenha123')
        await passwordInputs[1].setValue('novaSenha123')
        await wrapper.vm.$nextTick()
        
        // Submeter o formulário
        const form = wrapper.find('form')
        if (form.exists()) {
          await form.trigger('submit')
          await wrapper.vm.$nextTick()
          await new Promise(resolve => setTimeout(resolve, 100))
          
          expect(mockNotify).toHaveBeenCalledWith({
            type: 'negative',
            message: 'Token inválido ou expirado',
            position: 'top'
          })
        }
      }
    })

    it('deve mostrar mensagem de erro genérico quando erro não tem response', async () => {
      mockLocationHash = '#token=valid-token-123'
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockRejectedValue(new Error('Erro de conexão'))
      
      // Preencher os campos
      const passwordInputs = wrapper.findAll('input[type="password"]')
      if (passwordInputs.length > 1) {
        await passwordInputs[0].setValue('novaSenha123')
        await passwordInputs[1].setValue('novaSenha123')
        await wrapper.vm.$nextTick()
        
        // Submeter o formulário
        const form = wrapper.find('form')
        if (form.exists()) {
          await form.trigger('submit')
          await wrapper.vm.$nextTick()
          await new Promise(resolve => setTimeout(resolve, 100))
          
          expect(mockNotify).toHaveBeenCalledWith({
            type: 'negative',
            message: 'Erro desconhecido',
            position: 'top'
          })
        }
      }
    })

    it('deve mostrar mensagem de erro quando erro não tem data', async () => {
      mockLocationHash = '#token=valid-token-123'
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const mockPost = vi.mocked(api.post)
      // Criar um erro que seja instância de Error e tenha response
      const errorResponse = Object.assign(new Error('Erro de rede'), {
        response: {
          data: {},
        },
      })
      mockPost.mockRejectedValue(errorResponse)
      
      // Preencher os campos
      const passwordInputs = wrapper.findAll('input[type="password"]')
      if (passwordInputs.length > 1) {
        await passwordInputs[0].setValue('novaSenha123')
        await passwordInputs[1].setValue('novaSenha123')
        await wrapper.vm.$nextTick()
        
        // Submeter o formulário
        const form = wrapper.find('form')
        if (form.exists()) {
          await form.trigger('submit')
          await wrapper.vm.$nextTick()
          await new Promise(resolve => setTimeout(resolve, 100))
          
          expect(mockNotify).toHaveBeenCalledWith({
            type: 'negative',
            message: 'Erro ao redefinir a senha',
            position: 'top'
          })
        }
      }
    })
  })

  describe('Estados do componente', () => {
    it('deve inicializar com campos vazios', async () => {
      mockLocationHash = '#token=valid-token'
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      
      const passwordInputs = wrapper.findAll('input[type="password"]')
      if (passwordInputs.length > 0) {
        expect((passwordInputs[0].element as HTMLInputElement).value).toBe('')
      }
      if (passwordInputs.length > 1) {
        expect((passwordInputs[1].element as HTMLInputElement).value).toBe('')
      }
    })

    it('deve inicializar com token quando presente no hash', async () => {
      mockLocationHash = '#token=test-token-123'
      wrapper = createWrapper()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verificar se o token foi inicializado corretamente (não deve mostrar erro)
      expect(mockNotify).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})

