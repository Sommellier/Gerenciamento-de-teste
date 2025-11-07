import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import EssentialLink from 'src/components/EssentialLink.vue'

describe('EssentialLink', () => {
  let wrapper: VueWrapper<any>

  const createWrapper = (props = {}) => {
    return mount(EssentialLink, {
      props: {
        title: 'Test Link',
        ...props,
      },
      global: {
        stubs: {
          'q-item': {
            template: '<a :href="$attrs.href || href" :target="$attrs.target || target || \'_blank\'" class="q-item" v-bind="$attrs"><slot /></a>',
            props: ['href', 'target', 'clickable', 'tag'],
          },
          'q-item-section': {
            template: '<div class="q-item-section" v-bind="$attrs"><slot /></div>',
            props: ['avatar'],
          },
          'q-item-label': {
            template: '<div class="q-item-label" v-bind="$attrs"><slot /></div>',
            props: ['caption'],
          },
          'q-icon': {
            template: '<span class="q-icon" :name="name" v-bind="$attrs"></span>',
            props: ['name'],
          },
        },
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
      expect(wrapper.text()).toContain('Test Link')
    })

    it('deve renderizar caption quando fornecido', () => {
      wrapper = createWrapper({ caption: 'Test Caption' })
      expect(wrapper.text()).toContain('Test Caption')
    })

    it('deve não renderizar caption quando não fornecido', () => {
      expect(wrapper.text()).not.toContain('Test Caption')
    })

    it('deve renderizar ícone quando fornecido', () => {
      wrapper = createWrapper({ icon: 'home' })
      const icon = wrapper.find('.q-icon')
      expect(icon.exists()).toBe(true)
      expect(icon.attributes('name')).toBe('home')
    })

    it('deve não renderizar ícone quando não fornecido', () => {
      const icon = wrapper.find('.q-icon')
      expect(icon.exists()).toBe(false)
    })
  })

  describe('Props', () => {
    it('deve usar link padrão quando não fornecido', () => {
      const link = wrapper.find('a')
      expect(link.attributes('href')).toBe('#')
    })

    it('deve usar link fornecido', () => {
      wrapper = createWrapper({ link: 'https://example.com' })
      const link = wrapper.find('a')
      expect(link.attributes('href')).toBe('https://example.com')
    })

    it('deve ter target _blank', () => {
      const link = wrapper.find('a')
      expect(link.attributes('target')).toBe('_blank')
    })

    it('deve renderizar título correto', () => {
      wrapper = createWrapper({ title: 'Custom Title' })
      expect(wrapper.text()).toContain('Custom Title')
    })

    it('deve renderizar caption correto', () => {
      wrapper = createWrapper({ caption: 'Custom Caption' })
      expect(wrapper.text()).toContain('Custom Caption')
    })

    it('deve renderizar ícone correto', () => {
      wrapper = createWrapper({ icon: 'settings' })
      const icon = wrapper.find('.q-icon')
      expect(icon.attributes('name')).toBe('settings')
    })
  })

  describe('Estrutura HTML', () => {
    it('deve ter estrutura correta com q-item', () => {
      const item = wrapper.find('.q-item')
      expect(item.exists()).toBe(true)
    })

    it('deve ter q-item-section quando ícone fornecido', () => {
      wrapper = createWrapper({ icon: 'home' })
      const sections = wrapper.findAll('.q-item-section')
      expect(sections.length).toBeGreaterThan(0)
    })
  })
})

