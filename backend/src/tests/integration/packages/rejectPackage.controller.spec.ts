import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { rejectPackageController } from '../../../controllers/packages/rejectPackage.controller'
import { Role, ScenarioType, Priority, PackageStatus } from '@prisma/client'

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
    : (err as any)?.statusCode || 500
  const message = (err as any)?.message || 'Internal server error'
  res.status(status as number).json({ message })
}

let app: express.Express
let ownerId: number
let managerId: number
let projectId: number
let packageId: number

beforeAll(async () => {
  app = express()
  app.use(express.json())
  app.post('/projects/:projectId/packages/:packageId/reject', auth, rejectPackageController)
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

  // Criar usuário manager
  const manager = await prisma.user.create({
    data: {
      name: 'Test Manager',
      email: unique('manager@test.com'),
      password: 'password123'
    }
  })
  managerId = manager.id

  // Criar projeto
  const project = await prisma.project.create({
    data: {
      name: 'Test Project',
      description: 'Test Description',
      ownerId: ownerId
    }
  })
  projectId = project.id

  // Adicionar manager ao projeto
  await prisma.userOnProject.create({
    data: {
      userId: managerId,
      projectId: projectId,
      role: Role.MANAGER
    }
  })
})

afterAll(async () => {
  await prisma.userOnProject.deleteMany({
    where: { projectId }
  })
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
    where: { id: { in: [ownerId, managerId] } }
  })
})

describe('rejectPackageController', () => {
  beforeEach(async () => {
    // Criar pacote em EM_TESTE para cada teste
    const testPackage = await prisma.testPackage.create({
      data: {
        title: 'Test Package',
        description: 'Test Description',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        release: '2024-01',
        status: PackageStatus.EM_TESTE,
        projectId: projectId
      }
    })
    packageId = testPackage.id
  })

  afterEach(async () => {
    await prisma.testScenario.deleteMany({
      where: { packageId }
    })
    await prisma.testPackage.deleteMany({
      where: { id: packageId }
    })
  })

  describe('rejectPackageController - casos de sucesso', () => {
    it('reprova pacote com sucesso quando owner reprova', async () => {
      const rejectionReason = 'Motivo da reprovação'

      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/reject`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .send({ rejectionReason })
        .expect(200)

      expect(response.body).toMatchObject({
        message: 'Pacote reprovado com sucesso',
        package: expect.objectContaining({
          id: packageId,
          status: PackageStatus.REPROVADO,
          rejectedById: ownerId,
          rejectionReason
        })
      })
    })

    it('reprova pacote com sucesso quando manager reprova', async () => {
      const rejectionReason = 'Testes insuficientes'

      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/reject`)
        .set('Authorization', `Bearer ${tokenFor(managerId)}`)
        .send({ rejectionReason })
        .expect(200)

      expect(response.body).toMatchObject({
        message: 'Pacote reprovado com sucesso',
        package: expect.objectContaining({
          id: packageId,
          status: PackageStatus.REPROVADO,
          rejectedById: managerId,
          rejectionReason
        })
      })
    })

    it('remove espaços em branco do motivo', async () => {
      const rejectionReason = '  Motivo com espaços  '

      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/reject`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .send({ rejectionReason })
        .expect(200)

      expect(response.body.package.rejectionReason).toBe('Motivo com espaços')
    })
  })

  describe('rejectPackageController - casos de erro', () => {
    it('rejeita quando não autenticado (linha 20)', async () => {
      // Testar diretamente o controller sem req.user para cobrir linha 20
      const req = {
        params: { projectId: projectId.toString(), packageId: packageId.toString() },
        body: { rejectionReason: 'Motivo' },
        user: undefined
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await rejectPackageController(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Não autenticado'
        })
      )
      expect(res.status).not.toHaveBeenCalled()
    })

    it('rejeita quando não autenticado (com auth middleware)', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/reject`)
        .send({ rejectionReason: 'Motivo' })
        .expect(401)

      expect(response.body).toMatchObject({
        message: 'Não autenticado'
      })
    })

    it('rejeita quando token é inválido', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/reject`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ rejectionReason: 'Motivo' })
        .expect(401)

      expect(response.body).toMatchObject({
        message: 'Token inválido'
      })
    })

    it('rejeita quando rejectionReason está ausente', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/reject`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .send({})
        .expect(400)

      expect(response.body).toMatchObject({
        message: 'Justificativa da reprovação é obrigatória'
      })
    })

    it('rejeita quando rejectionReason está vazio', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/reject`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .send({ rejectionReason: '' })
        .expect(400)

      expect(response.body).toMatchObject({
        message: 'Justificativa da reprovação é obrigatória'
      })
    })

    it('rejeita quando rejectionReason só tem espaços', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/reject`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .send({ rejectionReason: '   ' })
        .expect(400)

      expect(response.body).toMatchObject({
        message: 'Justificativa da reprovação é obrigatória'
      })
    })

    it('rejeita quando projectId está ausente (linha 24)', async () => {
      // Testar diretamente o controller com projectId undefined para cobrir linha 24
      const req1 = {
        params: { projectId: undefined, packageId: packageId.toString() },
        body: { rejectionReason: 'Motivo' },
        user: { id: ownerId }
      } as any

      const res1 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next1 = jest.fn()

      await rejectPackageController(req1, res1, next1)

      expect(next1).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'IDs inválidos'
        })
      )
    })

    it('rejeita quando packageId está ausente (linha 24)', async () => {
      // Testar diretamente o controller com packageId undefined para cobrir linha 24
      const req = {
        params: { projectId: projectId.toString(), packageId: undefined },
        body: { rejectionReason: 'Motivo' },
        user: { id: ownerId }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await rejectPackageController(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'IDs inválidos'
        })
      )
    })

    it('rejeita quando packageId é NaN', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/invalid/reject`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .send({ rejectionReason: 'Motivo' })
        .expect(500) // parseInt retorna NaN, causando erro no use-case
    })

    it('rejeita quando pacote não existe', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/99999/reject`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .send({ rejectionReason: 'Motivo' })
        .expect(404)

      expect(response.body).toMatchObject({
        message: 'Pacote não encontrado'
      })
    })

    it('rejeita quando pacote não pertence ao projeto', async () => {
      // Criar outro projeto e pacote
      const otherProject = await prisma.project.create({
        data: {
          name: 'Other Project',
          description: 'Other Description',
          ownerId: ownerId
        }
      })

      const otherPackage = await prisma.testPackage.create({
        data: {
          title: 'Other Package',
          description: 'Other Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          release: '2024-01',
          status: PackageStatus.EM_TESTE,
          projectId: otherProject.id
        }
      })

      const response = await request(app)
        .post(`/projects/${projectId}/packages/${otherPackage.id}/reject`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .send({ rejectionReason: 'Motivo' })
        .expect(404)

      expect(response.body).toMatchObject({
        message: 'Pacote não encontrado'
      })

      // Limpar
      await prisma.testPackage.delete({ where: { id: otherPackage.id } })
      await prisma.project.delete({ where: { id: otherProject.id } })
    })
  })
})

