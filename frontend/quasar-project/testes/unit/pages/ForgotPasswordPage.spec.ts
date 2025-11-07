import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ForgotPasswordPage from 'pages/ForgotPasswordPage.vue'
import api from 'src/services/api'

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
    { path: '/forgot-password', component: ForgotPasswordPage },
    { path: '/login', component: { template: '<div>Login</div>' } },
  ],
})

router.push = mockPush

// Mock da API
vi.mock('src/services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('ForgotPasswordPage', () => {
  let wrapper: ReturnType<typeof mount>

  const createWrapper = () => {
    return mount(ForgotPasswordPage, {
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
            props: ['type', 'label', 'color', 'loading', 'unelevated', 'rounded', 'noCaps', 'size', 'flat'],
          },
          'q-banner': {
            template: '<div class="q-banner message-banner" v-bind="$attrs"><slot></slot></div>',
            props: ['dense', 'rounded', 'class'],
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

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.post).mockResolvedValue({ data: {} })
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Recuperar Senha')
      expect(wrapper.html()).toContain('Digite seu email para receber o link de recuperação')
    })

    it('deve renderizar o campo de email', () => {
      wrapper = createWrapper()
      
      const emailInput = wrapper.find('input[type="email"]')
      expect(emailInput.exists()).toBe(true)
    })

    it('deve renderizar o botão de envio', () => {
      wrapper = createWrapper()
      
      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.exists()).toBe(true)
      expect(submitButton.text()).toContain('Enviar Link de Recuperação')
    })

    it('deve renderizar o link para login', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('Fazer login')
    })
  })

  describe('Interação com formulário', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('deve atualizar email quando digitado', async () => {
      wrapper.vm.email = 'teste@example.com'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.email).toBe('teste@example.com')
    })

    it('deve mostrar loading quando está enviando', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      vi.mocked(api.post).mockImplementation(() => promise)
      
      wrapper.vm.email = 'teste@example.com'
      const resetPromise = wrapper.vm.handleReset()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.isLoading).toBe(true)
      
      resolvePromise!({ data: {} })
      await resetPromise
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.isLoading).toBe(false)
    })
  })

  describe('Submissão do formulário', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('deve mostrar erro quando email está vazio', async () => {
      wrapper.vm.email = ''
      
      await wrapper.vm.handleReset()
      await wrapper.vm.$nextTick()
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Por favor, digite seu email',
        position: 'top',
      })
      expect(api.post).not.toHaveBeenCalled()
    })

    it('deve enviar email de recuperação quando formulário é submetido', async () => {
      wrapper.vm.email = 'teste@example.com'
      
      await wrapper.vm.handleReset()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(api.post).toHaveBeenCalledWith('/request-password-reset', {
        email: 'teste@example.com',
      })
      expect(wrapper.vm.message).toBe('Verifique seu e-mail para redefinir sua senha.')
      expect(wrapper.vm.isError).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Email de recuperação enviado com sucesso!',
        position: 'top',
      })
    })

    it('deve mostrar erro quando falha ao enviar email', async () => {
      const errorResponse = Object.assign(new Error('Erro de rede'), {
        response: {
          data: {
            error: 'Email não encontrado',
          },
        },
      })
      vi.mocked(api.post).mockRejectedValueOnce(errorResponse)
      
      wrapper.vm.email = 'teste@example.com'
      
      await wrapper.vm.handleReset()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(wrapper.vm.isError).toBe(true)
      expect(wrapper.vm.message).toBe('Email não encontrado')
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Email não encontrado',
        position: 'top',
      })
    })

    it('deve mostrar erro genérico quando erro não tem response', async () => {
      const errorResponse = new Error('Erro desconhecido')
      vi.mocked(api.post).mockRejectedValueOnce(errorResponse)
      
      wrapper.vm.email = 'teste@example.com'
      
      await wrapper.vm.handleReset()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(wrapper.vm.isError).toBe(true)
      expect(wrapper.vm.message).toBe('Erro desconhecido')
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro desconhecido',
        position: 'top',
      })
    })

    it('deve limpar mensagem anterior ao enviar novo email', async () => {
      wrapper.vm.message = 'Mensagem anterior'
      wrapper.vm.isError = true
      wrapper.vm.email = 'teste@example.com'
      
      // Mock para delayar a resolução da Promise
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      vi.mocked(api.post).mockImplementationOnce(() => promise)
      
      const resetPromise = wrapper.vm.handleReset()
      await wrapper.vm.$nextTick()
      
      // A mensagem é limpa no início da função, antes de enviar
      expect(wrapper.vm.message).toBe('')
      expect(wrapper.vm.isError).toBe(false)
      
      // Resolver a Promise para completar o envio
      resolvePromise!({ data: {} })
      await resetPromise
      await wrapper.vm.$nextTick()
      
      // Depois de enviar, a mensagem de sucesso é definida
      expect(wrapper.vm.message).toBe('Verifique seu e-mail para redefinir sua senha.')
      expect(wrapper.vm.isError).toBe(false)
    })
  })

  describe('Navegação', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('deve navegar para login quando clicar em fazer login', async () => {
      await wrapper.vm.goToLogin()
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  describe('Estados do componente', () => {
    it('deve inicializar com campos vazios', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.email).toBe('')
      expect(wrapper.vm.message).toBe('')
      expect(wrapper.vm.isError).toBe(false)
      expect(wrapper.vm.isLoading).toBe(false)
    })

    it('deve mostrar mensagem de sucesso quando email é enviado', async () => {
      wrapper = createWrapper()
      wrapper.vm.email = 'teste@example.com'
      
      await wrapper.vm.handleReset()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(wrapper.vm.message).toBe('Verifique seu e-mail para redefinir sua senha.')
      expect(wrapper.vm.isError).toBe(false)
    })
  })
})

