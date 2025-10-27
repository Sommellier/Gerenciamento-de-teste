import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import { auth } from '../../../infrastructure/auth'
import { createScenarioInPackageController } from '../../../controllers/scenarios/createScenarioInPackage.controller'
import { updateScenarioInPackageController } from '../../../controllers/scenarios/updateScenarioInPackage.controller'
import { deleteScenarioInPackageController } from '../../../controllers/scenarios/deleteScenarioInPackage.controller'
import { prisma } from '../../../infrastructure/prisma'

const errorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
  const status = (err as any).statusCode || 500
  const message = (err as any).message || 'Internal server error'
  res.status(status as number).json({ message })
}

let app: express.Express
let ownerId: number
let projectId: number
let packageId: number
let scenarioId: number
let authToken: string

const tokenFor = (userId: number) => {
  const secret = process.env.JWT_SECRET || 'test-secret-key-for-jwt-tokens'
  return jwt.sign({ userId }, secret, { expiresIn: '1h' })
}

beforeAll(async () => {
  app = express()
  app.use(express.json())
  
  // Rotas para cenários em pacotes
  app.post('/projects/:projectId/packages/:packageId/scenarios', auth, createScenarioInPackageController)
  app.put('/projects/:projectId/packages/:packageId/scenarios/:scenarioId', auth, updateScenarioInPackageController)
  app.delete('/projects/:projectId/packages/:packageId/scenarios/:scenarioId', auth, deleteScenarioInPackageController)
  
  app.use(errorHandler)

  // Criar usuário e projeto para os testes
  const owner = await prisma.user.create({
    data: {
      name: 'Test Owner',
      email: `owner-${Date.now()}@test.com`,
      password: 'password123'
    }
  })
  ownerId = owner.id
  authToken = tokenFor(ownerId)

  const project = await prisma.project.create({
    data: {
      name: 'Test Project',
      description: 'Test Description',
      ownerId: ownerId
    }
  })
  projectId = project.id

  // Criar pacote para os testes
  const testPackage = await prisma.testPackage.create({
    data: {
      title: 'Test Package',
      description: 'Test Package Description',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      projectId: projectId,
      release: '2024-01'
    }
  })
  packageId = testPackage.id

  // Criar cenário para os testes
  const scenario = await prisma.testScenario.create({
    data: {
      title: 'Test Scenario',
      description: 'Test Description',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      projectId: projectId,
      packageId: packageId,
      steps: {
        create: [
          { action: 'Step 1', expected: 'Expected 1', stepOrder: 1 },
          { action: 'Step 2', expected: 'Expected 2', stepOrder: 2 }
        ]
      }
    }
  })
  scenarioId = scenario.id
})

afterAll(async () => {
  // Limpar dados de teste
  await prisma.testScenarioStep.deleteMany({
    where: { scenario: { projectId: projectId } }
  })
  await prisma.testScenario.deleteMany({
    where: { projectId: projectId }
  })
  await prisma.testPackage.deleteMany({
    where: { projectId: projectId }
  })
  await prisma.project.deleteMany({
    where: { ownerId: ownerId }
  })
  await prisma.user.deleteMany({
    where: { id: ownerId }
  })
})

describe('Cenários em Pacotes - CRUD Completo', () => {
  describe('PUT /projects/:projectId/packages/:packageId/scenarios/:scenarioId', () => {
    it('atualiza cenário com sucesso', async () => {
      const updateData = {
        title: 'Updated Scenario Title',
        description: 'Updated Description',
        priority: 'MEDIUM',
        tags: ['updated', 'test'],
        steps: [
          { action: 'Updated Step 1', expected: 'Updated Expected 1' },
          { action: 'Updated Step 2', expected: 'Updated Expected 2' }
        ]
      }

      const response = await request(app)
        .put(`/projects/${projectId}/packages/${packageId}/scenarios/${scenarioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Cenário atualizado com sucesso')
      expect(response.body).toHaveProperty('scenario')
      expect(response.body.scenario.title).toBe('Updated Scenario Title')
      expect(response.body.scenario.description).toBe('Updated Description')
      expect(response.body.scenario.priority).toBe('MEDIUM')
      expect(response.body.scenario.tags).toEqual(['updated', 'test'])
      expect(response.body.scenario.steps).toHaveLength(2)
    })

    it('atualiza apenas campos específicos', async () => {
      const updateData = {
        title: 'Only Title Updated',
        status: 'EXECUTED'
      }

      const response = await request(app)
        .put(`/projects/${projectId}/packages/${packageId}/scenarios/${scenarioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.scenario.title).toBe('Only Title Updated')
      expect(response.body.scenario.status).toBe('EXECUTED')
      expect(response.body.scenario.description).toBe('Updated Description') // Mantém valor anterior
    })

    it('rejeita quando não autenticado', async () => {
      const updateData = {
        title: 'Test Title'
      }

      await request(app)
        .put(`/projects/${projectId}/packages/${packageId}/scenarios/${scenarioId}`)
        .send(updateData)
        .expect(401)
        .expect({ message: 'Não autenticado' })
    })

    it('rejeita quando cenário não existe', async () => {
      const updateData = {
        title: 'Test Title'
      }

      await request(app)
        .put(`/projects/${projectId}/packages/${packageId}/scenarios/99999`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404)
        .expect({ message: 'Cenário não encontrado' })
    })
  })

  describe('DELETE /projects/:projectId/packages/:packageId/scenarios/:scenarioId', () => {
    it('deleta cenário com sucesso', async () => {
      // Criar cenário para deletar
      const scenarioToDelete = await prisma.testScenario.create({
        data: {
          title: 'Scenario to Delete',
          description: 'Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId: projectId,
          packageId: packageId,
          steps: {
            create: [
              { action: 'Step 1', expected: 'Expected 1', stepOrder: 1 }
            ]
          }
        }
      })

      const response = await request(app)
        .delete(`/projects/${projectId}/packages/${packageId}/scenarios/${scenarioToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Cenário deletado com sucesso')

      // Verificar se foi deletado
      const deletedScenario = await prisma.testScenario.findUnique({
        where: { id: scenarioToDelete.id }
      })
      expect(deletedScenario).toBeNull()
    })

    it('rejeita quando não autenticado', async () => {
      await request(app)
        .delete(`/projects/${projectId}/packages/${packageId}/scenarios/${scenarioId}`)
        .expect(401)
        .expect({ message: 'Não autenticado' })
    })

    it('rejeita quando cenário não existe', async () => {
      await request(app)
        .delete(`/projects/${projectId}/packages/${packageId}/scenarios/99999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect({ message: 'Cenário não encontrado' })
    })
  })
})
