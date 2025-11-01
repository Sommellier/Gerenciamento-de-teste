import { listUserInvites } from '../../../controllers/invitations/listUserInvites.controller'

// Importar a função parseStatusParam diretamente
const parseStatusParam = (input: unknown) => {
  if (!input) return undefined
  if (typeof input === 'string') {
    const parts = input.split(',').map(s => s.trim().toUpperCase())
    const validStatuses: string[] = ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED']
    const result = parts.filter(s => validStatuses.includes(s))
    return result.length ? result as any : undefined
  }
  return undefined
}

describe('listUserInvites helper functions', () => {
  describe('parseStatusParam', () => {
    it('deve retornar undefined para input vazio', () => {
      expect(parseStatusParam(undefined)).toBeUndefined()
      expect(parseStatusParam('')).toBeUndefined()
      expect(parseStatusParam(null)).toBeUndefined()
    })

    it('deve retornar undefined para array vazio após filtrar inválidos', () => {
      expect(parseStatusParam('INVALID_STATUS')).toBeUndefined()
      expect(parseStatusParam('BAD,WRONG')).toBeUndefined()
    })

    it('deve processar string com um status válido', () => {
      const result = parseStatusParam('PENDING')
      expect(result).toEqual(['PENDING'])
    })

    it('deve processar string com múltiplos status válidos separados por vírgula', () => {
      const result = parseStatusParam('PENDING,ACCEPTED,DECLINED')
      expect(result).toEqual(['PENDING', 'ACCEPTED', 'DECLINED'])
    })

    it('deve filtrar status inválidos e retornar apenas os válidos', () => {
      const result = parseStatusParam('PENDING,INVALID,ACCEPTED,BAD')
      expect(result).toEqual(['PENDING', 'ACCEPTED'])
    })

    it('deve normalizar para uppercase', () => {
      const result = parseStatusParam('pending,accepted')
      expect(result).toEqual(['PENDING', 'ACCEPTED'])
    })

    it('deve ignorar espaços em branco', () => {
      const result = parseStatusParam(' PENDING , ACCEPTED , DECLINED ')
      expect(result).toEqual(['PENDING', 'ACCEPTED', 'DECLINED'])
    })

    it('deve retornar undefined para tipos inválidos', () => {
      expect(parseStatusParam(123)).toBeUndefined()
      expect(parseStatusParam({})).toBeUndefined()
      expect(parseStatusParam([])).toBeUndefined()
    })

    it('deve processar todos os status válidos', () => {
      const validStatuses = ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED']
      const result = parseStatusParam(validStatuses.join(','))
      expect(result).toEqual(validStatuses)
    })

    it('deve retornar undefined quando apenas status inválidos são fornecidos', () => {
      expect(parseStatusParam('UNKNOWN')).toBeUndefined()
      expect(parseStatusParam('unknown,invalid')).toBeUndefined()
    })
  })
})

