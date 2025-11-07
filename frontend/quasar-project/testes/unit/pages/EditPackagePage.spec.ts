import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import EditPackagePage from 'pages/EditPackagePage.vue'
import * as packageService from 'src/services/package.service'
import * as projectDetailsService from 'src/services/project-details.service'

const mockNotify = vi.fn()
const mockPush = vi.fn()

const mockRoute = {
  params: { projectId: '1', packageId: '1' },
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
    { path: '/projects/:projectId/packages/:packageId/edit', component: EditPackagePage },
    { path: '/projects/:projectId/packages', component: { template: '<div>Packages</div>' } },
  ],
})

router.push = mockPush

// Mock dos serviços
vi.mock('src/services/package.service', () => ({
  getPackageDetails: vi.fn(),
  updatePackage: vi.fn(),
}))

vi.mock('src/services/project-details.service', () => ({
  getProjectDetails: vi.fn(),
  getAvailableReleases: vi.fn(),
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('vue-router')
  return {
    ...actual,
    useRoute: () => mockRoute,
    useRouter: () => router,
  }
})

describe('EditPackagePage', () => {
  let wrapper: ReturnType<typeof mount>

  const createWrapper = () => {
    return mount(EditPackagePage, {
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
    vi.mocked(projectDetailsService.getProjectDetails).mockResolvedValue({
      id: 1,
      name: 'Projeto Teste',
      description: 'Descrição',
      members: [
        { id: 1, name: 'João', email: 'joao@example.com' },
        { id: 2, name: 'Maria', email: 'maria@example.com' },
      ],
    })
    vi.mocked(projectDetailsService.getAvailableReleases).mockResolvedValue(['v1.0', 'v1.1'])
    vi.mocked(packageService.updatePackage).mockResolvedValue({ id: 1, title: 'Pacote Atualizado' })
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(wrapper.html()).toContain('Editar Pacote')
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
      expect(wrapper.vm.packageForm.name).toBe('Pacote de Teste')
    })

    it('deve carregar releases e membros ao montar', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(projectDetailsService.getProjectDetails).toHaveBeenCalledWith(1)
      expect(projectDetailsService.getAvailableReleases).toHaveBeenCalledWith(1)
    })

    it('deve mostrar erro quando falha ao carregar dados', async () => {
      vi.mocked(packageService.getPackageDetails).mockRejectedValue(new Error('Erro ao carregar'))
      
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao carregar dados',
      })
    })
  })

  describe('Interação com formulário', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve atualizar nome do pacote', async () => {
      wrapper.vm.packageForm.name = 'Novo Nome do Pacote'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.packageForm.name).toBe('Novo Nome do Pacote')
    })

    it('deve adicionar tag', async () => {
      wrapper.vm.tagsInput = 'tag1'
      wrapper.vm.packageForm.tags = []
      await wrapper.vm.addTag()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.packageForm.tags).toContain('tag1')
      expect(wrapper.vm.tagsInput).toBe('')
    })

    it('deve remover tag', async () => {
      wrapper.vm.packageForm.tags = ['tag1', 'tag2']
      await wrapper.vm.removeTag(0)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.packageForm.tags).not.toContain('tag1')
      expect(wrapper.vm.packageForm.tags).toContain('tag2')
    })
  })

  describe('Submissão do formulário', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve atualizar pacote quando formulário é submetido', async () => {
      wrapper.vm.packageForm.name = 'Pacote Atualizado'
      wrapper.vm.packageForm.type = 'FUNCTIONAL'
      wrapper.vm.packageForm.priority = 'HIGH'
      wrapper.vm.packageForm.release = 'v1.0'
      
      // Mock form validation
      wrapper.vm.formRef = { validate: vi.fn().mockResolvedValue(true) }
      
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
        })
      )
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Pacote atualizado com sucesso!',
        position: 'top',
      })
      expect(mockPush).toHaveBeenCalledWith('/projects/1/packages')
    })

    it('deve mostrar erro quando falha ao atualizar pacote', async () => {
      vi.mocked(packageService.updatePackage).mockRejectedValueOnce(new Error('Erro ao atualizar'))
      
      wrapper.vm.packageForm.name = 'Pacote Atualizado'
      wrapper.vm.packageForm.type = 'FUNCTIONAL'
      wrapper.vm.packageForm.priority = 'HIGH'
      wrapper.vm.packageForm.release = 'v1.0'
      
      wrapper.vm.formRef = { validate: vi.fn().mockResolvedValue(true) }
      
      await wrapper.vm.onSubmit()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockNotify).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao atualizar pacote',
        position: 'top',
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
      
      expect(mockPush).toHaveBeenCalledWith('/projects/1/packages')
    })
  })

  describe('Funções auxiliares', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('deve retornar cor para tag', () => {
      const color1 = wrapper.vm.getTagColor('tag1')
      const color2 = wrapper.vm.getTagColor('tag2')
      
      expect(color1).toBeTruthy()
      expect(color2).toBeTruthy()
    })
  })
})

