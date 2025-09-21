// src/tests/integration/packages/updatePackage.controller.spec.ts
import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { updatePackageController } from '../../../controllers/packages/updatePackage.controller'
import { AppError } from '../../../utils/AppError'
import * as updateUC from '../../../application/use-cases/packages/updatePackage.use-case'

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
    res.status(401).json({ message: 'Não autenticado' })
    return
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'test-secret'
    ) as { id: number }
    // @ts-expect-error campo ad-hoc
    req.user = { id: payload.id }
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido' })
    return
  }
}

const errorHandler: express.ErrorRequestHandler = (err, _req, res, _next) => {
  const status = Number.isFinite((err as any)?.status)
    ? (err as any).status
    : 500
  const message = (err as any)?.message || 'Internal server error'
  res.status(status as number).json({ message })
}

let app: express.Express
let ownerId: number
let projectId: number
let packageId: number

beforeAll(async () => {
  app = express()
  app.use(express.json())
  app.put('/projects/:projectId/packages/:packageId', auth, updatePackageController)
  app.use(errorHandler)

  // Criar usuário e projeto para os testes
  const owner = await prisma.user.create({
    data: {
      name: 'Test Owner',
      email: unique('owner@test.com'),
      password: 'password123'
    }
  })
  ownerId = owner.id

  const project = await prisma.project.create({
    data: {
      name: 'Test Project',
      description: 'Test Description',
      ownerId: ownerId
    }
  })
  projectId = project.id

  // Criar pacote para atualizar
  const testPackage = await prisma.testPackage.create({
    data: {
      title: 'Test Package to Update',
      description: 'Test Description',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      projectId: projectId,
      release: '2024-01-15'
    }
  })
  packageId = testPackage.id
})

