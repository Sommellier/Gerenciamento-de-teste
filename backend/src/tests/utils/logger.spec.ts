describe('logger', () => {
  const originalConsoleLog = console.log
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn
  const originalConsoleDebug = console.debug
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    console.log = jest.fn()
    console.error = jest.fn()
    console.warn = jest.fn()
    console.debug = jest.fn()
  })

  afterEach(() => {
    console.log = originalConsoleLog
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
    console.debug = originalConsoleDebug
  })

  afterAll(() => {
    process.env.NODE_ENV = originalEnv
  })

  describe('logger em modo não-produção (test/development)', () => {
    let logger: any

    beforeAll(() => {
      // Salvar NODE_ENV original
      const originalEnv = process.env.NODE_ENV
      
      // Mudar para test
      process.env.NODE_ENV = 'test'
      
      // Resetar módulos do Jest
      jest.resetModules()
      
      // Importar o módulo em modo test
      const loggerModule = require('../../utils/logger')
      logger = loggerModule.logger
      
      // Restaurar NODE_ENV original
      process.env.NODE_ENV = originalEnv
    })

    it('deve logar mensagens em ambiente não-produção', () => {
      logger.log('test message')
      expect(console.log).toHaveBeenCalledWith('test message')
    })

    it('deve logar múltiplos argumentos', () => {
      logger.log('message', 123, { data: 'test' })
      expect(console.log).toHaveBeenCalledWith('message', 123, { data: 'test' })
    })

    it('deve logar debug em ambiente não-produção', () => {
      logger.debug('debug message')
      expect(console.debug).toHaveBeenCalledWith('debug message')
    })

    it('deve sempre logar erros independente do ambiente', () => {
      logger.error('error message')
      expect(console.error).toHaveBeenCalledWith('error message')
    })

    it('deve sempre logar warnings independente do ambiente', () => {
      logger.warn('warning message')
      expect(console.warn).toHaveBeenCalledWith('warning message')
    })

    it('deve passar múltiplos argumentos para error', () => {
      logger.error('error', { details: 'test' }, 123)
      expect(console.error).toHaveBeenCalledWith('error', { details: 'test' }, 123)
    })

    it('deve passar múltiplos argumentos para warn', () => {
      logger.warn('warning', { details: 'test' })
      expect(console.warn).toHaveBeenCalledWith('warning', { details: 'test' })
    })
  })

  describe('logger em modo produção', () => {
    let logger: any

    beforeAll(() => {
      // Salvar NODE_ENV original
      const originalEnv = process.env.NODE_ENV
      
      // Mudar para produção
      process.env.NODE_ENV = 'production'
      
      // Resetar módulos do Jest
      jest.resetModules()
      
      // Importar o módulo em modo produção
      const loggerModule = require('../../utils/logger')
      logger = loggerModule.logger
      
      // Restaurar NODE_ENV original
      process.env.NODE_ENV = originalEnv
    })

    it('NÃO deve logar mensagens em produção', () => {
      logger.log('test message')
      expect(console.log).not.toHaveBeenCalled()
    })

    it('NÃO deve logar debug em produção', () => {
      logger.debug('debug message')
      expect(console.debug).not.toHaveBeenCalled()
    })

    it('deve sempre logar erros mesmo em produção', () => {
      logger.error('error message')
      expect(console.error).toHaveBeenCalledWith('error message')
    })

    it('deve sempre logar warnings mesmo em produção', () => {
      logger.warn('warning message')
      expect(console.warn).toHaveBeenCalledWith('warning message')
    })

    it('deve passar múltiplos argumentos para error em produção', () => {
      logger.error('error', { details: 'test' }, 123)
      expect(console.error).toHaveBeenCalledWith('error', { details: 'test' }, 123)
    })

    it('deve passar múltiplos argumentos para warn em produção', () => {
      logger.warn('warning', { details: 'test' })
      expect(console.warn).toHaveBeenCalledWith('warning', { details: 'test' })
    })
  })

  describe('exportação default', () => {
    it('deve exportar logger como default', () => {
      const loggerDefault = require('../../utils/logger').default
      expect(loggerDefault).toBeDefined()
      expect(typeof loggerDefault.log).toBe('function')
      expect(typeof loggerDefault.error).toBe('function')
      expect(typeof loggerDefault.warn).toBe('function')
      expect(typeof loggerDefault.debug).toBe('function')
    })
  })

  describe('logger - exportação nomeada', () => {
    it('deve exportar logger como exportação nomeada', () => {
      const loggerNamed = require('../../utils/logger').logger
      expect(loggerNamed).toBeDefined()
      expect(typeof loggerNamed.log).toBe('function')
      expect(typeof loggerNamed.error).toBe('function')
      expect(typeof loggerNamed.warn).toBe('function')
      expect(typeof loggerNamed.debug).toBe('function')
    })
  })
})

