import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { sendPackageToTestController } from '../../../controllers/packages/sendToTest.controller'
import { ScenarioType, Priority, PackageStatus } from '@prisma/client'

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
let projectId: number
let packageId: number

beforeAll(async () => {
  app = express()
  app.use(express.json())
  app.post('/projects/:projectId/packages/:packageId/send-to-test', auth, sendPackageToTestController)
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

describe('sendPackageToTestController', () => {
  beforeEach(async () => {
    // Criar pacote em REPROVADO para cada teste
    const testPackage = await prisma.testPackage.create({
      data: {
        title: 'Test Package',
        description: 'Test Description',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        release: '2024-01',
        status: PackageStatus.REPROVADO,
        projectId: projectId,
        rejectedById: ownerId,
        rejectedAt: new Date(),
        rejectionReason: 'Motivo anterior'
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

  describe('sendPackageToTestController - casos de sucesso', () => {
    it('envia pacote para teste com sucesso', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/send-to-test`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(200)

      expect(response.body).toMatchObject({
        message: 'Pacote reenviado para teste com sucesso',
        package: expect.objectContaining({
          id: packageId,
          status: PackageStatus.EM_TESTE
        })
      })
    })
  })

  describe('sendPackageToTestController - casos de erro', () => {
    it('rejeita quando não autenticado', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/send-to-test`)
        .expect(401)

      expect(response.body).toMatchObject({
        message: 'Não autenticado'
      })
    })

    it('rejeita quando token é inválido', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/send-to-test`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toMatchObject({
        message: 'Token inválido'
      })
    })

    it('rejeita quando projectId está ausente', async () => {
      const response = await request(app)
        .post(`/projects//packages/${packageId}/send-to-test`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(404) // Express retorna 404 quando rota não existe (projectId vazio)

      // Quando projectId está vazio, Express não encontra a rota
    })

    it('rejeita quando packageId é NaN', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/invalid/send-to-test`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(500) // parseInt retorna NaN, causando erro no use-case
    })

    it('rejeita quando pacote não existe', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/99999/send-to-test`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
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
          status: PackageStatus.REPROVADO,
          projectId: otherProject.id
        }
      })

      const response = await request(app)
        .post(`/projects/${projectId}/packages/${otherPackage.id}/send-to-test`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(404)

      expect(response.body).toMatchObject({
        message: 'Pacote não encontrado'
      })

      // Limpar
      await prisma.testPackage.delete({ where: { id: otherPackage.id } })
      await prisma.project.delete({ where: { id: otherProject.id } })
    })

    it('rejeita quando pacote não está em REPROVADO', async () => {
      // Atualizar pacote para outro status
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.CREATED
        }
      })

      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/send-to-test`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(400)

      expect(response.body).toMatchObject({
        message: 'Pacote deve estar em REPROVADO para ser reenviado para teste'
      })
    })
  })
})

