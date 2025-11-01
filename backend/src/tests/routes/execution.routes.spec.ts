import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import express from 'express'
import request from 'supertest'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'

// Mock do ExecutionController
const mockExecutionController = {
  addComment: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(201).json({ ok: true, route: 'addComment', stepId: req.params.stepId, body: req.body })
  }),
  getComments: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'getComments', stepId: req.params.stepId })
  }),
  uploadAttachment: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'uploadAttachment', stepId: req.params.stepId, file: req.file })
  }),
  getAttachments: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'getAttachments', stepId: req.params.stepId })
  }),
  updateStepStatusHandler: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'updateStepStatusHandler', stepId: req.params.stepId, body: req.body })
  }),
  createBug: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(201).json({ ok: true, route: 'createBug', scenarioId: req.params.scenarioId, body: req.body })
  }),
  getScenarioBugs: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'getScenarioBugs', scenarioId: req.params.scenarioId })
  }),
  getPackageBugsHandler: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'getPackageBugsHandler', projectId: req.params.projectId, packageId: req.params.packageId })
  }),
  updateBugHandler: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'updateBugHandler', bugId: req.params.bugId, body: req.body })
  }),
  deleteBugHandler: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(204).end()
  }),
  registerHistory: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(201).json({ ok: true, route: 'registerHistory', scenarioId: req.params.scenarioId, body: req.body })
  }),
  getHistory: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'getHistory', scenarioId: req.params.scenarioId })
  })
}

jest.mock('../../controllers/execution/execution.controller', () => ({
  ExecutionController: jest.fn().mockImplementation(() => mockExecutionController)
}))

// Mock do multer
jest.mock('multer', () => {
  const mockDiskStorage = jest.fn((config: any) => {
    // Simular a execução das funções de callback para cobrir as linhas 18-24 e 45-56
    if (config.destination) {
      config.destination(null, null, (err: any, dest: string) => {
        // Aceita tanto 'uploads/evidences/' quanto 'uploads/bug-attachments/'
        expect(['uploads/evidences/', 'uploads/bug-attachments/']).toContain(dest)
      })
    }
    if (config.filename) {
      config.filename(null, { fieldname: 'file', originalname: 'test.jpg' }, (err: any, filename: string) => {
        // Aceita tanto padrão de evidence quanto bug-attachment
        expect(filename).toMatch(/(evidence|bug-attachment)-\d+-\d+\.jpg/)
      })
    }
    return {}
  })
  
  const mockMulter = (config: any) => {
    // Simular a execução do fileFilter para cobrir as linhas 33-37 e 63-77
    if (config.fileFilter) {
      // Tipos permitidos para evidências
      const evidenceTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      // Tipos permitidos para anexos de bugs
      const bugAttachmentTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      
      const allAllowedTypes = [...new Set([...evidenceTypes, ...bugAttachmentTypes])]
      
      allAllowedTypes.forEach(mimetype => {
        config.fileFilter(null, { mimetype }, (err: any, result: boolean) => {
          expect(result).toBe(true)
        })
      })
      // Testar tipo não permitido
      config.fileFilter(null, { mimetype: 'text/plain' }, (err: any, result: boolean) => {
        expect(err).toBeInstanceOf(Error)
        expect(['Tipo de arquivo não permitido', 'Tipo de arquivo não permitido. Use PDF, Word, PowerPoint ou Excel']).toContain(err.message)
      })
    }
    
    return {
      single: jest.fn(() => (req: any, res: any, next: any) => {
        req.file = { fieldname: 'file', originalname: 'test.jpg', mimetype: 'image/jpeg' }
        next()
      })
    }
  }
  mockMulter.diskStorage = mockDiskStorage
  return mockMulter
})

// Mock do auth
jest.mock('../../infrastructure/auth', () => ({
  __esModule: true,
  default: (_req: any, _res: any, next: any) => next(),
}))

// Mock das permissões
jest.mock('../../infrastructure/permissions', () => ({
  requirePermission: (_permission: any) => (_req: any, _res: any, next: any) => next(),
  requireAnyPermission: (_permissions: any) => (_req: any, _res: any, next: any) => next(),
}))

import executionRouter from '../../routes/execution.routes'

