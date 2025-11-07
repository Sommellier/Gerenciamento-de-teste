import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import PackagesPage from 'src/pages/PackagesPage.vue'
import * as packageService from 'src/services/package.service'

// Mock dos serviços
vi.mock('src/services/package.service', () => ({
  getProjectPackages: vi.fn(),
  deletePackage: vi.fn(),
}))

// Mock do Quasar
const mockNotify = vi.fn()
const createMockDialog = () => ({
  onOk: vi.fn((callback) => {
    // Executar callback imediatamente para simular confirmação
    if (callback) callback()
    return { onCancel: vi.fn() }
  }),
  onCancel: vi.fn(),
})

const mockDialogFn = vi.fn(() => createMockDialog())

vi.mock('quasar', () => ({
  useQuasar: () => ({
    notify: mockNotify,
    dialog: mockDialogFn,
  }),
}))

// Mock do useRoute
const mockRoute = {
  params: { projectId: '1' },
  query: {},
}

const mockPush = vi.fn()

vi.mock('vue-router', async () => {
  const actual = await import('vue-router') as typeof import('vue-router')
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
    { path: '/projects/:projectId/packages', component: PackagesPage },
    { path: '/projects/:projectId/create-package', component: { template: '<div>Create Package</div>' } },
    { path: '/projects/:projectId', component: { template: '<div>Project</div>' } },
    { path: '/projects/:projectId/packages/:packageId', component: { template: '<div>Package Details</div>' } },
    { path: '/projects/:projectId/packages/:packageId/edit', component: { template: '<div>Edit Package</div>' } },
    { path: '/projects/:projectId/packages/:packageId/scenarios', component: { template: '<div>Scenarios</div>' } },
  ],
})

