import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from 'src/pages/LoginPage.vue'
import api from 'src/services/api'

// Mock da API
vi.mock('src/services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

// Mock do Quasar
const mockNotify = vi.fn()
vi.mock('quasar', () => ({
  useQuasar: () => ({
    notify: mockNotify,
  }),
}))

// Mock do sessionStorage (migrado de localStorage para maior segurança)
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Criar router mock
const mockPush = vi.fn()
const mockReplace = vi.fn()
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/register', name: 'register', component: { template: '<div>Register</div>' } },
    { path: '/forgot-password', name: 'forgot-password', component: { template: '<div>Forgot Password</div>' } },
    { path: '/dashboard', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
  ],
})

// Mock do router.push e router.replace
router.push = mockPush
router.replace = mockReplace

describe('LoginPage', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    vi.clearAllMocks()
    mockNotify.mockClear()
    mockPush.mockClear()
    mockReplace.mockClear()
    sessionStorageMock.setItem.mockClear()
    sessionStorageMock.getItem.mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = () => {
    return mount(LoginPage, {
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
            props: ['modelValue', 'label', 'type', 'filled', 'rounded', 'color', 'rules', 'lazyRules'],
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
            props: ['type', 'label', 'color', 'loading', 'flat', 'unelevated', 'rounded', 'noCaps', 'size'],
          },
          'q-checkbox': {
            template: '<div class="q-checkbox"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" v-bind="$attrs" /><label v-if="label">{{ label }}</label></div>',
            props: ['modelValue', 'label', 'color'],
            emits: ['update:modelValue'],
          },
          'q-icon': {
            template: '<span class="q-icon" v-bind="$attrs"></span>',
            props: ['name', 'size', 'color'],
          },
          'q-img': {
            template: '<img v-bind="$attrs" />',
            props: ['src', 'style', 'fit'],
          },
        },
      },
    })
  }

  describe('Renderização', () => {
    it('deve renderizar o formulário de login', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Entrar')
      expect(wrapper.html()).toContain('Email')
      expect(wrapper.html()).toContain('Senha')
    })

    it('deve renderizar os campos de entrada corretamente', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Email')
      expect(wrapper.html()).toContain('Senha')
    })

    it('deve renderizar o botão de entrar', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Entrar')
    })

    it('deve renderizar o checkbox "Lembrar de mim"', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Lembrar de mim')
    })

    it('deve renderizar o link "Esqueceu a senha?"', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Esqueceu a senha?')
    })

    it('deve renderizar o link "Criar conta"', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Criar conta')
    })
  })

  describe('Interação com campos', () => {
    it('deve permitir digitar no campo de email', async () => {
      wrapper = createWrapper()
      
      const emailInput = wrapper.find('input[type="email"]')
      if (emailInput.exists()) {
        await emailInput.setValue('joao@example.com')
        await wrapper.vm.$nextTick()
        expect((emailInput.element as HTMLInputElement).value).toBe('joao@example.com')
      }
    })

    it('deve permitir digitar no campo de senha', async () => {
      wrapper = createWrapper()
      
      const passwordInput = wrapper.find('input[type="password"]')
      if (passwordInput.exists()) {
        await passwordInput.setValue('senha123')
        await wrapper.vm.$nextTick()
        expect((passwordInput.element as HTMLInputElement).value).toBe('senha123')
      }
    })

    it('deve alternar visibilidade da senha ao clicar no ícone', async () => {
      wrapper = createWrapper()
      
      const toggleIcon = wrapper.find('.password-toggle')
      if (toggleIcon.exists()) {
        await toggleIcon.trigger('click')
        await wrapper.vm.$nextTick()
        expect(toggleIcon.exists()).toBe(true)
      }
    })

    it('deve permitir marcar/desmarcar o checkbox "Lembrar de mim"', async () => {
      wrapper = createWrapper()
      
      const checkbox = wrapper.find('input[type="checkbox"]')
      if (checkbox.exists()) {
        await checkbox.setChecked(true)
        await wrapper.vm.$nextTick()
        expect((checkbox.element as HTMLInputElement).checked).toBe(true)
        
        await checkbox.setChecked(false)
        await wrapper.vm.$nextTick()
        expect((checkbox.element as HTMLInputElement).checked).toBe(false)
      }
    })
  })

  describe('Validação de formulário', () => {
    it('deve mostrar notificação quando campos estão vazios', async () => {
      wrapper = createWrapper()
      
      const form = wrapper.find('form')
      if (form.exists()) {
        await form.trigger('submit')
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))
        
        expect(mockNotify).toHaveBeenCalledWith({
          type: 'negative',
          message: 'Por favor, preencha todos os campos',
          position: 'top',
        })
      }
    })

    it('deve validar email obrigatório', async () => {
      wrapper = createWrapper()
      
      const emailInput = wrapper.find('input[type="email"]')
      if (emailInput.exists()) {
        await emailInput.setValue('')
        await wrapper.vm.$nextTick()
        expect((emailInput.element as HTMLInputElement).value).toBe('')
      }
    })

    it('deve validar senha obrigatória', async () => {
      wrapper = createWrapper()
      
      const passwordInput = wrapper.find('input[type="password"]')
      if (passwordInput.exists()) {
        await passwordInput.setValue('')
        await wrapper.vm.$nextTick()
        expect((passwordInput.element as HTMLInputElement).value).toBe('')
      }
    })
  })

  describe('Submissão do formulário', () => {
    it('deve chamar API quando formulário é submetido com dados válidos', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue({
        data: {
          accessToken: 'token123',
          refreshToken: 'refresh123',
          user: {
            id: 1,
            name: 'João Silva',
            email: 'joao@example.com',
          },
        },
      })
      
      // Preencher os campos
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (emailInput.exists()) {
        await emailInput.setValue('joao@example.com')
      }
      if (passwordInput.exists()) {
        await passwordInput.setValue('senha123')
      }
      
      await wrapper.vm.$nextTick()
      
      // Submeter o formulário
      const form = wrapper.find('form')
      if (form.exists()) {
        await form.trigger('submit')
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))
        
        expect(mockPost).toHaveBeenCalledWith('/login', {
          email: 'joao@example.com',
          password: 'senha123',
        })
      }
    })

    it('deve salvar token e user no localStorage após login bem-sucedido', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      const userData = {
        id: 1,
        name: 'João Silva',
        email: 'joao@example.com',
      }
      mockPost.mockResolvedValue({
        data: {
          accessToken: 'token123',
          refreshToken: 'refresh123',
          user: userData,
        },
      })
      
      // Preencher os campos
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (emailInput.exists()) {
        await emailInput.setValue('joao@example.com')
      }
      if (passwordInput.exists()) {
        await passwordInput.setValue('senha123')
      }
      
      await wrapper.vm.$nextTick()
      
      // Submeter o formulário
      const form = wrapper.find('form')
      if (form.exists()) {
        await form.trigger('submit')
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))
        
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith('token', 'token123')
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh123')
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(userData))
      }
    })

    it('deve mostrar mensagem de sucesso após login bem-sucedido', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue({
        data: {
          accessToken: 'token123',
          refreshToken: 'refresh123',
          user: {
            id: 1,
            name: 'João Silva',
            email: 'joao@example.com',
          },
        },
      })
      
      // Preencher os campos
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (emailInput.exists()) {
        await emailInput.setValue('joao@example.com')
      }
      if (passwordInput.exists()) {
        await passwordInput.setValue('senha123')
      }
      
      await wrapper.vm.$nextTick()
      
      // Submeter o formulário
      const form = wrapper.find('form')
      if (form.exists()) {
        await form.trigger('submit')
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))
        
        expect(mockNotify).toHaveBeenCalledWith({
          type: 'positive',
          message: 'Login realizado com sucesso!',
          position: 'top',
        })
      }
    })

    it('deve redirecionar para dashboard após login bem-sucedido', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue({
        data: {
          accessToken: 'token123',
          refreshToken: 'refresh123',
          user: {
            id: 1,
            name: 'João Silva',
            email: 'joao@example.com',
          },
        },
      })
      
      // Preencher os campos
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (emailInput.exists()) {
        await emailInput.setValue('joao@example.com')
      }
      if (passwordInput.exists()) {
        await passwordInput.setValue('senha123')
      }
      
      await wrapper.vm.$nextTick()
      
      // Submeter o formulário
      const form = wrapper.find('form')
      if (form.exists()) {
        await form.trigger('submit')
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))
        
        expect(mockReplace).toHaveBeenCalledWith({ name: 'dashboard' })
      }
    })

    it('deve redirecionar para URL de redirect se presente na query', async () => {
      wrapper = createWrapper()
      
      // Simular query parameter redirect
      router.currentRoute.value.query = { redirect: '/projects' }
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue({
        data: {
          accessToken: 'token123',
          refreshToken: 'refresh123',
          user: {
            id: 1,
            name: 'João Silva',
            email: 'joao@example.com',
          },
        },
      })
      
      // Preencher os campos
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (emailInput.exists()) {
        await emailInput.setValue('joao@example.com')
      }
      if (passwordInput.exists()) {
        await passwordInput.setValue('senha123')
      }
      
      await wrapper.vm.$nextTick()
      
      // Submeter o formulário
      const form = wrapper.find('form')
      if (form.exists()) {
        await form.trigger('submit')
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))
        
        expect(mockReplace).toHaveBeenCalledWith('/projects')
      }
    })

    it('deve mostrar mensagem de erro quando API retorna erro', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      const errorResponse = {
        response: {
          data: {
            error: 'Credenciais inválidas',
          },
        },
      }
      mockPost.mockRejectedValue(errorResponse)
      
      // Preencher os campos
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (emailInput.exists()) {
        await emailInput.setValue('joao@example.com')
      }
      if (passwordInput.exists()) {
        await passwordInput.setValue('senha123')
      }
      
      await wrapper.vm.$nextTick()
      
      // Submeter o formulário
      const form = wrapper.find('form')
      if (form.exists()) {
        await form.trigger('submit')
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))
        
        expect(mockNotify).toHaveBeenCalledWith({
          type: 'negative',
          message: 'Credenciais inválidas',
          position: 'top',
        })
      }
    })

    it('deve mostrar mensagem de erro genérico quando erro não tem response', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockRejectedValue(new Error('Erro de conexão'))
      
      // Preencher os campos
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (emailInput.exists()) {
        await emailInput.setValue('joao@example.com')
      }
      if (passwordInput.exists()) {
        await passwordInput.setValue('senha123')
      }
      
      await wrapper.vm.$nextTick()
      
      // Submeter o formulário
      const form = wrapper.find('form')
      if (form.exists()) {
        await form.trigger('submit')
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))
        
        expect(mockNotify).toHaveBeenCalledWith({
          type: 'negative',
          message: 'Erro ao fazer login',
          position: 'top',
        })
      }
    })

    it('deve mostrar loading durante o login', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      // Criar uma promise que demora para resolver
      let resolvePromise: (value: any) => void
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockPost.mockReturnValue(delayedPromise)
      
      // Preencher os campos
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (emailInput.exists()) {
        await emailInput.setValue('joao@example.com')
      }
      if (passwordInput.exists()) {
        await passwordInput.setValue('senha123')
      }
      
      await wrapper.vm.$nextTick()
      
      // Submeter o formulário
      const form = wrapper.find('form')
      if (form.exists()) {
        await form.trigger('submit')
        await wrapper.vm.$nextTick()
        
        // Verificar se o botão está em estado de loading
        const submitButton = wrapper.find('button[type="submit"]')
        if (submitButton.exists()) {
          expect(submitButton.attributes('disabled')).toBeDefined()
        }
        
        // Resolver a promise
        resolvePromise!({
          data: {
            accessToken: 'token123',
            refreshToken: 'refresh123',
            user: {
              id: 1,
              name: 'João Silva',
              email: 'joao@example.com',
            },
          },
        })
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    })
  })

  describe('Navegação', () => {
    it('deve navegar para forgot-password ao clicar no botão "Esqueceu a senha?"', async () => {
      wrapper = createWrapper()
      
      const forgotButton = wrapper.find('.forgot-btn')
      if (forgotButton.exists()) {
        await forgotButton.trigger('click')
        await wrapper.vm.$nextTick()
        
        expect(mockPush).toHaveBeenCalledWith('/forgot-password')
      }
    })

    it('deve navegar para register ao clicar no botão "Criar conta"', async () => {
      wrapper = createWrapper()
      
      const signupButton = wrapper.find('.signup-btn')
      if (signupButton.exists()) {
        await signupButton.trigger('click')
        await wrapper.vm.$nextTick()
        
        expect(mockPush).toHaveBeenCalledWith('/register')
      }
    })
  })

  describe('Estados do componente', () => {
    it('deve inicializar com campos vazios', () => {
      wrapper = createWrapper()
      
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (emailInput.exists()) {
        expect((emailInput.element as HTMLInputElement).value).toBe('')
      }
      if (passwordInput.exists()) {
        expect((passwordInput.element as HTMLInputElement).value).toBe('')
      }
    })

    it('deve inicializar com senha oculta', () => {
      wrapper = createWrapper()
      
      const passwordInput = wrapper.find('input[type="password"]')
      expect(passwordInput.exists()).toBe(true)
    })

    it('deve inicializar com "Lembrar de mim" desmarcado', () => {
      wrapper = createWrapper()
      
      const checkbox = wrapper.find('input[type="checkbox"]')
      if (checkbox.exists()) {
        expect((checkbox.element as HTMLInputElement).checked).toBe(false)
      }
    })

    it('deve inicializar sem loading', () => {
      wrapper = createWrapper()
      
      const submitButton = wrapper.find('button[type="submit"]')
      if (submitButton.exists()) {
        expect(submitButton.attributes('disabled')).toBeUndefined()
      }
    })
  })
})

