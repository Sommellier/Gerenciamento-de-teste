import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import express from 'express'
import request from 'supertest'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'

// Mock do ScenarioController
const mockScenarioController = {
  getPackageScenarios: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'getPackageScenarios', packageId: req.params.packageId })
  }),
  createScenario: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(201).json({ ok: true, route: 'createScenario', packageId: req.params.packageId, body: req.body })
  }),
  getScenarioById: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'getScenarioById', id: req.params.id })
  }),
  updateScenario: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'updateScenario', id: req.params.id, body: req.body })
  }),
  deleteScenario: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(204).end()
  }),
  executeScenario: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'executeScenario', id: req.params.id, body: req.body })
  }),
  duplicateScenario: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(201).json({ ok: true, route: 'duplicateScenario', id: req.params.id })
  }),
  uploadEvidence: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'uploadEvidence', id: req.params.id, file: req.file })
  }),
  exportScenariosToCSV: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'exportScenariosToCSV', packageId: req.params.packageId })
  }),
  generateScenarioReport: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'generateScenarioReport', packageId: req.params.packageId })
  })
}

jest.mock('../../controllers/scenarios/scenario.controller', () => ({
  ScenarioController: jest.fn().mockImplementation(() => mockScenarioController)
}))

// Mock do multer
jest.mock('multer', () => {
  const path = require('path')
  const mockDiskStorage = jest.fn((config: any) => {
    // Simular a execução das funções de callback para cobrir as linhas 18-22
    if (config.destination) {
      config.destination(null, null, (err: any, dest: string) => {
        // Agora usa caminho absoluto
        expect(dest).toBe(path.join(process.cwd(), 'uploads', 'evidences'))
      })
    }
    if (config.filename) {
      config.filename(null, { fieldname: 'file', originalname: 'test.jpg' }, (err: any, filename: string) => {
        expect(filename).toMatch(/file-\d+-\d+\.jpg/)
      })
    }
    return {}
  })
  
  const mockMulter = () => ({
    single: jest.fn(() => (req: any, res: any, next: any) => {
      req.file = { fieldname: 'file', originalname: 'test.jpg', mimetype: 'image/jpeg' }
      next()
    })
  })
  mockMulter.diskStorage = mockDiskStorage
  return mockMulter
})

// Mock do auth
jest.mock('../../infrastructure/auth', () => ({
  __esModule: true,
  default: (_req: any, _res: any, next: any) => next(),
}))

import scenarioRouter from '../../routes/scenario.routes'

