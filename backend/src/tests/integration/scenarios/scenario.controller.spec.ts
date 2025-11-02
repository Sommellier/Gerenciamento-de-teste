import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { ScenarioController } from '../../../controllers/scenarios/scenario.controller'
import { AppError } from '../../../utils/AppError'

const unique = (p: string) =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

function tokenFor(id: number) {
  const secret = process.env.JWT_SECRET || 'test-secret'
  return jwt.sign({ userId: id, type: 'access' }, secret, { expiresIn: '1h' })
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
    ) as { userId: number }
    ;(req as any).user = { id: payload.userId }
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido' })
  }
}

const errorHandler: express.ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message })
  } else if (err.message && err.message.includes('obrigatório')) {
    // Tratar erros de validação como 400
    res.status(400).json({ message: err.message })
  } else {
    res.status(500).json({ 
      error: err.message || 'Internal Server Error',
      message: err.message || 'Internal Server Error'
    })
  }
}

let app: express.Express

describe('ScenarioController', () => {
  let user: any
  let project: any
  let testPackage: any
  let authToken: string
  let scenarioController: ScenarioController

  beforeAll(async () => {
    app = express()
    app.use(express.json())
    
    scenarioController = new ScenarioController()
    
    app.get('/packages/:packageId/scenarios', auth, scenarioController.getPackageScenarios.bind(scenarioController) as any)
    app.post('/packages/:packageId/scenarios', auth, scenarioController.createScenario.bind(scenarioController) as any)
    app.get('/scenarios/:id', auth, scenarioController.getScenarioById.bind(scenarioController) as any)
    app.put('/scenarios/:id', auth, scenarioController.updateScenario.bind(scenarioController) as any)
    app.delete('/scenarios/:id', auth, scenarioController.deleteScenario.bind(scenarioController) as any)
    app.post('/scenarios/:id/executions', auth, scenarioController.executeScenario.bind(scenarioController) as any)
    app.post('/scenarios/:id/duplicate', auth, scenarioController.duplicateScenario.bind(scenarioController) as any)
    app.post('/scenarios/:id/evidences', auth, scenarioController.uploadEvidence.bind(scenarioController) as any)
    app.get('/packages/:packageId/scenarios/export.csv', auth, scenarioController.exportScenariosToCSV.bind(scenarioController) as any)
    app.get('/packages/:packageId/scenarios/report.pdf', auth, scenarioController.generateScenarioReport.bind(scenarioController) as any)
    
    app.use(errorHandler)

    // Criar usuário e projeto para os testes
    user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: unique('test@example.com'),
        password: 'password123'
      }
    })

    project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: user.id
      }
    })

    // Adicionar usuário como membro do projeto (para ter acesso)
    await prisma.userOnProject.create({
      data: {
        userId: user.id,
        projectId: project.id,
        role: 'OWNER'
      }
    })

    // Criar pacote de teste
    testPackage = await prisma.testPackage.create({
      data: {
        title: 'Test Package',
        description: 'Test Package Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId: project.id,
        release: '2024-01'
      }
    })

    authToken = tokenFor(user.id)
  })

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.testPackage.deleteMany({
      where: { projectId: project.id }
    })
    await prisma.project.deleteMany({
      where: { id: project.id }
    })
    await prisma.user.deleteMany({
      where: { id: user.id }
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /packages/:packageId/scenarios', () => {
    it('deve retornar lista de cenários', async () => {
      // Criar cenário de teste
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario',
          description: 'Test Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId: testPackage.id,
          projectId: project.id,
          steps: {
            create: [
              { action: 'Test action', expected: 'Expected result', stepOrder: 1 }
            ]
          }
        }
      })

      const response = await request(app)
        .get(`/packages/${testPackage.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.message).toBe('Cenários recuperados com sucesso')
      expect(response.body.data.scenarios).toHaveLength(1)
      expect(response.body.data.scenarios[0].title).toBe('Test Scenario')

      // Limpar cenário
      await prisma.testScenarioStep.deleteMany({
        where: { scenarioId: scenario.id }
      })
      await prisma.testScenario.delete({
        where: { id: scenario.id }
      })
    })

    it('deve filtrar por status', async () => {
      const response = await request(app)
        .get(`/packages/${testPackage.id}/scenarios`)
        .query({ status: 'CREATED' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.scenarios).toBeDefined()
    })

    it('deve negar acesso sem token', async () => {
      await request(app)
        .get(`/packages/${testPackage.id}/scenarios`)
        .expect(401)
    })

    it('deve tratar erro interno do servidor', async () => {
      // Mock do scenarioService para simular erro interno
      const originalGetPackageScenarios = require('../../../services/scenario.service').ScenarioService.prototype.getPackageScenarios
      require('../../../services/scenario.service').ScenarioService.prototype.getPackageScenarios = jest.fn().mockRejectedValue(new Error('Database connection error'))

      const response = await request(app)
        .get(`/packages/${testPackage.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)

      expect(response.body.message).toBe('Erro interno do servidor')

      // Restaurar mock
      require('../../../services/scenario.service').ScenarioService.prototype.getPackageScenarios = originalGetPackageScenarios
    })
  })

  describe('POST /packages/:packageId/scenarios', () => {
    const validScenarioData = {
      title: 'New Test Scenario',
      description: 'New Test Description',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      // TODO: campos não existem no schema atual
      // severity: 'MEDIUM',
      // module: 'Auth',
      // environment: 'DEV',
      tags: ['test', 'auth'],
      // preconditions: ['User logged in'],
      steps: [
        {
          order: 1,
          action: 'Click login button',
          dataInput: 'username: test, password: test123',
          expected: 'User is logged in',
          checkpoint: 'Check dashboard is visible'
        }
      ]
    }

    it('deve criar cenário com dados válidos', async () => {
      const response = await request(app)
        .post(`/packages/${testPackage.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validScenarioData)
        .expect(201)

      expect(response.body.message).toBe('Cenário criado com sucesso')
      expect(response.body.scenario.title).toBe('New Test Scenario')
      expect(response.body.scenario.type).toBe('FUNCTIONAL')
      expect(response.body.scenario.steps).toHaveLength(1)

      // Limpar cenário criado
      await prisma.testScenarioStep.deleteMany({
        where: { scenarioId: response.body.scenario.id }
      })
      await prisma.testScenario.delete({
        where: { id: response.body.scenario.id }
      })
    })

    it('deve rejeitar dados inválidos', async () => {
      const invalidData = {
        title: '', // Título vazio
        type: 'INVALID_TYPE',
        priority: 'INVALID_PRIORITY',
        steps: [] // Steps vazio
      }

      await request(app)
        .post(`/packages/${testPackage.id}/scenarios`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400)
    })

    it('deve negar acesso sem token', async () => {
      await request(app)
        .post(`/packages/${testPackage.id}/scenarios`)
        .send(validScenarioData)
        .expect(401)
    })
  })

  describe('POST /scenarios/:id/executions', () => {
    let scenario: any

    beforeEach(async () => {
      scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario for Execution',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId: testPackage.id,
          projectId: project.id,
          steps: {
            create: [
              { action: 'Test action', expected: 'Expected result', stepOrder: 1 }
            ]
          }
        }
      })
    })

    afterEach(async () => {
      // TODO: scenarioExecution não existe no schema atual
      // await prisma.scenarioExecution.deleteMany({
      //   where: { scenarioId: scenario.id }
      // })
      await prisma.testScenarioStep.deleteMany({
        where: { scenarioId: scenario.id }
      })
      await prisma.testScenario.delete({
        where: { id: scenario.id }
      })
    })

    it('deve executar cenário com sucesso', async () => {
      const executionData = {
        status: 'PASSED',
        notes: 'Execution completed successfully'
      }

      const response = await request(app)
        .post(`/scenarios/${scenario.id}/executions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(executionData)
        .expect(201)

      expect(response.body.message).toBe('Execução registrada com sucesso')
      expect(response.body.execution.status).toBe('PASSED')
      // TODO: runNumber não existe no schema atual
      // expect(response.body.execution.runNumber).toBe(1)
    })

    it('deve rejeitar status inválido', async () => {
      const invalidData = {
        status: 'INVALID_STATUS',
        notes: 'Invalid execution'
      }

      await request(app)
        .post(`/scenarios/${scenario.id}/executions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400)
    })
  })

  describe('POST /scenarios/:id/duplicate', () => {
    let scenario: any

    beforeEach(async () => {
      scenario = await prisma.testScenario.create({
        data: {
          title: 'Original Scenario',
          description: 'Original Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'PASSED',
          packageId: testPackage.id,
          projectId: project.id,
          steps: {
            create: [
              { action: 'Action 1', expected: 'Expected 1', stepOrder: 1 },
              { action: 'Action 2', expected: 'Expected 2', stepOrder: 2 }
            ]
          }
        }
      })
    })

    afterEach(async () => {
      await prisma.testScenarioStep.deleteMany({
        where: { scenarioId: { in: [scenario.id, scenario.duplicatedId].filter(Boolean) } }
      })
      await prisma.testScenario.deleteMany({
        where: { id: { in: [scenario.id, scenario.duplicatedId].filter(Boolean) } }
      })
    })

    it('deve duplicar cenário com sucesso', async () => {
      const response = await request(app)
        .post(`/scenarios/${scenario.id}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)

      expect(response.body.message).toBe('Cenário duplicado com sucesso')
      expect(response.body.scenario.title).toBe('Original Scenario (Cópia)')
      expect(response.body.scenario.status).toBe('CREATED')
      expect(response.body.scenario.steps).toHaveLength(2)

      scenario.duplicatedId = response.body.scenario.id
    })

    it('deve tratar erro AppError ao duplicar cenário (linha 216)', async () => {
      // Mock do scenarioService para simular AppError
      const originalDuplicateScenario = require('../../../services/scenario.service').ScenarioService.prototype.duplicateScenario
      require('../../../services/scenario.service').ScenarioService.prototype.duplicateScenario = jest.fn().mockRejectedValue(new AppError('Cenário não encontrado', 404))

      const response = await request(app)
        .post(`/scenarios/${scenario.id}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body.message).toBe('Cenário não encontrado')

      // Restaurar mock
      require('../../../services/scenario.service').ScenarioService.prototype.duplicateScenario = originalDuplicateScenario
    })

    it('deve tratar erro interno do servidor ao duplicar cenário (linhas 219-220)', async () => {
      // Mock do scenarioService para simular erro interno
      const originalDuplicateScenario = require('../../../services/scenario.service').ScenarioService.prototype.duplicateScenario
      require('../../../services/scenario.service').ScenarioService.prototype.duplicateScenario = jest.fn().mockRejectedValue(new Error('Database connection error'))

      const response = await request(app)
        .post(`/scenarios/${scenario.id}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)

      expect(response.body.message).toBe('Erro interno do servidor')

      // Restaurar mock
      require('../../../services/scenario.service').ScenarioService.prototype.duplicateScenario = originalDuplicateScenario
    })
  })

  describe('DELETE /scenarios/:id', () => {
    let scenario: any

    beforeEach(async () => {
      scenario = await prisma.testScenario.create({
        data: {
          title: 'Scenario to Delete',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId: testPackage.id,
          projectId: project.id,
          steps: {
            create: [
              { action: 'Test action', expected: 'Expected result', stepOrder: 1 }
            ]
          }
        }
      })
    })

    it('deve deletar cenário com sucesso', async () => {
      const response = await request(app)
        .delete(`/scenarios/${scenario.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.message).toBe('Cenário deletado com sucesso')

      // Verificar se cenário foi deletado
      const deletedScenario = await prisma.testScenario.findUnique({
        where: { id: scenario.id }
      })
      expect(deletedScenario).toBeNull()
    })

    it('deve retornar erro para cenário inexistente', async () => {
      await request(app)
        .delete('/scenarios/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('GET /scenarios/:id', () => {
    let scenario: any

    beforeEach(async () => {
      scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario for Get',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId: testPackage.id,
          projectId: project.id
        }
      })
    })

    afterEach(async () => {
      await prisma.testScenarioStep.deleteMany({
        where: { scenarioId: scenario.id }
      })
      await prisma.testScenario.delete({
        where: { id: scenario.id }
      })
    })

    it('deve retornar cenário por ID', async () => {
      const response = await request(app)
        .get(`/scenarios/${scenario.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Cenário recuperado com sucesso')
      expect(response.body.scenario).toHaveProperty('id', scenario.id)
    })

    it('deve retornar erro para cenário inexistente', async () => {
      const response = await request(app)
        .get('/scenarios/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('PUT /scenarios/:id', () => {
    let scenario: any

    beforeEach(async () => {
      scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario for Update',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId: testPackage.id,
          projectId: project.id
        }
      })
    })

    afterEach(async () => {
      await prisma.testScenarioStep.deleteMany({
        where: { scenarioId: scenario.id }
      })
      await prisma.testScenario.delete({
        where: { id: scenario.id }
      })
    })

    it('deve atualizar cenário com sucesso', async () => {
      const updateData = {
        title: 'Cenário Atualizado',
        description: 'Descrição atualizada',
        priority: 'MEDIUM'
      }

      const response = await request(app)
        .put(`/scenarios/${scenario.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Cenário atualizado com sucesso')
      expect(response.body.scenario.title).toBe('Cenário Atualizado')
    })

    it('deve retornar erro para cenário inexistente', async () => {
      const updateData = {
        title: 'Cenário Atualizado'
      }

      const response = await request(app)
        .put('/scenarios/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /scenarios/:id/evidences', () => {
    let scenario: any

    beforeEach(async () => {
      scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario for Evidence',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId: testPackage.id,
          projectId: project.id
        }
      })
    })

    afterEach(async () => {
      await prisma.testScenarioStep.deleteMany({
        where: { scenarioId: scenario.id }
      })
      await prisma.testScenario.delete({
        where: { id: scenario.id }
      })
    })

    it('deve rejeitar quando arquivo não é fornecido (linha 235)', async () => {
      const response = await request(app)
        .post(`/scenarios/${scenario.id}/evidences`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      expect(response.body).toHaveProperty('message', 'Arquivo não fornecido')
    })

    it('deve rejeitar quando não autenticado (linha 231)', async () => {
      // Criar um middleware customizado que não seta req.user.id
      const customAuth: express.RequestHandler = (req, res, next) => {
        ;(req as any).user = {} // user existe mas não tem id
        next()
      }

      const customApp = express()
      customApp.use(express.json())
      const scenarioController = new ScenarioController()
      customApp.post('/scenarios/:id/evidences', customAuth, scenarioController.uploadEvidence.bind(scenarioController) as any)
      customApp.use(errorHandler)

      const response = await request(customApp)
        .post(`/scenarios/${scenario.id}/evidences`)
        .expect(401)

      expect(response.body).toHaveProperty('message', 'Não autenticado')
    })

    it('deve tratar erro interno do servidor ao enviar evidência', async () => {
      // Mock do scenarioService para simular erro interno após validação
      const originalUploadEvidence = require('../../../services/scenario.service').ScenarioService.prototype.uploadEvidence
      require('../../../services/scenario.service').ScenarioService.prototype.uploadEvidence = jest.fn().mockRejectedValue(new Error('Database connection error'))

      // Criar app com multer configurado
      const multer = require('multer')
      const multerMemory = multer({ storage: multer.memoryStorage() })
      
      // Criar nova instância do controller para este teste específico
      const testScenarioController = new ScenarioController()
      
      const testApp = express()
      testApp.use(express.json())
      testApp.post('/scenarios/:id/evidences', auth, multerMemory.single('file'), testScenarioController.uploadEvidence.bind(testScenarioController) as any)
      testApp.use(errorHandler)

      const fs = require('fs')
      const path = require('path')
      const tempFile = path.join(__dirname, 'temp-test-file.jpg')
      fs.writeFileSync(tempFile, Buffer.from('fake image data'))

      const response = await request(testApp)
        .post(`/scenarios/${scenario.id}/evidences`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', tempFile)
        .expect(500)

      expect(response.body.message).toBe('Erro interno do servidor')

      // Limpar arquivo temporário
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }

      // Restaurar mock
      require('../../../services/scenario.service').ScenarioService.prototype.uploadEvidence = originalUploadEvidence
    })
  })

  describe('GET /packages/:packageId/scenarios/export.csv', () => {
    it('deve exportar cenários para CSV', async () => {
      const response = await request(app)
        .get(`/packages/${testPackage.id}/scenarios/export.csv`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.headers['content-disposition']).toContain('attachment')
    })

    it('deve negar acesso sem token', async () => {
      const response = await request(app)
        .get(`/packages/${testPackage.id}/scenarios/export.csv`)
        .expect(401)

      expect(response.body).toHaveProperty('message', 'Token não fornecido')
    })

    it('deve tratar erro AppError ao exportar (linha 270)', async () => {
      // Mock do scenarioService para simular AppError
      const originalExportScenariosToCSV = require('../../../services/scenario.service').ScenarioService.prototype.exportScenariosToCSV
      require('../../../services/scenario.service').ScenarioService.prototype.exportScenariosToCSV = jest.fn().mockRejectedValue(new AppError('Pacote não encontrado', 404))

      const response = await request(app)
        .get(`/packages/${testPackage.id}/scenarios/export.csv`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body.message).toBe('Pacote não encontrado')

      // Restaurar mock
      require('../../../services/scenario.service').ScenarioService.prototype.exportScenariosToCSV = originalExportScenariosToCSV
    })

    it('deve tratar erro interno do servidor', async () => {
      // Mock do scenarioService para simular erro interno
      const originalExportScenariosToCSV = require('../../../services/scenario.service').ScenarioService.prototype.exportScenariosToCSV
      require('../../../services/scenario.service').ScenarioService.prototype.exportScenariosToCSV = jest.fn().mockRejectedValue(new Error('Database connection error'))

      const response = await request(app)
        .get(`/packages/${testPackage.id}/scenarios/export.csv`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)

      expect(response.body.message).toBe('Erro interno do servidor')

      // Restaurar mock
      require('../../../services/scenario.service').ScenarioService.prototype.exportScenariosToCSV = originalExportScenariosToCSV
    })
  })

  describe('GET /packages/:packageId/scenarios/report.pdf', () => {
    let scenario: any

    beforeEach(async () => {
      scenario = await prisma.testScenario.create({
        data: {
          title: 'Test Scenario for Report',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          status: 'CREATED',
          packageId: testPackage.id,
          projectId: project.id
        }
      })
    })

    afterEach(async () => {
      await prisma.testScenarioStep.deleteMany({
        where: { scenarioId: scenario.id }
      })
      await prisma.testScenario.delete({
        where: { id: scenario.id }
      })
    })

    it('deve gerar relatório PDF do pacote com sucesso', async () => {
      const response = await request(app)
        .get(`/packages/${testPackage.id}/scenarios/report.pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.headers['content-type']).toContain('application/pdf')
      expect(response.headers['content-disposition']).toContain('attachment')
      expect(response.body.toString()).toContain('Relatório de Cenários de Teste')
      expect(response.body.toString()).toContain(`Pacote ${testPackage.id}`)
    })

    it('deve negar acesso sem token (linha 284)', async () => {
      // Criar um middleware customizado que não seta req.user.id
      const customAuth: express.RequestHandler = (req, res, next) => {
        ;(req as any).user = {} // user existe mas não tem id
        next()
      }

      const customApp = express()
      customApp.use(express.json())
      const scenarioController = new ScenarioController()
      customApp.get('/packages/:packageId/scenarios/report.pdf', customAuth, scenarioController.generateScenarioReport.bind(scenarioController) as any)
      customApp.use(errorHandler)

      const response = await request(customApp)
        .get(`/packages/${testPackage.id}/scenarios/report.pdf`)
        .expect(401)

      expect(response.body).toHaveProperty('message', 'Não autenticado')
    })

    it('deve retornar 403 quando acesso ao pacote é negado', async () => {
      // Criar outro usuário sem acesso ao pacote
      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: unique('other@example.com'),
          password: 'password123'
        }
      })

      const otherToken = tokenFor(otherUser.id)

      const response = await request(app)
        .get(`/packages/${testPackage.id}/scenarios/report.pdf`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403)

      expect(response.body).toHaveProperty('message', 'Acesso negado ao pacote')

      // Limpar
      await prisma.user.delete({ where: { id: otherUser.id } })
    })

    it('deve tratar erro AppError ao gerar relatório', async () => {
      // Mock do scenarioService para simular AppError
      const originalCheckPackageAccess = require('../../../services/scenario.service').ScenarioService.prototype.checkPackageAccess
      require('../../../services/scenario.service').ScenarioService.prototype.checkPackageAccess = jest.fn().mockResolvedValue(true)
      
      const originalGetPackageScenarios = require('../../../services/scenario.service').ScenarioService.prototype.getPackageScenarios
      require('../../../services/scenario.service').ScenarioService.prototype.getPackageScenarios = jest.fn().mockRejectedValue(new AppError('Pacote não encontrado', 404))

      const response = await request(app)
        .get(`/packages/${testPackage.id}/scenarios/report.pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body.message).toBe('Pacote não encontrado')

      // Restaurar mocks
      require('../../../services/scenario.service').ScenarioService.prototype.checkPackageAccess = originalCheckPackageAccess
      require('../../../services/scenario.service').ScenarioService.prototype.getPackageScenarios = originalGetPackageScenarios
    })

    it('deve tratar erro interno do servidor', async () => {
      // Mock do scenarioService para simular erro interno
      const originalCheckPackageAccess = require('../../../services/scenario.service').ScenarioService.prototype.checkPackageAccess
      require('../../../services/scenario.service').ScenarioService.prototype.checkPackageAccess = jest.fn().mockRejectedValue(new Error('Database connection error'))

      const response = await request(app)
        .get(`/packages/${testPackage.id}/scenarios/report.pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)

      expect(response.body.message).toBe('Erro interno do servidor')

      // Restaurar mock
      require('../../../services/scenario.service').ScenarioService.prototype.checkPackageAccess = originalCheckPackageAccess
    })
  })
})
