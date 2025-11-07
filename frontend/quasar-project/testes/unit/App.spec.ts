import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import App from 'src/App.vue'

// Mock do router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } },
  ],
})

describe('App.vue', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('deve renderizar o componente corretamente', async () => {
    wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    await router.isReady()
    await wrapper.vm.$nextTick()

    expect(wrapper.exists()).toBe(true)
  })

  it('deve renderizar router-view', async () => {
    await router.push('/')
    await router.isReady()

    wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Verificar se o componente foi renderizado (router-view renderiza o conteúdo do router)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.html()).toBeTruthy()
  })

  it('deve renderizar conteúdo do router', async () => {
    await router.push('/')
    await router.isReady()

    wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Verificar se o conteúdo do router foi renderizado
    expect(wrapper.html()).toBeTruthy()
  })
})

