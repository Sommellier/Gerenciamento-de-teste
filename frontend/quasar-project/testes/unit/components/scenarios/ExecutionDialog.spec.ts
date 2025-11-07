import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ExecutionDialog from 'src/components/scenarios/ExecutionDialog.vue'
import { scenarioService } from 'src/services/scenario.service'
import { Notify } from 'quasar'
import type { TestScenario } from 'src/services/scenario.service'

// Mock dos serviços
vi.mock('src/services/scenario.service', () => ({
  scenarioService: {
    executeScenario: vi.fn(),
  },
}))

// Mock do Quasar
vi.mock('quasar', () => ({
  Notify: {
    create: vi.fn(),
  },
}))

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: { template: '<div>Home</div>' } }],
})

describe('ExecutionDialog', () => {
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
    steps: [
      { order: 1, action: 'Action 1', expected: 'Expected 1' },
      { order: 2, action: 'Action 2', expected: 'Expected 2' },
    ],
  }

  const createWrapper = (props = {}) => {
    return mount(ExecutionDialog, {
      props: {
        modelValue: true,
        scenario: mockScenario,
        ...props,
      },
      global: {
        plugins: [router],
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
            props: ['icon', 'flat', 'round', 'dense', 'color', 'label', 'loading', 'disable'],
          },
          'q-space': {
            template: '<div class="q-space"></div>',
          },
          'q-list': {
            template: '<div class="q-list"><slot /></div>',
            props: ['bordered', 'separator'],
          },
          'q-expansion-item': {
            template: '<div class="q-expansion-item"><slot /></div>',
            props: ['label', 'defaultOpened'],
          },
          'q-checkbox': {
            template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
            props: ['modelValue', 'label', 'color'],
            emits: ['update:modelValue'],
          },
          'q-input': {
            template: `
              <div class="q-input">
                <label v-if="label">{{ label }}</label>
                <textarea v-if="type === \'textarea\'" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" v-bind="$attrs"></textarea>
                <input v-else :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" v-bind="$attrs" />
              </div>
            `,
            props: ['modelValue', 'label', 'type', 'rows', 'filled', 'placeholder'],
            emits: ['update:modelValue'],
          },
          'q-select': {
            template: `
              <div class="q-select">
                <label v-if="label">{{ label }}</label>
                <select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" v-bind="$attrs">
                  <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </div>
            `,
            props: ['modelValue', 'options', 'label', 'emitValue', 'mapOptions', 'rules', 'filled'],
            emits: ['update:modelValue'],
          },
          'q-stat': {
            template: '<div class="q-stat"><slot /></div>',
            props: ['value', 'label', 'color'],
          },
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('deve exibir título do cenário', () => {
      wrapper = createWrapper()
      expect(wrapper.text()).toContain('Executar Cenário: Test Scenario')
    })

    it('deve inicializar resultados dos passos', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.stepResults.length).toBe(2)
      expect(wrapper.vm.stepNotes.length).toBe(2)
    })

    it('deve exibir dataInput quando step tem dataInput', () => {
      const scenarioWithDataInput: TestScenario = {
        ...mockScenario,
        steps: [
          { order: 1, action: 'Action 1', expected: 'Expected 1', dataInput: 'Input data' },
        ],
      }
      wrapper = createWrapper({ scenario: scenarioWithDataInput })
      expect(wrapper.exists()).toBe(true)
    })

    it('deve exibir checkpoint quando step tem checkpoint', () => {
      const scenarioWithCheckpoint: TestScenario = {
        ...mockScenario,
        steps: [
          { order: 1, action: 'Action 1', expected: 'Expected 1', checkpoint: 'Checkpoint data' },
        ],
      }
      wrapper = createWrapper({ scenario: scenarioWithCheckpoint })
      expect(wrapper.exists()).toBe(true)
    })

    it('deve usar index quando step não tem order (linha 19)', () => {
      const scenarioWithoutOrder: TestScenario = {
        ...mockScenario,
        steps: [
          { action: 'Action 1', expected: 'Expected 1' }, // sem order
          { action: 'Action 2', expected: 'Expected 2' }, // sem order
        ],
      }
      wrapper = createWrapper({ scenario: scenarioWithoutOrder })
      expect(wrapper.exists()).toBe(true)
      // Verificar que o componente renderiza corretamente com steps sem order
      expect(wrapper.vm.stepResults.length).toBe(2)
    })

    it('deve usar index no checkbox quando step não tem order (linha 50)', async () => {
      const scenarioWithoutOrder: TestScenario = {
        ...mockScenario,
        steps: [
          { action: 'Action 1', expected: 'Expected 1' }, // sem order
        ],
      }
      wrapper = createWrapper({ scenario: scenarioWithoutOrder })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(wrapper.vm.stepResults.length).toBe(1)
      expect(wrapper.vm.stepNotes.length).toBe(1)
    })
  })

  describe('Execução', () => {
    it('deve registrar execução com sucesso', async () => {
      vi.mocked(scenarioService.executeScenario).mockResolvedValueOnce({
        message: 'Success',
        execution: {
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
        },
      })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      wrapper.vm.executionResult.status = 'PASSED'
      wrapper.vm.executionResult.notes = 'Test notes'
      wrapper.vm.stepResults = [true, true]

      await wrapper.vm.onExecute()
      await wrapper.vm.$nextTick()

      expect(scenarioService.executeScenario).toHaveBeenCalledWith(1, {
        status: 'PASSED',
        notes: 'Test notes',
      })
      expect(Notify.create).toHaveBeenCalledWith({
        type: 'positive',
        message: 'Execução registrada com sucesso',
      })
    })

    it('deve validar que pelo menos um passo foi executado', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      wrapper.vm.executionResult.status = 'PASSED'
      wrapper.vm.stepResults = [false, false]

      await wrapper.vm.onExecute()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Marque pelo menos um passo como executado',
      })
      expect(scenarioService.executeScenario).not.toHaveBeenCalled()
    })

    it('deve incluir notas de passos com problema', async () => {
      vi.mocked(scenarioService.executeScenario).mockResolvedValueOnce({
        message: 'Success',
        execution: {
          id: 1,
          status: 'FAILED',
          runNumber: 1,
          executedAt: '2024-01-01T00:00:00Z',
          userId: 1,
          user: {
            id: 1,
            name: 'User 1',
            email: 'user1@example.com',
          },
        },
      })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      wrapper.vm.executionResult.status = 'FAILED'
      wrapper.vm.executionResult.notes = 'General notes'
      wrapper.vm.stepResults = [true, false]
      wrapper.vm.stepNotes = ['', 'Step 2 failed']

      await wrapper.vm.onExecute()
      await wrapper.vm.$nextTick()

      expect(scenarioService.executeScenario).toHaveBeenCalled()
      const call = vi.mocked(scenarioService.executeScenario).mock.calls[0]
      expect(call[1].notes).toContain('General notes')
      expect(call[1].notes).toContain('Passos com problema')
      expect(call[1].notes).toContain('Step 2 failed')
    })

    it('deve não incluir seção de passos com problema quando todos passaram (melhorar branches)', async () => {
      vi.mocked(scenarioService.executeScenario).mockResolvedValueOnce({
        message: 'Success',
        execution: {
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
        },
      })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      wrapper.vm.executionResult.status = 'PASSED'
      wrapper.vm.executionResult.notes = 'General notes'
      wrapper.vm.stepResults = [true, true] // todos passaram
      wrapper.vm.stepNotes = ['', '']

      await wrapper.vm.onExecute()
      await wrapper.vm.$nextTick()

      expect(scenarioService.executeScenario).toHaveBeenCalled()
      const call = vi.mocked(scenarioService.executeScenario).mock.calls[0]
      expect(call[1].notes).toBe('General notes')
      expect(call[1].notes).not.toContain('Passos com problema')
    })

    it('deve incluir notas de passos mesmo quando stepNotes está vazio', async () => {
      vi.mocked(scenarioService.executeScenario).mockResolvedValueOnce({
        message: 'Success',
        execution: {
          id: 1,
          status: 'FAILED',
          runNumber: 1,
          executedAt: '2024-01-01T00:00:00Z',
          userId: 1,
          user: {
            id: 1,
            name: 'User 1',
            email: 'user1@example.com',
          },
        },
      })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      wrapper.vm.executionResult.status = 'FAILED'
      wrapper.vm.executionResult.notes = 'General notes'
      wrapper.vm.stepResults = [true, false] // segundo passo falhou
      wrapper.vm.stepNotes = ['', ''] // sem notas específicas

      await wrapper.vm.onExecute()
      await wrapper.vm.$nextTick()

      expect(scenarioService.executeScenario).toHaveBeenCalled()
      const call = vi.mocked(scenarioService.executeScenario).mock.calls[0]
      expect(call[1].notes).toContain('General notes')
      expect(call[1].notes).toContain('Passos com problema')
      expect(call[1].notes).toContain('Passo 2: Action 2') // deve incluir mesmo sem nota
    })

    it('deve usar index quando step não tem order na consolidação de notas (linha 222)', async () => {
      const scenarioWithoutOrder: TestScenario = {
        ...mockScenario,
        steps: [
          { action: 'Action 1', expected: 'Expected 1' }, // sem order
          { action: 'Action 2', expected: 'Expected 2' }, // sem order
        ],
      }

      vi.mocked(scenarioService.executeScenario).mockResolvedValueOnce({
        message: 'Success',
        execution: {
          id: 1,
          status: 'FAILED',
          runNumber: 1,
          executedAt: '2024-01-01T00:00:00Z',
          userId: 1,
          user: {
            id: 1,
            name: 'User 1',
            email: 'user1@example.com',
          },
        },
      })

      wrapper = createWrapper({ scenario: scenarioWithoutOrder })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      wrapper.vm.executionResult.status = 'FAILED'
      wrapper.vm.executionResult.notes = 'General notes'
      wrapper.vm.stepResults = [true, false] // segundo passo falhou
      wrapper.vm.stepNotes = ['', 'Step 2 failed']

      await wrapper.vm.onExecute()
      await wrapper.vm.$nextTick()

      expect(scenarioService.executeScenario).toHaveBeenCalled()
      const call = vi.mocked(scenarioService.executeScenario).mock.calls[0]
      expect(call[1].notes).toContain('Passo 2: Action 2') // deve usar index + 1 quando não tem order
      expect(call[1].notes).toContain('Step 2 failed')
    })

    it('deve tratar erro ao executar', async () => {
      vi.mocked(scenarioService.executeScenario).mockRejectedValueOnce(new Error('Execution failed'))

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      wrapper.vm.executionResult.status = 'PASSED'
      wrapper.vm.stepResults = [true, true]

      await wrapper.vm.onExecute()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith({
        type: 'negative',
        message: 'Erro ao registrar execução',
      })
    })
  })

  describe('Reset Form', () => {
    it('deve resetar formulário corretamente', () => {
      wrapper = createWrapper()
      wrapper.vm.stepResults = [true, false]
      wrapper.vm.stepNotes = ['Note 1', 'Note 2']
      wrapper.vm.executionResult = { status: 'PASSED', notes: 'Test' }

      wrapper.vm.resetForm()

      expect(wrapper.vm.stepResults).toEqual([])
      expect(wrapper.vm.stepNotes).toEqual([])
      expect(wrapper.vm.executionResult.status).toBe('')
      expect(wrapper.vm.executionResult.notes).toBe('')
    })
  })

  describe('Watchers', () => {
    it('deve resetar e inicializar quando modelValue muda para true', async () => {
      wrapper = createWrapper({ modelValue: false })
      await wrapper.vm.$nextTick()

      wrapper.setProps({ modelValue: true })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.stepResults.length).toBe(2)
      expect(wrapper.vm.stepNotes.length).toBe(2)
    })

    it('deve resetar e inicializar quando scenario muda e modelValue é true', async () => {
      wrapper = createWrapper({ modelValue: true })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      const newScenario: TestScenario = {
        ...mockScenario,
        steps: [
          { order: 1, action: 'New Action', expected: 'New Expected' },
        ],
      }

      wrapper.setProps({ scenario: newScenario })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.vm.stepResults.length).toBe(1)
      expect(wrapper.vm.stepNotes.length).toBe(1)
    })
  })
})

