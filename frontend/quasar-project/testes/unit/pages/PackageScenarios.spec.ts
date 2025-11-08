import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import PackageScenarios from 'src/pages/PackageScenarios.vue'
import * as scenarioService from 'src/services/scenario.service'
import * as projectDetailsService from 'src/services/project-details.service'
import { getInitials, getMemberColor } from 'src/utils/helpers'

// Mock dos serviços
vi.mock('src/services/scenario.service', () => ({
  scenarioService: {
    createScenario: vi.fn(),
  },
}))

vi.mock('src/services/project-details.service', () => ({
  getProjectMembers: vi.fn(),
}))

// Mock do Quasar
vi.mock('quasar', () => ({
  Notify: {
    create: vi.fn(),
  },
}))

// Mock do useRoute
const mockRoute = {
  params: { projectId: '1', packageId: '1' },
  query: {},
}

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRoute: () => mockRoute,
  }
})

// Criar router mock
const mockPush = vi.fn()
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/projects/:projectId/packages/:packageId/scenarios/create', name: 'package-scenarios', component: PackageScenarios },
    { path: '/projects/:projectId/packages/:packageId', name: 'package-details', component: { template: '<div>Package</div>' } },
  ],
})

router.push = mockPush

describe('PackageScenarios', () => {
  let wrapper: VueWrapper<any>
  let mockNotify: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockRoute.params = { projectId: '1', packageId: '1' }
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

  const createWrapper = () => {
    return mount(PackageScenarios, {
      global: {
        plugins: [router],
        stubs: {
          'q-page': {
            template: '<div class="q-page"><slot /></div>',
          },
          'q-btn': {
            template: '<button @click="$attrs.onClick" :type="type" :disabled="loading" class="q-btn" v-bind="$attrs"><slot>{{ label }}</slot></button>',
            props: ['type', 'label', 'color', 'loading', 'flat', 'round', 'icon', 'unelevated'],
          },
          'q-form': {
            template: '<form @submit.prevent="$attrs.onSubmit" class="q-form"><slot /></form>',
          },
          'q-input': {
            template: `
              <div class="q-input">
                <label v-if="label">{{ label }}</label>
                <input 
                  v-if="type !== 'textarea'"
                  :value="modelValue" 
                  @input="handleInput" 
                  :type="type"
                  v-bind="$attrs" 
                />
                <textarea 
                  v-else
                  :value="modelValue" 
                  @input="handleInput"
                  v-bind="$attrs"
                ></textarea>
                <slot name="prepend"></slot>
              </div>
            `,
            props: ['modelValue', 'label', 'type', 'filled', 'dark', 'labelColor', 'inputClass', 'rules', 'hint', 'placeholder', 'rows'],
            emits: ['update:modelValue'],
            methods: {
              handleInput(event: Event) {
                const target = event.target as HTMLInputElement | HTMLTextAreaElement
                this.$emit('update:modelValue', target.value)
              },
            },
          },
          'q-select': {
            template: `
              <div class="q-select">
                <label v-if="label">{{ label }}</label>
                <select 
                  :value="modelValue" 
                  @change="handleChange" 
                  v-bind="$attrs"
                >
                  <option v-for="option in options" :key="option.value || option" :value="option.value || option">
                    {{ option.label || option }}
                  </option>
                </select>
                <slot name="prepend"></slot>
              </div>
            `,
            props: ['modelValue', 'label', 'options', 'filled', 'dark', 'labelColor', 'rules', 'placeholder', 'emitValue', 'mapOptions'],
            emits: ['update:modelValue'],
            methods: {
              handleChange(event: Event) {
                const target = event.target as HTMLSelectElement
                this.$emit('update:modelValue', target.value)
              },
            },
          },
          'q-icon': {
            template: '<span class="q-icon" v-bind="$attrs"></span>',
            props: ['name', 'size', 'color'],
          },
          'q-dialog': {
            template: '<div v-if="modelValue" class="q-dialog"><slot /></div>',
            props: ['modelValue', 'persistent'],
            emits: ['update:modelValue'],
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
            props: ['class'],
          },
          'q-item': {
            template: '<div class="q-item"><slot /></div>',
          },
          'q-item-section': {
            template: '<div class="q-item-section"><slot /></div>',
            props: ['avatar'],
          },
          'q-item-label': {
            template: '<div class="q-item-label"><slot /></div>',
            props: ['caption'],
          },
          'q-avatar': {
            template: '<div class="q-avatar" v-bind="$attrs"><slot /></div>',
            props: ['color', 'textColor', 'size'],
          },
        },
      },
    })
  }

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', async () => {
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce([])
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.q-page').exists()).toBe(true)
    })

    it('deve exibir o título da página', async () => {
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce([])
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const title = wrapper.find('.page-title')
      expect(title.exists()).toBe(true)
      expect(title.text()).toContain('Cenários de Teste')
    })

    it('deve exibir o formulário de criação de cenário', async () => {
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce([])
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.scenario-form').exists()).toBe(true)
    })
  })

  describe('Carregamento de dados', () => {
    it('deve carregar membros do projeto ao montar', async () => {
      const members = [
        { id: 1, name: 'João Silva', email: 'joao@example.com', role: 'OWNER' },
        { id: 2, name: 'Maria Santos', email: 'maria@example.com', role: 'TESTER' },
      ]
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(members)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(projectDetailsService.getProjectMembers).toHaveBeenCalledWith(1)
      expect(wrapper.vm.members).toEqual(members)
    })

    it('deve pré-selecionar o OWNER como testador e aprovador', async () => {
      const members = [
        { id: 1, name: 'João Silva', email: 'joao@example.com', role: 'OWNER' },
        { id: 2, name: 'Maria Santos', email: 'maria@example.com', role: 'TESTER' },
      ]
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(members)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.scenarioForm.tester).toBe(1)
      expect(wrapper.vm.scenarioForm.approver).toBe(1)
    })

    it('deve tratar erro ao carregar membros', async () => {
      vi.mocked(projectDetailsService.getProjectMembers).mockRejectedValueOnce(new Error('Erro ao carregar'))
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao carregar membros do projeto',
      })
      expect(wrapper.vm.members).toEqual([])
    })
  })

  describe('Interação com formulário', () => {
    beforeEach(async () => {
      const members = [
        { id: 1, name: 'João Silva', email: 'joao@example.com', role: 'OWNER' },
        { id: 2, name: 'Maria Santos', email: 'maria@example.com', role: 'TESTER' },
        { id: 3, name: 'Pedro Costa', email: 'pedro@example.com', role: 'APPROVER' },
      ]
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(members)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('deve atualizar nome do cenário', async () => {
      wrapper.vm.scenarioForm.name = 'Novo Cenário'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.scenarioForm.name).toBe('Novo Cenário')
    })

    it('deve atualizar descrição do cenário', async () => {
      wrapper.vm.scenarioForm.description = 'Descrição do cenário'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.scenarioForm.description).toBe('Descrição do cenário')
    })

    it('deve atualizar testador', async () => {
      wrapper.vm.scenarioForm.tester = 2
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.scenarioForm.tester).toBe(2)
    })

    it('deve atualizar aprovador', async () => {
      wrapper.vm.scenarioForm.approver = 3
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.scenarioForm.approver).toBe(3)
    })

    it('deve atualizar tipo do cenário', async () => {
      wrapper.vm.scenarioForm.type = 'FUNCTIONAL'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.scenarioForm.type).toBe('FUNCTIONAL')
    })

    it('deve atualizar prioridade do cenário', async () => {
      wrapper.vm.scenarioForm.priority = 'HIGH'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.scenarioForm.priority).toBe('HIGH')
    })
  })

  describe('Validação', () => {
    beforeEach(async () => {
      const members = [
        { id: 1, name: 'João Silva', email: 'joao@example.com', role: 'OWNER' },
        { id: 2, name: 'Maria Santos', email: 'maria@example.com', role: 'TESTER' },
        { id: 3, name: 'Pedro Costa', email: 'pedro@example.com', role: 'APPROVER' },
      ]
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(members)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('deve validar campos obrigatórios', async () => {
      wrapper.vm.scenarioForm = {
        name: '',
        description: '',
        tester: null,
        approver: null,
        type: null,
        priority: null,
      }

      await wrapper.vm.createScenario()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showErrorDialog).toBe(true)
      expect(wrapper.vm.errorMessage).toBe('Por favor, preencha todos os campos obrigatórios')
    })

    it('deve validar que testador e aprovador são diferentes (exceto OWNER)', async () => {
      wrapper.vm.scenarioForm = {
        name: 'Cenário Teste',
        description: '',
        tester: 2,
        approver: 2,
        type: 'FUNCTIONAL',
        priority: 'HIGH',
      }

      await wrapper.vm.createScenario()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showErrorDialog).toBe(true)
      expect(wrapper.vm.errorMessage).toBe('O testador e o aprovador devem ser pessoas diferentes')
    })

    it('deve permitir testador e aprovador iguais se for OWNER', async () => {
      wrapper.vm.scenarioForm = {
        name: 'Cenário Teste',
        description: '',
        tester: 1,
        approver: 1,
        type: 'FUNCTIONAL',
        priority: 'HIGH',
      }

      vi.mocked(scenarioService.scenarioService.createScenario).mockResolvedValueOnce({} as any)
      await wrapper.vm.createScenario()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(scenarioService.scenarioService.createScenario).toHaveBeenCalled()
    })

    it('deve validar projectId inválido', async () => {
      mockRoute.params.projectId = 'invalid'
      wrapper.vm.scenarioForm = {
        name: 'Cenário Teste',
        description: '',
        tester: 1,
        approver: 1,
        type: 'FUNCTIONAL',
        priority: 'HIGH',
      }

      await wrapper.vm.createScenario()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showErrorDialog).toBe(true)
      expect(wrapper.vm.errorMessage).toBe('ID do projeto inválido')
    })
  })

  describe('Criação de cenário', () => {
    beforeEach(async () => {
      const members = [
        { id: 1, name: 'João Silva', email: 'joao@example.com', role: 'OWNER' },
        { id: 2, name: 'Maria Santos', email: 'maria@example.com', role: 'TESTER' },
        { id: 3, name: 'Pedro Costa', email: 'pedro@example.com', role: 'APPROVER' },
      ]
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(members)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      mockRoute.params.projectId = '1'
    })

    it('deve criar cenário com sucesso', async () => {
      wrapper.vm.scenarioForm = {
        name: 'Cenário Teste',
        description: 'Descrição do cenário',
        tester: 1,
        approver: 1,
        type: 'FUNCTIONAL',
        priority: 'HIGH',
      }

      vi.mocked(scenarioService.scenarioService.createScenario).mockResolvedValueOnce({} as any)
      await wrapper.vm.createScenario()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(scenarioService.scenarioService.createScenario).toHaveBeenCalledWith(1, {
        title: 'Cenário Teste',
        description: 'Descrição do cenário',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId: 1,
        testadorId: 1,
        aprovadorId: 1,
        tags: [],
        steps: [],
      })
      expect(wrapper.vm.showSuccessDialog).toBe(true)
    })

    it('deve limpar formulário após criar cenário', async () => {
      wrapper.vm.scenarioForm = {
        name: 'Cenário Teste',
        description: 'Descrição',
        tester: 1,
        approver: 1,
        type: 'FUNCTIONAL',
        priority: 'HIGH',
      }

      vi.mocked(scenarioService.scenarioService.createScenario).mockResolvedValueOnce({} as any)
      await wrapper.vm.createScenario()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.scenarioForm.name).toBe('')
      expect(wrapper.vm.scenarioForm.description).toBe('')
      expect(wrapper.vm.scenarioForm.tester).toBeNull()
      expect(wrapper.vm.scenarioForm.approver).toBeNull()
      expect(wrapper.vm.scenarioForm.type).toBeNull()
      expect(wrapper.vm.scenarioForm.priority).toBeNull()
    })

    it('deve redirecionar após criar cenário', async () => {
      wrapper.vm.scenarioForm = {
        name: 'Cenário Teste',
        description: '',
        tester: 1,
        approver: 1,
        type: 'FUNCTIONAL',
        priority: 'HIGH',
      }

      vi.mocked(scenarioService.scenarioService.createScenario).mockResolvedValueOnce({} as any)
      await wrapper.vm.createScenario()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 1600))

      expect(mockPush).toHaveBeenCalledWith('/projects/1/packages/1')
    })

    it('deve tratar erro ao criar cenário', async () => {
      wrapper.vm.scenarioForm = {
        name: 'Cenário Teste',
        description: '',
        tester: 1,
        approver: 1,
        type: 'FUNCTIONAL',
        priority: 'HIGH',
      }

      const error = new Error('Erro ao criar cenário')
      vi.mocked(scenarioService.scenarioService.createScenario).mockRejectedValueOnce(error)
      await wrapper.vm.createScenario()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showErrorDialog).toBe(true)
      expect(wrapper.vm.errorMessage).toBe('Erro ao criar cenário')
    })

    it('deve tratar erro genérico ao criar cenário', async () => {
      wrapper.vm.scenarioForm = {
        name: 'Cenário Teste',
        description: '',
        tester: 1,
        approver: 1,
        type: 'FUNCTIONAL',
        priority: 'HIGH',
      }

      vi.mocked(scenarioService.scenarioService.createScenario).mockRejectedValueOnce({})
      await wrapper.vm.createScenario()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showErrorDialog).toBe(true)
      expect(wrapper.vm.errorMessage).toBe('Erro inesperado ao criar cenário')
    })
  })

  describe('Navegação', () => {
    beforeEach(async () => {
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce([])
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
    })

    it('deve navegar de volta ao clicar em voltar', async () => {
      await wrapper.vm.goBack()
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects/1/packages/1')
    })
  })

  describe('Funções auxiliares', () => {
    beforeEach(async () => {
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce([])
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
    })

    it('deve gerar iniciais corretamente', () => {
      // getInitials agora é importado de utils/helpers
      expect(getInitials('João Silva')).toBe('JS')
      expect(getInitials('Maria')).toBe('MA')
      expect(getInitials('')).toBe('?')
    })

    it('deve retornar cor para membro', () => {
      // getMemberColor agora é importado de utils/helpers
      const color = getMemberColor(1)
      expect(['primary', 'secondary', 'accent', 'positive', 'info', 'warning', 'negative']).toContain(color)
    })
  })

  describe('Computed properties', () => {
    beforeEach(async () => {
      const members = [
        { id: 1, name: 'João Silva', email: 'joao@example.com', role: 'OWNER' },
        { id: 2, name: 'Maria Santos', email: 'maria@example.com', role: 'TESTER' },
        { id: 3, name: 'Pedro Costa', email: 'pedro@example.com', role: 'APPROVER' },
      ]
      vi.mocked(projectDetailsService.getProjectMembers).mockResolvedValueOnce(members)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('deve filtrar testadores corretamente', () => {
      const testerOptions = wrapper.vm.testerOptions
      const members = wrapper.vm.members
      expect(testerOptions.length).toBeGreaterThan(0)
      expect(testerOptions.every((opt: any) => ['OWNER', 'ADMIN', 'MANAGER', 'TESTER'].includes(
        members.find((m: any) => m.id === opt.value)?.role || ''
      ))).toBe(true)
    })

    it('deve filtrar aprovadores corretamente', () => {
      const approverOptions = wrapper.vm.approverOptions
      const members = wrapper.vm.members
      expect(approverOptions.length).toBeGreaterThan(0)
      expect(approverOptions.every((opt: any) => ['OWNER', 'ADMIN', 'MANAGER', 'APPROVER'].includes(
        members.find((m: any) => m.id === opt.value)?.role || ''
      ))).toBe(true)
    })

    it('deve calcular packageId corretamente', () => {
      expect(wrapper.vm.packageId).toBe(1)
    })
  })
})

