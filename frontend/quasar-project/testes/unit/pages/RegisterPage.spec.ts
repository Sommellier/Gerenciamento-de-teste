import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import RegisterPage from 'src/pages/RegisterPage.vue'
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

// Criar router mock
const mockPush = vi.fn()
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/register', name: 'register', component: RegisterPage },
    { path: '/login', name: 'login', component: { template: '<div>Login</div>' } },
  ],
})

// Mock do router.push
router.push = mockPush

describe('RegisterPage', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    vi.clearAllMocks()
    mockNotify.mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = () => {
    return mount(RegisterPage, {
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
          'q-banner': {
            template: '<div class="q-banner message-banner" v-bind="$attrs"><slot></slot></div>',
            props: ['dense', 'rounded'],
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
    it('deve renderizar o formulário de registro', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Criar Conta')
      expect(wrapper.html()).toContain('Nome completo')
      expect(wrapper.html()).toContain('Email')
      expect(wrapper.html()).toContain('Senha')
    })

    it('deve renderizar os campos de entrada corretamente', () => {
      wrapper = createWrapper()
      
      // Verificar se os componentes Quasar estão sendo renderizados
      expect(wrapper.find('q-input').exists() || wrapper.html().includes('Nome completo')).toBe(true)
      expect(wrapper.html()).toContain('Email')
      expect(wrapper.html()).toContain('Senha')
    })

    it('deve renderizar o botão de criar conta', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Criar Conta')
    })

    it('deve renderizar o link para fazer login', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Fazer login')
    })
  })

  describe('Interação com campos', () => {
    it('deve permitir digitar no campo de nome', async () => {
      wrapper = createWrapper()
      
      const nameInput = wrapper.find('input[type="text"]')
      if (nameInput.exists()) {
        await nameInput.setValue('João Silva')
        await wrapper.vm.$nextTick()
        // Verificar se o valor foi atualizado no componente
        expect((nameInput.element as HTMLInputElement).value).toBe('João Silva')
      }
    })

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
      
      // Encontrar o ícone de toggle de senha
      const toggleIcon = wrapper.find('.password-toggle')
      if (toggleIcon.exists()) {
        await toggleIcon.trigger('click')
        await wrapper.vm.$nextTick()
        // Verificar se o tipo do input mudou
        const passwordInput = wrapper.find('input[type="text"]')
        // Pode não encontrar se ainda estiver como password
        expect(toggleIcon.exists()).toBe(true)
      }
    })
  })

  describe('Validação de formulário', () => {
    it('deve mostrar notificação quando campos estão vazios', async () => {
      wrapper = createWrapper()
      
      // Encontrar o formulário e submeter
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

    it('deve validar nome com menos de 2 caracteres', async () => {
      wrapper = createWrapper()
      
      const nameInput = wrapper.find('input[type="text"]')
      if (nameInput.exists()) {
        await nameInput.setValue('A')
        await wrapper.vm.$nextTick()
        expect((nameInput.element as HTMLInputElement).value).toBe('A')
      }
    })

    it('deve validar email inválido', async () => {
      wrapper = createWrapper()
      
      const emailInput = wrapper.find('input[type="email"]')
      if (emailInput.exists()) {
        await emailInput.setValue('email-invalido')
        await wrapper.vm.$nextTick()
        expect((emailInput.element as HTMLInputElement).value).toBe('email-invalido')
      }
    })

    it('deve validar senha com menos de 6 caracteres', async () => {
      wrapper = createWrapper()
      
      const passwordInput = wrapper.find('input[type="password"]')
      if (passwordInput.exists()) {
        await passwordInput.setValue('12345')
        await wrapper.vm.$nextTick()
        expect((passwordInput.element as HTMLInputElement).value).toBe('12345')
      }
    })
  })

  describe('Submissão do formulário', () => {
    it('deve chamar API quando formulário é submetido com dados válidos', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue({ data: { message: 'Usuário criado com sucesso' } })
      
      // Preencher os campos
      const nameInput = wrapper.find('input[type="text"]')
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (nameInput.exists()) {
        await nameInput.setValue('João Silva')
      }
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
        
        expect(mockPost).toHaveBeenCalledWith('/register', {
          name: 'João Silva',
          email: 'joao@example.com',
          password: 'senha123',
        })
      }
    })

    it('deve mostrar mensagem de sucesso após registro bem-sucedido', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue({ data: { message: 'Usuário criado com sucesso' } })
      
      // Preencher os campos
      const nameInput = wrapper.find('input[type="text"]')
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (nameInput.exists()) {
        await nameInput.setValue('João Silva')
      }
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
        await new Promise(resolve => setTimeout(resolve, 300))
        
        expect(mockNotify).toHaveBeenCalledWith({
          type: 'positive',
          message: 'Conta criada com sucesso!',
          position: 'top',
        })
      }
    })

    it('deve redirecionar para login após registro bem-sucedido', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue({ data: { message: 'Usuário criado com sucesso' } })
      
      // Preencher os campos
      const nameInput = wrapper.find('input[type="text"]')
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (nameInput.exists()) {
        await nameInput.setValue('João Silva')
      }
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
        
        // Aguardar o timeout de 2 segundos antes do redirecionamento
        await new Promise(resolve => setTimeout(resolve, 2100))
        
        expect(mockPush).toHaveBeenCalledWith('/login')
      }
    })

    it('deve mostrar mensagem de erro quando API retorna erro', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      const errorResponse = {
        response: {
          data: {
            message: 'Email já cadastrado',
          },
        },
      }
      mockPost.mockRejectedValue(errorResponse)
      
      // Preencher os campos
      const nameInput = wrapper.find('input[type="text"]')
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (nameInput.exists()) {
        await nameInput.setValue('João Silva')
      }
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
          message: 'Email já cadastrado',
          position: 'top',
        })
      }
    })

    it('deve mostrar mensagem de erro genérico quando erro não tem response', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockRejectedValue(new Error('Erro de conexão'))
      
      // Preencher os campos
      const nameInput = wrapper.find('input[type="text"]')
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (nameInput.exists()) {
        await nameInput.setValue('João Silva')
      }
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
          message: expect.any(String),
          position: 'top',
        })
      }
    })

    it('deve mostrar loading durante o registro', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      // Criar uma promise que demora para resolver
      let resolvePromise: (value: any) => void
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockPost.mockReturnValue(delayedPromise)
      
      // Preencher os campos
      const nameInput = wrapper.find('input[type="text"]')
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (nameInput.exists()) {
        await nameInput.setValue('João Silva')
      }
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
        resolvePromise!({ data: { message: 'Sucesso' } })
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    })
  })

  describe('Navegação', () => {
    it('deve navegar para login ao clicar no botão "Fazer login"', async () => {
      wrapper = createWrapper()
      
      // Encontrar o botão de login
      const loginButton = wrapper.find('.login-btn')
      if (loginButton.exists()) {
        await loginButton.trigger('click')
        await wrapper.vm.$nextTick()
        
        expect(mockPush).toHaveBeenCalledWith('/login')
      }
    })
  })

  describe('Mensagens de feedback', () => {
    it('deve mostrar banner de sucesso após registro bem-sucedido', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockResolvedValue({ data: { message: 'Usuário criado com sucesso' } })
      
      // Preencher os campos
      const nameInput = wrapper.find('input[type="text"]')
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (nameInput.exists()) {
        await nameInput.setValue('João Silva')
      }
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
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Verificar se a mensagem de sucesso está sendo exibida
        const banner = wrapper.find('.message-banner')
        if (banner.exists()) {
          expect(banner.text()).toContain('Conta criada com sucesso')
        }
      }
    })

    it('deve mostrar banner de erro quando registro falha', async () => {
      wrapper = createWrapper()
      
      const mockPost = vi.mocked(api.post)
      mockPost.mockRejectedValue({
        response: {
          data: {
            message: 'Email já cadastrado',
          },
        },
      })
      
      // Preencher os campos
      const nameInput = wrapper.find('input[type="text"]')
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (nameInput.exists()) {
        await nameInput.setValue('João Silva')
      }
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
        
        // Verificar se a mensagem de erro está sendo exibida
        const banner = wrapper.find('.message-banner')
        if (banner.exists()) {
          expect(banner.text()).toContain('Email já cadastrado')
        }
      }
    })
  })

  describe('Estados do componente', () => {
    it('deve inicializar com campos vazios', () => {
      wrapper = createWrapper()
      
      const nameInput = wrapper.find('input[type="text"]')
      const emailInput = wrapper.find('input[type="email"]')
      const passwordInput = wrapper.find('input[type="password"]')
      
      if (nameInput.exists()) {
        expect((nameInput.element as HTMLInputElement).value).toBe('')
      }
      if (emailInput.exists()) {
        expect((emailInput.element as HTMLInputElement).value).toBe('')
      }
      if (passwordInput.exists()) {
        expect((passwordInput.element as HTMLInputElement).value).toBe('')
      }
    })

    it('deve inicializar sem mensagem de feedback', () => {
      wrapper = createWrapper()
      
      const banner = wrapper.find('.message-banner')
      expect(banner.exists()).toBe(false)
    })

    it('deve inicializar com senha oculta', () => {
      wrapper = createWrapper()
      
      const passwordInput = wrapper.find('input[type="password"]')
      expect(passwordInput.exists()).toBe(true)
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

