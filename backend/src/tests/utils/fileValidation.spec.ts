import { AppError } from '../../utils/AppError'
import {
  sanitizeFileName,
  validateFile,
  validateImageFile,
  validateEvidenceFile,
  validateBugAttachmentFile
} from '../../utils/fileValidation'
import fs from 'fs'
import path from 'path'

// Mock do fs para testes
jest.mock('fs', () => ({
  readFileSync: jest.fn()
}))
const mockedFs = fs as jest.Mocked<typeof fs>

describe('fileValidation utils', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    jest.clearAllMocks()
  })

  describe('sanitizeFileName', () => {
    it('deve lançar erro para nome de arquivo inválido', () => {
      expect(() => sanitizeFileName('')).toThrow(AppError)
      expect(() => sanitizeFileName(null as any)).toThrow(AppError)
      expect(() => sanitizeFileName(undefined as any)).toThrow(AppError)
    })

    it('deve remover caracteres perigosos em produção', () => {
      process.env.NODE_ENV = 'production'
      const result = sanitizeFileName('file<>:"|?*\\/name.txt')
      expect(result).toBe('filename.txt')
    })

    it('deve substituir espaços por underscore em produção', () => {
      process.env.NODE_ENV = 'production'
      const result = sanitizeFileName('my file name.txt')
      expect(result).toBe('my_file_name.txt')
    })

    it('deve limitar tamanho do nome em produção', () => {
      process.env.NODE_ENV = 'production'
      const longName = 'a'.repeat(300) + '.txt'
      const result = sanitizeFileName(longName)
      expect(result.length).toBeLessThanOrEqual(255)
      expect(result).toContain('.txt')
    })

    it('deve retornar "file" quando nome fica vazio após sanitização', () => {
      process.env.NODE_ENV = 'production'
      const result = sanitizeFileName('<>:"|?*\\/')
      expect(result).toBe('file')
    })

    it('deve ser mais tolerante em ambiente de teste', () => {
      process.env.NODE_ENV = 'test'
      const result = sanitizeFileName('normal-file-name.txt')
      expect(result).toBe('normal-file-name.txt')
    })

    it('deve remover apenas caracteres perigosos em teste', () => {
      process.env.NODE_ENV = 'test'
      const result = sanitizeFileName('file<>name.txt')
      expect(result).toBe('filename.txt')
    })

    it('deve retornar "file" quando nome fica vazio em teste', () => {
      process.env.NODE_ENV = 'test'
      const result = sanitizeFileName('<>:"|?*\\/')
      expect(result).toBe('file')
    })

    it('deve preservar nome válido em teste', () => {
      process.env.NODE_ENV = 'test'
      const result = sanitizeFileName('valid-file-name.txt')
      expect(result).toBe('valid-file-name.txt')
    })
  })

  describe('validateFile', () => {
    const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      destination: '',
      filename: '',
      path: '',
      stream: {} as any,
      ...overrides
    })

    it('deve lançar erro quando arquivo não é fornecido', async () => {
      await expect(validateFile(null as any, ['image/jpeg'])).rejects.toThrow(AppError)
      await expect(validateFile(null as any, ['image/jpeg'])).rejects.toThrow('Arquivo não fornecido')
    })

    it('deve lançar erro quando MIME type não está na lista permitida', async () => {
      const file = createMockFile({ mimetype: 'image/gif' })
      await expect(validateFile(file, ['image/jpeg'])).rejects.toThrow(AppError)
    })

    it('deve normalizar image/jpg para image/jpeg', async () => {
      const file = createMockFile({ mimetype: 'image/jpg' })
      await expect(validateFile(file, ['image/jpeg'])).resolves.not.toThrow()
    })

    it('deve lançar erro para tipo de arquivo não suportado', async () => {
      const file = createMockFile({ mimetype: 'application/unknown' })
      await expect(validateFile(file, ['application/unknown'])).rejects.toThrow(AppError)
      await expect(validateFile(file, ['application/unknown'])).rejects.toThrow('Tipo de arquivo não suportado')
    })

    it('deve lançar erro quando arquivo excede tamanho máximo', async () => {
      const file = createMockFile({ 
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024 // 6MB, maior que o máximo de 5MB
      })
      await expect(validateFile(file, ['image/jpeg'])).rejects.toThrow(AppError)
      await expect(validateFile(file, ['image/jpeg'])).rejects.toThrow('Arquivo muito grande')
    })

    it('deve lançar erro quando não é possível ler o conteúdo do arquivo', async () => {
      const file = createMockFile({ 
        buffer: undefined,
        path: undefined
      })
      await expect(validateFile(file, ['image/jpeg'])).rejects.toThrow(AppError)
      await expect(validateFile(file, ['image/jpeg'])).rejects.toThrow('Não foi possível ler o conteúdo do arquivo')
    })

    it('deve ler arquivo do path quando buffer não está disponível', async () => {
      process.env.NODE_ENV = 'test' // Usar test para não verificar magic bytes
      const fileBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
      ;(mockedFs.readFileSync as jest.Mock).mockReturnValue(fileBuffer)
      
      const file = createMockFile({ 
        buffer: undefined,
        path: '/tmp/test.jpg',
        mimetype: 'image/jpeg'
      })
      
      await validateFile(file, ['image/jpeg'])
      expect(mockedFs.readFileSync).toHaveBeenCalledWith('/tmp/test.jpg')
    })

    it('deve validar arquivo com buffer válido em ambiente de teste', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile()
      await expect(validateFile(file, ['image/jpeg'])).resolves.not.toThrow()
    })

    it('deve validar arquivo PDF', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
        buffer: Buffer.from([0x25, 0x50, 0x44, 0x46])
      })
      await expect(validateFile(file, ['application/pdf'])).resolves.not.toThrow()
    })

    it('deve lançar erro específico para anexo de bug com tipo inválido', async () => {
      const file = createMockFile({ mimetype: 'image/jpeg' })
      const allowedTypes = [
        'application/pdf',
        'application/msword'
      ]
      await expect(validateFile(file, allowedTypes)).rejects.toThrow('Tipo de arquivo não permitido. Use PDF, Word, PowerPoint ou Excel')
    })

    it('deve lançar erro genérico para evidência com tipo inválido', async () => {
      const file = createMockFile({ mimetype: 'image/gif' })
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
      await expect(validateFile(file, allowedTypes)).rejects.toThrow('Tipo de arquivo não permitido')
    })

    it('deve validar extensão do arquivo em produção', async () => {
      process.env.NODE_ENV = 'production'
      // Criar buffer JPEG válido com magic bytes corretos [0xff, 0xd8, 0xff]
      const jpegMagicBytes = [0xff, 0xd8, 0xff]
      const fileBuffer = Buffer.from([...jpegMagicBytes, ...Array(100).fill(0)])
      ;(mockedFs.readFileSync as jest.Mock).mockReturnValue(fileBuffer)
      
      const file = createMockFile({
        mimetype: 'image/jpeg',
        originalname: 'test.wrong', // Extensão errada
        buffer: fileBuffer
      })
      
      // Magic bytes são válidos, então a validação chegará até a verificação de extensão
      await expect(validateFile(file, ['image/jpeg'])).rejects.toThrow(AppError)
      await expect(validateFile(file, ['image/jpeg'])).rejects.toThrow('Extensão de arquivo não permitida')
    })

    it('deve aceitar extensão válida em produção', async () => {
      process.env.NODE_ENV = 'production'
      // Criar buffer JPEG válido com magic bytes corretos [0xff, 0xd8, 0xff]
      const jpegMagicBytes = [0xff, 0xd8, 0xff]
      const fileBuffer = Buffer.from([...jpegMagicBytes, ...Array(100).fill(0)])
      ;(mockedFs.readFileSync as jest.Mock).mockReturnValue(fileBuffer)
      
      const file = createMockFile({
        mimetype: 'image/jpeg',
        originalname: 'test.jpg', // Extensão correta
        buffer: fileBuffer
      })
      await expect(validateFile(file, ['image/jpeg'])).resolves.not.toThrow()
    })
  })

  describe('validateImageFile', () => {
    const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      destination: '',
      filename: '',
      path: '',
      stream: {} as any,
      ...overrides
    })

    it('deve validar arquivo JPEG', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({ mimetype: 'image/jpeg' })
      await expect(validateImageFile(file)).resolves.not.toThrow()
    })

    it('deve validar arquivo PNG', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({
        mimetype: 'image/png',
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      })
      await expect(validateImageFile(file)).resolves.not.toThrow()
    })

    it('deve validar arquivo GIF', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({
        mimetype: 'image/gif',
        buffer: Buffer.from([0x47, 0x49, 0x46, 0x38])
      })
      await expect(validateImageFile(file)).resolves.not.toThrow()
    })

    it('deve validar arquivo WebP', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({
        mimetype: 'image/webp',
        buffer: Buffer.from([0x52, 0x49, 0x46, 0x46])
      })
      await expect(validateImageFile(file)).resolves.not.toThrow()
    })

    it('deve rejeitar arquivo que não é imagem', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({ mimetype: 'application/pdf' })
      await expect(validateImageFile(file)).rejects.toThrow(AppError)
    })
  })

  describe('validateEvidenceFile', () => {
    const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      destination: '',
      filename: '',
      path: '',
      stream: {} as any,
      ...overrides
    })

    it('deve validar arquivo JPEG como evidência', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({ mimetype: 'image/jpeg' })
      await expect(validateEvidenceFile(file)).resolves.not.toThrow()
    })

    it('deve validar arquivo PNG como evidência', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({
        mimetype: 'image/png',
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      })
      await expect(validateEvidenceFile(file)).resolves.not.toThrow()
    })

    it('deve validar arquivo PDF como evidência', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({
        mimetype: 'application/pdf',
        buffer: Buffer.from([0x25, 0x50, 0x44, 0x46])
      })
      await expect(validateEvidenceFile(file)).resolves.not.toThrow()
    })

    it('deve rejeitar arquivo GIF como evidência', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({
        mimetype: 'image/gif',
        buffer: Buffer.from([0x47, 0x49, 0x46, 0x38])
      })
      await expect(validateEvidenceFile(file)).rejects.toThrow(AppError)
    })
  })

  describe('validateBugAttachmentFile', () => {
    const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from([0x25, 0x50, 0x44, 0x46]),
      destination: '',
      filename: '',
      path: '',
      stream: {} as any,
      ...overrides
    })

    it('deve validar arquivo PDF como anexo de bug', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({ mimetype: 'application/pdf' })
      await expect(validateBugAttachmentFile(file)).resolves.not.toThrow()
    })

    it('deve validar arquivo DOC como anexo de bug', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({
        mimetype: 'application/msword',
        buffer: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
      })
      await expect(validateBugAttachmentFile(file)).resolves.not.toThrow()
    })

    it('deve validar arquivo DOCX como anexo de bug', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04])
      })
      await expect(validateBugAttachmentFile(file)).resolves.not.toThrow()
    })

    it('deve validar arquivo PPTX como anexo de bug', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({
        mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04])
      })
      await expect(validateBugAttachmentFile(file)).resolves.not.toThrow()
    })

    it('deve validar arquivo XLSX como anexo de bug', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04])
      })
      await expect(validateBugAttachmentFile(file)).resolves.not.toThrow()
    })

    it('deve rejeitar arquivo JPEG como anexo de bug', async () => {
      process.env.NODE_ENV = 'test'
      const file = createMockFile({
        mimetype: 'image/jpeg',
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0])
      })
      await expect(validateBugAttachmentFile(file)).rejects.toThrow(AppError)
    })
  })
})

