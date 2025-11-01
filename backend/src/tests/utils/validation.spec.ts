import { AppError } from '../../utils/AppError'
import {
  validateEmail,
  validateMinLength,
  validateId,
  validateEnum,
  validateOptionalString,
  validateArray,
  validatePagination,
  sanitizeString
} from '../../utils/validation'

describe('validation utils', () => {
  describe('validateEmail', () => {
    it('deve aceitar email válido', () => {
      const result = validateEmail('test@example.com')
      expect(result).toBe('test@example.com')
    })

    it('deve normalizar email para lowercase', () => {
      const result = validateEmail('TEST@EXAMPLE.COM')
      expect(result).toBe('test@example.com')
    })

    it('deve remover espaços em branco', () => {
      const result = validateEmail('  test@example.com  ')
      expect(result).toBe('test@example.com')
    })

    it('deve lançar erro para email vazio', () => {
      expect(() => validateEmail('')).toThrow(AppError)
      expect(() => validateEmail('')).toThrow('Email é obrigatório')
    })

    it('deve lançar erro para email inválido sem @', () => {
      expect(() => validateEmail('invalid-email')).toThrow(AppError)
      expect(() => validateEmail('invalid-email')).toThrow('Email inválido')
    })

    it('deve lançar erro para email inválido sem domínio', () => {
      expect(() => validateEmail('test@')).toThrow(AppError)
      expect(() => validateEmail('test@')).toThrow('Email inválido')
    })

    it('deve lançar erro quando email não é string', () => {
      expect(() => validateEmail(null as any)).toThrow(AppError)
      expect(() => validateEmail(undefined as any)).toThrow(AppError)
    })

    it('deve aceitar email com caracteres especiais', () => {
      const result = validateEmail('user.name+tag@example-domain.co.uk')
      expect(result).toBe('user.name+tag@example-domain.co.uk')
    })
  })

  describe('validateMinLength', () => {
    it('deve aceitar string com tamanho suficiente', () => {
      const result = validateMinLength('test', 4, 'campo')
      expect(result).toBe('test')
    })

    it('deve remover espaços em branco', () => {
      const result = validateMinLength('  test  ', 4, 'campo')
      expect(result).toBe('test')
    })

    it('deve lançar erro para string menor que mínimo', () => {
      expect(() => validateMinLength('abc', 5, 'campo')).toThrow(AppError)
      expect(() => validateMinLength('abc', 5, 'campo')).toThrow('campo deve ter pelo menos 5 caracteres')
    })

    it('deve lançar erro para string vazia', () => {
      expect(() => validateMinLength('', 1, 'campo')).toThrow(AppError)
      expect(() => validateMinLength('', 1, 'campo')).toThrow('campo é obrigatório')
    })

    it('deve lançar erro quando valor não é string', () => {
      expect(() => validateMinLength(null as any, 5, 'campo')).toThrow(AppError)
      expect(() => validateMinLength(123 as any, 5, 'campo')).toThrow(AppError)
    })

    it('deve aceitar string exata do tamanho mínimo', () => {
      const result = validateMinLength('abcde', 5, 'campo')
      expect(result).toBe('abcde')
    })
  })

  describe('validateId', () => {
    it('deve aceitar ID válido', () => {
      expect(validateId(123, 'ID')).toBe(123)
      expect(validateId('456', 'ID')).toBe(456)
    })

    it('deve lançar erro para ID inválido (não inteiro)', () => {
      expect(() => validateId(123.45, 'ID')).toThrow(AppError)
      expect(() => validateId(123.45, 'ID')).toThrow('ID inválido')
    })

    it('deve lançar erro para ID zero ou negativo', () => {
      expect(() => validateId(0, 'ID')).toThrow(AppError)
      expect(() => validateId(-1, 'ID')).toThrow(AppError)
    })

    it('deve lançar erro para string inválida', () => {
      expect(() => validateId('abc', 'ID')).toThrow(AppError)
      expect(() => validateId('', 'ID')).toThrow(AppError)
    })

    it('deve converter string numérica para número', () => {
      expect(validateId('789', 'ID')).toBe(789)
    })

    it('deve usar nome de campo customizado', () => {
      expect(() => validateId('invalid', 'userId')).toThrow('userId inválido')
    })
  })

  describe('validateEnum', () => {
    const roles = ['OWNER', 'MANAGER', 'TESTER'] as const

    it('deve aceitar valor válido', () => {
      expect(validateEnum('OWNER', roles, 'role')).toBe('OWNER')
      expect(validateEnum('MANAGER', roles, 'role')).toBe('MANAGER')
    })

    it('deve lançar erro para valor inválido', () => {
      expect(() => validateEnum('INVALID', roles, 'role')).toThrow(AppError)
      expect(() => validateEnum('INVALID', roles, 'role')).toThrow('role deve ser um dos seguintes valores: OWNER, MANAGER, TESTER')
    })

    it('deve lançar erro para valor vazio', () => {
      expect(() => validateEnum('', roles, 'role')).toThrow(AppError)
      expect(() => validateEnum(null, roles, 'role')).toThrow(AppError)
    })

    it('deve aceitar valor exato do enum', () => {
      expect(validateEnum('TESTER', roles, 'role')).toBe('TESTER')
    })
  })

  describe('validateOptionalString', () => {
    it('deve retornar string válida', () => {
      expect(validateOptionalString('test', 'campo')).toBe('test')
    })

    it('deve remover espaços em branco', () => {
      expect(validateOptionalString('  test  ', 'campo')).toBe('test')
    })

    it('deve retornar undefined para valor vazio', () => {
      expect(validateOptionalString('', 'campo')).toBeUndefined()
      expect(validateOptionalString('   ', 'campo')).toBeUndefined()
    })

    it('deve retornar undefined para null/undefined', () => {
      expect(validateOptionalString(undefined, 'campo')).toBeUndefined()
      expect(validateOptionalString(null, 'campo')).toBeUndefined()
    })

    it('deve lançar erro para tipo inválido', () => {
      expect(() => validateOptionalString(123, 'campo')).toThrow(AppError)
      expect(() => validateOptionalString(123, 'campo')).toThrow('campo deve ser uma string')
    })
  })

  describe('validateArray', () => {
    it('deve aceitar array válido', () => {
      const result = validateArray([1, 2, 3], 'items', 10)
      expect(result).toEqual([1, 2, 3])
    })

    it('deve lançar erro para não-array', () => {
      expect(() => validateArray('not-array', 'items', 10)).toThrow(AppError)
      expect(() => validateArray('not-array', 'items', 10)).toThrow('items deve ser um array')
    })

    it('deve lançar erro para array vazio', () => {
      expect(() => validateArray([], 'items', 10)).toThrow(AppError)
      expect(() => validateArray([], 'items', 10)).toThrow('items não pode estar vazio')
    })

    it('deve lançar erro para array maior que máximo', () => {
      expect(() => validateArray([1, 2, 3, 4, 5], 'items', 3)).toThrow(AppError)
      expect(() => validateArray([1, 2, 3, 4, 5], 'items', 3)).toThrow('items não pode ter mais de 3 itens')
    })

    it('deve aceitar array com tamanho exato do máximo', () => {
      const result = validateArray([1, 2, 3], 'items', 3)
      expect(result).toEqual([1, 2, 3])
    })
  })

  describe('validatePagination', () => {
    it('deve retornar valores padrão', () => {
      const result = validatePagination()
      expect(result).toEqual({ page: 1, pageSize: 20 })
    })

    it('deve validar page e pageSize fornecidos', () => {
      const result = validatePagination('5', '10')
      expect(result).toEqual({ page: 5, pageSize: 10 })
    })

    it('deve lançar erro para pageSize maior que 100', () => {
      expect(() => validatePagination('1', '101')).toThrow(AppError)
      expect(() => validatePagination('1', '101')).toThrow('pageSize não pode ser maior que 100')
    })

    it('deve aceitar pageSize exatamente 100', () => {
      const result = validatePagination('1', '100')
      expect(result).toEqual({ page: 1, pageSize: 100 })
    })

    it('deve lançar erro para page inválido', () => {
      expect(() => validatePagination('0', '20')).toThrow(AppError)
      expect(() => validatePagination('abc', '20')).toThrow(AppError)
    })
  })

  describe('sanitizeString', () => {
    it('deve remover script tags', () => {
      const result = sanitizeString('text <script>alert("xss")</script>')
      expect(result).not.toContain('<script>')
    })

    it('deve remover iframe tags', () => {
      const result = sanitizeString('text <iframe src="evil.com"></iframe>')
      expect(result).not.toContain('<iframe>')
    })

    it('deve remover javascript: protocol', () => {
      const result = sanitizeString('javascript:alert(1)')
      expect(result).not.toContain('javascript:')
    })

    it('deve remover event handlers', () => {
      const result = sanitizeString('onclick=alert(1)')
      expect(result).not.toContain('onclick=')
    })

    it('deve retornar string normal sem alteração', () => {
      const input = 'This is a normal string'
      expect(sanitizeString(input)).toBe(input)
    })
  })
})

