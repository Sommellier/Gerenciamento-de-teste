// src/tests/infrastructure/prisma.spec.ts
// Testes do bootstrap de src/infrastructure/prisma.ts

import path from 'path'

// ---- Mocks (hoisted pelo Jest) ----
const mockDotenvConfig = jest.fn()
jest.mock('dotenv', () => ({
  config: (opts: any) => mockDotenvConfig(opts),
}))

const mockPrismaClientCtor = jest
  .fn()
  .mockImplementation(() => ({ $disconnect: jest.fn() }))

jest.mock('@prisma/client', () => ({
  PrismaClient: mockPrismaClientCtor,
}))
// -----------------------------------

describe('infrastructure/prisma bootstrap', () => {
  // Caminho real do módulo que queremos testar
  const MODULE_PATH = path.resolve(__dirname, '../../infrastructure/prisma')
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules() // limpa cache do require/import
    process.env = { ...OLD_ENV } // isola env entre testes
    mockDotenvConfig.mockReset()
    mockPrismaClientCtor.mockClear()
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('usa .env.test quando NODE_ENV="test" e instancia PrismaClient', () => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db'

    let exported: any
    jest.isolateModules(() => {
      exported = require(MODULE_PATH) // executa o bootstrap do módulo
    })

    expect(mockDotenvConfig).toHaveBeenCalledWith({ path: '.env.test' })
    expect(mockPrismaClientCtor).toHaveBeenCalledTimes(1)
    expect(exported.prisma).toBeDefined()
  })

  it('usa .env quando NODE_ENV != "test"', () => {
    process.env.NODE_ENV = 'development'
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db'

    jest.isolateModules(() => {
      require(MODULE_PATH)
    })

    expect(mockDotenvConfig).toHaveBeenCalledWith({ path: '.env' })
    expect(mockPrismaClientCtor).toHaveBeenCalledTimes(1)
  })

  it('lança erro quando DATABASE_URL não está definida', () => {
    process.env.NODE_ENV = 'development'
    delete process.env.DATABASE_URL

    expect(() =>
      jest.isolateModules(() => {
        require(MODULE_PATH)
      })
    ).toThrow(/DATABASE_URL/i)
  })
})
