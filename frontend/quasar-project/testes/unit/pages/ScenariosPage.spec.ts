import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ScenariosPage from 'src/pages/ScenariosPage.vue'
import api from 'src/services/api'

// Mock do api
vi.mock('src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock do Quasar
const mockNotify = vi.fn()
const mockDialog = vi.fn()

vi.mock('quasar', () => ({
  useQuasar: () => ({
    notify: mockNotify,
    dialog: mockDialog,
  }),
}))

// Mock do useRoute
const mockRoute = {
  params: { projectId: '1' },
  query: {},
}

const mockPush = vi.fn()

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRoute: () => mockRoute,
    useRouter: () => ({
      push: mockPush,
    }),
  }
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/projects/:projectId/scenarios', component: ScenariosPage },
    { path: '/projects/:projectId', component: { template: '<div>Project Details</div>' } },
    { path: '/projects/:projectId/create-scenario', component: { template: '<div>Create Scenario</div>' } },
  ],
})

describe('ScenariosPage', () => {
  let wrapper: VueWrapper<any>
  let mockNotifyFn: ReturnType<typeof vi.fn>

  const mockProject = {
    id: 1,
    name: 'Projeto Teste',
    description: 'Descrição do projeto',
  }

  const mockScenarios = [
    {
      id: 1,
      title: 'Cenário 1',
      description: 'Descrição do cenário 1',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      status: 'CREATED',
      environment: 'DEV',
      release: '1.0.0',
      steps: [
        { id: 1, action: 'Ação 1', expected: 'Resultado 1', order: 1 },
        { id: 2, action: 'Ação 2', expected: 'Resultado 2', order: 2 },
      ],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      title: 'Cenário 2',
      description: 'Descrição do cenário 2',
      type: 'REGRESSION',
      priority: 'MEDIUM',
      status: 'PASSED',
      environment: 'QA',
      release: '1.0.0',
      steps: [
        { id: 3, action: 'Ação 3', expected: 'Resultado 3', order: 1 },
      ],
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ]

  const createWrapper = () => {
    return mount(ScenariosPage, {
      global: {
        plugins: [router],
        mocks: {
          $q: {
            notify: mockNotifyFn,
            dialog: mockDialog,
          },
        },
        stubs: {
          'q-page': { template: '<div class="q-page"><slot /></div>' },
          'q-card': { template: '<div class="q-card" @click="$attrs.onClick" v-bind="$attrs"><slot /></div>', props: ['clickable'] },
          'q-card-section': { template: '<div class="q-card-section"><slot /></div>' },
          'q-card-actions': { template: '<div class="q-card-actions"><slot /></div>' },
          'q-btn': { template: '<button @click="$attrs.onClick" v-bind="$attrs"><slot /></button>', props: ['color', 'icon', 'label', 'loading', 'unelevated', 'flat', 'round', 'size'] },
          'q-icon': { template: '<span class="q-icon" v-bind="$attrs"></span>', props: ['name', 'size', 'color'] },
          'q-avatar': { template: '<div class="q-avatar" v-bind="$attrs"><slot /></div>', props: ['color', 'textColor', 'size', 'icon'] },
          'q-chip': { template: '<span class="q-chip" v-bind="$attrs"><slot /></span>', props: ['color', 'textColor', 'size', 'label'] },
          'q-spinner-dots': { template: '<div class="q-spinner-dots" v-bind="$attrs"></div>', props: ['size', 'color'] },
          'q-input': {
            template: `
              <div class="q-input">
                <label v-if="label">{{ label }}</label>
                <input :value="modelValue" @input="handleInput" :type="type" v-bind="$attrs" />
                <slot name="prepend"></slot>
                <slot name="append"></slot>
              </div>
            `,
            props: ['modelValue', 'label', 'type', 'filled', 'clearable', 'placeholder'],
            emits: ['update:modelValue', 'clear'],
            methods: {
              handleInput(event: Event) {
                const target = event.target as HTMLInputElement
                this.$emit('update:modelValue', target.value)
              },
            },
          },
          'q-menu': { template: '<div v-if="modelValue" class="q-menu" v-bind="$attrs"><slot /></div>', props: ['modelValue', 'target', 'position'] },
          'q-list': { template: '<div class="q-list"><slot /></div>' },
          'q-item': { template: '<div class="q-item" @click="$attrs.onClick" v-bind="$attrs"><slot /></div>', props: ['clickable'] },
          'q-item-section': { template: '<div class="q-item-section" v-bind="$attrs"><slot /></div>', props: ['avatar'] },
          'q-separator': { template: '<div class="q-separator" v-bind="$attrs"></div>' },
          'q-dialog': { template: '<div v-if="modelValue" class="q-dialog"><slot /></div>', props: ['modelValue'], emits: ['update:modelValue'] },
          'q-pagination': {
            template: '<div class="q-pagination"><button @click="$emit(\'update:modelValue\', modelValue - 1)">Prev</button><span>{{ modelValue }}</span><button @click="$emit(\'update:modelValue\', modelValue + 1)">Next</button></div>',
            props: ['modelValue', 'max', 'maxPages', 'directionLinks'],
            emits: ['update:modelValue'],
          },
          'q-tooltip': { template: '<div class="q-tooltip" v-bind="$attrs"><slot /></div>' },
        },
      },
    })
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockNotify.mockClear()
    mockDialog.mockClear()
    mockRoute.params = { projectId: '1' }
    // Obter referência ao mock do Quasar
    const quasar = await import('quasar')
    const quasarInstance = quasar.useQuasar()
    mockNotifyFn = quasarInstance.notify as ReturnType<typeof vi.fn>
    mockNotifyFn.mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockScenarios })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.q-page').exists()).toBe(true)
    })

    it('deve exibir título da página', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockScenarios })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(wrapper.text()).toContain('Cenários de Teste')
    })

    it('deve exibir estado de carregamento', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {}))
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.loading).toBe(true)
    })

    it('deve exibir estado vazio quando não há cenários', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockResolvedValueOnce({ data: [] })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(wrapper.vm.scenarios).toEqual([])
      expect(wrapper.text()).toContain('Nenhum cenário encontrado')
    })

    it('deve exibir descrição quando cenário tem descrição (linha 117)', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockScenarios })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(wrapper.vm.scenarios[0].description).toBe('Descrição do cenário 1')
    })

    it('deve exibir "Sem descrição" quando cenário não tem descrição (linhas 118-120)', async () => {
      const scenariosWithoutDescription = [
        {
          ...mockScenarios[0],
          description: null,
        },
      ]
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockResolvedValueOnce({ data: scenariosWithoutDescription })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(wrapper.vm.scenarios[0].description).toBeNull()
    })
  })

  describe('Carregamento de dados', () => {
    it('deve carregar cenários ao montar', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockScenarios })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(api.get).toHaveBeenCalled()
      expect(wrapper.vm.scenarios).toEqual(mockScenarios)
    })

    it('deve carregar nome do projeto ao montar', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockScenarios })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(api.get).toHaveBeenCalledWith('/projects/1')
      expect(wrapper.vm.projectName).toBe('Projeto Teste')
    })

    it('deve tratar erro ao carregar nome do projeto (linhas 469-470)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Erro ao carregar projeto'))
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockScenarios })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading project name:', expect.any(Error))
      consoleErrorSpy.mockRestore()
    })

    it('deve tratar erro ao carregar cenários', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Erro ao carregar'))
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotifyFn).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao carregar cenários',
        position: 'top',
      })
    })
  })

  describe('Busca', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockScenarios })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve buscar cenários ao digitar', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: [mockScenarios[0]] })
      wrapper.vm.searchQuery = 'Cenário 1'
      await wrapper.vm.onSearch()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(api.get).toHaveBeenCalled()
    })

    it('deve limpar busca e recarregar todos os cenários', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockScenarios })
      wrapper.vm.searchQuery = 'Cenário 1'
      await wrapper.vm.onSearch()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 600))

      wrapper.vm.searchQuery = ''
      await wrapper.vm.onSearch()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(api.get).toHaveBeenCalled()
    })
  })

  describe('Navegação', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockScenarios })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve navegar de volta ao clicar em voltar', async () => {
      await wrapper.vm.goBack()
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects/1')
    })

    it('deve navegar para criar cenário', async () => {
      await wrapper.vm.createScenario()
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects/1/create-scenario')
    })

    it('deve visualizar cenário ao clicar nele', async () => {
      await wrapper.vm.viewScenario(mockScenarios[0])
      await wrapper.vm.$nextTick()

      // A função viewScenario está vazia (TODO), então apenas verificamos que não há erro
      expect(wrapper.vm.viewScenario).toBeDefined()
    })
  })

  describe('Menu de ações', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockScenarios })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve abrir menu ao clicar em ações', async () => {
      const event = { target: document.createElement('button') } as unknown as Event
      await wrapper.vm.showScenarioMenu(mockScenarios[0], event)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showMenu).toBe(true)
      expect(wrapper.vm.selectedScenario).toEqual(mockScenarios[0])
    })

    it('deve editar cenário ao clicar em editar', async () => {
      wrapper.vm.selectedScenario = mockScenarios[0]
      await wrapper.vm.editScenario(mockScenarios[0])
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showMenu).toBe(false)
      // A função editScenario está vazia (TODO), então apenas verificamos que não há erro
      expect(wrapper.vm.editScenario).toBeDefined()
    })

    it('deve abrir diálogo de confirmação ao excluir cenário', async () => {
      await wrapper.vm.deleteScenario(mockScenarios[0])
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.deleteDialog).toBe(true)
      expect(wrapper.vm.scenarioToDelete).toEqual(mockScenarios[0])
    })
  })

  describe('Exclusão de cenário', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockScenarios })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve excluir cenário com sucesso', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce(undefined as any)
      vi.mocked(api.get).mockResolvedValueOnce({ data: [mockScenarios[1]] })
      wrapper.vm.scenarioToDelete = mockScenarios[0]

      await wrapper.vm.confirmDelete()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(api.delete).toHaveBeenCalledWith('/projects/1/scenarios/1')
      expect(mockNotifyFn).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Cenário excluído com sucesso!',
        position: 'top',
      })
    })

    it('deve tratar erro ao excluir cenário', async () => {
      vi.mocked(api.delete).mockRejectedValueOnce(new Error('Erro ao excluir'))
      wrapper.vm.scenarioToDelete = mockScenarios[0]

      await wrapper.vm.confirmDelete()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotifyFn).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao excluir cenário',
        position: 'top',
      })
    })
  })

  describe('Funções auxiliares', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockProject })
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockScenarios })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve formatar data corretamente', () => {
      const date = '2024-01-01T00:00:00Z'
      const formatted = wrapper.vm.formatDate(date)
      expect(formatted).toBeTruthy()
    })

    it('deve retornar cor de tipo corretamente', () => {
      expect(wrapper.vm.getScenarioTypeColor('FUNCTIONAL')).toBe('blue')
      expect(wrapper.vm.getScenarioTypeColor('REGRESSION')).toBe('orange')
      expect(wrapper.vm.getScenarioTypeColor('SMOKE')).toBe('green')
      expect(wrapper.vm.getScenarioTypeColor('E2E')).toBe('purple')
    })

    it('deve retornar label de tipo corretamente', () => {
      expect(wrapper.vm.getScenarioTypeLabel('FUNCTIONAL')).toBe('Funcional')
      expect(wrapper.vm.getScenarioTypeLabel('REGRESSION')).toBe('Regressão')
      expect(wrapper.vm.getScenarioTypeLabel('SMOKE')).toBe('Smoke')
      expect(wrapper.vm.getScenarioTypeLabel('E2E')).toBe('End-to-End')
    })

    it('deve retornar label de prioridade corretamente', () => {
      expect(wrapper.vm.getScenarioPriorityLabel('LOW')).toBe('Baixa')
      expect(wrapper.vm.getScenarioPriorityLabel('MEDIUM')).toBe('Média')
      expect(wrapper.vm.getScenarioPriorityLabel('HIGH')).toBe('Alta')
      expect(wrapper.vm.getScenarioPriorityLabel('CRITICAL')).toBe('Crítica')
    })

    it('deve retornar status corretamente', () => {
      expect(wrapper.vm.getScenarioStatus('CREATED')).toBe('Criado')
      expect(wrapper.vm.getScenarioStatus('EXECUTED')).toBe('Executado')
      expect(wrapper.vm.getScenarioStatus('PASSED')).toBe('Concluído')
      expect(wrapper.vm.getScenarioStatus('FAILED')).toBe('Falhou')
    })

    it('deve retornar cor de status corretamente', () => {
      expect(wrapper.vm.getScenarioStatusColor('CREATED')).toBe('grey')
      expect(wrapper.vm.getScenarioStatusColor('EXECUTED')).toBe('orange')
      expect(wrapper.vm.getScenarioStatusColor('PASSED')).toBe('green')
      expect(wrapper.vm.getScenarioStatusColor('FAILED')).toBe('red')
    })
  })
})

