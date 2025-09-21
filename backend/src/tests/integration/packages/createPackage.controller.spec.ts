// src/tests/integration/packages/createPackage.controller.spec.ts
import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { createPackageController } from '../../../controllers/packages/createPackage.controller'
import { AppError } from '../../../utils/AppError'
import * as createUC from '../../../application/use-cases/packages/createPackage.use-case'

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

beforeAll(async () => {
  app = express()
  app.use(express.json())
  app.post('/projects/:projectId/packages', auth, createPackageController)
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

describe('createPackageController', () => {
  describe('POST /projects/:projectId/packages', () => {
    it('cria pacote com sucesso', async () => {
      const token = tokenFor(ownerId)
      const packageData = {
        title: 'Test Package',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: ['test', 'integration'],
        steps: [
          { action: 'Step 1', expected: 'First step' },
          { action: 'Step 2', expected: 'Second step' }
        ],
        environment: 'DEV',
        release: '2024-01'
      }

      const response = await request(app)
        .post(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .send(packageData)
        .expect(201)

      expect(response.body).toHaveProperty('message', 'Pacote criado com sucesso')
      expect(response.body).toHaveProperty('testPackage')
      expect(response.body.testPackage).toHaveProperty('id')
      expect(response.body.testPackage.title).toBe('Test Package')
    })

    it('rejeita quando não autenticado', async () => {
      const packageData = {
        title: 'Test Package',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        release: '2024-01'
      }

      await request(app)
        .post(`/projects/${projectId}/packages`)
        .send(packageData)
        .expect(401)
        .expect({ message: 'Não autenticado' })
    })

    it('rejeita com token inválido', async () => {
      const packageData = {
        title: 'Test Package',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        release: '2024-01'
      }

      await request(app)
        .post(`/projects/${projectId}/packages`)
        .set('Authorization', 'Bearer invalid-token')
        .send(packageData)
        .expect(401)
        .expect({ message: 'Token inválido' })
    })

    it('rejeita quando faltam campos obrigatórios', async () => {
      const token = tokenFor(ownerId)
      const packageData = {
        title: 'Test Package'
        // Faltando type, priority, release
      }

      await request(app)
        .post(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .send(packageData)
        .expect(400)
        .expect({ message: 'Campos obrigatórios: title, type, priority, release' })
    })

    it('rejeita quando title está vazio', async () => {
      const token = tokenFor(ownerId)
      const packageData = {
        title: '',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        release: '2024-01'
      }

      await request(app)
        .post(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .send(packageData)
        .expect(400)
        .expect({ message: 'Campos obrigatórios: title, type, priority, release' })
    })

    it('rejeita quando type está vazio', async () => {
      const token = tokenFor(ownerId)
      const packageData = {
        title: 'Test Package',
        type: '',
        priority: 'HIGH',
        release: '2024-01'
      }

      await request(app)
        .post(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .send(packageData)
        .expect(400)
        .expect({ message: 'Campos obrigatórios: title, type, priority, release' })
    })

    it('rejeita quando priority está vazio', async () => {
      const token = tokenFor(ownerId)
      const packageData = {
        title: 'Test Package',
        type: 'FUNCTIONAL',
        priority: '',
        release: '2024-01'
      }

      await request(app)
        .post(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .send(packageData)
        .expect(400)
        .expect({ message: 'Campos obrigatórios: title, type, priority, release' })
    })

    it('rejeita quando release está vazio', async () => {
      const token = tokenFor(ownerId)
      const packageData = {
        title: 'Test Package',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        release: ''
      }

      await request(app)
        .post(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .send(packageData)
        .expect(400)
        .expect({ message: 'Campos obrigatórios: title, type, priority, release' })
    })

    it('cria pacote com campos opcionais', async () => {
      const token = tokenFor(ownerId)
      const packageData = {
        title: 'Test Package Optional',
        description: 'Optional description',
        type: 'REGRESSION',
        priority: 'MEDIUM',
        tags: ['optional'],
        environment: 'QA',
        release: '2024-02'
      }

      const response = await request(app)
        .post(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .send(packageData)
        .expect(201)

      expect(response.body).toHaveProperty('message', 'Pacote criado com sucesso')
      expect(response.body.testPackage.title).toBe('Test Package Optional')
      expect(response.body.testPackage.description).toBe('Optional description')
    })

    it('cria pacote com assigneeId', async () => {
      const token = tokenFor(ownerId)
      const packageData = {
        title: 'Test Package with Assignee',
        type: 'SMOKE',
        priority: 'LOW',
        assigneeId: ownerId,
        release: '2024-03'
      }

      const response = await request(app)
        .post(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .send(packageData)
        .expect(201)

      expect(response.body.testPackage.title).toBe('Test Package with Assignee')
    })

    it('cria pacote com assigneeEmail', async () => {
      const token = tokenFor(ownerId)
      
      // Primeiro criar um usuário para ser o assignee
      const assignee = await prisma.user.create({
        data: {
          name: unique('Assignee'),
          email: unique('assignee@test.com'),
          password: 'password123'
        }
      })

      const packageData = {
        title: 'Test Package with Email',
        type: 'E2E',
        priority: 'CRITICAL',
        assigneeEmail: assignee.email,
        release: '2024-04'
      }

      const response = await request(app)
        .post(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .send(packageData)
        .expect(201)

      expect(response.body.testPackage.title).toBe('Test Package with Email')
      
      // Limpar o assignee criado
      await prisma.user.delete({ where: { id: assignee.id } })
    })

    it('trata erro do use case', async () => {
      const token = tokenFor(ownerId)
      const packageData = {
        title: 'Test Package Error',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        release: '2024-01'
      }

      // Mock do use case para retornar erro
      const createPackageSpy = jest.spyOn(createUC, 'createPackage')
      createPackageSpy.mockRejectedValueOnce(new Error('Database error'))

      await request(app)
        .post(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .send(packageData)
        .expect(500)

      createPackageSpy.mockRestore()
    })

    it('trata AppError do use case', async () => {
      const token = tokenFor(ownerId)
      const packageData = {
        title: 'Test Package AppError',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        release: '2024-01'
      }

      // Mock do use case para retornar AppError
      const createPackageSpy = jest.spyOn(createUC, 'createPackage')
      createPackageSpy.mockRejectedValueOnce(new AppError('Projeto não encontrado', 404))

      await request(app)
        .post(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .send(packageData)
        .expect(404)
        .expect({ message: 'Projeto não encontrado' })

      createPackageSpy.mockRestore()
    })
  })
})
