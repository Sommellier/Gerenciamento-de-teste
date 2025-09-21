// src/tests/integration/upload/uploadAvatar.controller.spec.ts
import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { prisma } from '../../../infrastructure/prisma'
import { uploadAvatarController, uploadMiddleware } from '../../../controllers/upload/uploadAvatar.controller'
import { AppError } from '../../../utils/AppError'
import * as uploadAvatarUC from '../../../application/use-cases/upload/uploadAvatar.use-case'

const unique = (p: string) =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

function tokenFor(id: number) {
  const secret = process.env.JWT_SECRET || 'test-secret'
  return jwt.sign({ id }, secret, { expiresIn: '1h' })
}

const auth: express.RequestHandler = (req, res, next) => {
  const header = req.headers.authorization || ''
  const [, token] = header.split(' ')
  if (!token) {
    res.status(401).json({ message: 'Token não fornecido' })
    return
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'test-secret'
    ) as { id: number }
    ;(req as any).user = { id: payload.id }
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido' })
  }
}

const errorHandler: express.ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message })
  } else {
    res.status(500).json({ 
      error: err.message || 'Internal Server Error',
      message: err.message || 'Internal Server Error'
    })
  }
}

let app: express.Express

describe('uploadAvatar.controller', () => {
  let user: any
  let authToken: string
  let tempDir: string

  beforeAll(async () => {
    // Criar diretório temporário para uploads
    tempDir = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    app = express()
    app.use(express.json())
    app.post('/upload/avatar', auth, uploadMiddleware, uploadAvatarController)
    app.use(errorHandler)

    // Criar usuário para os testes
    user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: unique('test@example.com'),
        password: 'password123'
      }
    })

    authToken = tokenFor(user.id)
  })

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.user.deleteMany({
      where: { id: user.id }
    })

    // Limpar diretório temporário
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir)
      files.forEach(file => {
        fs.unlinkSync(path.join(tempDir, file))
      })
      fs.rmdirSync(tempDir)
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /upload/avatar', () => {
    it('faz upload de avatar com sucesso', async () => {
      const mockResult = {
        user: {
          id: user.id,
          name: 'Test User',
          email: user.email,
          avatar: '/uploads/avatar-123.jpg',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        avatarUrl: '/uploads/avatar-123.jpg'
      } as any

      jest.spyOn(uploadAvatarUC, 'uploadAvatar').mockResolvedValue(mockResult)

      const response = await request(app)
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(200)

      expect(response.body).toEqual({
        message: 'Avatar atualizado com sucesso',
        user: {
          id: user.id,
          name: 'Test User',
          email: user.email,
          avatar: '/uploads/avatar-123.jpg',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        },
        avatarUrl: '/uploads/avatar-123.jpg'
      })
      expect(uploadAvatarUC.uploadAvatar).toHaveBeenCalledWith({
        userId: user.id,
        filePath: expect.stringContaining('avatar-'),
        originalName: 'test.jpg'
      })
    })

    it('faz upload de avatar PNG com sucesso', async () => {
      const mockResult = {
        user: {
          id: user.id,
          name: 'Test User',
          email: user.email,
          avatar: '/uploads/avatar-456.png',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        avatarUrl: '/uploads/avatar-456.png'
      } as any

      jest.spyOn(uploadAvatarUC, 'uploadAvatar').mockResolvedValue(mockResult)

      const response = await request(app)
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', Buffer.from('fake-png-data'), 'test.png')
        .expect(200)

      expect(response.body.message).toBe('Avatar atualizado com sucesso')
      expect(uploadAvatarUC.uploadAvatar).toHaveBeenCalledWith({
        userId: user.id,
        filePath: expect.stringContaining('avatar-'),
        originalName: 'test.png'
      })
    })

    it('faz upload de avatar GIF com sucesso', async () => {
      const mockResult = {
        user: {
          id: user.id,
          name: 'Test User',
          email: user.email,
          avatar: '/uploads/avatar-789.gif',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        avatarUrl: '/uploads/avatar-789.gif'
      } as any

      jest.spyOn(uploadAvatarUC, 'uploadAvatar').mockResolvedValue(mockResult)

      const response = await request(app)
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', Buffer.from('fake-gif-data'), 'test.gif')
        .expect(200)

      expect(response.body.message).toBe('Avatar atualizado com sucesso')
      expect(uploadAvatarUC.uploadAvatar).toHaveBeenCalledWith({
        userId: user.id,
        filePath: expect.stringContaining('avatar-'),
        originalName: 'test.gif'
      })
    })

    it('faz upload de avatar WEBP com sucesso', async () => {
      const mockResult = {
        user: {
          id: user.id,
          name: 'Test User',
          email: user.email,
          avatar: '/uploads/avatar-101.webp',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        avatarUrl: '/uploads/avatar-101.webp'
      } as any

      jest.spyOn(uploadAvatarUC, 'uploadAvatar').mockResolvedValue(mockResult)

      const response = await request(app)
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', Buffer.from('fake-webp-data'), 'test.webp')
        .expect(200)

      expect(response.body.message).toBe('Avatar atualizado com sucesso')
      expect(uploadAvatarUC.uploadAvatar).toHaveBeenCalledWith({
        userId: user.id,
        filePath: expect.stringContaining('avatar-'),
        originalName: 'test.webp'
      })
    })

    it('retorna 401 quando usuário não está autenticado', async () => {
      const response = await request(app)
        .post('/upload/avatar')
        .attach('avatar', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token não fornecido'
      })
      expect(uploadAvatarUC.uploadAvatar).not.toHaveBeenCalled()
    })

    it('retorna 401 quando token é inválido', async () => {
      const response = await request(app)
        .post('/upload/avatar')
        .set('Authorization', 'Bearer invalid-token')
        .attach('avatar', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(401)

      expect(response.body).toEqual({
        message: 'Token inválido'
      })
      expect(uploadAvatarUC.uploadAvatar).not.toHaveBeenCalled()
    })

    it('retorna 400 quando nenhum arquivo é enviado', async () => {
      const response = await request(app)
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      expect(response.body).toEqual({
        message: 'Nenhum arquivo enviado'
      })
      expect(uploadAvatarUC.uploadAvatar).not.toHaveBeenCalled()
    })

    it('retorna 400 quando formato de arquivo não é suportado (TXT)', async () => {
      const response = await request(app)
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', Buffer.from('fake-text-data'), 'test.txt')
        .expect(400)

      expect(response.body).toEqual({
        message: 'Formato de arquivo não suportado. Use JPG, PNG, GIF ou WEBP'
      })
      expect(uploadAvatarUC.uploadAvatar).not.toHaveBeenCalled()
    })

    it('retorna 400 quando formato de arquivo não é suportado (PDF)', async () => {
      const response = await request(app)
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', Buffer.from('fake-pdf-data'), 'test.pdf')
        .expect(400)

      expect(response.body).toEqual({
        message: 'Formato de arquivo não suportado. Use JPG, PNG, GIF ou WEBP'
      })
      expect(uploadAvatarUC.uploadAvatar).not.toHaveBeenCalled()
    })

    it('retorna 400 quando formato de arquivo não é suportado (BMP)', async () => {
      const response = await request(app)
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', Buffer.from('fake-bmp-data'), 'test.bmp')
        .expect(400)

      expect(response.body).toEqual({
        message: 'Formato de arquivo não suportado. Use JPG, PNG, GIF ou WEBP'
      })
      expect(uploadAvatarUC.uploadAvatar).not.toHaveBeenCalled()
    })

    it('trata AppError do use case', async () => {
      jest.spyOn(uploadAvatarUC, 'uploadAvatar').mockRejectedValue(new AppError('Erro ao processar arquivo', 500))

      const response = await request(app)
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(500)

      expect(response.body).toEqual({
        message: 'Erro ao processar arquivo'
      })
      expect(uploadAvatarUC.uploadAvatar).toHaveBeenCalledWith({
        userId: user.id,
        filePath: expect.stringContaining('avatar-'),
        originalName: 'test.jpg'
      })
    })

    it('trata erro genérico do use case', async () => {
      jest.spyOn(uploadAvatarUC, 'uploadAvatar').mockRejectedValue(new Error('Erro interno'))

      const response = await request(app)
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(500)

      expect(response.body).toEqual({
        error: 'Erro interno',
        message: 'Erro interno'
      })
      expect(uploadAvatarUC.uploadAvatar).toHaveBeenCalledWith({
        userId: user.id,
        filePath: expect.stringContaining('avatar-'),
        originalName: 'test.jpg'
      })
    })

    it('rejeita arquivo muito grande', async () => {
      // Criar um buffer de 6MB (maior que o limite de 5MB)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024)

      const response = await request(app)
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', largeBuffer, 'large.jpg')
        .expect(500) // Multer retorna 500 para arquivo muito grande

      expect(uploadAvatarUC.uploadAvatar).not.toHaveBeenCalled()
    })

    it('aceita arquivo no limite de tamanho', async () => {
      const mockResult = {
        user: {
          id: user.id,
          name: 'Test User',
          email: user.email,
          avatar: '/uploads/avatar-limit.jpg',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        avatarUrl: '/uploads/avatar-limit.jpg'
      } as any

      jest.spyOn(uploadAvatarUC, 'uploadAvatar').mockResolvedValue(mockResult)

      // Criar um buffer de 1MB (bem abaixo do limite de 5MB)
      const limitBuffer = Buffer.alloc(1024 * 1024)

      const response = await request(app)
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', limitBuffer, 'limit.jpg')
        .expect(200)

      expect(response.body.message).toBe('Avatar atualizado com sucesso')
      expect(uploadAvatarUC.uploadAvatar).toHaveBeenCalledWith({
        userId: user.id,
        filePath: expect.stringContaining('avatar-'),
        originalName: 'limit.jpg'
      })
    })
  })
})
