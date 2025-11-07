import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import ExampleComponent from 'src/components/ExampleComponent.vue'
import type { Todo, Meta } from 'src/components/models'

describe('ExampleComponent', () => {
  let wrapper: VueWrapper<any>

  const mockTodos: Todo[] = [
    { id: 1, content: 'Todo 1' },
    { id: 2, content: 'Todo 2' },
    { id: 3, content: 'Todo 3' },
  ]

  const mockMeta: Meta = {
    totalCount: 5,
  }

  const createWrapper = (props = {}) => {
    return mount(ExampleComponent, {
      props: {
        title: 'Test Title',
        todos: mockTodos,
        meta: mockMeta,
        active: true,
        ...props,
      },
    })
  }

  beforeEach(() => {
    wrapper = createWrapper()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', () => {
      expect(wrapper.exists()).toBe(true)
    })

    it('deve renderizar título', () => {
      expect(wrapper.text()).toContain('Test Title')
    })

    it('deve renderizar lista de todos', () => {
      const listItems = wrapper.findAll('li')
      expect(listItems.length).toBe(3)
      expect(listItems[0].text()).toContain('1 - Todo 1')
      expect(listItems[1].text()).toContain('2 - Todo 2')
      expect(listItems[2].text()).toContain('3 - Todo 3')
    })

    it('deve renderizar contador de todos', () => {
      expect(wrapper.text()).toContain('Count: 3 / 5')
    })

    it('deve renderizar status ativo', () => {
      expect(wrapper.text()).toContain('Active: yes')
    })

    it('deve renderizar status inativo', () => {
      wrapper = createWrapper({ active: false })
      expect(wrapper.text()).toContain('Active: no')
    })

    it('deve renderizar contador de cliques inicial', () => {
      expect(wrapper.text()).toContain('Clicks on todos: 0')
    })
  })

  describe('Props', () => {
    it('deve usar todos padrão quando não fornecido', () => {
      wrapper = createWrapper({ todos: undefined })
      const listItems = wrapper.findAll('li')
      expect(listItems.length).toBe(0)
      expect(wrapper.text()).toContain('Count: 0 / 5')
    })

    it('deve renderizar título correto', () => {
      wrapper = createWrapper({ title: 'Custom Title' })
      expect(wrapper.text()).toContain('Custom Title')
    })

    it('deve renderizar meta correta', () => {
      wrapper = createWrapper({ meta: { totalCount: 10 } })
      expect(wrapper.text()).toContain('Count: 3 / 10')
    })

    it('deve renderizar lista vazia quando não há todos', () => {
      wrapper = createWrapper({ todos: [] })
      const listItems = wrapper.findAll('li')
      expect(listItems.length).toBe(0)
      expect(wrapper.text()).toContain('Count: 0 / 5')
    })
  })

  describe('Interação', () => {
    it('deve incrementar contador de cliques ao clicar em todo', async () => {
      const listItems = wrapper.findAll('li')
      expect(wrapper.text()).toContain('Clicks on todos: 0')

      await listItems[0].trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Clicks on todos: 1')
    })

    it('deve incrementar contador múltiplas vezes', async () => {
      const listItems = wrapper.findAll('li')
      expect(wrapper.text()).toContain('Clicks on todos: 0')

      await listItems[0].trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Clicks on todos: 1')

      await listItems[1].trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Clicks on todos: 2')

      await listItems[2].trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Clicks on todos: 3')
    })

    it('deve chamar função increment ao clicar', async () => {
      const listItems = wrapper.findAll('li')
      const initialCount = wrapper.vm.clickCount

      await listItems[0].trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.clickCount).toBe(initialCount + 1)
    })
  })

  describe('Computed Properties', () => {
    it('deve calcular todoCount corretamente', () => {
      expect(wrapper.vm.todoCount).toBe(3)
    })

    it('deve calcular todoCount como 0 quando lista vazia', () => {
      wrapper = createWrapper({ todos: [] })
      expect(wrapper.vm.todoCount).toBe(0)
    })

    it('deve atualizar todoCount quando todos mudam', async () => {
      expect(wrapper.vm.todoCount).toBe(3)

      await wrapper.setProps({ todos: [{ id: 1, content: 'Todo 1' }] })
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.todoCount).toBe(1)
    })
  })

  describe('Função increment', () => {
    it('deve retornar novo valor do contador', () => {
      const initialCount = wrapper.vm.clickCount
      const result = wrapper.vm.increment()
      expect(result).toBe(initialCount + 1)
    })

    it('deve incrementar contador internamente', () => {
      const initialCount = wrapper.vm.clickCount
      wrapper.vm.increment()
      expect(wrapper.vm.clickCount).toBe(initialCount + 1)
    })
  })
})