afterAll(async () => {
  // Limpar dados de teste
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

describe('updatePackageController', () => {
  describe('PUT /projects/:projectId/packages/:packageId', () => {
    it('atualiza pacote com sucesso', async () => {
      const token = tokenFor(ownerId)
      const updateData = {
        title: 'Updated Test Package',
        description: 'Updated Description',
        type: 'REGRESSION',
        priority: 'MEDIUM',
        tags: ['updated', 'test'],
        steps: [
          { action: 'Updated Step 1', expected: 'Updated first step' }
        ],
        environment: 'QA',
        release: '2024-02-15',
        status: 'CREATED'
      }

      const response = await request(app)
        .put(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Pacote atualizado com sucesso')
      expect(response.body).toHaveProperty('testPackage')
      expect(response.body.testPackage).toHaveProperty('id')
    })

    it('rejeita quando não autenticado', async () => {
      const updateData = {
        title: 'Updated Test Package'
      }

      await request(app)
        .put(`/projects/${projectId}/packages/${packageId}`)
        .send(updateData)
        .expect(401)
        .expect({ message: 'Não autenticado' })
    })

    it('rejeita com token inválido', async () => {
      const updateData = {
        title: 'Updated Test Package'
      }

      await request(app)
        .put(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send(updateData)
        .expect(401)
        .expect({ message: 'Token inválido' })
    })

    it('rejeita quando projectId é inválido', async () => {
      const token = tokenFor(ownerId)
      const updateData = {
        title: 'Updated Test Package'
      }

      const response = await request(app)
        .put(`/projects/invalid/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(400)

      expect(response.body).toHaveProperty('message', 'ID do projeto inválido')
    })

    it('rejeita quando packageId é inválido', async () => {
      const token = tokenFor(ownerId)
      const updateData = {
        title: 'Updated Test Package'
      }

      const response = await request(app)
        .put(`/projects/${projectId}/packages/invalid`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(400)

      expect(response.body).toHaveProperty('message', 'ID do pacote inválido')
    })

    it('atualiza apenas campos fornecidos', async () => {
      const token = tokenFor(ownerId)
      const updateData = {
        title: 'Partially Updated Package'
      }

      const response = await request(app)
        .put(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Pacote atualizado com sucesso')
      expect(response.body.testPackage.title).toBe('Partially Updated Package')
    })

    it('atualiza com campos opcionais', async () => {
      const token = tokenFor(ownerId)
      const updateData = {
        description: 'Updated description only',
        tags: ['new', 'tags'],
        environment: 'PROD'
      }

      const response = await request(app)
        .put(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Pacote atualizado com sucesso')
    })

    it('atualiza com assigneeId', async () => {
      const token = tokenFor(ownerId)
      const updateData = {
        assigneeId: ownerId
      }

      const response = await request(app)
        .put(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Pacote atualizado com sucesso')
    })

    it('atualiza com assigneeEmail', async () => {
      const token = tokenFor(ownerId)
      
      // Primeiro criar um usuário para ser o assignee
      const assignee = await prisma.user.create({
        data: {
          name: unique('New Assignee'),
          email: unique('newassignee@test.com'),
          password: 'password123'
        }
      })

      const updateData = {
        assigneeEmail: assignee.email
      }

      const response = await request(app)
        .put(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Pacote atualizado com sucesso')
      
      // Limpar o assignee criado
      await prisma.user.delete({ where: { id: assignee.id } })
    })

    it('atualiza status do pacote', async () => {
      const token = tokenFor(ownerId)
      const updateData = {
        status: 'PASSED'
      }

      const response = await request(app)
        .put(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Pacote atualizado com sucesso')
    })

    it('trata erro do use case', async () => {
      const token = tokenFor(ownerId)
      const updateData = {
        title: 'Updated Test Package Error'
      }

      // Mock do use case para retornar erro
      const updatePackageSpy = jest.spyOn(updateUC, 'updatePackage')
      updatePackageSpy.mockRejectedValueOnce(new Error('Database error'))

      await request(app)
        .put(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(500)

      updatePackageSpy.mockRestore()
    })

    it('trata AppError do use case', async () => {
      const token = tokenFor(ownerId)
      const updateData = {
        title: 'Updated Test Package AppError'
      }

      // Mock do use case para retornar AppError
      const updatePackageSpy = jest.spyOn(updateUC, 'updatePackage')
      updatePackageSpy.mockRejectedValueOnce(new AppError('Pacote não encontrado', 404))

      await request(app)
        .put(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(404)
        .expect({ message: 'Pacote não encontrado' })

      updatePackageSpy.mockRestore()
    })

    it('trata erro quando pacote não existe', async () => {
      const token = tokenFor(ownerId)
      const nonExistentPackageId = 99999
      const updateData = {
        title: 'Updated Test Package'
      }

      // Mock do use case para retornar AppError
      const updatePackageSpy = jest.spyOn(updateUC, 'updatePackage')
      updatePackageSpy.mockRejectedValueOnce(new AppError('Pacote não encontrado', 404))

      await request(app)
        .put(`/projects/${projectId}/packages/${nonExistentPackageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(404)
        .expect({ message: 'Pacote não encontrado' })

      updatePackageSpy.mockRestore()
    })

    it('trata erro quando projeto não existe', async () => {
      const token = tokenFor(ownerId)
      const nonExistentProjectId = 99999
      const updateData = {
        title: 'Updated Test Package'
      }

      // Mock do use case para retornar AppError
      const updatePackageSpy = jest.spyOn(updateUC, 'updatePackage')
      updatePackageSpy.mockRejectedValueOnce(new AppError('Projeto não encontrado', 404))

      await request(app)
        .put(`/projects/${nonExistentProjectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(404)
        .expect({ message: 'Projeto não encontrado' })

      updatePackageSpy.mockRestore()
    })

    it('funciona com body vazio', async () => {
      const token = tokenFor(ownerId)

      const response = await request(app)
        .put(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Pacote atualizado com sucesso')
    })
  })
})
