import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import EditProjectPage from 'pages/EditProjectPage.vue'
import api from 'src/services/api'

const mockNotify = vi.fn()
const mockPush = vi.fn()

const mockRoute = {
  params: { id: '1' },
  query: {},
}

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
    { path: '/projects/:id/edit', component: EditProjectPage },
    { path: '/projects', component: { template: '<div>Projects</div>' } },
  ],
})

router.push = mockPush

// Mock da API
vi.mock('src/services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('vue-router')
  return {
    ...actual,
    useRoute: () => mockRoute,
    useRouter: () => router,
  }
})

describe('EditProjectPage', () => {
  let wrapper: ReturnType<typeof mount>

  const createWrapper = () => {
    return mount(EditProjectPage, {
      global: {
        plugins: [router],
        mocks: {
          $q: {
            notify: mockNotify,
          },
        },
        stubs: {
          'q-dialog': {
            template: '<div v-if="modelValue" class="q-dialog"><slot /></div>',
            props: ['modelValue'],
          },
          'q-card': {
            template: '<div class="q-card"><slot /></div>',
          },
          'q-card-section': {
            template: '<div class="q-card-section"><slot /></div>',
            props: ['class'],
          },
          'q-card-actions': {
            template: '<div class="q-card-actions"><slot /></div>',
            props: ['align'],
          },
          'q-icon': {
            template: '<span class="q-icon" v-bind="$attrs"></span>',
            props: ['name', 'size', 'color'],
          },
          'q-btn': {
            template: '<button @click="$attrs.onClick" :disabled="disabled" class="q-btn" v-bind="$attrs"><slot>{{ label }}</slot></button>',
            props: ['label', 'color', 'flat', 'disabled'],
          },
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({
      data: {
        id: 1,
        name: 'Projeto Teste',
        description: 'Descrição do projeto',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    })
    vi.mocked(api.put).mockResolvedValue({
      data: {
        id: 1,
        name: 'Projeto Atualizado',
        description: 'Descrição atualizada',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    })
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(wrapper.html()).toContain('Editar Projeto')
      expect(wrapper.html()).toContain('Nome do Projeto')
    })

    it('deve mostrar loading enquanto carrega', async () => {
      vi.mocked(api.get).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: {
            id: 1,
            name: 'Projeto',
            description: '',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
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
    it('deve carregar dados do projeto ao montar', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(api.get).toHaveBeenCalledWith('/projects/1')
      expect(wrapper.vm.name).toBe('Projeto Teste')
      expect(wrapper.vm.description).toBe('Descrição do projeto')
    })

    it('deve mostrar erro quando falha ao carregar projeto', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Erro ao carregar'))
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao carregar projeto',
        position: 'top',
      })
      expect(mockPush).toHaveBeenCalledWith('/projects')
    })

    it('deve mostrar erro quando projectId não é fornecido', async () => {
      mockRoute.params = { id: '' }
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao carregar projeto',
        position: 'top',
      })
      
      // Resetar para outros testes
      mockRoute.params = { id: '1' }
    })
  })

  describe('Interação com formulário', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve atualizar nome do projeto', async () => {
      const nameInput = wrapper.find('input[type="text"]')
      await nameInput.setValue('Novo Nome do Projeto')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.name).toBe('Novo Nome do Projeto')
    })

    it('deve atualizar descrição do projeto', async () => {
      const descriptionTextarea = wrapper.find('textarea')
      await descriptionTextarea.setValue('Nova Descrição')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.description).toBe('Nova Descrição')
    })

    it('deve mostrar contador de caracteres para nome', async () => {
      wrapper.vm.name = 'Teste'
      await wrapper.vm.$nextTick()
      
      // O contador mostra o comprimento atual do nome
      expect(wrapper.html()).toContain(`${wrapper.vm.name.length}/100`)
    })

    it('deve mostrar contador de caracteres para descrição', async () => {
      wrapper.vm.description = 'Descrição de teste'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.html()).toContain('18/500')
    })

    it('deve mostrar hint quando nome tem menos de 2 caracteres', async () => {
      wrapper.vm.name = 'A'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.html()).toContain('Mínimo de 2 caracteres')
    })
  })

  describe('Submissão do formulário', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve atualizar projeto quando formulário é submetido', async () => {
      wrapper.vm.name = 'Projeto Atualizado'
      wrapper.vm.description = 'Descrição atualizada'
      
      await wrapper.vm.submitForm()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(api.put).toHaveBeenCalledWith('/projects/1', {
        name: 'Projeto Atualizado',
        description: 'Descrição atualizada',
      })
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Projeto atualizado com sucesso!',
        position: 'top',
        timeout: 4000,
        actions: [{ icon: 'check', color: 'white' }],
      })
      expect(wrapper.vm.successDialog).toBe(true)
      expect(wrapper.vm.successText).toBe('Projeto atualizado com sucesso!')
    })

    it('deve tratar descrição vazia como null', async () => {
      wrapper.vm.name = 'Projeto Atualizado'
      wrapper.vm.description = '   '
      
      await wrapper.vm.submitForm()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(api.put).toHaveBeenCalledWith('/projects/1', {
        name: 'Projeto Atualizado',
        description: null,
      })
    })

    it('deve mostrar erro quando projectId não é fornecido', async () => {
      mockRoute.params = { id: '' }
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      wrapper.vm.name = 'Projeto Atualizado'
      
      await wrapper.vm.submitForm()
      await wrapper.vm.$nextTick()
      
      expect(api.put).not.toHaveBeenCalled()
      
      // Resetar para outros testes
      mockRoute.params = { id: '1' }
    })

    it('deve mostrar erro quando falha ao atualizar projeto', async () => {
      const errorResponse = Object.assign(new Error('Erro de rede'), {
        response: {
          status: 400,
          data: {
            message: 'Nome do projeto é obrigatório',
          },
        },
      })
      vi.mocked(api.put).mockRejectedValueOnce(errorResponse)
      
      wrapper.vm.name = 'Projeto Atualizado'
      
      await wrapper.vm.submitForm()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'O nome do projeto é obrigatório. Por favor, preencha este campo.',
        position: 'top',
        timeout: 5000,
        actions: [{ icon: 'close', color: 'white' }],
      })
      expect(wrapper.vm.errorDialog).toBe(true)
    })

    it('deve tratar diferentes status codes de erro', async () => {
      const testCases = [
        { status: 401, expected: 'Sessão expirada. Faça login novamente para continuar.' },
        { status: 403, expected: 'Você não tem permissão para editar este projeto.' },
        { status: 404, expected: 'Projeto não encontrado.' },
        { status: 409, message: 'already exists', expected: 'Você já possui um projeto com este nome. Escolha um nome diferente.' },
        { status: 500, expected: 'Erro interno do servidor. Tente novamente em alguns minutos.' },
        { status: 418, message: 'Mensagem customizada', expected: 'Mensagem customizada' },
        { status: 418, expected: 'Erro inesperado. Tente novamente.' },
      ]
      
      for (const testCase of testCases) {
        const errorResponse = Object.assign(new Error('Erro'), {
          response: {
            status: testCase.status,
            data: {
              message: testCase.message || '',
            },
          },
        })
        vi.mocked(api.put).mockRejectedValueOnce(errorResponse)
        
        wrapper = createWrapper()
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 200))
        
        wrapper.vm.name = 'Projeto Atualizado'
        
        await wrapper.vm.submitForm()
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))
        
        expect(mockNotify).toHaveBeenCalledWith({
          type: 'negative',
          message: testCase.expected,
          position: 'top',
          timeout: 5000,
          actions: [{ icon: 'close', color: 'white' }],
        })
        
        mockNotify.mockClear()
      }
    })

    it('deve tratar erro sem status', async () => {
      const errorResponse = Object.assign(new Error('Erro de rede'), {})
      vi.mocked(api.put).mockRejectedValueOnce(errorResponse)
      
      wrapper.vm.name = 'Projeto Atualizado'
      
      await wrapper.vm.submitForm()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro de conexão. Verifique sua internet e tente novamente.',
        position: 'top',
        timeout: 5000,
        actions: [{ icon: 'close', color: 'white' }],
      })
    })
  })

  describe('Navegação', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve navegar para projetos quando clicar em voltar', async () => {
      await wrapper.vm.goBack()
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/projects')
    })

    it('deve navegar para projetos quando clicar em OK no dialog de sucesso', async () => {
      wrapper.vm.successDialog = true
      await wrapper.vm.$nextTick()
      
      const okButton = wrapper.find('button')
      if (okButton.exists()) {
        await okButton.trigger('click')
        await wrapper.vm.$nextTick()
        
        expect(mockPush).toHaveBeenCalledWith('/projects')
      }
    })
  })

  describe('Funções auxiliares', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve formatar data corretamente', () => {
      const dateString = '2024-01-01T12:00:00Z'
      const formatted = wrapper.vm.formatDate(dateString)
      
      expect(formatted).toBeTruthy()
      expect(formatted).not.toBe('N/A')
    })

    it('deve retornar N/A quando data é undefined', () => {
      const formatted = wrapper.vm.formatDate(undefined)
      
      expect(formatted).toBe('N/A')
    })

    it('deve retornar N/A quando data é vazia', () => {
      const formatted = wrapper.vm.formatDate('')
      
      expect(formatted).toBe('N/A')
    })
  })

  describe('Estados do componente', () => {
    it('deve inicializar com campos vazios', async () => {
      // Mock para evitar carregamento automático
      vi.mocked(api.get).mockImplementation(() => 
        new Promise(() => {}) // Promise que nunca resolve
      )
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.name).toBe('')
      expect(wrapper.vm.description).toBe('')
      expect(wrapper.vm.submitting).toBe(false)
      
      // Resetar mock para outros testes
      vi.mocked(api.get).mockResolvedValue({
        data: {
          id: 1,
          name: 'Projeto Teste',
          description: 'Descrição do projeto',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      })
    })

    it('deve mostrar informações do projeto quando carregado', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(wrapper.vm.project).toBeTruthy()
      expect(wrapper.vm.project?.name).toBe('Projeto Teste')
    })
  })
})

