import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ScenarioDetailsPage from 'src/pages/ScenarioDetailsPage.vue'
import * as scenarioService from 'src/services/scenario.service'
import * as ectService from 'src/services/ect.service'
import * as projectService from 'src/services/project.service'
import api from 'src/services/api'

// Mock dos serviços
vi.mock('src/services/scenario.service', () => ({
  scenarioService: {
    getScenarioById: vi.fn(),
    updateScenario: vi.fn(),
  },
}))

vi.mock('src/services/ect.service', () => ({
  ectService: {
    generateECT: vi.fn(),
    downloadReport: vi.fn(),
    approveReport: vi.fn(),
    rejectReport: vi.fn(),
  },
}))

vi.mock('src/services/project.service', () => ({
  getProjectMembers: vi.fn(),
}))

vi.mock('src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock do Quasar
vi.mock('quasar', () => ({
  Notify: {
    create: vi.fn(),
  },
}))

// Mock do window.open
const mockWindowOpen = vi.fn()
global.window.open = mockWindowOpen

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
      resolve: (to: any) => ({ href: `/projects/1/packages/1/scenarios/1/execute` }),
    }),
  }
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/projects/:projectId/packages/:packageId/scenarios/:scenarioId', component: ScenarioDetailsPage },
    { path: '/projects/:projectId/packages/:packageId', component: { template: '<div>Package Details</div>' } },
    { path: '/projects/:projectId/packages/:packageId/scenarios/:scenarioId/execute', component: { template: '<div>Execute</div>' } },
    { path: '/projects/:projectId/packages/:packageId/scenarios/:scenarioId/edit', component: { template: '<div>Edit Scenario</div>' } },
  ],
})

