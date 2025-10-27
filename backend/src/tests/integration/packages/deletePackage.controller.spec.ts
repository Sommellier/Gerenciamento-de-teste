// src/tests/integration/packages/deletePackage.controller.spec.ts
import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { deletePackageController } from '../../../controllers/packages/deletePackage.controller'
import { AppError } from '../../../utils/AppError'
import * as deleteUC from '../../../application/use-cases/packages/deletePackage.use-case'

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
  app.delete('/projects/:projectId/packages/:packageId', auth, deletePackageController)
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

  // Criar pacote para deletar
  const testPackage = await prisma.testPackage.create({
    data: {
      title: 'Test Package to Delete',
      description: 'Test Description',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      projectId: projectId,
      release: '2024-01'
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

describe('deletePackageController', () => {
  describe('DELETE /projects/:projectId/packages/:packageId', () => {
    it('deleta pacote com sucesso', async () => {
      const token = tokenFor(ownerId)

      const response = await request(app)
        .delete(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Pacote deletado com sucesso')
    })

    it('rejeita quando não autenticado', async () => {
      await request(app)
        .delete(`/projects/${projectId}/packages/${packageId}`)
        .expect(401)
        .expect({ message: 'Não autenticado' })
    })

    it('rejeita com token inválido', async () => {
      await request(app)
        .delete(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
        .expect({ message: 'Token inválido' })
    })

    it('rejeita quando projectId é inválido', async () => {
      const token = tokenFor(ownerId)

      const response = await request(app)
        .delete(`/projects/invalid/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400)

      expect(response.body).toHaveProperty('message', 'ID do projeto inválido')
    })

    it('rejeita quando packageId é inválido', async () => {
      const token = tokenFor(ownerId)

      const response = await request(app)
        .delete(`/projects/${projectId}/packages/invalid`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400)

      expect(response.body).toHaveProperty('message', 'ID do pacote inválido')
    })

    it('trata erro do use case', async () => {
      const token = tokenFor(ownerId)

      // Mock do use case para retornar erro
      const deletePackageSpy = jest.spyOn(deleteUC, 'deletePackage')
      deletePackageSpy.mockRejectedValueOnce(new Error('Database error'))

      await request(app)
        .delete(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(500)

      deletePackageSpy.mockRestore()
    })

    it('trata AppError do use case', async () => {
      const token = tokenFor(ownerId)

      // Mock do use case para retornar AppError
      const deletePackageSpy = jest.spyOn(deleteUC, 'deletePackage')
      deletePackageSpy.mockRejectedValueOnce(new AppError('Pacote não encontrado', 404))

      await request(app)
        .delete(`/projects/${projectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
        .expect({ message: 'Pacote não encontrado' })

      deletePackageSpy.mockRestore()
    })

    it('trata erro quando pacote não existe', async () => {
      const token = tokenFor(ownerId)
      const nonExistentPackageId = 99999

      // Mock do use case para retornar AppError
      const deletePackageSpy = jest.spyOn(deleteUC, 'deletePackage')
      deletePackageSpy.mockRejectedValueOnce(new AppError('Pacote não encontrado', 404))

      await request(app)
        .delete(`/projects/${projectId}/packages/${nonExistentPackageId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
        .expect({ message: 'Pacote não encontrado' })

      deletePackageSpy.mockRestore()
    })

    it('trata erro quando projeto não existe', async () => {
      const token = tokenFor(ownerId)
      const nonExistentProjectId = 99999

      // Mock do use case para retornar AppError
      const deletePackageSpy = jest.spyOn(deleteUC, 'deletePackage')
      deletePackageSpy.mockRejectedValueOnce(new AppError('Projeto não encontrado', 404))

      await request(app)
        .delete(`/projects/${nonExistentProjectId}/packages/${packageId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
        .expect({ message: 'Projeto não encontrado' })

      deletePackageSpy.mockRestore()
    })

    it('testa controller diretamente sem autenticação', async () => {
      const req = {
        params: { projectId: projectId.toString(), packageId: packageId.toString() },
        user: undefined
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await deletePackageController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ message: 'Não autenticado' })
    })
  })
})
