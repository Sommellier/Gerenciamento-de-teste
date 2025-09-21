// src/tests/integration/packages/getProjectPackages.controller.spec.ts
import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { getProjectPackagesController } from '../../../controllers/packages/getProjectPackages.controller'
import { AppError } from '../../../utils/AppError'
import * as getPackagesUC from '../../../application/use-cases/packages/getProjectPackages.use-case'

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
let packageId1: number
let packageId2: number

beforeAll(async () => {
  app = express()
  app.use(express.json())
  app.get('/projects/:projectId/packages', auth, getProjectPackagesController)
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

  // Criar pacotes para listar
  const testPackage1 = await prisma.testPackage.create({
    data: {
      title: 'Test Package 1',
      description: 'Test Description 1',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      projectId: projectId,
      release: '2024-01'
    }
  })
  packageId1 = testPackage1.id

  const testPackage2 = await prisma.testPackage.create({
    data: {
      title: 'Test Package 2',
      description: 'Test Description 2',
      type: 'REGRESSION',
      priority: 'MEDIUM',
      projectId: projectId,
      release: '2024-02'
    }
  })
  packageId2 = testPackage2.id
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

describe('getProjectPackagesController', () => {
  describe('GET /projects/:projectId/packages', () => {
    it('lista pacotes com sucesso', async () => {
      const token = tokenFor(ownerId)

      const response = await request(app)
        .get(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('packages')
      expect(Array.isArray(response.body.packages)).toBe(true)
      expect(response.body.packages.length).toBeGreaterThanOrEqual(2)
    })

    it('filtra pacotes por release', async () => {
      const token = tokenFor(ownerId)

      const response = await request(app)
        .get(`/projects/${projectId}/packages?release=2024-01`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('packages')
      expect(Array.isArray(response.body.packages)).toBe(true)
    })

    it('rejeita quando não autenticado', async () => {
      await request(app)
        .get(`/projects/${projectId}/packages`)
        .expect(401)
        .expect({ message: 'Não autenticado' })
    })

    it('rejeita com token inválido', async () => {
      await request(app)
        .get(`/projects/${projectId}/packages`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
        .expect({ message: 'Token inválido' })
    })

    it('rejeita quando projectId é inválido', async () => {
      const token = tokenFor(ownerId)

      const response = await request(app)
        .get(`/projects/invalid/packages`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400)

      expect(response.body).toHaveProperty('message', 'ID do projeto inválido')
    })

    it('retorna lista vazia quando não há pacotes', async () => {
      const token = tokenFor(ownerId)
      const emptyProject = await prisma.project.create({
        data: {
          name: 'Empty Project',
          description: 'Empty Description',
          ownerId: ownerId
        }
      })

      const response = await request(app)
        .get(`/projects/${emptyProject.id}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('packages')
      expect(response.body.packages).toEqual([])

      // Limpar projeto vazio
      await prisma.project.delete({ where: { id: emptyProject.id } })
    })

    it('trata erro do use case', async () => {
      const token = tokenFor(ownerId)

      // Mock do use case para retornar erro
      const getProjectPackagesSpy = jest.spyOn(getPackagesUC, 'getProjectPackages')
      getProjectPackagesSpy.mockRejectedValueOnce(new Error('Database error'))

      await request(app)
        .get(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .expect(500)

      getProjectPackagesSpy.mockRestore()
    })

    it('trata AppError do use case', async () => {
      const token = tokenFor(ownerId)

      // Mock do use case para retornar AppError
      const getProjectPackagesSpy = jest.spyOn(getPackagesUC, 'getProjectPackages')
      getProjectPackagesSpy.mockRejectedValueOnce(new AppError('Projeto não encontrado', 404))

      await request(app)
        .get(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
        .expect({ message: 'Projeto não encontrado' })

      getProjectPackagesSpy.mockRestore()
    })

    it('filtra por release específica', async () => {
      const token = tokenFor(ownerId)

      const response = await request(app)
        .get(`/projects/${projectId}/packages?release=2024-02`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('packages')
      expect(Array.isArray(response.body.packages)).toBe(true)
    })

    it('funciona sem parâmetros de query', async () => {
      const token = tokenFor(ownerId)

      const response = await request(app)
        .get(`/projects/${projectId}/packages`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('packages')
      expect(Array.isArray(response.body.packages)).toBe(true)
    })

    it('funciona com release vazia', async () => {
      const token = tokenFor(ownerId)

      const response = await request(app)
        .get(`/projects/${projectId}/packages?release=`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('packages')
      expect(Array.isArray(response.body.packages)).toBe(true)
    })
  })
})
