import 'dotenv/config'
import {
  validateCreateScenarioData,
  validateExecuteScenarioData,
  validateScenarioFilters,
  ScenarioTypeEnum,
  PriorityEnum,
  SeverityEnum,
  EnvironmentEnum,
  ScenarioStatusEnum,
  ExecutionResultEnum
} from '../../schemas/scenario.schema'

describe('scenario.schema', () => {
  describe('validateCreateScenarioData', () => {
    it('deve validar dados válidos de criação de cenário', () => {
      const validData = {
        title: 'Test Scenario',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        description: 'Test description',
        steps: [
          { order: 1, action: 'Click button', expected: 'Page loads' },
          { order: 2, action: 'Enter data', expected: 'Data saved' }
        ]
      }

      const result = validateCreateScenarioData(validData)
      expect(result).toEqual(validData)
    })

    it('deve validar dados mínimos válidos', () => {
      const minimalData = {
        title: 'Minimal Scenario',
        type: 'SMOKE',
        priority: 'LOW'
      }

      const result = validateCreateScenarioData(minimalData)
      expect(result).toEqual(minimalData)
    })

    it('deve rejeitar quando título está ausente', () => {
      const invalidData = {
        type: 'FUNCTIONAL',
        priority: 'HIGH'
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Título é obrigatório')
    })

    it('deve rejeitar quando título está vazio', () => {
      const invalidData = {
        title: '',
        type: 'FUNCTIONAL',
        priority: 'HIGH'
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Título é obrigatório')
    })

    it('deve rejeitar quando título não é string', () => {
      const invalidData = {
        title: 123,
        type: 'FUNCTIONAL',
        priority: 'HIGH'
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Título é obrigatório')
    })

    it('deve rejeitar quando tipo está ausente', () => {
      const invalidData = {
        title: 'Test Scenario',
        priority: 'HIGH'
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Tipo é obrigatório e deve ser válido')
    })

    it('deve rejeitar quando tipo é inválido', () => {
      const invalidData = {
        title: 'Test Scenario',
        type: 'INVALID_TYPE',
        priority: 'HIGH'
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Tipo é obrigatório e deve ser válido')
    })

    it('deve rejeitar quando prioridade está ausente', () => {
      const invalidData = {
        title: 'Test Scenario',
        type: 'FUNCTIONAL'
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Prioridade é obrigatória e deve ser válida')
    })

    it('deve rejeitar quando prioridade é inválida', () => {
      const invalidData = {
        title: 'Test Scenario',
        type: 'FUNCTIONAL',
        priority: 'INVALID_PRIORITY'
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Prioridade é obrigatória e deve ser válida')
    })

    it('deve rejeitar quando steps não é array', () => {
      const invalidData = {
        title: 'Test Scenario',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        steps: 'not an array'
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Steps deve ser um array')
    })

    it('deve rejeitar quando há mais de 50 steps', () => {
      const invalidData = {
        title: 'Test Scenario',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        steps: Array(51).fill({ order: 1, action: 'test', expected: 'test' })
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Máximo de 50 passos permitidos')
    })

    it('deve rejeitar quando step não tem ação', () => {
      const invalidData = {
        title: 'Test Scenario',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        steps: [
          { order: 1, expected: 'Page loads' }
        ]
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Ação do passo 1 é obrigatória')
    })

    it('deve rejeitar quando step tem ação vazia', () => {
      const invalidData = {
        title: 'Test Scenario',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        steps: [
          { order: 1, action: '', expected: 'Page loads' }
        ]
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Ação do passo 1 é obrigatória')
    })

    it('deve rejeitar quando step não tem resultado esperado', () => {
      const invalidData = {
        title: 'Test Scenario',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        steps: [
          { order: 1, action: 'Click button' }
        ]
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Resultado esperado do passo 1 é obrigatório')
    })

    it('deve rejeitar quando step tem resultado esperado vazio', () => {
      const invalidData = {
        title: 'Test Scenario',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        steps: [
          { order: 1, action: 'Click button', expected: '' }
        ]
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Resultado esperado do passo 1 é obrigatório')
    })

    it('deve rejeitar quando ordem do step está incorreta', () => {
      const invalidData = {
        title: 'Test Scenario',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        steps: [
          { order: 2, action: 'Click button', expected: 'Page loads' }
        ]
      }

      expect(() => validateCreateScenarioData(invalidData))
        .toThrow('Ordem do passo 1 deve ser 1')
    })

    it('deve aceitar todos os tipos válidos', () => {
      ScenarioTypeEnum.forEach(type => {
        const data = {
          title: 'Test Scenario',
          type,
          priority: 'HIGH'
        }
        expect(() => validateCreateScenarioData(data)).not.toThrow()
      })
    })

    it('deve aceitar todas as prioridades válidas', () => {
      PriorityEnum.forEach(priority => {
        const data = {
          title: 'Test Scenario',
          type: 'FUNCTIONAL',
          priority
        }
        expect(() => validateCreateScenarioData(data)).not.toThrow()
      })
    })
  })

  describe('validateExecuteScenarioData', () => {
    it('deve validar dados válidos de execução', () => {
      const validData = {
        status: 'PASSED',
        notes: 'Test executed successfully'
      }

      const result = validateExecuteScenarioData(validData)
      expect(result).toEqual(validData)
    })

    it('deve validar dados mínimos válidos', () => {
      const minimalData = {
        status: 'FAILED'
      }

      const result = validateExecuteScenarioData(minimalData)
      expect(result).toEqual(minimalData)
    })

    it('deve rejeitar quando status está ausente', () => {
      const invalidData = {
        notes: 'Some notes'
      }

      expect(() => validateExecuteScenarioData(invalidData))
        .toThrow('Status é obrigatório e deve ser válido')
    })

    it('deve rejeitar quando status é inválido', () => {
      const invalidData = {
        status: 'INVALID_STATUS'
      }

      expect(() => validateExecuteScenarioData(invalidData))
        .toThrow('Status é obrigatório e deve ser válido')
    })

    it('deve aceitar todos os status válidos', () => {
      ExecutionResultEnum.forEach(status => {
        const data = { status }
        expect(() => validateExecuteScenarioData(data)).not.toThrow()
      })
    })
  })

  describe('validateScenarioFilters', () => {
    it('deve validar filtros vazios com valores padrão', () => {
      const result = validateScenarioFilters({})
      
      expect(result).toEqual({
        page: 1,
        pageSize: 20,
        sort: 'createdAt',
        sortOrder: 'desc'
      })
    })

    it('deve validar filtros com todos os campos', () => {
      const filters = {
        status: 'PASSED',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tag: 'important',
        owner: '123',
        q: 'search term',
        page: '2',
        pageSize: '10',
        sort: 'title',
        sortOrder: 'asc'
      }

      const result = validateScenarioFilters(filters)
      
      expect(result).toEqual({
        status: 'PASSED',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tag: 'important',
        owner: 123,
        q: 'search term',
        page: 2,
        pageSize: 10,
        sort: 'title',
        sortOrder: 'asc'
      })
    })

    it('deve ignorar status inválido', () => {
      const filters = {
        status: 'INVALID_STATUS',
        page: '1',
        pageSize: '20',
        sort: 'createdAt',
        sortOrder: 'desc'
      }

      const result = validateScenarioFilters(filters)
      
      expect(result).toEqual({
        page: 1,
        pageSize: 20,
        sort: 'createdAt',
        sortOrder: 'desc'
      })
      expect(result.status).toBeUndefined()
    })

    it('deve ignorar tipo inválido', () => {
      const filters = {
        type: 'INVALID_TYPE',
        page: '1',
        pageSize: '20',
        sort: 'createdAt',
        sortOrder: 'desc'
      }

      const result = validateScenarioFilters(filters)
      
      expect(result).toEqual({
        page: 1,
        pageSize: 20,
        sort: 'createdAt',
        sortOrder: 'desc'
      })
      expect(result.type).toBeUndefined()
    })

    it('deve ignorar prioridade inválida', () => {
      const filters = {
        priority: 'INVALID_PRIORITY',
        page: '1',
        pageSize: '20',
        sort: 'createdAt',
        sortOrder: 'desc'
      }

      const result = validateScenarioFilters(filters)
      
      expect(result).toEqual({
        page: 1,
        pageSize: 20,
        sort: 'createdAt',
        sortOrder: 'desc'
      })
      expect(result.priority).toBeUndefined()
    })

    it('deve ignorar tag que não é string', () => {
      const filters = {
        tag: 123,
        page: '1',
        pageSize: '20',
        sort: 'createdAt',
        sortOrder: 'desc'
      }

      const result = validateScenarioFilters(filters)
      
      expect(result).toEqual({
        page: 1,
        pageSize: 20,
        sort: 'createdAt',
        sortOrder: 'desc'
      })
      expect(result.tag).toBeUndefined()
    })

    it('deve ignorar owner que não é número válido', () => {
      const filters = {
        owner: 'not-a-number',
        page: '1',
        pageSize: '20',
        sort: 'createdAt',
        sortOrder: 'desc'
      }

      const result = validateScenarioFilters(filters)
      
      expect(result).toEqual({
        page: 1,
        pageSize: 20,
        sort: 'createdAt',
        sortOrder: 'desc'
      })
      expect(result.owner).toBeUndefined()
    })

    it('deve ignorar q que não é string', () => {
      const filters = {
        q: 123,
        page: '1',
        pageSize: '20',
        sort: 'createdAt',
        sortOrder: 'desc'
      }

      const result = validateScenarioFilters(filters)
      
      expect(result).toEqual({
        page: 1,
        pageSize: 20,
        sort: 'createdAt',
        sortOrder: 'desc'
      })
      expect(result.q).toBeUndefined()
    })

    it('deve aceitar todos os status válidos', () => {
      ScenarioStatusEnum.forEach(status => {
        const filters = { status, page: '1', pageSize: '20', sort: 'createdAt', sortOrder: 'desc' }
        const result = validateScenarioFilters(filters)
        expect(result.status).toBe(status)
      })
    })

    it('deve aceitar todos os tipos válidos', () => {
      ScenarioTypeEnum.forEach(type => {
        const filters = { type, page: '1', pageSize: '20', sort: 'createdAt', sortOrder: 'desc' }
        const result = validateScenarioFilters(filters)
        expect(result.type).toBe(type)
      })
    })

    it('deve aceitar todas as prioridades válidas', () => {
      PriorityEnum.forEach(priority => {
        const filters = { priority, page: '1', pageSize: '20', sort: 'createdAt', sortOrder: 'desc' }
        const result = validateScenarioFilters(filters)
        expect(result.priority).toBe(priority)
      })
    })
  })

  describe('enums', () => {
    it('deve ter todos os valores corretos para ScenarioTypeEnum', () => {
      expect(ScenarioTypeEnum).toEqual(['FUNCTIONAL', 'REGRESSION', 'SMOKE', 'E2E'])
    })

    it('deve ter todos os valores corretos para PriorityEnum', () => {
      expect(PriorityEnum).toEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    })

    it('deve ter todos os valores corretos para SeverityEnum', () => {
      expect(SeverityEnum).toEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    })

    it('deve ter todos os valores corretos para EnvironmentEnum', () => {
      expect(EnvironmentEnum).toEqual(['DEV', 'QA', 'STAGING', 'PROD'])
    })

    it('deve ter todos os valores corretos para ScenarioStatusEnum', () => {
      expect(ScenarioStatusEnum).toEqual(['CREATED', 'EXECUTED', 'PASSED', 'FAILED', 'BLOCKED'])
    })

    it('deve ter todos os valores corretos para ExecutionResultEnum', () => {
      expect(ExecutionResultEnum).toEqual(['PASSED', 'FAILED', 'BLOCKED'])
    })
  })
})










