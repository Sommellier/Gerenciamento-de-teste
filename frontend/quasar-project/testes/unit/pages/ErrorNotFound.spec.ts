import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ErrorNotFound from 'pages/ErrorNotFound.vue'

const mockPush = vi.fn()

// Mock do Vue Router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/404', component: ErrorNotFound },
  ],
})

router.push = mockPush

describe('ErrorNotFound', () => {
  let wrapper: ReturnType<typeof mount>

  const createWrapper = () => {
    return mount(ErrorNotFound, {
      global: {
        plugins: [router],
        stubs: {
          'q-page': {
            template: '<div class="q-page"><slot /></div>',
            props: ['class'],
          },
          'q-btn': {
            template: '<button @click="handleClick" class="q-btn" v-bind="$attrs"><slot>{{ label }}</slot></button>',
            props: ['label', 'color', 'to'],
            methods: {
              handleClick() {
                if (this.$attrs.to) {
                  router.push(this.$attrs.to)
                }
              },
            },
          },
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Renderização', () => {
    it('deve renderizar o componente corretamente', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('404 - Page Not Found')
      expect(wrapper.html()).toContain('Voltar para o início')
    })

    it('deve renderizar o botão de voltar', () => {
      wrapper = createWrapper()
      
      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Voltar para o início')
    })
  })

  describe('Navegação', () => {
    it('deve navegar para home quando clicar no botão', async () => {
      wrapper = createWrapper()
      
      const button = wrapper.find('button')
      await button.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })
})

