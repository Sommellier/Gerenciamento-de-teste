import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ScenarioExecutionPage from 'src/pages/ScenarioExecutionPage.vue'
import * as scenarioService from 'src/services/scenario.service'
import * as executionService from 'src/services/execution.service'
import * as projectDetailsService from 'src/services/project-details.service'

// Mock dos serviços
vi.mock('src/services/scenario.service', () => ({
  scenarioService: {
    getScenarioById: vi.fn(),
    updateScenario: vi.fn(),
  },
}))

vi.mock('src/services/execution.service', () => ({
  executionService: {
    getBugs: vi.fn(),
    getHistory: vi.fn(),
    getStepComments: vi.fn(),
    getStepAttachments: vi.fn(),
    updateStepStatus: vi.fn(),
    addStepComment: vi.fn(),
    uploadStepAttachment: vi.fn(),
    deleteStepAttachment: vi.fn(),
    createBug: vi.fn(),
    uploadBugAttachment: vi.fn(),
    registerHistory: vi.fn(),
  },
}))

vi.mock('src/services/project-details.service', () => ({
  getProjectMembers: vi.fn(),
}))

// Mock do Quasar
const mockDialogFn = vi.fn()
vi.mock('quasar', () => ({
  Notify: {
    create: vi.fn(),
  },
  useQuasar: () => ({
    notify: vi.fn(),
    dialog: mockDialogFn,
  }),
}))

// Mock do useRoute
const mockRoute = {
  params: { projectId: '1', packageId: '1', scenarioId: '1' },
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
    { path: '/projects/:projectId/packages/:packageId/scenarios/:scenarioId/execute', component: ScenarioExecutionPage },
    { path: '/projects/:projectId/packages/:packageId/scenarios/:scenarioId', component: { template: '<div>Scenario Details</div>' } },
    { path: '/projects/:projectId/packages/:packageId', component: { template: '<div>Package Details</div>' } },
  ],
})

