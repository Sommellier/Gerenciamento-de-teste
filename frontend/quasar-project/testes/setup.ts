import { vi } from 'vitest'
import { config } from '@vue/test-utils'

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