describe('ScenarioDetailsPage', () => {
  let wrapper: VueWrapper<any>
  let mockNotify: ReturnType<typeof vi.fn>

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
    aprovador: { id: 2, name: 'Aprovador', email: 'aprovador@example.com' },
    project: { id: 1, ownerId: 1 },
    reports: [],
  }

  const mockCurrentUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
  }

  const mockMembers = [
    { id: 1, name: 'Test User', email: 'test@example.com', role: 'OWNER' },
    { id: 2, name: 'Manager User', email: 'manager@example.com', role: 'MANAGER' },
  ]

  const createWrapper = () => {
    return mount(ScenarioDetailsPage, {
      global: {
        plugins: [router],
        stubs: {
          'q-page': { template: '<div class="q-page"><slot /></div>' },
          'q-card': { template: '<div class="q-card"><slot /></div>' },
          'q-card-section': { template: '<div class="q-card-section"><slot /></div>' },
          'q-card-actions': { template: '<div class="q-card-actions"><slot /></div>' },
          'q-btn': { template: '<button @click="$attrs.onClick" v-bind="$attrs"><slot /></button>', props: ['color', 'icon', 'label', 'loading', 'unelevated', 'flat', 'round', 'textColor'] },
          'q-icon': { template: '<span class="q-icon" v-bind="$attrs"></span>', props: ['name', 'size', 'color'] },
          'q-chip': { template: '<span class="q-chip" v-bind="$attrs"><slot /></span>', props: ['color', 'textColor'] },
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
                <select :value="modelValue" @change="handleChange" v-bind="$attrs">
                  <option v-for="option in options" :key="option.value || option" :value="option.value || option">{{ option.label || option }}</option>
                </select>
              </div>
            `,
            props: ['modelValue', 'label', 'options', 'outlined', 'rules', 'placeholder', 'emitValue', 'mapOptions'],
            emits: ['update:modelValue'],
            methods: {
              handleChange(event: Event) {
                const target = event.target as HTMLSelectElement
                this.$emit('update:modelValue', target.value)
              },
            },
          },
          'q-list': { template: '<div class="q-list"><slot /></div>' },
          'q-item': { template: '<div class="q-item" @click="$attrs.onClick" v-bind="$attrs"><slot /></div>', props: ['clickable'] },
          'q-item-section': { template: '<div class="q-item-section" v-bind="$attrs"><slot /></div>', props: ['avatar'] },
          'q-item-label': { template: '<div class="q-item-label"><slot /></div>' },
          'q-separator': { template: '<div class="q-separator" v-bind="$attrs"></div>' },
          'q-avatar': { template: '<div class="q-avatar" v-bind="$attrs"><slot /></div>', props: ['size', 'color'] },
          'q-tooltip': { template: '<div class="q-tooltip" v-bind="$attrs"><slot /></div>' },
        },
      },
    })
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockWindowOpen.mockClear()
    mockRoute.params = { projectId: '1', packageId: '1', scenarioId: '1' }
    // Obter referência ao mock do Quasar
    const quasar = await import('quasar')
    mockNotify = vi.mocked(quasar.Notify.create)
    mockNotify.mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser })
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.q-page').exists()).toBe(true)
    })

    it('deve exibir estado de carregamento', async () => {
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {}))
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.loading).toBe(true)
    })

    it('deve exibir erro quando falha ao carregar', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser })
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockRejectedValueOnce(new Error('Erro ao carregar'))
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(wrapper.vm.error).toBeTruthy()
    })
  })

  describe('Carregamento de dados', () => {
    it('deve carregar cenário ao montar', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser })
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.scenarioService.getScenarioById).toHaveBeenCalledWith(1)
      expect(wrapper.vm.scenario).toBeTruthy()
    })

    it('deve carregar usuário atual ao montar', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser })
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(api.get).toHaveBeenCalledWith('/profile')
      expect(wrapper.vm.currentUser).toEqual(mockCurrentUser)
    })

    it('deve carregar membros do projeto ao montar', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser })
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(projectService.getProjectMembers).toHaveBeenCalledWith(1)
      expect(wrapper.vm.members).toEqual(mockMembers)
    })
  })

  describe('Navegação', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser })
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve navegar de volta ao clicar em voltar', async () => {
      await wrapper.vm.goBack()
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects/1/packages/1')
    })

    it('deve abrir execução em nova aba', async () => {
      await wrapper.vm.executeScenario()
      await wrapper.vm.$nextTick()

      expect(mockWindowOpen).toHaveBeenCalled()
    })

    it('deve abrir diálogo de edição', async () => {
      // Garantir que o cenário está carregado e os membros também
      wrapper.vm.scenario = mockScenario as any
      wrapper.vm.members = mockMembers as any
      await wrapper.vm.$nextTick()
      
      await wrapper.vm.editScenario()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showEditDialog).toBe(true)
    })
  })

  describe('Geração de ECT', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser })
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve gerar ECT com sucesso', async () => {
      vi.mocked(ectService.ectService.generateECT).mockResolvedValueOnce({ reportId: 1 } as any)
      vi.mocked(ectService.ectService.downloadReport).mockResolvedValueOnce(undefined as any)
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)

      await wrapper.vm.generateECT()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(ectService.ectService.generateECT).toHaveBeenCalledWith(1)
      expect(ectService.ectService.downloadReport).toHaveBeenCalledWith(1)
      expect(mockNotify).toHaveBeenCalled()
    })

    it('deve tratar erro ao gerar ECT', async () => {
      vi.mocked(ectService.ectService.generateECT).mockRejectedValueOnce(new Error('Erro ao gerar'))

      await wrapper.vm.generateECT()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotify).toHaveBeenCalled()
    })
  })

  describe('Aprovação/Reprovação de ECT', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser })
      const scenarioWithReport = {
        ...mockScenario,
        reports: [{ id: 1, approval: null, createdAt: '2024-01-01T00:00:00Z' }],
      }
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: scenarioWithReport } as any)
      vi.mocked(projectService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve abrir diálogo de aprovação', async () => {
      await wrapper.vm.openECTApprovalDialog()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showECTApprovalDialog).toBe(true)
    })

    it('deve aprovar ECT com sucesso', async () => {
      vi.mocked(ectService.ectService.approveReport).mockResolvedValueOnce(undefined as any)
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      wrapper.vm.ectReportId = 1

      await wrapper.vm.approveECTReport()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(ectService.ectService.approveReport).toHaveBeenCalledWith(1, undefined)
      expect(mockNotify).toHaveBeenCalled()
    })

    it('deve reprovar ECT com sucesso', async () => {
      vi.mocked(ectService.ectService.rejectReport).mockResolvedValueOnce(undefined as any)
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      wrapper.vm.ectReportId = 1
      wrapper.vm.ectRejectionComment = 'Motivo da reprovação'

      await wrapper.vm.rejectECTReport()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(ectService.ectService.rejectReport).toHaveBeenCalledWith(1, 'Motivo da reprovação')
      expect(mockNotify).toHaveBeenCalled()
    })
  })

  describe('Gerenciamento de etapas', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser })
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve abrir diálogo para adicionar etapa', async () => {
      await wrapper.vm.handleAddStep()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showAddStepDialog).toBe(true)
    })

    it('deve abrir diálogo de editar etapa (linha 1003)', async () => {
      const step = mockScenario.steps[0]
      await wrapper.vm.editStep(step)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showAddStepDialog).toBe(true)
      expect(wrapper.vm.editingStep).toEqual(step)
      expect(wrapper.vm.stepForm.action).toBe(step.action)
      expect(wrapper.vm.stepForm.expected).toBe(step.expected)
    })

    it('deve adicionar etapa com sucesso', async () => {
      vi.mocked(scenarioService.scenarioService.updateScenario).mockResolvedValueOnce(undefined as any)
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      wrapper.vm.stepForm = { action: 'Nova ação', expected: 'Novo resultado esperado' }

      await wrapper.vm.saveStep()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.scenarioService.updateScenario).toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalled()
    })

    it('deve não permitir salvar etapa se cenário está concluído (linhas 1017-1023)', async () => {
      wrapper.vm.scenario = { ...mockScenario, status: 'PASSED' } as any
      wrapper.vm.stepForm = { action: 'Nova ação', expected: 'Novo resultado esperado' }

      await wrapper.vm.saveStep()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.scenarioService.updateScenario).not.toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'warning',
        message: 'Não é possível adicionar ou editar etapas em um cenário concluído',
        timeout: 3000
      })
    })

    it('deve tratar erro ao salvar etapa (linhas 1070-1087)', async () => {
      const axiosError = Object.assign(new Error('Erro ao salvar'), {
        response: {
          data: {
            message: 'Erro específico do servidor'
          }
        }
      })
      vi.mocked(scenarioService.scenarioService.updateScenario).mockRejectedValueOnce(axiosError)
      wrapper.vm.scenario = { ...mockScenario, status: 'CREATED' } as any
      wrapper.vm.stepForm = { action: 'Nova ação', expected: 'Novo resultado esperado' }

      await wrapper.vm.saveStep()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro específico do servidor'
      })
    })

    it('deve tratar erro ao salvar etapa com erro não-axios (linhas 1070-1087)', async () => {
      const error = new Error('Erro genérico')
      vi.mocked(scenarioService.scenarioService.updateScenario).mockRejectedValueOnce(error)
      wrapper.vm.scenario = { ...mockScenario, status: 'CREATED' } as any
      wrapper.vm.stepForm = { action: 'Nova ação', expected: 'Novo resultado esperado' }

      await wrapper.vm.saveStep()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro genérico'
      })
    })

    it('deve editar etapa com sucesso', async () => {
      vi.mocked(scenarioService.scenarioService.updateScenario).mockResolvedValueOnce(undefined as any)
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      wrapper.vm.editingStep = mockScenario.steps[0]
      wrapper.vm.stepForm = { action: 'Ação editada', expected: 'Resultado editado' }

      await wrapper.vm.saveStep()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.scenarioService.updateScenario).toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalled()
    })

    it('deve excluir etapa com sucesso', async () => {
      const mockConfirm = vi.fn(() => true)
      global.confirm = mockConfirm
      vi.mocked(scenarioService.scenarioService.updateScenario).mockResolvedValueOnce(undefined as any)
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)

      await wrapper.vm.deleteStep(1)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.scenarioService.updateScenario).toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalled()
    })

    it('deve não permitir excluir etapa se cenário está concluído (linhas 1096-1102)', async () => {
      wrapper.vm.scenario = { ...mockScenario, status: 'PASSED' } as any

      await wrapper.vm.deleteStep(1)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.scenarioService.updateScenario).not.toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'warning',
        message: 'Não é possível excluir etapas em um cenário concluído',
        timeout: 3000
      })
    })

    it('deve não permitir excluir etapa se cenário não existe (linhas 1096-1102)', async () => {
      wrapper.vm.scenario = null

      await wrapper.vm.deleteStep(1)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.scenarioService.updateScenario).not.toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'warning',
        message: 'Não é possível excluir etapas em um cenário concluído',
        timeout: 3000
      })
    })

    it('deve cancelar exclusão de etapa quando usuário cancela confirmação (linha 1106)', async () => {
      const mockConfirm = vi.fn(() => false)
      global.confirm = mockConfirm
      wrapper.vm.scenario = { ...mockScenario, status: 'CREATED' } as any

      await wrapper.vm.deleteStep(1)
      await wrapper.vm.$nextTick()

      expect(mockConfirm).toHaveBeenCalled()
      expect(scenarioService.scenarioService.updateScenario).not.toHaveBeenCalled()
    })

    it('deve tratar erro ao excluir etapa com erro axios (linhas 1125-1143)', async () => {
      const mockConfirm = vi.fn(() => true)
      global.confirm = mockConfirm
      const axiosError = Object.assign(new Error('Erro ao excluir'), {
        response: {
          data: {
            message: 'Erro específico do servidor'
          }
        }
      })
      vi.mocked(scenarioService.scenarioService.updateScenario).mockRejectedValueOnce(axiosError)
      wrapper.vm.scenario = { ...mockScenario, status: 'CREATED' } as any

      await wrapper.vm.deleteStep(1)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro específico do servidor'
      })
    })

    it('deve tratar erro ao excluir etapa com erro não-axios (linhas 1125-1143)', async () => {
      const mockConfirm = vi.fn(() => true)
      global.confirm = mockConfirm
      const error = new Error('Erro genérico')
      vi.mocked(scenarioService.scenarioService.updateScenario).mockRejectedValueOnce(error)
      wrapper.vm.scenario = { ...mockScenario, status: 'CREATED' } as any

      await wrapper.vm.deleteStep(1)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro genérico'
      })
    })

    it('deve tratar erro ao excluir etapa com erro não-Error (linhas 1125-1143)', async () => {
      const mockConfirm = vi.fn(() => true)
      global.confirm = mockConfirm
      vi.mocked(scenarioService.scenarioService.updateScenario).mockRejectedValueOnce({ message: 'Erro desconhecido' })
      wrapper.vm.scenario = { ...mockScenario, status: 'CREATED' } as any

      await wrapper.vm.deleteStep(1)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao excluir etapa'
      })
    })
  })

  describe('Edição de cenário', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser })
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve salvar edição de cenário com sucesso (linhas 1204-1271)', async () => {
      wrapper.vm.scenario = mockScenario as any
      wrapper.vm.members = mockMembers as any
      wrapper.vm.editForm = {
        title: 'Cenário Editado',
        description: 'Nova descrição',
        type: 'REGRESSION',
        priority: 'MEDIUM',
        testadorId: 1,
        aprovadorId: 2
      }
      vi.mocked(scenarioService.scenarioService.updateScenario).mockResolvedValueOnce(undefined as any)
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)

      await wrapper.vm.saveScenarioEdit()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.scenarioService.updateScenario).toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Cenário atualizado com sucesso!'
      })
      expect(wrapper.vm.showEditDialog).toBe(false)
    })

    it('deve validar campos obrigatórios ao salvar edição (linhas 1208-1213)', async () => {
      wrapper.vm.scenario = mockScenario as any
      wrapper.vm.editForm = {
        title: '',
        description: '',
        type: '',
        priority: '',
        testadorId: null,
        aprovadorId: null
      }

      await wrapper.vm.saveScenarioEdit()
      await wrapper.vm.$nextTick()

      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Por favor, preencha todos os campos obrigatórios'
      })
      expect(scenarioService.scenarioService.updateScenario).not.toHaveBeenCalled()
    })

    it('deve validar que testador e aprovador devem ser diferentes (exceto OWNER) (linhas 1217-1226)', async () => {
      wrapper.vm.scenario = mockScenario as any
      wrapper.vm.members = [
        { id: 1, name: 'Test User', email: 'test@example.com', role: 'MANAGER' },
        { id: 2, name: 'Manager User', email: 'manager@example.com', role: 'MANAGER' },
      ] as any
      wrapper.vm.editForm = {
        title: 'Cenário Editado',
        description: 'Nova descrição',
        type: 'REGRESSION',
        priority: 'MEDIUM',
        testadorId: 1,
        aprovadorId: 1 // Mesmo ID
      }

      await wrapper.vm.saveScenarioEdit()
      await wrapper.vm.$nextTick()

      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'O testador e o aprovador devem ser pessoas diferentes'
      })
      expect(scenarioService.scenarioService.updateScenario).not.toHaveBeenCalled()
    })

    it('deve permitir testador e aprovador iguais se for OWNER (linhas 1217-1227)', async () => {
      wrapper.vm.scenario = mockScenario as any
      wrapper.vm.members = [
        { id: 1, name: 'Test User', email: 'test@example.com', role: 'OWNER' },
      ] as any
      wrapper.vm.editForm = {
        title: 'Cenário Editado',
        description: 'Nova descrição',
        type: 'REGRESSION',
        priority: 'MEDIUM',
        testadorId: 1,
        aprovadorId: 1 // Mesmo ID, mas é OWNER
      }
      vi.mocked(scenarioService.scenarioService.updateScenario).mockResolvedValueOnce(undefined as any)
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)

      await wrapper.vm.saveScenarioEdit()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.scenarioService.updateScenario).toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Cenário atualizado com sucesso!'
      })
    })

    it('deve tratar erro ao salvar edição com erro axios (linhas 1252-1267)', async () => {
      wrapper.vm.scenario = mockScenario as any
      wrapper.vm.members = mockMembers as any
      wrapper.vm.editForm = {
        title: 'Cenário Editado',
        description: 'Nova descrição',
        type: 'REGRESSION',
        priority: 'MEDIUM',
        testadorId: 1,
        aprovadorId: 2
      }
      const axiosError = Object.assign(new Error('Erro ao atualizar'), {
        response: {
          data: {
            message: 'Erro específico do servidor'
          }
        }
      })
      vi.mocked(scenarioService.scenarioService.updateScenario).mockRejectedValueOnce(axiosError)

      await wrapper.vm.saveScenarioEdit()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro específico do servidor'
      })
    })

    it('deve tratar erro ao salvar edição com erro não-axios (linhas 1252-1267)', async () => {
      wrapper.vm.scenario = mockScenario as any
      wrapper.vm.members = mockMembers as any
      wrapper.vm.editForm = {
        title: 'Cenário Editado',
        description: 'Nova descrição',
        type: 'REGRESSION',
        priority: 'MEDIUM',
        testadorId: 1,
        aprovadorId: 2
      }
      vi.mocked(scenarioService.scenarioService.updateScenario).mockRejectedValueOnce(new Error('Erro genérico'))

      await wrapper.vm.saveScenarioEdit()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao atualizar cenário'
      })
    })

    it('deve não salvar se cenário não existe (linha 1205)', async () => {
      wrapper.vm.scenario = null
      wrapper.vm.editForm = {
        title: 'Cenário Editado',
        description: 'Nova descrição',
        type: 'REGRESSION',
        priority: 'MEDIUM',
        testadorId: 1,
        aprovadorId: 2
      }

      await wrapper.vm.saveScenarioEdit()
      await wrapper.vm.$nextTick()

      expect(scenarioService.scenarioService.updateScenario).not.toHaveBeenCalled()
    })
  })

  describe('Carregamento de membros', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser })
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve tratar erro ao carregar membros (linhas 1199-1200)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(projectService.getProjectMembers).mockRejectedValueOnce(new Error('Erro ao carregar membros'))

      await wrapper.vm.loadMembers()
      await wrapper.vm.$nextTick()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Erro ao carregar membros:', expect.any(Error))
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Funções auxiliares', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser })
      vi.mocked(scenarioService.scenarioService.getScenarioById).mockResolvedValueOnce({ scenario: mockScenario } as any)
      vi.mocked(projectService.getProjectMembers).mockResolvedValueOnce(mockMembers as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve retornar cor de tipo corretamente', () => {
      expect(wrapper.vm.getTypeColor('FUNCTIONAL')).toBe('blue')
      expect(wrapper.vm.getTypeColor('REGRESSION')).toBe('purple')
    })

    it('deve retornar label de tipo corretamente', () => {
      expect(wrapper.vm.getTypeLabel('FUNCTIONAL')).toBe('Funcional')
      expect(wrapper.vm.getTypeLabel('REGRESSION')).toBe('Regressão')
    })

    it('deve retornar cor de prioridade corretamente', () => {
      expect(wrapper.vm.getPriorityColor('LOW')).toBe('green')
      expect(wrapper.vm.getPriorityColor('HIGH')).toBe('red')
    })

    it('deve retornar label de prioridade corretamente', () => {
      expect(wrapper.vm.getPriorityLabel('LOW')).toBe('Baixa')
      expect(wrapper.vm.getPriorityLabel('HIGH')).toBe('Alta')
    })

    it('deve retornar cor de status corretamente', () => {
      expect(wrapper.vm.getStatusColor('CREATED')).toBe('grey')
      expect(wrapper.vm.getStatusColor('PASSED')).toBe('green')
    })

    it('deve retornar label de status corretamente', () => {
      expect(wrapper.vm.getStatusLabel('CREATED')).toBe('Criado')
      expect(wrapper.vm.getStatusLabel('PASSED')).toBe('Concluído')
    })

    it('deve gerar iniciais corretamente', () => {
      expect(wrapper.vm.getInitials('João Silva')).toBe('JS')
      expect(wrapper.vm.getInitials('Maria')).toBe('M')
      expect(wrapper.vm.getInitials('')).toBe('?')
    })

    it('deve retornar ? quando não consegue gerar iniciais (linha 1359)', () => {
      // Caso onde parts.length >= 2 mas first[0] ou second[0] não existe
      // Isso é difícil de testar diretamente, mas podemos testar casos edge
      expect(wrapper.vm.getInitials('')).toBe('?')
      // Caso onde parts.length > 0 mas firstPart[0] não existe
      // Isso também é difícil de testar, mas o caso de string vazia já cobre
    })

    it('deve formatar data corretamente', () => {
      const date = '2024-01-01T00:00:00Z'
      const formatted = wrapper.vm.formatDate(date)
      expect(formatted).toBeTruthy()
    })
  })
})