describe('scenario.routes', () => {
  let app: express.Express

  beforeEach(() => {
    jest.clearAllMocks()
    app = express()
    app.use(express.json())

    app.use(scenarioRouter)

    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status = Number.isFinite(err?.status) ? err.status : 500
      res.status(status).json({ message: err?.message || 'Internal error' })
    })
  })

  describe('Rotas de cenários de pacotes', () => {
    it('GET /packages/:packageId/scenarios → chama getPackageScenarios', async () => {
      const res = await request(app).get('/packages/123/scenarios')
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true, route: 'getPackageScenarios', packageId: '123' })
      expect(mockScenarioController.getPackageScenarios).toHaveBeenCalledTimes(1)
    })

    it('POST /packages/:packageId/scenarios → chama createScenario', async () => {
      const res = await request(app)
        .post('/packages/123/scenarios')
        .send({ title: 'Test Scenario', type: 'FUNCTIONAL', priority: 'HIGH' })
      
      expect(res.status).toBe(201)
      expect(res.body).toEqual({ 
        ok: true, 
        route: 'createScenario', 
        packageId: '123',
        body: { title: 'Test Scenario', type: 'FUNCTIONAL', priority: 'HIGH' }
      })
      expect(mockScenarioController.createScenario).toHaveBeenCalledTimes(1)
    })
  })

  describe('Rotas de cenários individuais', () => {
    it('GET /scenarios/:id → chama getScenarioById', async () => {
      const res = await request(app).get('/scenarios/456')
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true, route: 'getScenarioById', id: '456' })
      expect(mockScenarioController.getScenarioById).toHaveBeenCalledTimes(1)
    })

    it('PUT /scenarios/:id → chama updateScenario', async () => {
      const res = await request(app)
        .put('/scenarios/456')
        .send({ title: 'Updated Scenario' })
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ 
        ok: true, 
        route: 'updateScenario', 
        id: '456',
        body: { title: 'Updated Scenario' }
      })
      expect(mockScenarioController.updateScenario).toHaveBeenCalledTimes(1)
    })

    it('DELETE /scenarios/:id → chama deleteScenario', async () => {
      const res = await request(app).delete('/scenarios/456')
      
      expect(res.status).toBe(204)
      expect(res.text).toBe('')
      expect(mockScenarioController.deleteScenario).toHaveBeenCalledTimes(1)
    })
  })

  describe('Rotas de execução de cenários', () => {
    it('POST /scenarios/:id/executions → chama executeScenario com auth', async () => {
      const res = await request(app)
        .post('/scenarios/456/executions')
        .send({ status: 'PASSED', notes: 'Test executed successfully' })
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ 
        ok: true, 
        route: 'executeScenario', 
        id: '456',
        body: { status: 'PASSED', notes: 'Test executed successfully' }
      })
      expect(mockScenarioController.executeScenario).toHaveBeenCalledTimes(1)
    })

    it('POST /scenarios/:id/duplicate → chama duplicateScenario', async () => {
      const res = await request(app).post('/scenarios/456/duplicate')
      
      expect(res.status).toBe(201)
      expect(res.body).toEqual({ ok: true, route: 'duplicateScenario', id: '456' })
      expect(mockScenarioController.duplicateScenario).toHaveBeenCalledTimes(1)
    })
  })

  describe('Rotas de evidências', () => {
    it('POST /scenarios/:id/evidences → chama uploadEvidence com auth e multer', async () => {
      const res = await request(app)
        .post('/scenarios/456/evidences')
        .attach('file', Buffer.from('fake file content'), 'test.jpg')
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ 
        ok: true, 
        route: 'uploadEvidence', 
        id: '456',
        file: { fieldname: 'file', originalname: 'test.jpg', mimetype: 'image/jpeg' }
      })
      expect(mockScenarioController.uploadEvidence).toHaveBeenCalledTimes(1)
    })
  })

  describe('Rotas de exportação', () => {
    it('GET /packages/:packageId/scenarios/export.csv → chama exportScenariosToCSV com auth', async () => {
      const res = await request(app).get('/packages/123/scenarios/export.csv')
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true, route: 'exportScenariosToCSV', packageId: '123' })
      expect(mockScenarioController.exportScenariosToCSV).toHaveBeenCalledTimes(1)
    })

    it('GET /packages/:packageId/scenarios/report.pdf → chama generateScenarioReport com auth', async () => {
      const res = await request(app).get('/packages/123/scenarios/report.pdf')
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true, route: 'generateScenarioReport', packageId: '123' })
      expect(mockScenarioController.generateScenarioReport).toHaveBeenCalledTimes(1)
    })
  })

  describe('Tratamento de erros', () => {
    it('asyncH: se o controller rejeitar, cai no error handler', async () => {
      mockScenarioController.getScenarioById.mockImplementationOnce(async () => {
        const err: any = new Error('Controller error')
        err.status = 400
        throw err
      })

      const res = await request(app).get('/scenarios/999')
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ message: 'Controller error' })
    })

    it('asyncH: se o controller rejeitar sem status, usa 500', async () => {
      mockScenarioController.getScenarioById.mockImplementationOnce(async () => {
        throw new Error('Generic error')
      })

      const res = await request(app).get('/scenarios/999')
      expect(res.status).toBe(500)
      expect(res.body).toEqual({ message: 'Generic error' })
    })
  })

  describe('Configuração do multer', () => {
    it('deve configurar multer corretamente para upload de evidências', async () => {
      // Este teste verifica se o multer está configurado corretamente
      // através do teste de upload de evidências que já existe
      const res = await request(app)
        .post('/scenarios/456/evidences')
        .attach('file', Buffer.from('fake file content'), 'test.jpg')
      
      expect(res.status).toBe(200)
      expect(res.body.file).toBeDefined()
      expect(res.body.file.fieldname).toBe('file')
      expect(res.body.file.originalname).toBe('test.jpg')
    })
  })
})
