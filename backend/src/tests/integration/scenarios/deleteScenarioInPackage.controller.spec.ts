import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { deleteScenarioInPackageController } from '../../../controllers/scenarios/deleteScenarioInPackage.controller'
import { AppError } from '../../../utils/AppError'
import { Role, ScenarioType, Priority, ScenarioStatus } from '@prisma/client'

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
let ownerId: number
let projectId: number
let packageId: number
let scenarioId: number

beforeAll(async () => {
  app = express()
  app.use(express.json())
  app.delete('/projects/:projectId/packages/:packageId/scenarios/:scenarioId', auth, deleteScenarioInPackageController)
  app.use(errorHandler)

  // Criar usuário owner
  const owner = await prisma.user.create({
    data: {
      name: 'Test Owner',
      email: unique('owner@test.com'),
      password: 'password123'
    }
  })
  ownerId = owner.id

  // Criar projeto
  const project = await prisma.project.create({
    data: {
      name: 'Test Project',
      description: 'Test Description',
      ownerId: ownerId
    }
  })
  projectId = project.id

  // Criar pacote
  const testPackage = await prisma.testPackage.create({
    data: {
      title: 'Test Package',
      description: 'Test Description',
      type: ScenarioType.FUNCTIONAL,
      priority: Priority.HIGH,
      release: '2024-01',
      projectId: projectId
    }
  })
  packageId = testPackage.id
})

afterAll(async () => {
  await prisma.testScenario.deleteMany({
    where: { projectId }
  })
  await prisma.testPackage.deleteMany({
    where: { projectId }
  })
  await prisma.project.deleteMany({
    where: { id: projectId }
  })
  await prisma.user.deleteMany({
    where: { id: ownerId }
  })
})

describe('deleteScenarioInPackageController', () => {
  beforeEach(async () => {
    // Criar cenário para cada teste
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Test Scenario',
        description: 'Test Description',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        status: ScenarioStatus.CREATED,
        projectId,
        packageId
      }
    })
    scenarioId = scenario.id
  })

  afterEach(async () => {
    // Limpar cenário se ainda existir
    await prisma.testScenario.deleteMany({
      where: { id: scenarioId }
    })
  })

  describe('deleteScenarioInPackageController - casos de sucesso', () => {
    it('deleta cenário com sucesso', async () => {
      const response = await request(app)
        .delete(`/projects/${projectId}/packages/${packageId}/scenarios/${scenarioId}`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(200)

      expect(response.body).toMatchObject({
        message: 'Cenário deletado com sucesso'
      })

      // Verificar que cenário foi deletado
      const deletedScenario = await prisma.testScenario.findUnique({
        where: { id: scenarioId }
      })
      expect(deletedScenario).toBeNull()
    })
  })

  describe('deleteScenarioInPackageController - casos de erro', () => {
    it('rejeita quando não autenticado', async () => {
      const response = await request(app)
        .delete(`/projects/${projectId}/packages/${packageId}/scenarios/${scenarioId}`)
        .expect(401)

      expect(response.body).toMatchObject({
        message: 'Token não fornecido'
      })
    })

    it('rejeita quando token é inválido', async () => {
      const response = await request(app)
        .delete(`/projects/${projectId}/packages/${packageId}/scenarios/${scenarioId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toMatchObject({
        message: 'Token inválido'
      })
    })

    it('rejeita quando req.user.id está ausente (linha 18)', async () => {
      // Criar um middleware customizado que não seta req.user.id
      const customAuth: express.RequestHandler = (req, res, next) => {
        ;(req as any).user = {} // user existe mas não tem id
        next()
      }

      const customApp = express()
      customApp.use(express.json())
      customApp.delete('/projects/:projectId/packages/:packageId/scenarios/:scenarioId', customAuth, deleteScenarioInPackageController)
      customApp.use(errorHandler)

      const response = await request(customApp)
        .delete(`/projects/${projectId}/packages/${packageId}/scenarios/${scenarioId}`)
        .expect(401)

      expect(response.body).toMatchObject({
        message: 'Não autenticado'
      })
    })

    it('rejeita quando scenarioId é NaN (linha 27)', async () => {
      const response = await request(app)
        .delete(`/projects/${projectId}/packages/${packageId}/scenarios/invalid`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(400)

      expect(response.body).toMatchObject({
        message: 'IDs inválidos'
      })
    })

    it('rejeita quando packageId é NaN', async () => {
      const response = await request(app)
        .delete(`/projects/${projectId}/packages/invalid/scenarios/${scenarioId}`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(400)

      expect(response.body).toMatchObject({
        message: 'IDs inválidos'
      })
    })

    it('rejeita quando projectId é NaN', async () => {
      const response = await request(app)
        .delete(`/projects/invalid/packages/${packageId}/scenarios/${scenarioId}`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(400)

      expect(response.body).toMatchObject({
        message: 'IDs inválidos'
      })
    })

    it('rejeita quando cenário não existe', async () => {
      const response = await request(app)
        .delete(`/projects/${projectId}/packages/${packageId}/scenarios/99999`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(404)

      expect(response.body).toMatchObject({
        message: 'Cenário não encontrado'
      })
    })
  })
})