describe('ScenarioExecutionPage', () => {
  let wrapper: VueWrapper<any>
  let mockNotifyFn: ReturnType<typeof vi.fn>

  const mockScenario = {
    id: 1,
    title: 'Cenário de Teste',
    description: 'Descrição do cenário',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    status: 'CREATED',
    steps: [
      { id: 1, action: 'Ação 1', expected: 'Resultado esperado 1', order: 1 },
      { id: 2, action: 'Ação 2', expected: 'Resultado esperado 2', order: 2 },
    ],
    testador: { id: 1, name: 'Testador', email: 'testador@example.com' },
    project: { id: 1, ownerId: 1 },
  }

  const mockMembers = [
    { id: 1, name: 'Test User', email: 'test@example.com', role: 'OWNER' },
    { id: 2, name: 'Manager User', email: 'manager@example.com', role: 'MANAGER' },
  ]

  const mockBugs: any[] = []
  const mockHistory: any[] = []
  const mockComments: any[] = []
  const mockAttachments: any[] = []

  const createWrapper = () => {
    return mount(ScenarioExecutionPage, {
      global: {
        plugins: [router],
        mocks: {
          $q: {
            notify: mockNotifyFn,
            dialog: mockDialogFn,
          },
        },
        stubs: {
          'q-page': { template: '<div class="q-page"><slot /></div>' },
          'q-card': { template: '<div class="q-card"><slot /></div>' },
          'q-card-section': { template: '<div class="q-card-section"><slot /></div>' },
          'q-card-actions': { template: '<div class="q-card-actions"><slot /></div>' },
          'q-btn': { template: '<button @click="$attrs.onClick" v-bind="$attrs"><slot /></button>', props: ['color', 'icon', 'label', 'loading', 'unelevated', 'flat', 'round', 'textColor'] },
          'q-icon': { template: '<span class="q-icon" v-bind="$attrs"></span>', props: ['name', 'size', 'color'] },
          'q-chip': { template: '<span class="q-chip" v-bind="$attrs"><slot /></span>', props: ['color', 'textColor', 'size'] },
          'q-spinner-dots': { template: '<div class="q-spinner-dots" v-bind="$attrs"></div>', props: ['size', 'color'] },
          'q-dialog': { template: '<div v-if="modelValue" class="q-dialog"><slot /></div>', props: ['modelValue'], emits: ['update:modelValue'] },
          'q-form': { template: '<form @submit.prevent="$attrs.onSubmit" class="q-form"><slot /></form>' },
          'q-input': {
            template: `
              <div class="q-input">
                <label v-if="label">{{ label }}</label>
                <input :value="modelValue" @input="handleInput" :type="type" v-bind="$attrs" />
                <textarea v-if="type === 'textarea'" :value="modelValue" @input="handleTextareaInput" :rows="rows" v-bind="$attrs"></textarea>
              </div>
            `,
            props: ['modelValue', 'label', 'type', 'rows', 'outlined', 'rules', 'placeholder'],
            emits: ['update:modelValue'],
            methods: {
              handleInput(event: Event) {
                const target = event.target as HTMLInputElement
                this.$emit('update:modelValue', target.value)
              },
              handleTextareaInput(event: Event) {
                const target = event.target as HTMLTextAreaElement
                this.$emit('update:modelValue', target.value)
              },
            },
          },
          'q-select': {
            template: `
              <div class="q-select">
                <label v-if="label">{{ label }}</label>
                <select :value="modelValue" @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)" v-bind="$attrs">
                  <option v-for="option in options" :key="option.value || option" :value="option.value || option">{{ option.label || option }}</option>
                </select>
              </div>
            `,
            props: ['modelValue', 'label', 'options', 'outlined', 'rules', 'placeholder', 'emitValue', 'mapOptions'],
            emits: ['update:modelValue'],
          },
          'q-file': {
            template: '<input type="file" @change="$emit(\'update:modelValue\', $event)" v-bind="$attrs" />',
            props: ['modelValue', 'label', 'accept', 'multiple'],
            emits: ['update:modelValue'],
          },
          'q-avatar': { template: '<div class="q-avatar" v-bind="$attrs"><slot /></div>', props: ['size', 'color'] },
          'q-list': { template: '<div class="q-list"><slot /></div>' },
          'q-item': { template: '<div class="q-item" @click="$attrs.onClick" v-bind="$attrs"><slot /></div>', props: ['clickable'] },
          'q-item-section': { template: '<div class="q-item-section" v-bind="$attrs"><slot /></div>', props: ['avatar'] },
          'q-item-label': { template: '<div class="q-item-label"><slot /></div>' },
          'q-separator': { template: '<div class="q-separator" v-bind="$attrs"></div>' },
          'q-linear-progress': { template: '<div class="q-linear-progress" v-bind="$attrs"></div>', props: ['value', 'color'] },
          'q-editor': { template: '<div class="q-editor" v-bind="$attrs"><slot /></div>', props: ['modelValue'], emits: ['update:modelValue'] },
          'q-img': { template: '<img class="q-img" v-bind="$attrs" />', props: ['src', 'style', 'fit'] },
          'q-menu': { template: '<div class="q-menu" v-bind="$attrs"><slot /></div>' },
        },
      },
    })
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockDialogFn.mockClear()
    mockRoute.params = { projectId: '1', packageId: '1', scenarioId: '1' }
    // Obter referência aos mocks do Quasar
    const quasar = await import('quasar')
    mockNotifyFn = vi.mocked(quasar.Notify.create)
    mockNotifyFn.mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', async () => {
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      vi.mocked(executionService.executionService.getBugs).mockResolvedValueOnce(mockBugs)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)
      vi.mocked(executionService.executionService.getStepComments).mockResolvedValueOnce(mockComments)
      vi.mocked(executionService.executionService.getStepAttachments).mockResolvedValueOnce(mockAttachments)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.q-page').exists()).toBe(true)
    })

    it('deve exibir estado de carregamento', async () => {
      const pendingPromise = new Promise(() => {})
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockReturnValue(pendingPromise as any)
      vi.mocked(projectDetailsService.getProjectMembers).mockReturnValue(pendingPromise as any)
      vi.mocked(executionService.executionService.getBugs).mockReturnValue(pendingPromise as any)
      vi.mocked(executionService.executionService.getHistory).mockReturnValue(pendingPromise as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.loading).toBe(true)
    })
  })

  describe('Carregamento de dados', () => {
    it('deve carregar cenário ao montar', async () => {
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      vi.mocked(executionService.executionService.getBugs).mockResolvedValueOnce(mockBugs)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)
      vi.mocked(executionService.executionService.getStepComments).mockResolvedValueOnce(mockComments)
      vi.mocked(executionService.executionService.getStepAttachments).mockResolvedValueOnce(mockAttachments)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.scenarioService.getScenarioById).toHaveBeenCalledWith(1)
      expect(wrapper.vm.scenario).toBeTruthy()
    })

    it('deve carregar membros do projeto ao montar', async () => {
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      vi.mocked(executionService.executionService.getBugs).mockResolvedValueOnce(mockBugs)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)
      vi.mocked(executionService.executionService.getStepComments).mockResolvedValueOnce(mockComments)
      vi.mocked(executionService.executionService.getStepAttachments).mockResolvedValueOnce(mockAttachments)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(projectDetailsService.getProjectMembers).toHaveBeenCalledWith(1)
      expect(wrapper.vm.projectMembers).toEqual(mockMembers)
    })
  })

  describe('Navegação', () => {
    beforeEach(async () => {
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      vi.mocked(executionService.executionService.getBugs).mockResolvedValueOnce(mockBugs)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)
      vi.mocked(executionService.executionService.getStepComments).mockResolvedValueOnce(mockComments)
      vi.mocked(executionService.executionService.getStepAttachments).mockResolvedValueOnce(mockAttachments)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve navegar de volta ao clicar em voltar', async () => {
      await wrapper.vm.goBack()
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects/1/packages/1/scenarios/1')
    })

    it('deve navegar para pacote ao concluir execução', async () => {
      await wrapper.vm.goBackToPackage()
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects/1/packages/1')
    })
  })

  describe('Execução', () => {
    beforeEach(async () => {
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      vi.mocked(executionService.executionService.getBugs).mockResolvedValueOnce(mockBugs)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)
      vi.mocked(executionService.executionService.getStepComments).mockResolvedValueOnce(mockComments)
      vi.mocked(executionService.executionService.getStepAttachments).mockResolvedValueOnce(mockAttachments)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve iniciar execução com sucesso', async () => {
      vi.mocked(scenarioService.scenarioService.updateScenario).mockResolvedValueOnce(undefined as any)
      vi.mocked(executionService.executionService.registerHistory).mockResolvedValueOnce(undefined as any)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)

      await wrapper.vm.startExecution()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.scenarioService.updateScenario).toHaveBeenCalled()
      expect(executionService.executionService.registerHistory).toHaveBeenCalled()
      expect(mockNotifyFn).toHaveBeenCalled()
    })

    it('deve concluir execução com sucesso', async () => {
      // Configurar etapas como concluídas
      wrapper.vm.steps = [
        { id: 1, action: 'Ação 1', expected: 'Resultado esperado 1', order: 1, status: 'PASSED', actualResult: 'Resultado' },
        { id: 2, action: 'Ação 2', expected: 'Resultado esperado 2', order: 2, status: 'PASSED', actualResult: 'Resultado' },
      ]
      vi.mocked(scenarioService.scenarioService.updateScenario).mockResolvedValueOnce(undefined as any)
      vi.mocked(executionService.executionService.registerHistory).mockResolvedValueOnce(undefined as any)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)

      await wrapper.vm.finishExecution()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.scenarioService.updateScenario).toHaveBeenCalled()
      expect(executionService.executionService.registerHistory).toHaveBeenCalled()
      expect(mockNotifyFn).toHaveBeenCalled()
    })

    it('deve reexecutar cenário com sucesso', async () => {
      // Garantir que o cenário e os steps estão configurados
      wrapper.vm.scenario = mockScenario as any
      wrapper.vm.steps = [
        { id: 1, action: 'Ação 1', expected: 'Resultado esperado 1', order: 1, status: 'PASSED', actualResult: 'Resultado' },
        { id: 2, action: 'Ação 2', expected: 'Resultado esperado 2', order: 2, status: 'PASSED', actualResult: 'Resultado' },
      ]
      const mockDialog = {
        onOk: (callback: () => void) => {
          callback()
          return { onCancel: vi.fn() }
        },
        onCancel: vi.fn(),
      }
      // Mockar $q.dialog através do wrapper
      mockDialogFn.mockReturnValue(mockDialog)
      vi.mocked(executionService.executionService.updateStepStatus).mockResolvedValue(undefined as any)
      vi.mocked(scenarioService.scenarioService.updateScenario).mockResolvedValueOnce(undefined as any)
      vi.mocked(executionService.executionService.registerHistory).mockResolvedValueOnce(undefined as any)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)

      await wrapper.vm.restartExecution()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockDialogFn).toHaveBeenCalled()
      expect(scenarioService.scenarioService.updateScenario).toHaveBeenCalled()
      expect(mockNotifyFn).toHaveBeenCalled()
    })
  })

  describe('Gerenciamento de etapas', () => {
    beforeEach(async () => {
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      vi.mocked(executionService.executionService.getBugs).mockResolvedValueOnce(mockBugs)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)
      vi.mocked(executionService.executionService.getStepComments).mockResolvedValueOnce(mockComments)
      vi.mocked(executionService.executionService.getStepAttachments).mockResolvedValueOnce(mockAttachments)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve avançar para próxima etapa', async () => {
      wrapper.vm.currentStepIndex = 0
      await wrapper.vm.nextStep()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.currentStepIndex).toBe(1)
    })

    it('deve voltar para etapa anterior', async () => {
      wrapper.vm.currentStepIndex = 1
      await wrapper.vm.previousStep()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.currentStepIndex).toBe(0)
    })

    it('deve atualizar status da etapa', async () => {
      vi.mocked(executionService.executionService.updateStepStatus).mockResolvedValueOnce(undefined as any)
      vi.mocked(executionService.executionService.registerHistory).mockResolvedValueOnce(undefined as any)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)
      // Garantir que o cenário e os steps estão configurados
      wrapper.vm.scenario = { ...mockScenario, status: 'CREATED' } as any
      wrapper.vm.steps = [
        { id: 1, action: 'Ação 1', expected: 'Resultado esperado 1', order: 1, status: 'PENDING', actualResult: '' },
        { id: 2, action: 'Ação 2', expected: 'Resultado esperado 2', order: 2, status: 'PENDING', actualResult: '' },
      ]
      wrapper.vm.currentStepIndex = 0
      wrapper.vm.executionStatus = 'NOT_STARTED'
      wrapper.vm.steps[0].actualResult = 'Resultado'

      await wrapper.vm.setStepStatus('PASSED')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(executionService.executionService.updateStepStatus).toHaveBeenCalled()
      expect(mockNotifyFn).toHaveBeenCalled()
    })

    it('deve adicionar comentário com sucesso', async () => {
      vi.mocked(executionService.executionService.addStepComment).mockResolvedValueOnce({ id: 1, comment: 'Comentário', createdAt: '2024-01-01' } as any)
      // Garantir que o cenário e os steps estão configurados
      wrapper.vm.scenario = { ...mockScenario, status: 'CREATED' } as any
      wrapper.vm.steps = [
        { id: 1, action: 'Ação 1', expected: 'Resultado esperado 1', order: 1, status: 'PENDING', actualResult: '', comments: [], attachments: [] },
        { id: 2, action: 'Ação 2', expected: 'Resultado esperado 2', order: 2, status: 'PENDING', actualResult: '', comments: [], attachments: [] },
      ]
      wrapper.vm.currentStepIndex = 0
      wrapper.vm.executionStatus = 'IN_PROGRESS'
      wrapper.vm.newComment = 'Novo comentário'

      await wrapper.vm.addComment()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(executionService.executionService.addStepComment).toHaveBeenCalled()
      expect(mockNotifyFn).toHaveBeenCalled()
    })

    it('deve retornar quando currentStep não existe (linha 1234)', async () => {
      wrapper.vm.currentStepIndex = -1
      wrapper.vm.currentStep = null
      wrapper.vm.newComment = 'Novo comentário'

      await wrapper.vm.addComment()
      await wrapper.vm.$nextTick()

      expect(executionService.executionService.addStepComment).not.toHaveBeenCalled()
    })

    it('deve inicializar comments se não existir (linhas 1243-1244)', async () => {
      vi.mocked(executionService.executionService.addStepComment).mockResolvedValueOnce({ id: 1, comment: 'Comentário', createdAt: '2024-01-01' } as any)
      wrapper.vm.scenario = { ...mockScenario, status: 'CREATED' } as any
      wrapper.vm.steps = [
        { id: 1, action: 'Ação 1', expected: 'Resultado esperado 1', order: 1, status: 'PENDING', actualResult: '', attachments: [] },
      ]
      wrapper.vm.currentStepIndex = 0
      wrapper.vm.executionStatus = 'IN_PROGRESS'
      wrapper.vm.newComment = 'Novo comentário'

      await wrapper.vm.addComment()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(wrapper.vm.steps[0].comments).toBeDefined()
      expect(Array.isArray(wrapper.vm.steps[0].comments)).toBe(true)
    })

    it('deve mostrar notificação quando há menções (linhas 1251-1261)', async () => {
      const mockNotifyCreate = vi.fn()
      const quasar = await import('quasar')
      vi.mocked(quasar.Notify.create).mockImplementation(mockNotifyCreate)
      
      vi.mocked(executionService.executionService.addStepComment).mockResolvedValueOnce({ id: 1, comment: 'Comentário @Test User', createdAt: '2024-01-01' } as any)
      wrapper.vm.scenario = { ...mockScenario, status: 'CREATED' } as any
      wrapper.vm.projectMembers = mockMembers
      wrapper.vm.steps = [
        { id: 1, action: 'Ação 1', expected: 'Resultado esperado 1', order: 1, status: 'PENDING', actualResult: '', comments: [], attachments: [] },
      ]
      wrapper.vm.currentStepIndex = 0
      wrapper.vm.executionStatus = 'IN_PROGRESS'
      wrapper.vm.newComment = 'Novo comentário @Test User'

      await wrapper.vm.addComment()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(executionService.executionService.addStepComment).toHaveBeenCalled()
      // Verificar se a notificação de menção foi chamada
      const mentionNotify = mockNotifyCreate.mock.calls.find(call => call[0]?.type === 'info' && call[0]?.message?.includes('será notificado'))
      expect(mentionNotify).toBeDefined()
    })

    it('deve tratar erro ao adicionar comentário (linhas 1268-1284)', async () => {
      const mockNotifyCreate = vi.fn()
      const quasar = await import('quasar')
      vi.mocked(quasar.Notify.create).mockImplementation(mockNotifyCreate)
      
      const axiosError = Object.assign(new Error('Erro ao adicionar comentário'), {
        response: {
          data: {
            message: 'Erro específico do servidor'
          }
        }
      })
      vi.mocked(executionService.executionService.addStepComment).mockRejectedValueOnce(axiosError)
      wrapper.vm.scenario = { ...mockScenario, status: 'CREATED' } as any
      wrapper.vm.steps = [
        { id: 1, action: 'Ação 1', expected: 'Resultado esperado 1', order: 1, status: 'PENDING', actualResult: '', comments: [], attachments: [] },
      ]
      wrapper.vm.currentStepIndex = 0
      wrapper.vm.executionStatus = 'IN_PROGRESS'
      wrapper.vm.newComment = 'Novo comentário'

      await wrapper.vm.addComment()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      const errorNotify = mockNotifyCreate.mock.calls.find(call => call[0]?.type === 'negative' && call[0]?.message?.includes('Erro ao adicionar comentário'))
      expect(errorNotify).toBeDefined()
    })
  })

  describe('Criação de bugs', () => {
    beforeEach(async () => {
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      vi.mocked(executionService.executionService.getBugs).mockResolvedValueOnce(mockBugs)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)
      vi.mocked(executionService.executionService.getStepComments).mockResolvedValueOnce(mockComments)
      vi.mocked(executionService.executionService.getStepAttachments).mockResolvedValueOnce(mockAttachments)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve criar bug com sucesso', async () => {
      vi.mocked(executionService.executionService.createBug).mockResolvedValueOnce({ id: 1, title: 'Bug', severity: 'MEDIUM' } as any)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)
      wrapper.vm.bugForm = {
        title: 'Bug de teste',
        description: 'Descrição do bug',
        severity: 'HIGH',
        relatedStep: null,
        attachments: [],
      }

      await wrapper.vm.createBug()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(executionService.executionService.createBug).toHaveBeenCalled()
      expect(mockNotifyFn).toHaveBeenCalled()
    })

    it('deve fazer upload de anexos ao criar bug (linhas 1325-1330)', async () => {
      const mockFile1 = new File(['content1'], 'file1.pdf', { type: 'application/pdf' })
      const mockFile2 = new File(['content2'], 'file2.jpg', { type: 'image/jpeg' })
      vi.mocked(executionService.executionService.createBug).mockResolvedValueOnce({ id: 1, title: 'Bug', severity: 'MEDIUM' } as any)
      vi.mocked(executionService.executionService.uploadBugAttachment).mockResolvedValueOnce(undefined as any)
      vi.mocked(executionService.executionService.uploadBugAttachment).mockResolvedValueOnce(undefined as any)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)
      wrapper.vm.bugForm = {
        title: 'Bug de teste',
        description: 'Descrição do bug',
        severity: 'HIGH',
        relatedStep: null,
        attachments: [mockFile1, mockFile2],
      }

      await wrapper.vm.createBug()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(executionService.executionService.uploadBugAttachment).toHaveBeenCalledTimes(2)
      expect(executionService.executionService.uploadBugAttachment).toHaveBeenCalledWith(1, mockFile1)
      expect(executionService.executionService.uploadBugAttachment).toHaveBeenCalledWith(1, mockFile2)
    })

    it('deve tratar erro ao criar bug com erro axios (linhas 1353-1368, linha 1364)', async () => {
      const mockNotifyCreate = vi.fn()
      const quasar = await import('quasar')
      vi.mocked(quasar.Notify.create).mockImplementation(mockNotifyCreate)
      
      const axiosError = Object.assign(new Error('Erro ao criar bug'), {
        response: {
          data: {
            message: 'Erro específico do servidor'
          }
        }
      })
      vi.mocked(executionService.executionService.createBug).mockRejectedValueOnce(axiosError)
      wrapper.vm.bugForm = {
        title: 'Bug de teste',
        description: 'Descrição do bug',
        severity: 'HIGH',
        relatedStep: null,
        attachments: [],
      }

      await wrapper.vm.createBug()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      const errorNotify = mockNotifyCreate.mock.calls.find(call => call[0]?.type === 'negative' && call[0]?.message?.includes('Erro ao criar bug'))
      expect(errorNotify).toBeDefined()
      expect(errorNotify?.[0]?.message).toContain('Erro específico do servidor')
    })

    it('deve tratar erro ao criar bug com erro não-axios (linha 1364)', async () => {
      const mockNotifyCreate = vi.fn()
      const quasar = await import('quasar')
      vi.mocked(quasar.Notify.create).mockImplementation(mockNotifyCreate)
      
      const error = new Error('Erro genérico')
      vi.mocked(executionService.executionService.createBug).mockRejectedValueOnce(error)
      wrapper.vm.bugForm = {
        title: 'Bug de teste',
        description: 'Descrição do bug',
        severity: 'HIGH',
        relatedStep: null,
        attachments: [],
      }

      await wrapper.vm.createBug()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      const errorNotify = mockNotifyCreate.mock.calls.find(call => call[0]?.type === 'negative' && call[0]?.message?.includes('Erro ao criar bug'))
      expect(errorNotify).toBeDefined()
      expect(errorNotify?.[0]?.message).toContain('Erro genérico')
    })

    it('deve tratar erro ao criar bug com erro desconhecido (linhas 1353-1368)', async () => {
      vi.mocked(executionService.executionService.createBug).mockRejectedValueOnce({ message: 'Erro desconhecido' })
      wrapper.vm.bugForm = {
        title: 'Bug de teste',
        description: 'Descrição do bug',
        severity: 'HIGH',
        relatedStep: null,
        attachments: [],
      }

      await wrapper.vm.createBug()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotifyFn).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao criar bug: Erro desconhecido'
      })
    })

    it('deve validar título obrigatório', async () => {
      wrapper.vm.bugForm = {
        title: '',
        description: '',
        severity: 'MEDIUM',
        relatedStep: null,
        attachments: [],
      }

      await wrapper.vm.createBug()
      await wrapper.vm.$nextTick()

      expect(mockNotifyFn).toHaveBeenCalled()
    })
  })

  describe('Gerenciamento de anexos', () => {
    beforeEach(async () => {
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      vi.mocked(executionService.executionService.getBugs).mockResolvedValueOnce(mockBugs)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)
      vi.mocked(executionService.executionService.getStepComments).mockResolvedValueOnce(mockComments)
      vi.mocked(executionService.executionService.getStepAttachments).mockResolvedValueOnce(mockAttachments)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve visualizar anexo (linhas 1374-1377)', () => {
      const mockWindowOpen = vi.fn()
      global.window.open = mockWindowOpen
      const attachment = { id: 1, url: 'https://example.com/file.pdf', filename: 'file.pdf' } as any

      wrapper.vm.viewAttachment(attachment)

      expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/file.pdf', '_blank')
    })

    it('deve baixar anexo (linhas 1379-1384)', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
      const attachment = { id: 1, url: 'https://example.com/file.pdf', filename: 'file.pdf' } as any

      wrapper.vm.downloadAttachment(attachment)

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.href).toBe('https://example.com/file.pdf')
      expect(mockLink.download).toBe('file.pdf')
      expect(mockLink.click).toHaveBeenCalled()

      createElementSpy.mockRestore()
    })

    it('deve excluir anexo com sucesso (linhas 1386-1409)', async () => {
      const stepWithAttachments = { id: 1, attachments: [{ id: 1, filename: 'test.pdf' }], action: 'Test', expected: 'Result', order: 1, status: 'PENDING' } as any
      wrapper.vm.steps = [stepWithAttachments]
      wrapper.vm.currentStepIndex = 0
      wrapper.vm.scenario = mockScenario as any
      vi.mocked(executionService.executionService.deleteStepAttachment).mockResolvedValueOnce(undefined as any)
      vi.mocked(executionService.executionService.getStepAttachments).mockResolvedValueOnce([])

      await wrapper.vm.deleteAttachment(1)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(executionService.executionService.deleteStepAttachment).toHaveBeenCalledWith(1, 1)
      expect(executionService.executionService.getStepAttachments).toHaveBeenCalledWith(1)
      expect(mockNotifyFn).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Evidência removida'
      })
    })

    it('deve tratar erro ao excluir anexo com erro axios (linhas 1410-1426)', async () => {
      const stepWithAttachments = { id: 1, attachments: [{ id: 1, filename: 'test.pdf' }], action: 'Test', expected: 'Result', order: 1, status: 'PENDING' } as any
      wrapper.vm.steps = [stepWithAttachments]
      wrapper.vm.currentStepIndex = 0
      wrapper.vm.scenario = mockScenario as any
      const axiosError = Object.assign(new Error('Erro ao excluir'), {
        response: {
          data: {
            message: 'Erro específico do servidor'
          }
        }
      })
      vi.mocked(executionService.executionService.deleteStepAttachment).mockRejectedValueOnce(axiosError)

      await wrapper.vm.deleteAttachment(1)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotifyFn).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro específico do servidor'
      })
    })

    it('deve tratar erro ao excluir anexo com erro não-axios (linhas 1410-1426)', async () => {
      const stepWithAttachments = { id: 1, attachments: [{ id: 1, filename: 'test.pdf' }], action: 'Test', expected: 'Result', order: 1, status: 'PENDING' } as any
      wrapper.vm.steps = [stepWithAttachments]
      wrapper.vm.currentStepIndex = 0
      wrapper.vm.scenario = mockScenario as any
      vi.mocked(executionService.executionService.deleteStepAttachment).mockRejectedValueOnce(new Error('Erro genérico'))

      await wrapper.vm.deleteAttachment(1)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotifyFn).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao excluir evidência'
      })
    })

    it('deve não excluir anexo se currentStep não existe (linha 1387)', async () => {
      wrapper.vm.steps = []
      wrapper.vm.currentStepIndex = 0

      await wrapper.vm.deleteAttachment(1)
      await wrapper.vm.$nextTick()

      expect(executionService.executionService.deleteStepAttachment).not.toHaveBeenCalled()
    })
  })

  describe('Funções auxiliares', () => {
    beforeEach(async () => {
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      vi.mocked(executionService.executionService.getBugs).mockResolvedValueOnce(mockBugs)
      vi.mocked(executionService.executionService.getHistory).mockResolvedValueOnce(mockHistory)
      vi.mocked(executionService.executionService.getStepComments).mockResolvedValueOnce(mockComments)
      vi.mocked(executionService.executionService.getStepAttachments).mockResolvedValueOnce(mockAttachments)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve retornar cor de status corretamente', () => {
      expect(wrapper.vm.getStatusColor('NOT_STARTED')).toBe('grey')
      expect(wrapper.vm.getStatusColor('IN_PROGRESS')).toBe('blue')
      expect(wrapper.vm.getStatusColor('COMPLETED')).toBe('positive')
      expect(wrapper.vm.getStatusColor('FAILED')).toBe('negative')
    })

    it('deve retornar label de status corretamente', () => {
      expect(wrapper.vm.getStatusLabel('NOT_STARTED')).toBe('Não Iniciado')
      expect(wrapper.vm.getStatusLabel('IN_PROGRESS')).toBe('Em Execução')
      expect(wrapper.vm.getStatusLabel('COMPLETED')).toBe('Concluído')
      expect(wrapper.vm.getStatusLabel('FAILED')).toBe('Falha')
    })

    it('deve verificar se é imagem (linhas 1461-1463)', () => {
      expect(wrapper.vm.isImage('image/png')).toBe(true)
      expect(wrapper.vm.isImage('image/jpeg')).toBe(true)
      expect(wrapper.vm.isImage('application/pdf')).toBe(false)
      expect(wrapper.vm.isImage('text/plain')).toBe(false)
    })

    it('deve retornar ícone de arquivo corretamente (linhas 1465-1468)', () => {
      expect(wrapper.vm.getFileIcon('application/pdf')).toBe('picture_as_pdf')
      expect(wrapper.vm.getFileIcon('image/png')).toBe('insert_drive_file')
      expect(wrapper.vm.getFileIcon('text/plain')).toBe('insert_drive_file')
    })

    it('deve gerar iniciais corretamente', () => {
      expect(wrapper.vm.getInitials('João Silva')).toBe('JS')
      expect(wrapper.vm.getInitials('Maria')).toBe('M')
      expect(wrapper.vm.getInitials(undefined)).toBe('?')
    })

    it('deve formatar data corretamente', () => {
      const date = '2024-01-01T00:00:00Z'
      const formatted = wrapper.vm.formatDate(date)
      expect(formatted).toBeTruthy()
    })
  })
})