describe('PackagesPage', () => {
  let wrapper: VueWrapper<any>
  let mockNotify: ReturnType<typeof vi.fn>

  const mockPackages = [
    {
      id: 1,
      title: 'Pacote Teste 1',
      description: 'Descrição do pacote 1',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      tags: ['tag1', 'tag2'],
      assigneeEmail: 'test@example.com',
      environment: 'DEV',
      release: 'v1.0.0',
      status: 'CREATED',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      steps: [],
      scenarios: [],
      project: {
        id: 1,
        name: 'Projeto Teste',
      },
      metrics: {
        totalScenarios: 0,
        totalSteps: 0,
        packageSteps: 0,
        scenariosByType: {},
        scenariosByPriority: {},
      },
    },
    {
      id: 2,
      title: 'Pacote Teste 2',
      description: 'Descrição do pacote 2',
      type: 'REGRESSION',
      priority: 'MEDIUM',
      tags: ['tag3'],
      release: 'v1.1.0',
      status: 'EXECUTED',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      steps: [],
      scenarios: [{ id: 1, title: 'Cenário 1' }],
      project: {
        id: 1,
        name: 'Projeto Teste',
      },
      metrics: {
        totalScenarios: 1,
        totalSteps: 0,
        packageSteps: 0,
        scenariosByType: {},
        scenariosByPriority: {},
      },
    },
  ]

  const createWrapper = () => {
    return mount(PackagesPage, {
      global: {
        plugins: [router],
        mocks: {
          $q: {
            notify: mockNotify,
            dialog: mockDialogFn,
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
          'q-btn': {
            template: '<button @click="$attrs.onClick" :type="type" :disabled="loading" class="q-btn" v-bind="$attrs"><slot>{{ label }}</slot></button>',
            props: ['type', 'label', 'color', 'loading', 'flat', 'round', 'icon', 'unelevated', 'size'],
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
            props: ['modelValue', 'label', 'options', 'outlined', 'clearable', 'dark', 'filled'],
            emits: ['update:modelValue'],
            methods: {
              handleChange(event: Event) {
                const target = event.target as HTMLSelectElement
                this.$emit('update:modelValue', target.value)
              },
            },
          },
          'q-chip': {
            template: '<span class="q-chip" :class="color"><slot>{{ label }}</slot></span>',
            props: ['label', 'color', 'textColor', 'size'],
          },
          'q-icon': {
            template: '<span class="q-icon" v-bind="$attrs"></span>',
            props: ['name', 'size', 'color'],
          },
          'q-spinner': {
            template: '<div class="q-spinner" v-bind="$attrs"></div>',
            props: ['size', 'color'],
          },
          'q-btn-dropdown': {
            template: `
              <div class="q-btn-dropdown">
                <button @click.stop="toggleMenu" class="q-btn-dropdown-trigger" v-bind="$attrs">
                  <slot name="icon"></slot>
                </button>
                <div v-if="showMenu" class="q-btn-dropdown-menu" @click.stop>
                  <slot></slot>
                </div>
              </div>
            `,
            props: ['icon', 'flat', 'round', 'menuAnchor', 'menuSelf', 'dark'],
            data() {
              return { showMenu: false }
            },
            methods: {
              toggleMenu() {
                this.showMenu = !this.showMenu
              },
            },
          },
          'q-list': {
            template: '<div class="q-list" v-bind="$attrs"><slot /></div>',
            props: ['dark'],
          },
          'q-item': {
            template: '<div class="q-item" @click="$attrs.onClick" v-bind="$attrs"><slot /></div>',
            props: ['clickable'],
          },
          'q-item-section': {
            template: '<div class="q-item-section" v-bind="$attrs"><slot /></div>',
            props: ['avatar'],
          },
          'q-item-label': {
            template: '<div class="q-item-label"><slot /></div>',
          },
          'q-separator': {
            template: '<div class="q-separator" v-bind="$attrs"></div>',
            props: ['dark'],
          },
        },
      },
    })
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockDialogFn.mockClear()
    mockRoute.params = { projectId: '1' }
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
      vi.mocked(packageService.getProjectPackages).mockResolvedValueOnce(mockPackages as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.q-page').exists()).toBe(true)
    })

    it('deve exibir título da página', async () => {
      vi.mocked(packageService.getProjectPackages).mockResolvedValueOnce(mockPackages as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('Pacotes de Teste')
    })

    it('deve exibir estado de carregamento', async () => {
      vi.mocked(packageService.getProjectPackages).mockImplementation(() => new Promise(() => {}))
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.loading).toBe(true)
    })

    it('deve exibir estado vazio quando não há pacotes', async () => {
      vi.mocked(packageService.getProjectPackages).mockResolvedValueOnce([])
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.packages).toEqual([])
      expect(wrapper.text()).toContain('Nenhum pacote encontrado')
    })
  })

  describe('Carregamento de dados', () => {
    it('deve carregar pacotes ao montar', async () => {
      vi.mocked(packageService.getProjectPackages).mockResolvedValueOnce(mockPackages as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(packageService.getProjectPackages).toHaveBeenCalledWith(1)
      expect(wrapper.vm.packages).toEqual(mockPackages)
    })

    it('deve tratar erro ao carregar pacotes', async () => {
      vi.mocked(packageService.getProjectPackages).mockRejectedValueOnce(new Error('Erro ao carregar'))
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockNotify).toHaveBeenCalled()
    })

    it('deve aplicar filtro por status', async () => {
      vi.mocked(packageService.getProjectPackages).mockResolvedValue(mockPackages as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      wrapper.vm.selectedStatus = 'CREATED'
      await wrapper.vm.loadPackages()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.packages.length).toBe(1)
      expect(wrapper.vm.packages[0].status).toBe('CREATED')
    })

    it('deve aplicar filtro por tipo', async () => {
      vi.mocked(packageService.getProjectPackages).mockResolvedValue(mockPackages as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      wrapper.vm.selectedType = 'FUNCTIONAL'
      await wrapper.vm.loadPackages()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.packages.length).toBe(1)
      expect(wrapper.vm.packages[0].type).toBe('FUNCTIONAL')
    })
  })

  describe('Navegação', () => {
    beforeEach(async () => {
      vi.mocked(packageService.getProjectPackages).mockResolvedValueOnce(mockPackages as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('deve navegar de volta ao clicar em voltar', async () => {
      await wrapper.vm.goBack()
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects/1')
    })

    it('deve navegar para criar pacote', async () => {
      await wrapper.vm.goToCreatePackage()
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects/1/create-package')
    })

    it('deve navegar para detalhes do pacote', async () => {
      await wrapper.vm.goToPackageDetails(1)
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects/1/packages/1')
    })

    it('deve navegar para editar pacote', async () => {
      await wrapper.vm.editPackage(1)
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects/1/packages/1/edit')
    })

    it('deve navegar para cenários do pacote', async () => {
      await wrapper.vm.goToScenarios(1)
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects/1/packages/1/scenarios')
    })
  })

  describe('Exclusão de pacote', () => {
    beforeEach(async () => {
      vi.mocked(packageService.getProjectPackages).mockResolvedValueOnce(mockPackages as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('deve abrir diálogo de confirmação ao excluir pacote', async () => {
      mockDialogFn.mockClear()
      await wrapper.vm.deletePackageAction(1)
      await wrapper.vm.$nextTick()

      expect(mockDialogFn).toHaveBeenCalled()
    })

    it('deve excluir pacote quando confirmado', async () => {
      vi.mocked(packageService.deletePackage).mockResolvedValueOnce(undefined as any)
      vi.mocked(packageService.getProjectPackages).mockResolvedValueOnce([mockPackages[1]] as any)
      mockDialogFn.mockClear()

      await wrapper.vm.deletePackageAction(1)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(packageService.deletePackage).toHaveBeenCalledWith(1, 1)
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Pacote excluído com sucesso!',
      })
    })

    it('deve tratar erro ao excluir pacote', async () => {
      vi.mocked(packageService.deletePackage).mockRejectedValueOnce(new Error('Erro ao excluir'))
      mockDialogFn.mockClear()

      await wrapper.vm.deletePackageAction(1)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockNotify).toHaveBeenCalled()
    })
  })

  describe('Funções auxiliares', () => {
    beforeEach(async () => {
      vi.mocked(packageService.getProjectPackages).mockResolvedValueOnce(mockPackages as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('deve retornar label de status corretamente', () => {
      expect(wrapper.vm.getStatusLabel('CREATED')).toBe('Criado')
      expect(wrapper.vm.getStatusLabel('EXECUTED')).toBe('Executado')
      expect(wrapper.vm.getStatusLabel('PASSED')).toBe('Concluído')
      expect(wrapper.vm.getStatusLabel('FAILED')).toBe('Falhou')
      expect(wrapper.vm.getStatusLabel('APROVADO')).toBe('Aprovado')
    })

    it('deve retornar cor de status corretamente', () => {
      expect(wrapper.vm.getStatusColor('CREATED')).toBe('grey')
      expect(wrapper.vm.getStatusColor('EXECUTED')).toBe('orange')
      expect(wrapper.vm.getStatusColor('PASSED')).toBe('green')
      expect(wrapper.vm.getStatusColor('FAILED')).toBe('red')
      expect(wrapper.vm.getStatusColor('APROVADO')).toBe('positive')
    })

    it('deve retornar label de tipo corretamente', () => {
      expect(wrapper.vm.getTypeLabel('FUNCTIONAL')).toBe('Funcional')
      expect(wrapper.vm.getTypeLabel('REGRESSION')).toBe('Regressão')
      expect(wrapper.vm.getTypeLabel('SMOKE')).toBe('Smoke')
      expect(wrapper.vm.getTypeLabel('E2E')).toBe('End-to-End')
    })

    it('deve retornar label de prioridade corretamente', () => {
      expect(wrapper.vm.getPriorityLabel('LOW')).toBe('Baixa')
      expect(wrapper.vm.getPriorityLabel('MEDIUM')).toBe('Média')
      expect(wrapper.vm.getPriorityLabel('HIGH')).toBe('Alta')
      expect(wrapper.vm.getPriorityLabel('CRITICAL')).toBe('Crítica')
    })

    it('deve retornar label de ambiente corretamente', () => {
      expect(wrapper.vm.getEnvironmentLabel('DEV')).toBe('Desenvolvimento')
      expect(wrapper.vm.getEnvironmentLabel('QA')).toBe('QA')
      expect(wrapper.vm.getEnvironmentLabel('STAGING')).toBe('Staging')
      expect(wrapper.vm.getEnvironmentLabel('PROD')).toBe('Produção')
    })

    it('deve formatar data corretamente', () => {
      const date = '2024-01-01T00:00:00Z'
      const formatted = wrapper.vm.formatDate(date)
      expect(formatted).toBeTruthy()
    })
  })

  describe('Computed properties', () => {
    beforeEach(async () => {
      vi.mocked(packageService.getProjectPackages).mockResolvedValueOnce(mockPackages as any)
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('deve calcular projectId corretamente', () => {
      expect(wrapper.vm.projectId).toBe(1)
    })
  })
})

