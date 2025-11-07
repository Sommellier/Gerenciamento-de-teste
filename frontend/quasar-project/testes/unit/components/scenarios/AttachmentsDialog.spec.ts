import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import AttachmentsDialog from 'src/components/scenarios/AttachmentsDialog.vue'
import { scenarioService } from 'src/services/scenario.service'
import { Notify } from 'quasar'
import type { TestScenario, ScenarioEvidence, ScenarioExecution } from 'src/services/scenario.service'

// Mock dos serviços
vi.mock('src/services/scenario.service', () => ({
  scenarioService: {
    getScenarioById: vi.fn(),
    uploadEvidence: vi.fn(),
  },
}))

// Mock do Quasar
vi.mock('quasar', () => ({
  Notify: {
    create: vi.fn(),
  },
}))

// Mock do window.open
const mockOpen = vi.fn()
Object.defineProperty(window, 'open', {
  value: mockOpen,
  writable: true,
})

// Mock do document.createElement
const mockClick = vi.fn()
let mockLink: {
  href: string
  download: string
  click: ReturnType<typeof vi.fn>
}

// Salvar implementação original
const originalCreateElement = document.createElement.bind(document)
const createElementSpy = vi.spyOn(document, 'createElement')

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: { template: '<div>Home</div>' } }],
})

