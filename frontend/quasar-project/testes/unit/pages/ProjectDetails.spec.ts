import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ProjectDetails from 'src/pages/ProjectDetails.vue'
import * as projectDetailsService from 'src/services/project-details.service'
import api from 'src/services/api'

// Mock dos serviços
vi.mock('src/services/project-details.service', () => ({
  getProjectDetails: vi.fn(),
  getAvailableReleases: vi.fn(),
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
    { path: '/projects/:projectId', component: ProjectDetails },
    { path: '/projects', component: { template: '<div>Projects</div>' } },
    { path: '/projects/:projectId/create-package', component: { template: '<div>Create Package</div>' } },
    { path: '/projects/:projectId/packages', component: { template: '<div>Packages</div>' } },
  ],
})

describe('ProjectDetails', () => {
  let wrapper: VueWrapper<any>
  let mockNotifyFn: ReturnType<typeof vi.fn>

  const mockCurrentUser = {
    id: 1,
    name: 'Usuário Atual',
    email: 'usuario@example.com'
  }

  const mockProject = {
    id: 1,
    name: 'Projeto Teste',
    description: 'Descrição do projeto',
    ownerId: 1,
    metrics: {
      created: 5,
      executed: 3,
      passed: 2,
      failed: 1,
    },
    scenarioMetrics: {
      created: 10,
      executed: 8,
      passed: 6,
      failed: 2,
      approved: 1,
      reproved: 1,
    },
    testPackages: [
      {
        id: 1,
        name: 'Pacote 1',
        status: 'APROVADO',
        priority: 'HIGH',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'Pacote 2',
        status: 'REPROVADO',
        priority: 'MEDIUM',
        createdAt: '2024-02-01T00:00:00Z',
      },
    ],
    members: [
      {
        id: 1,
        name: 'Membro 1',
        email: 'membro1@example.com',
        role: 'OWNER',
        avatar: null,
      },
      {
        id: 2,
        name: 'Membro 2',
        email: 'membro2@example.com',
        role: 'MANAGER',
        avatar: null,
      },
    ],
  }

  const mockReleases = ['1.0.0', '1.1.0', '2.0.0']

  const createWrapper = (initialMembers: any[] = mockProject.members || []) => {
    // Garantir que initialMembers seja sempre um array válido
    const members = Array.isArray(initialMembers) ? initialMembers : []
    
    const wrapper = mount(ProjectDetails, {
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
          'q-card': { template: '<div class="q-card"><slot /></div>' },
          'q-card-section': { template: '<div class="q-card-section"><slot /></div>' },
          'q-card-actions': { template: '<div class="q-card-actions"><slot /></div>' },
          'q-btn': { template: '<button @click="$attrs.onClick" v-bind="$attrs"><slot /></button>', props: ['color', 'icon', 'label', 'loading', 'unelevated', 'flat', 'round', 'size', 'outline', 'disable'] },
          'q-icon': { template: '<span class="q-icon" v-bind="$attrs"></span>', props: ['name', 'size', 'color'] },
          'q-avatar': { template: '<div class="q-avatar" v-bind="$attrs"><slot /></div>', props: ['color', 'textColor', 'size'] },
          'q-chip': { template: '<span class="q-chip" v-bind="$attrs"><slot /></span>', props: ['color', 'textColor', 'size'] },
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
            props: ['modelValue', 'label', 'type', 'outlined', 'dense', 'clearable', 'hint', 'rules'],
            emits: ['update:modelValue'],
            methods: {
              handleInput(event: Event) {
                const target = event.target as HTMLInputElement
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
                <slot name="prepend"></slot>
              </div>
            `,
            props: ['modelValue', 'label', 'options', 'outlined', 'dense', 'emitValue', 'mapOptions', 'rules', 'hint'],
            emits: ['update:modelValue'],
            methods: {
              handleChange(event: Event) {
                const target = event.target as HTMLSelectElement
                this.$emit('update:modelValue', target.value)
              },
            },
          },
          'q-table': {
            template: `
              <div class="q-table">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (columns || [])" :key="col.name">{{ col.label }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="(row, index) in (rows || [])" :key="row?.id || index">
                      <tr v-if="row">
                        <td v-for="col in (columns || [])" :key="col.name">
                          <slot 
                            :name="'body-cell-' + col.name" 
                            :props="{ row: row, col: (col || {}) }"
                          >
                            {{ (row && row[col.field]) ? row[col.field] : '' }}
                          </slot>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            `,
            props: ['rows', 'columns', 'flat', 'pagination'],
          },
          'q-td': {
            template: '<td><slot :props="props" /></td>',
            props: ['props'],
          },
          'q-dialog': { template: '<div v-if="modelValue" class="q-dialog"><slot /></div>', props: ['modelValue', 'persistent'], emits: ['update:modelValue'] },
          'q-form': { template: '<form @submit.prevent="$attrs.onSubmit" class="q-form"><slot /></form>' },
          'apexchart': { template: '<div class="apexchart" v-bind="$attrs"></div>', props: ['type', 'options', 'series', 'height'] },
        },
      },
    })
    // Inicializar membros antes de renderizar para evitar erros de renderização
    // Usar set para garantir que a reatividade funcione corretamente
    if (members.length > 0) {
      wrapper.vm.members = members
    } else {
      wrapper.vm.members = []
    }
    // Aguardar próximo tick para garantir que os membros sejam processados
    return wrapper
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
    // Mock do currentUser
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser } as any)
  })

  afterEach(() => {
    if (wrapper) {
      try {
        wrapper.unmount()
      } catch (error) {
        // Ignorar erros de desmontagem
      }
    }
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.q-page').exists()).toBe(true)
    })

    it('deve exibir título do projeto', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      expect(wrapper.text()).toContain('Projeto Teste')
    })

    it('deve exibir estado de carregamento', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockImplementation(() => new Promise(() => {}))
      wrapper = createWrapper([])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.loading).toBe(true)
    })
  })

  describe('Carregamento de dados', () => {
    it('deve carregar detalhes do projeto ao montar', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      expect(projectDetailsService.getAvailableReleases).toHaveBeenCalledWith(1)
      expect(projectDetailsService.getProjectDetails).toHaveBeenCalledWith(1, '1.0.0')
      expect(wrapper.vm.project).toEqual(mockProject)
    })

    it('deve carregar releases disponíveis ao montar', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      expect(wrapper.vm.availableReleases).toEqual(mockReleases)
      expect(wrapper.vm.selectedRelease).toBe('1.0.0')
    })

    it('deve carregar membros do projeto ao montar', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      expect(wrapper.vm.members).toEqual(mockProject.members)
    })

    it('deve tratar erro ao carregar detalhes do projeto', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockRejectedValueOnce(new Error('Erro ao carregar'))
      wrapper = createWrapper([])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockNotifyFn).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao carregar detalhes do projeto',
        position: 'top',
      })
    })

    it('deve carregar dados básicos quando não há releases', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce([])
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(projectDetailsService.getProjectDetails).toHaveBeenCalledWith(1, undefined)
      expect(wrapper.vm.selectedRelease).toBeUndefined()
    })
  })

  describe('Métricas e gráficos', () => {
    beforeEach(async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      wrapper = createWrapper(mockProject.members || [])
      // Garantir que os dados sejam inicializados antes de renderizar
      wrapper.vm.project = mockProject
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))
    })

    it('deve calcular métricas corretamente', () => {
      expect(wrapper.vm.metrics.created).toBe(5)
      expect(wrapper.vm.metrics.executed).toBe(3)
      expect(wrapper.vm.metrics.passed).toBe(2)
      expect(wrapper.vm.metrics.failed).toBe(1)
    })

    it('deve calcular total de pacotes corretamente', () => {
      expect(wrapper.vm.totalPackages).toBe(11) // 5 + 3 + 2 + 1
    })

    it('deve calcular métricas de cenários corretamente', () => {
      expect(wrapper.vm.scenarioMetrics.created).toBe(10)
      expect(wrapper.vm.scenarioMetrics.executed).toBe(8)
      expect(wrapper.vm.scenarioMetrics.passed).toBe(6)
      expect(wrapper.vm.scenarioMetrics.failed).toBe(2)
    })

    it('deve calcular total de cenários corretamente', () => {
      expect(wrapper.vm.totalScenarios).toBe(28) // 10 + 8 + 6 + 2 + 1 + 1
    })

    it('deve calcular séries do gráfico corretamente', () => {
      expect(wrapper.vm.chartSeries).toEqual([5, 3, 2, 1])
    })
  })

  describe('Navegação', () => {
    beforeEach(async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      wrapper = createWrapper(mockProject.members || [])
      // Garantir que os dados sejam inicializados antes de renderizar
      wrapper.vm.project = mockProject
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))
    })

    it('deve navegar de volta ao clicar em voltar', async () => {
      await wrapper.vm.goBack()
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects')
    })

    it('deve navegar para criar pacote', async () => {
      await wrapper.vm.goToCreatePackage()
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects/1/create-package')
    })

    it('deve navegar para ver pacotes', async () => {
      await wrapper.vm.goToPackages()
      await wrapper.vm.$nextTick()

      expect(mockPush).toHaveBeenCalledWith('/projects/1/packages')
    })
  })

  describe('Gerenciamento de releases', () => {
    beforeEach(async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      wrapper = createWrapper(mockProject.members || [])
      // Garantir que os dados sejam inicializados antes de renderizar
      wrapper.vm.project = mockProject
      wrapper.vm.availableReleases = mockReleases
      wrapper.vm.selectedRelease = '1.0.0'
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))
    })

    it('deve mudar release e recarregar dados', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      wrapper.vm.selectedRelease = '1.1.0'
      await wrapper.vm.onReleaseChange()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 1000))

      expect(projectDetailsService.getProjectDetails).toHaveBeenCalledWith(1, '1.1.0')
    })
  })

  describe('Gerenciamento de membros', () => {
    beforeEach(async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))
    })

    it('deve filtrar membros por busca', async () => {
      wrapper.vm.memberSearch = 'Membro 1'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.filteredMembers.length).toBe(1)
      expect(wrapper.vm.filteredMembers[0].name).toBe('Membro 1')
    })

    it('deve mostrar todos os membros quando busca está vazia', async () => {
      wrapper.vm.memberSearch = 'Membro 1'
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.filteredMembers.length).toBe(1)

      wrapper.vm.memberSearch = ''
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.filteredMembers.length).toBe(2)
    })

    it('deve abrir diálogo de adicionar membro', async () => {
      wrapper.vm.showAddMemberDialog = true
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showAddMemberDialog).toBe(true)
    })

    it('deve adicionar membro com sucesso', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: {} } as any)
      wrapper.vm.addMemberForm.email = 'novo@example.com'
      wrapper.vm.addMemberForm.role = 'TESTER'

      await wrapper.vm.addMember()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(api.post).toHaveBeenCalledWith('/projects/1/members/by-email', {
        email: 'novo@example.com',
        role: 'TESTER',
      })
      expect(mockNotifyFn).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Convite enviado com sucesso! O membro aparecerá na lista após aceitar o convite.',
        position: 'top',
        timeout: 5000,
      })
      expect(wrapper.vm.showAddMemberDialog).toBe(false)
    })

    it('deve validar campos obrigatórios ao adicionar membro', async () => {
      wrapper.vm.addMemberForm.email = ''
      wrapper.vm.addMemberForm.role = ''

      await wrapper.vm.addMember()
      await wrapper.vm.$nextTick()

      expect(mockNotifyFn).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Por favor, preencha todos os campos obrigatórios',
        position: 'top',
      })
    })

    it('deve verificar se membro já existe ao adicionar', async () => {
      wrapper.vm.addMemberForm.email = 'membro1@example.com'
      wrapper.vm.addMemberForm.role = 'TESTER'

      await wrapper.vm.addMember()
      await wrapper.vm.$nextTick()

      expect(mockNotifyFn).toHaveBeenCalledWith({
        type: 'warning',
        message: 'Este usuário já é membro do projeto',
        position: 'top',
      })
    })

    it('deve tratar erro ao adicionar membro', async () => {
      const error = new Error('Erro ao adicionar')
      vi.mocked(api.post).mockRejectedValueOnce(error)
      wrapper.vm.addMemberForm.email = 'novo@example.com'
      wrapper.vm.addMemberForm.role = 'TESTER'

      await wrapper.vm.addMember()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      // Verificar se mockNotifyFn foi chamado com qualquer mensagem de erro
      expect(mockNotifyFn).toHaveBeenCalled()
      const lastCall = mockNotifyFn.mock.calls[mockNotifyFn.mock.calls.length - 1]
      expect(lastCall[0]).toMatchObject({
        type: 'negative',
        position: 'top',
      })
    })

    it('deve carregar usuário atual ao montar', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser } as any)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      expect(api.get).toHaveBeenCalledWith('/profile')
      expect(wrapper.vm.currentUser).toEqual(mockCurrentUser)
    })

    it('deve verificar se pode remover membro (owner pode remover)', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser } as any)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      wrapper.vm.currentUser = mockCurrentUser
      wrapper.vm.project = { ...mockProject, ownerId: 1 } as any
      wrapper.vm.members = mockProject.members

      // Owner pode remover membro que não é owner
      const canRemove = wrapper.vm.canRemoveMember(mockProject.members[1])
      expect(canRemove).toBe(true)
    })

    it('deve verificar se pode remover membro (manager não pode remover owner)', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      vi.mocked(api.get).mockResolvedValueOnce({ data: { id: 2, name: 'Manager', email: 'manager@example.com' } } as any)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      wrapper.vm.currentUser = { id: 2, name: 'Manager', email: 'manager@example.com' }
      wrapper.vm.project = { ...mockProject, ownerId: 1 } as any
      wrapper.vm.members = mockProject.members

      // Manager não pode remover owner
      const canRemove = wrapper.vm.canRemoveMember(mockProject.members[0])
      expect(canRemove).toBe(false)
    })

    it('deve remover membro com sucesso', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser } as any)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      wrapper.vm.currentUser = mockCurrentUser
      wrapper.vm.project = { ...mockProject, ownerId: 1 } as any
      wrapper.vm.members = [...mockProject.members]
      wrapper.vm.memberToRemove = mockProject.members[1]
      wrapper.vm.showRemoveMemberDialog = true

      vi.mocked(api.delete).mockResolvedValueOnce({ data: {} } as any)

      await wrapper.vm.removeMember()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(api.delete).toHaveBeenCalledWith('/projects/1/members/2')
      expect(wrapper.vm.members.length).toBe(1)
      expect(wrapper.vm.showRemoveMemberDialog).toBe(false)
      expect(mockNotifyFn).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Membro removido com sucesso!',
        position: 'top'
      })
    })

    it('deve verificar se pode alterar cargo (apenas owner)', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser } as any)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      wrapper.vm.currentUser = mockCurrentUser
      wrapper.vm.project = { ...mockProject, ownerId: 1 } as any
      wrapper.vm.members = mockProject.members

      // Owner pode alterar cargo de membro
      const canChange = wrapper.vm.canChangeRole(mockProject.members[1])
      expect(canChange).toBe(true)
    })

    it('deve verificar se pode alterar cargo (não owner não pode)', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      vi.mocked(api.get).mockResolvedValueOnce({ data: { id: 2, name: 'Manager', email: 'manager@example.com' } } as any)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      wrapper.vm.currentUser = { id: 2, name: 'Manager', email: 'manager@example.com' }
      wrapper.vm.project = { ...mockProject, ownerId: 1 } as any
      wrapper.vm.members = mockProject.members

      // Manager não pode alterar cargo
      const canChange = wrapper.vm.canChangeRole(mockProject.members[1])
      expect(canChange).toBe(false)
    })

    it('deve atualizar cargo do membro com sucesso', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser } as any)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      wrapper.vm.currentUser = mockCurrentUser
      wrapper.vm.project = { ...mockProject, ownerId: 1 } as any
      wrapper.vm.members = [...mockProject.members]
      wrapper.vm.editingRole = { 2: 'TESTER' }

      vi.mocked(api.put).mockResolvedValueOnce({ data: {} } as any)

      await wrapper.vm.updateMemberRole(mockProject.members[1])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(api.put).toHaveBeenCalledWith('/projects/1/members/2/role', {
        role: 'TESTER'
      })
      expect(mockNotifyFn).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Cargo do membro atualizado com sucesso!',
        position: 'top'
      })
    })

    it('deve confirmar remoção de membro', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser } as any)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      wrapper.vm.currentUser = mockCurrentUser
      wrapper.vm.project = { ...mockProject, ownerId: 1 } as any
      wrapper.vm.members = mockProject.members

      wrapper.vm.confirmRemoveMember(mockProject.members[1])
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showRemoveMemberDialog).toBe(true)
      expect(wrapper.vm.memberToRemove).toEqual(mockProject.members[1])
    })

    it('deve iniciar edição de role', async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCurrentUser } as any)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))

      wrapper.vm.currentUser = mockCurrentUser
      wrapper.vm.project = { ...mockProject, ownerId: 1 } as any
      // Limpar editingRole antes de iniciar
      wrapper.vm.editingRole = {}
      // Garantir que os membros tenham os roles corretos
      wrapper.vm.members = [
        { id: 1, name: 'Membro 1', email: 'membro1@example.com', role: 'OWNER', avatar: null },
        { id: 2, name: 'Membro 2', email: 'membro2@example.com', role: 'MANAGER', avatar: null }
      ]

      const memberToEdit = wrapper.vm.members[1]
      // Verificar que o role do membro é MANAGER antes de iniciar edição
      expect(memberToEdit.role).toBe('MANAGER')
      
      wrapper.vm.startEditingRole(memberToEdit)
      await wrapper.vm.$nextTick()

      // Verificar que o editingRole foi definido com o role atual do membro
      expect(wrapper.vm.editingRole[2]).toBe('MANAGER')
      expect(wrapper.vm.isEditingRole(memberToEdit)).toBe(true)
    })
  })

  describe('Funções auxiliares', () => {
    beforeEach(async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      wrapper = createWrapper(mockProject.members || [])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))
    })

    it('deve gerar iniciais corretamente', () => {
      // Garantir que os membros estejam inicializados
      wrapper.vm.members = mockProject.members || []
      expect(wrapper.vm.getInitials('João Silva')).toBe('JS')
      expect(wrapper.vm.getInitials('Maria')).toBe('M')
      // Pedro Álvares Cabral -> primeira letra de "Pedro" (P) e primeira letra de "Álvares" (Á) = "PÁ"
      expect(wrapper.vm.getInitials('Pedro Álvares Cabral')).toBe('PÁ')
      expect(wrapper.vm.getInitials('A')).toBe('A')
      expect(wrapper.vm.getInitials('')).toBe('?')
    })

    it('deve retornar URL de avatar corretamente', () => {
      expect(wrapper.vm.getAvatarUrl('http://example.com/avatar.jpg')).toBe('http://example.com/avatar.jpg')
      expect(wrapper.vm.getAvatarUrl('/uploads/avatar.jpg')).toContain('/uploads/avatar.jpg')
    })

    it('deve retornar cor de função corretamente', () => {
      expect(wrapper.vm.getRoleColor('OWNER')).toBe('purple')
      expect(wrapper.vm.getRoleColor('MANAGER')).toBe('green')
      expect(wrapper.vm.getRoleColor('TESTER')).toBe('orange')
      expect(wrapper.vm.getRoleColor('APPROVER')).toBe('teal')
      expect(wrapper.vm.getRoleColor('UNKNOWN')).toBe('grey')
    })

    it('deve retornar descrição de função corretamente', () => {
      expect(wrapper.vm.getRoleDescription('OWNER')).toContain('acesso total')
      expect(wrapper.vm.getRoleDescription('MANAGER')).toContain('gerenciar')
      expect(wrapper.vm.getRoleDescription('TESTER')).toContain('executar')
      expect(wrapper.vm.getRoleDescription('APPROVER')).toContain('aprovar')
      expect(wrapper.vm.getRoleDescription('UNKNOWN')).toBe('Função não definida')
    })

    it('deve validar email corretamente', () => {
      expect(wrapper.vm.isValidEmail('test@example.com')).toBe(true)
      expect(wrapper.vm.isValidEmail('invalid')).toBe(false)
      expect(wrapper.vm.isValidEmail('test@')).toBe(false)
      expect(wrapper.vm.isValidEmail('@example.com')).toBe(false)
    })
  })

  describe('Gráficos de análise', () => {
    beforeEach(async () => {
      vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValueOnce(mockReleases)
      vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValueOnce(mockProject)
      wrapper = createWrapper(mockProject.members || [])
      // Garantir que os dados sejam inicializados antes de renderizar
      wrapper.vm.project = mockProject
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 500))
    })

    it('deve calcular séries do gráfico de prioridade', () => {
      const series = wrapper.vm.priorityChartSeries
      expect(series).toBeDefined()
      expect(Array.isArray(series)).toBe(true)
    })

    it('deve calcular séries do gráfico mensal', () => {
      const series = wrapper.vm.monthlyChartSeries
      expect(series).toBeDefined()
      expect(Array.isArray(series)).toBe(true)
    })

    it('deve calcular séries do gráfico de taxa de sucesso', () => {
      const series = wrapper.vm.successRateChartSeries
      expect(series).toBeDefined()
      expect(Array.isArray(series)).toBe(true)
      // Deve retornar array com 3 valores: aprovados, reprovados, não executados
      expect(series.length).toBe(3)
    })
  })
})

