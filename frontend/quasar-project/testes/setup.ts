import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// Mock do sessionStorage (migrado de localStorage para maior segurança)
// Deve ser configurado antes de qualquer importação que use sessionStorage
const storage: Record<string, string> = {}
const sessionStorageMock = {
  getItem: vi.fn((key: string) => storage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key]
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach(key => delete storage[key])
  }),
  get length() {
    return Object.keys(storage).length
  },
  key: vi.fn((index: number) => {
    const keys = Object.keys(storage)
    return keys[index] || null
  }),
}

// Definir sessionStorage no global/window antes de qualquer importação
if (typeof global !== 'undefined') {
  (global as any).sessionStorage = sessionStorageMock
}
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
    configurable: true,
  })
  
  // Mock do window.location para o interceptor de resposta do api.ts
  if (!window.location) {
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
        href: 'http://localhost/',
      },
      writable: true,
      configurable: true,
    })
  }
}

// Mock do Quasar
const mockNotify = vi.fn()
vi.mock('quasar', () => ({
  useQuasar: () => ({
    notify: mockNotify,
  }),
}))

// Configuração global do Vue Test Utils
config.global.mocks = {
  $q: {
    notify: mockNotify,
  },
}