describe('AttachmentsDialog', () => {
  let wrapper: VueWrapper<any>

  const mockScenario: TestScenario = {
    id: 1,
    title: 'Test Scenario',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    status: 'CREATED',
    projectId: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    steps: [],
  }

  const mockEvidence: ScenarioEvidence = {
    id: 1,
    filename: 'test.jpg',
    originalName: 'test.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    storageUrl: 'http://example.com/test.jpg',
    checksum: 'abc123',
    scenarioId: 1,
    uploadedBy: 1,
    uploadedByUser: {
      id: 1,
      name: 'User 1',
      email: 'user1@example.com',
    },
    createdAt: '2024-01-01T00:00:00Z',
  }

  const mockExecution: ScenarioExecution = {
    id: 1,
    status: 'PASSED',
    runNumber: 1,
    executedAt: '2024-01-01T00:00:00Z',
    userId: 1,
    user: {
      id: 1,
      name: 'User 1',
      email: 'user1@example.com',
    },
    evidences: [mockEvidence],
  }

  const createWrapper = (props = {}) => {
    return mount(AttachmentsDialog, {
      props: {
        modelValue: true,
        scenario: mockScenario,
        ...props,
      },
      global: {
        plugins: [router],
        directives: {
          'close-popup': () => {},
        },
        stubs: {
          'q-dialog': {
            template: '<div v-if="modelValue" class="q-dialog"><slot /></div>',
            props: ['modelValue', 'persistent', 'maxWidth'],
          },
          'q-card': {
            template: '<div class="q-card"><slot /></div>',
          },
          'q-card-section': {
            template: '<div class="q-card-section"><slot /></div>',
          },
          'q-card-actions': {
            template: '<div class="q-card-actions"><slot /></div>',
          },
          'q-btn': {
            template: '<button @click="$attrs.onClick" v-bind="$attrs"><slot /></button>',
            props: ['icon', 'flat', 'round', 'dense', 'color', 'label', 'loading'],
          },
          'q-space': {
            template: '<div class="q-space"></div>',
          },
          'q-file': {
            template: `
              <div class="q-file">
                <input type="file" @change="handleChange" v-bind="$attrs" />
                <slot name="prepend"></slot>
              </div>
            `,
            props: ['modelValue', 'label', 'accept', 'maxFileSize', 'filled'],
            emits: ['update:modelValue', 'rejected'],
            methods: {
              handleChange(event: Event) {
                const target = event.target as HTMLInputElement
                if (target.files && target.files[0]) {
                  this.$emit('update:modelValue', target.files[0])
                }
              },
            },
          },
          'q-list': {
            template: '<div class="q-list"><slot /></div>',
            props: ['bordered', 'separator'],
          },
          'q-item': {
            template: '<div class="q-item" v-bind="$attrs"><slot /></div>',
            props: ['key'],
          },
          'q-item-section': {
            template: '<div class="q-item-section" v-bind="$attrs"><slot /></div>',
            props: ['avatar', 'side'],
          },
          'q-item-label': {
            template: '<div class="q-item-label" v-bind="$attrs"><slot /></div>',
            props: ['caption'],
          },
          'q-icon': {
            template: '<span class="q-icon" :name="name" v-bind="$attrs"></span>',
            props: ['name', 'color', 'size'],
          },
          'q-chip': {
            template: '<span class="q-chip" v-bind="$attrs"><slot /></span>',
            props: ['color', 'textColor', 'label', 'size'],
          },
          'q-tooltip': {
            template: '<div class="q-tooltip"><slot /></div>',
          },
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockClick.mockClear()
    
    mockLink = {
      href: '',
      download: '',
      click: mockClick,
    }
    
    createElementSpy.mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as any
      }
      // Usar implementação original para outros elementos
      return originalCreateElement(tagName)
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', async () => {
      vi.mocked(scenarioService.getScenarioById).mockResolvedValueOnce({
        message: 'Success',
        scenario: { ...mockScenario, evidences: [] },
      })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Upload de Arquivo', () => {
    it('deve fazer upload de arquivo com sucesso', async () => {
      vi.mocked(scenarioService.getScenarioById).mockResolvedValueOnce({
        message: 'Success',
        scenario: { ...mockScenario, evidences: [] },
      })
      vi.mocked(scenarioService.uploadEvidence).mockResolvedValueOnce({
        message: 'Success',
        evidence: mockEvidence,
      })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      wrapper.vm.selectedFile = file
      await wrapper.vm.uploadFile()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(scenarioService.uploadEvidence).toHaveBeenCalledWith(1, file)
      expect(Notify.create).toHaveBeenCalled()
    })

    it('deve tratar erro ao fazer upload', async () => {
      vi.mocked(scenarioService.getScenarioById).mockResolvedValueOnce({
        message: 'Success',
        scenario: { ...mockScenario, evidences: [] },
      })
      vi.mocked(scenarioService.uploadEvidence).mockRejectedValueOnce(new Error('Upload failed'))

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      wrapper.vm.selectedFile = file
      await wrapper.vm.uploadFile()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(Notify.create).toHaveBeenCalled()
    })

    it('deve tratar arquivo rejeitado', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.onFileRejected([
        { failedPropValidation: 'max-file-size' },
        { failedPropValidation: 'accept' },
      ])
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Arquivo rejeitado: max-file-size, accept',
      })
    })
  })

  describe('Carregamento de Evidências', () => {
    it('deve carregar evidências ao abrir diálogo', async () => {
      vi.mocked(scenarioService.getScenarioById).mockResolvedValueOnce({
        message: 'Success',
        scenario: { ...mockScenario, evidences: [mockEvidence] },
      })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 300))

      expect(scenarioService.getScenarioById).toHaveBeenCalled()
    })
  })

  describe('Funções Auxiliares', () => {
    beforeEach(async () => {
      vi.mocked(scenarioService.getScenarioById).mockResolvedValueOnce({
        message: 'Success',
        scenario: { ...mockScenario, evidences: [] },
      })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('deve retornar ícone correto para diferentes tipos de arquivo', () => {
      expect(wrapper.vm.getFileIcon('image/jpeg')).toBe('image')
      expect(wrapper.vm.getFileIcon('image/png')).toBe('image')
      expect(wrapper.vm.getFileIcon('application/pdf')).toBe('picture_as_pdf')
      expect(wrapper.vm.getFileIcon('video/mp4')).toBe('video_file')
      expect(wrapper.vm.getFileIcon('video/webm')).toBe('video_file')
      expect(wrapper.vm.getFileIcon('text/plain')).toBe('description')
      expect(wrapper.vm.getFileIcon('text/html')).toBe('description')
      expect(wrapper.vm.getFileIcon('unknown/type')).toBe('attach_file')
    })

    it('deve retornar cor correta para diferentes tipos de arquivo', () => {
      expect(wrapper.vm.getFileColor('image/jpeg')).toBe('blue')
      expect(wrapper.vm.getFileColor('image/png')).toBe('blue')
      expect(wrapper.vm.getFileColor('application/pdf')).toBe('red')
      expect(wrapper.vm.getFileColor('video/mp4')).toBe('purple')
      expect(wrapper.vm.getFileColor('video/webm')).toBe('purple')
      expect(wrapper.vm.getFileColor('text/plain')).toBe('green')
      expect(wrapper.vm.getFileColor('text/html')).toBe('green')
      expect(wrapper.vm.getFileColor('unknown/type')).toBe('grey')
    })

    it('deve retornar cor de status de execução', () => {
      expect(wrapper.vm.getExecutionStatusColor('PASSED')).toBe('green')
      expect(wrapper.vm.getExecutionStatusColor('FAILED')).toBe('red')
      expect(wrapper.vm.getExecutionStatusColor('BLOCKED')).toBe('orange')
      expect(wrapper.vm.getExecutionStatusColor('UNKNOWN')).toBe('grey')
    })

    it('deve retornar label de status de execução', () => {
      expect(wrapper.vm.getExecutionStatusLabel('PASSED')).toBe('Concluído')
      expect(wrapper.vm.getExecutionStatusLabel('FAILED')).toBe('Falhou')
      expect(wrapper.vm.getExecutionStatusLabel('BLOCKED')).toBe('Bloqueado')
      expect(wrapper.vm.getExecutionStatusLabel('UNKNOWN')).toBe('UNKNOWN')
    })

    it('deve fazer preview de arquivo', () => {
      wrapper.vm.previewFile(mockEvidence)
      expect(mockOpen).toHaveBeenCalledWith('http://example.com/test.jpg', '_blank')
    })

    it('deve fazer download de arquivo', () => {
      wrapper.vm.downloadFile(mockEvidence)
      expect(mockLink.href).toBe('http://example.com/test.jpg')
      expect(mockLink.download).toBe('test.jpg')
      expect(mockClick).toHaveBeenCalled()
    })

    it('deve tratar erro ao deletar evidência (linhas 270-275)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Para testar o catch (270-275), precisamos fazer Notify.create lançar um erro
      const originalNotify = Notify.create
      let notifyCallCount = 0
      Notify.create = vi.fn((options) => {
        notifyCallCount++
        if (notifyCallCount === 1) {
          // Primeira chamada (no try) lança erro
          throw new Error('Erro ao criar notificação')
        }
        // Segunda chamada (no catch) não lança erro
        return originalNotify(options)
      })

      try {
        wrapper.vm.deleteEvidence(1)
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        // Erro esperado, não fazer nada
      }

      // Deve logar o erro e mostrar notificação de erro (linhas 270-275)
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(Notify.create).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao excluir evidência',
      })

      // Restaurar
      Notify.create = originalNotify
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Watchers', () => {
    it('deve carregar evidências quando modelValue muda para true', async () => {
      vi.mocked(scenarioService.getScenarioById).mockResolvedValueOnce({
        message: 'Success',
        scenario: { ...mockScenario, evidences: [] },
      })

      wrapper = createWrapper({ modelValue: false })
      await wrapper.vm.$nextTick()

      wrapper.setProps({ modelValue: true })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.getScenarioById).toHaveBeenCalled()
    })

    it('deve carregar evidências quando scenario muda e modelValue é true', async () => {
      vi.mocked(scenarioService.getScenarioById).mockResolvedValueOnce({
        message: 'Success',
        scenario: { ...mockScenario, evidences: [] },
      })

      wrapper = createWrapper({ modelValue: true })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      vi.mocked(scenarioService.getScenarioById).mockResolvedValueOnce({
        message: 'Success',
        scenario: { ...mockScenario, id: 2, evidences: [] },
      })

      wrapper.setProps({ scenario: { ...mockScenario, id: 2 } })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(scenarioService.getScenarioById).toHaveBeenCalledTimes(2)
    })
  })
})

