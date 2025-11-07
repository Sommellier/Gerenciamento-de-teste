import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import EditPackage from 'pages/EditPackage.vue'
import * as packageService from 'src/services/package.service'
import * as projectService from 'src/services/project.service'

const mockNotify = vi.fn()
const mockPush = vi.fn()
const mockBack = vi.fn()

const mockRoute = {
  params: { id: '1' },
  query: { projectId: '1' },
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
    { path: '/packages/:id/edit', component: EditPackage },
  ],
})

router.push = mockPush
router.back = mockBack

// Mock dos serviços
vi.mock('src/services/package.service', () => ({
  getPackageDetails: vi.fn(),
  updatePackage: vi.fn(),
}))

vi.mock('src/services/project.service', () => ({
  getProjectReleases: vi.fn(),
  getProjectMembers: vi.fn(),
  addRelease: vi.fn(),
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('vue-router')
  return {
    ...actual,
    useRoute: () => mockRoute,
    useRouter: () => router,
  }
})

describe('EditPackage', () => {
  let wrapper: ReturnType<typeof mount>

  const createWrapper = () => {
    return mount(EditPackage, {
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
          'q-card': {
            template: '<div class="q-card"><slot /></div>',
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
                <slot name="append"></slot>
                <slot name="hint"></slot>
              </div>
            `,
            props: ['modelValue', 'label', 'type', 'outlined', 'rules', 'hint', 'readonly', 'rows'],
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
                <select 
                  :value="modelValue" 
                  @change="handleChange" 
                  v-bind="$attrs"
                >
                  <option v-for="option in options" :key="option.value || option" :value="option.value || option">
                    {{ option.label || option }}
                  </option>
                </select>
                <slot name="hint"></slot>
              </div>
            `,
            props: ['modelValue', 'label', 'options', 'outlined', 'rules', 'hint', 'loading', 'clearable'],
            emits: ['update:modelValue'],
            methods: {
              handleChange(event: Event) {
                const target = event.target as HTMLSelectElement
                this.$emit('update:modelValue', target.value)
              },
            },
          },
          'q-btn': {
            template: '<button @click="$attrs.onClick" :type="type" :disabled="loading" class="q-btn" v-bind="$attrs"><slot>{{ label }}</slot></button>',
            props: ['type', 'label', 'color', 'loading', 'flat', 'round', 'icon', 'outline', 'size'],
          },
          'q-chip': {
            template: '<div class="q-chip"><slot>{{ label }}</slot><button v-if="removable" @click="$emit(\'remove\')">×</button></div>',
            props: ['label', 'removable', 'color', 'textColor'],
            emits: ['remove'],
          },
          'q-icon': {
            template: '<span class="q-icon" v-bind="$attrs"></span>',
            props: ['name', 'size', 'color'],
          },
          'q-dialog': {
            template: '<div v-if="modelValue" class="q-dialog"><slot /></div>',
            props: ['modelValue'],
          },
          'q-card-section': {
            template: '<div class="q-card-section"><slot /></div>',
          },
          'q-card-actions': {
            template: '<div class="q-card-actions"><slot /></div>',
            props: ['align'],
          },
          'q-spinner': {
            template: '<div class="q-spinner"></div>',
            props: ['size', 'color'],
          },
          'q-popup-proxy': {
            template: '<div v-if="show" class="q-popup-proxy"><slot /></div>',
            props: ['cover'],
            data() {
              return { show: false }
            },
          },
          'q-date': {
            template: '<div class="q-date"><slot /></div>',
            props: ['modelValue', 'mask', 'options'],
            emits: ['update:modelValue'],
          },
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(packageService.getPackageDetails).mockResolvedValue({
      id: 1,
      title: 'Pacote de Teste',
      description: 'Descrição do pacote',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      environment: 'QA',
      release: 'v1.0',
      assigneeEmail: 'joao@example.com',
      status: 'CREATED',
      tags: ['tag1', 'tag2'],
    })
    vi.mocked(projectService.getProjectReleases).mockResolvedValue(['v1.0', 'v1.1'])
    vi.mocked(projectService.getProjectMembers).mockResolvedValue([
      { id: 1, name: 'João', email: 'joao@example.com' },
      { id: 2, name: 'Maria', email: 'maria@example.com' },
    ])
    vi.mocked(projectService.addRelease).mockReturnValue(['v1.0', 'v1.1', 'v2.0'])
    vi.mocked(packageService.updatePackage).mockResolvedValue({ id: 1, title: 'Pacote Atualizado' })
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(wrapper.html()).toContain('Editar Pacote de Teste')
      expect(wrapper.html()).toContain('Título do Pacote')
    })

    it('deve mostrar loading enquanto carrega', async () => {
      vi.mocked(packageService.getPackageDetails).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          id: 1,
          title: 'Pacote',
          description: '',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          release: 'v1.0',
          tags: [],
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
    it('deve carregar dados do pacote ao montar', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(packageService.getPackageDetails).toHaveBeenCalledWith(1, 1)
      expect(wrapper.vm.form.title).toBe('Pacote de Teste')
      expect(wrapper.vm.form.description).toBe('Descrição do pacote')
    })

    it('deve carregar releases e membros ao montar', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(projectService.getProjectReleases).toHaveBeenCalledWith(1)
      expect(projectService.getProjectMembers).toHaveBeenCalledWith(1)
    })

    it('deve mostrar erro quando falha ao carregar pacote', async () => {
      vi.mocked(packageService.getPackageDetails).mockRejectedValue(new Error('Erro ao carregar'))
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao carregar pacote',
      })
      expect(mockBack).toHaveBeenCalled()
    })

    it('deve mostrar erro quando projectId é inválido', async () => {
      mockRoute.query = { projectId: 'invalid' }
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Deve retornar sem carregar dados
      expect(packageService.getPackageDetails).not.toHaveBeenCalled()
      
      // Resetar para outros testes
      mockRoute.query = { projectId: '1' }
    })
  })

  describe('Interação com formulário', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve atualizar título do formulário', async () => {
      wrapper.vm.form.title = 'Novo Título'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.form.title).toBe('Novo Título')
    })

    it('deve atualizar descrição do formulário', async () => {
      wrapper.vm.form.description = 'Nova Descrição'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.form.description).toBe('Nova Descrição')
    })

    it('deve atualizar tipo do formulário', async () => {
      wrapper.vm.form.type = { label: 'Regressão', value: 'REGRESSION' }
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.form.type).toEqual({ label: 'Regressão', value: 'REGRESSION' })
    })

    it('deve atualizar prioridade do formulário', async () => {
      wrapper.vm.form.priority = { label: 'Média', value: 'MEDIUM' }
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.form.priority).toEqual({ label: 'Média', value: 'MEDIUM' })
    })

    it('deve atualizar ambiente do formulário', async () => {
      wrapper.vm.form.environment = { label: 'Produção', value: 'PROD' }
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.form.environment).toEqual({ label: 'Produção', value: 'PROD' })
    })

    it('deve atualizar release do formulário', async () => {
      wrapper.vm.form.release = 'v2.0'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.form.release).toBe('v2.0')
    })

    it('deve atualizar status do formulário', async () => {
      wrapper.vm.form.status = { label: 'Executado', value: 'EXECUTED' }
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.form.status).toEqual({ label: 'Executado', value: 'EXECUTED' })
    })
  })

  describe('Gerenciamento de tags', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve atualizar tags quando tagsInput muda', async () => {
      wrapper.vm.tagsInput = 'tag1, tag2, tag3'
      await wrapper.vm.updateTags()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.form.tags).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('deve remover espaços em branco das tags', async () => {
      wrapper.vm.tagsInput = 'tag1 , tag2 , tag3'
      await wrapper.vm.updateTags()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.form.tags).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('deve remover tag quando clicar em remover', async () => {
      wrapper.vm.form.tags = ['tag1', 'tag2', 'tag3']
      wrapper.vm.tagsInput = 'tag1, tag2, tag3'
      
      await wrapper.vm.removeTag('tag2')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.form.tags).toEqual(['tag1', 'tag3'])
      expect(wrapper.vm.tagsInput).toBe('tag1, tag3')
    })
  })

  describe('Criação de release', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve abrir dialog de criação de release', async () => {
      await wrapper.vm.openCreateReleaseDialog()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showCreateReleaseDialog).toBe(true)
    })

    it('deve criar nova release quando createNewRelease é chamado', async () => {
      wrapper.vm.newRelease = '2024-01-01'
      await wrapper.vm.createNewRelease()
      await wrapper.vm.$nextTick()
      
      expect(projectService.addRelease).toHaveBeenCalled()
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Release criada com sucesso!',
      })
      expect(wrapper.vm.showCreateReleaseDialog).toBe(false)
    })

    it('deve mostrar erro quando tenta criar release sem data', async () => {
      wrapper.vm.newRelease = ''
      await wrapper.vm.createNewRelease()
      await wrapper.vm.$nextTick()
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Selecione uma data para a release',
      })
    })

    it('deve mostrar erro quando falha ao criar release', async () => {
      vi.mocked(projectService.addRelease).mockImplementation(() => {
        throw new Error('Erro ao criar release')
      })
      
      wrapper.vm.newRelease = '2024-01-01'
      await wrapper.vm.createNewRelease()
      await wrapper.vm.$nextTick()
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao criar release',
      })
    })

    it('deve cancelar criação de release', async () => {
      wrapper.vm.showCreateReleaseDialog = true
      wrapper.vm.newRelease = '2024-01-01'
      await wrapper.vm.cancelCreateRelease()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.showCreateReleaseDialog).toBe(false)
      expect(wrapper.vm.newRelease).toBe('')
    })

    it('deve processar onDateSelected corretamente', async () => {
      wrapper.vm.onDateSelected('2024-01-01')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.newRelease).toBe('2024-01-01')
      expect(wrapper.vm.showDatePicker).toBe(false)
    })
  })

  describe('Submissão do formulário', () => {
    beforeEach(async () => {
      // Garantir que projectId está válido antes de cada teste
      mockRoute.query = { projectId: '1' }
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve atualizar pacote quando formulário é submetido', async () => {
      wrapper.vm.form.title = 'Pacote Atualizado'
      wrapper.vm.form.type = { label: 'Funcional', value: 'FUNCTIONAL' }
      wrapper.vm.form.priority = { label: 'Alta', value: 'HIGH' }
      wrapper.vm.form.release = 'v1.0'
      wrapper.vm.form.status = { label: 'Criado', value: 'CREATED' }
      
      await wrapper.vm.onSubmit()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(packageService.updatePackage).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({
          title: 'Pacote Atualizado',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          release: 'v1.0',
          status: 'CREATED',
        })
      )
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Pacote atualizado com sucesso!',
      })
      expect(mockBack).toHaveBeenCalled()
    })

    it('deve incluir campos opcionais quando fornecidos', async () => {
      wrapper.vm.form.environment = { label: 'QA', value: 'QA' }
      wrapper.vm.form.assigneeEmail = { label: 'João (joao@example.com)', value: 'joao@example.com' }
      wrapper.vm.form.title = 'Pacote Atualizado'
      wrapper.vm.form.type = { label: 'Funcional', value: 'FUNCTIONAL' }
      wrapper.vm.form.priority = { label: 'Alta', value: 'HIGH' }
      wrapper.vm.form.release = 'v1.0'
      
      await wrapper.vm.onSubmit()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(packageService.updatePackage).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({
          environment: 'QA',
          assigneeEmail: 'joao@example.com',
        })
      )
    })

    it('deve mostrar erro quando projectId é inválido', async () => {
      // Modificar projectId para inválido e recriar wrapper
      mockRoute.query = { projectId: 'invalid' }
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Preencher formulário
      wrapper.vm.form.title = 'Pacote Atualizado'
      wrapper.vm.form.type = { label: 'Funcional', value: 'FUNCTIONAL' }
      wrapper.vm.form.priority = { label: 'Alta', value: 'HIGH' }
      wrapper.vm.form.release = 'v1.0'
      
      await wrapper.vm.onSubmit()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'ID do projeto inválido',
      })
      expect(packageService.updatePackage).not.toHaveBeenCalled()
      
      // Resetar para outros testes
      mockRoute.query = { projectId: '1' }
    })

    it('deve mostrar erro quando falha ao atualizar pacote', async () => {
      const errorResponse = Object.assign(new Error('Erro de rede'), {
        response: {
          status: 400,
          data: {
            message: 'Erro ao atualizar pacote',
          },
        },
      })
      vi.mocked(packageService.updatePackage).mockRejectedValueOnce(errorResponse)
      
      // Preencher formulário
      wrapper.vm.form.title = 'Pacote Atualizado'
      wrapper.vm.form.type = { label: 'Funcional', value: 'FUNCTIONAL' }
      wrapper.vm.form.priority = { label: 'Alta', value: 'HIGH' }
      wrapper.vm.form.release = 'v1.0'
      
      await wrapper.vm.onSubmit()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao atualizar pacote',
      })
    })

    it('deve mostrar erro genérico quando erro não tem response.data.message', async () => {
      const errorResponse = Object.assign(new Error('Erro de rede'), {
        response: {
          data: {},
        },
      })
      vi.mocked(packageService.updatePackage).mockRejectedValueOnce(errorResponse)
      
      // Preencher formulário
      wrapper.vm.form.title = 'Pacote Atualizado'
      wrapper.vm.form.type = { label: 'Funcional', value: 'FUNCTIONAL' }
      wrapper.vm.form.priority = { label: 'Alta', value: 'HIGH' }
      wrapper.vm.form.release = 'v1.0'
      
      await wrapper.vm.onSubmit()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao atualizar pacote',
      })
    })
  })

  describe('Navegação', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve voltar quando clicar em cancelar', async () => {
      await wrapper.vm.goBack()
      await wrapper.vm.$nextTick()
      
      expect(mockBack).toHaveBeenCalled()
    })
  })

  describe('Funções auxiliares', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve converter objeto para valor corretamente', () => {
      expect(wrapper.vm.getOptionValue({ label: 'Teste', value: 'TEST' })).toBe('TEST')
      expect(wrapper.vm.getOptionValue('TEST')).toBe('TEST')
      expect(wrapper.vm.getOptionValue(null)).toBe('')
    })

    it('deve validar datas corretamente', () => {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      expect(wrapper.vm.dateOptions(tomorrow.toISOString().split('T')[0])).toBe(true)
      
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      expect(wrapper.vm.dateOptions(yesterday.toISOString().split('T')[0])).toBe(false)
    })
  })
})