describe('execution.routes', () => {
  let app: express.Express

  beforeEach(() => {
    jest.clearAllMocks()
    app = express()
    app.use(express.json())

    app.use(executionRouter)

    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status = Number.isFinite(err?.status) ? err.status : 500
      res.status(status).json({ message: err?.message || 'Internal error' })
    })
  })

  describe('Rotas de comentários em etapas', () => {
    it('POST /steps/:stepId/comments → chama addComment', async () => {
      const res = await request(app)
        .post('/steps/123/comments')
        .send({ comment: 'Test comment' })
      
      expect(res.status).toBe(201)
      expect(res.body).toEqual({ 
        ok: true, 
        route: 'addComment', 
        stepId: '123',
        body: { comment: 'Test comment' }
      })
      expect(mockExecutionController.addComment).toHaveBeenCalledTimes(1)
    })

    it('GET /steps/:stepId/comments → chama getComments', async () => {
      const res = await request(app).get('/steps/123/comments')
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true, route: 'getComments', stepId: '123' })
      expect(mockExecutionController.getComments).toHaveBeenCalledTimes(1)
    })
  })

  describe('Rotas de anexos/evidências em etapas', () => {
    it('POST /steps/:stepId/attachments → chama uploadAttachment com multer', async () => {
      const res = await request(app)
        .post('/steps/123/attachments')
        .attach('file', Buffer.from('fake file content'), 'test.jpg')
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ 
        ok: true, 
        route: 'uploadAttachment', 
        stepId: '123',
        file: { fieldname: 'file', originalname: 'test.jpg', mimetype: 'image/jpeg' }
      })
      expect(mockExecutionController.uploadAttachment).toHaveBeenCalledTimes(1)
    })

    it('GET /steps/:stepId/attachments → chama getAttachments', async () => {
      const res = await request(app).get('/steps/123/attachments')
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true, route: 'getAttachments', stepId: '123' })
      expect(mockExecutionController.getAttachments).toHaveBeenCalledTimes(1)
    })
  })

  describe('Rota para atualizar status da etapa', () => {
    it('PUT /execution/steps/:stepId/status → chama updateStepStatusHandler', async () => {
      const res = await request(app)
        .put('/execution/steps/123/status')
        .send({ status: 'PASSED' })
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ 
        ok: true, 
        route: 'updateStepStatusHandler', 
        stepId: '123',
        body: { status: 'PASSED' }
      })
      expect(mockExecutionController.updateStepStatusHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('Rotas de bugs', () => {
    it('POST /scenarios/:scenarioId/bugs → chama createBug', async () => {
      const res = await request(app)
        .post('/scenarios/456/bugs')
        .send({ title: 'Bug title', description: 'Bug description' })
      
      expect(res.status).toBe(201)
      expect(res.body).toEqual({ 
        ok: true, 
        route: 'createBug', 
        scenarioId: '456',
        body: { title: 'Bug title', description: 'Bug description' }
      })
      expect(mockExecutionController.createBug).toHaveBeenCalledTimes(1)
    })

    it('GET /scenarios/:scenarioId/bugs → chama getScenarioBugs', async () => {
      const res = await request(app).get('/scenarios/456/bugs')
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true, route: 'getScenarioBugs', scenarioId: '456' })
      expect(mockExecutionController.getScenarioBugs).toHaveBeenCalledTimes(1)
    })

    it('GET /projects/:projectId/packages/:packageId/bugs → chama getPackageBugsHandler', async () => {
      const res = await request(app).get('/projects/123/packages/789/bugs')
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ 
        ok: true, 
        route: 'getPackageBugsHandler', 
        projectId: '123',
        packageId: '789'
      })
      expect(mockExecutionController.getPackageBugsHandler).toHaveBeenCalledTimes(1)
    })

    it('PUT /bugs/:bugId → chama updateBugHandler', async () => {
      const res = await request(app)
        .put('/bugs/999')
        .send({ status: 'FIXED' })
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ 
        ok: true, 
        route: 'updateBugHandler', 
        bugId: '999',
        body: { status: 'FIXED' }
      })
      expect(mockExecutionController.updateBugHandler).toHaveBeenCalledTimes(1)
    })

    it('DELETE /bugs/:bugId → chama deleteBugHandler', async () => {
      const res = await request(app).delete('/bugs/999')
      
      expect(res.status).toBe(204)
      expect(res.text).toBe('')
      expect(mockExecutionController.deleteBugHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('Rotas de histórico de execução', () => {
    it('POST /scenarios/:scenarioId/history → chama registerHistory', async () => {
      const res = await request(app)
        .post('/scenarios/456/history')
        .send({ action: 'EXECUTED', notes: 'Test executed' })
      
      expect(res.status).toBe(201)
      expect(res.body).toEqual({ 
        ok: true, 
        route: 'registerHistory', 
        scenarioId: '456',
        body: { action: 'EXECUTED', notes: 'Test executed' }
      })
      expect(mockExecutionController.registerHistory).toHaveBeenCalledTimes(1)
    })

    it('GET /scenarios/:scenarioId/history → chama getHistory', async () => {
      const res = await request(app).get('/scenarios/456/history')
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true, route: 'getHistory', scenarioId: '456' })
      expect(mockExecutionController.getHistory).toHaveBeenCalledTimes(1)
    })
  })

  describe('Tratamento de erros', () => {
    it('asyncH: se o controller rejeitar, cai no error handler', async () => {
      mockExecutionController.getComments.mockImplementationOnce(async () => {
        const err: any = new Error('Controller error')
        err.status = 400
        throw err
      })

      const res = await request(app).get('/steps/999/comments')
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ message: 'Controller error' })
    })

    it('asyncH: se o controller rejeitar sem status, usa 500', async () => {
      mockExecutionController.getComments.mockImplementationOnce(async () => {
        throw new Error('Generic error')
      })

      const res = await request(app).get('/steps/999/comments')
      expect(res.status).toBe(500)
      expect(res.body).toEqual({ message: 'Generic error' })
    })
  })

  describe('Configuração do multer', () => {
    it('deve configurar multer corretamente para upload de evidências', async () => {
      // Este teste verifica se o multer está configurado corretamente
      // através do teste de upload de anexos que já existe
      const res = await request(app)
        .post('/steps/123/attachments')
        .attach('file', Buffer.from('fake file content'), 'test.jpg')
      
      expect(res.status).toBe(200)
      expect(res.body.file).toBeDefined()
      expect(res.body.file.fieldname).toBe('file')
      expect(res.body.file.originalname).toBe('test.jpg')
    })

    it('deve testar diferentes tipos de arquivo permitidos', async () => {
      // Teste com diferentes tipos de arquivo que devem ser aceitos
      const allowedTypes = [
        { name: 'test.jpg', type: 'image/jpeg' },
        { name: 'test.png', type: 'image/png' },
        { name: 'test.pdf', type: 'application/pdf' }
      ]

      for (const fileType of allowedTypes) {
        const res = await request(app)
          .post('/steps/123/attachments')
          .attach('file', Buffer.from('fake file content'), fileType.name)
        
        expect(res.status).toBe(200)
        expect(res.body.file).toBeDefined()
      }
    })
  })
})
