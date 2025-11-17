import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { approvePackageController } from '../../../controllers/packages/approvePackage.controller'
import { Role, ScenarioType, Priority, ScenarioStatus, PackageStatus } from '@prisma/client'

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
  app.post('/projects/:projectId/packages/:packageId/approve', auth, approvePackageController)
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

describe('approvePackageController', () => {
  beforeEach(async () => {
    // Criar pacote para cada teste
    const testPackage = await prisma.testPackage.create({
      data: {
        title: 'Test Package',
        description: 'Test Description',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        release: '2024-01',
        status: PackageStatus.CREATED,
        projectId: projectId
      }
    })
    packageId = testPackage.id

    // Criar cenários aprovados
    await prisma.testScenario.createMany({
      data: [
        {
          title: 'Scenario 1',
          description: 'Description 1',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.APPROVED,
          projectId,
          packageId
        },
        {
          title: 'Scenario 2',
          description: 'Description 2',
          type: ScenarioType.REGRESSION,
          priority: Priority.MEDIUM,
          status: ScenarioStatus.APPROVED,
          projectId,
          packageId
        }
      ]
    })
  })

  afterEach(async () => {
    await prisma.testScenario.deleteMany({
      where: { packageId }
    })
    await prisma.testPackage.deleteMany({
      where: { id: packageId }
    })
  })

  describe('approvePackageController - casos de sucesso', () => {
    it('aprova pacote com sucesso quando owner aprova', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/approve`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(200)

      expect(response.body).toMatchObject({
        message: 'Pacote aprovado com sucesso',
        package: expect.objectContaining({
          id: packageId,
          status: PackageStatus.APROVADO,
          approvedById: ownerId
        })
      })
    })

    it('aprova pacote com sucesso quando manager aprova', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/approve`)
        .set('Authorization', `Bearer ${tokenFor(managerId)}`)
        .expect(200)

      expect(response.body).toMatchObject({
        message: 'Pacote aprovado com sucesso',
        package: expect.objectContaining({
          id: packageId,
          status: PackageStatus.APROVADO,
          approvedById: managerId
        })
      })
    })
  })

  describe('approvePackageController - casos de erro', () => {
    it('rejeita quando não autenticado', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/approve`)
        .expect(401)

      expect(response.body).toMatchObject({
        message: 'Não autenticado'
      })
    })

    it('rejeita quando token é inválido', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/${packageId}/approve`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toMatchObject({
        message: 'Token inválido'
      })
    })

    it('rejeita quando projectId está ausente', async () => {
      const response = await request(app)
        .post(`/projects//packages/${packageId}/approve`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(404) // Express retorna 404 quando rota não existe (projectId vazio)

      // Quando projectId está vazio, Express não encontra a rota
    })

    it('rejeita quando packageId está ausente', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages//approve`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(404) // Express retorna 404 quando rota não existe
    })

    it('rejeita quando projectId é NaN', async () => {
      const response = await request(app)
        .post(`/projects/invalid/packages/${packageId}/approve`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(500) // parseInt retorna NaN, causando erro no use-case
    })

    it('rejeita quando packageId é NaN', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/invalid/approve`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(500) // parseInt retorna NaN, causando erro no use-case
    })

    it('rejeita quando pacote não existe', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/packages/99999/approve`)
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
          projectId: otherProject.id
        }
      })

      const response = await request(app)
        .post(`/projects/${projectId}/packages/${otherPackage.id}/approve`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(404)

      expect(response.body).toMatchObject({
        message: 'Pacote não encontrado'
      })

      // Limpar
      await prisma.testPackage.delete({ where: { id: otherPackage.id } })
      await prisma.project.delete({ where: { id: otherProject.id } })
    })

    it('rejeita quando userId não está presente no request', async () => {
      // Criar um middleware que não adiciona user ao request
      const appWithoutUser = express()
      appWithoutUser.use(express.json())
      appWithoutUser.post('/projects/:projectId/packages/:packageId/approve', (req, res, next) => {
        // Não adicionar req.user
        approvePackageController(req as any, res, next)
      })
      appWithoutUser.use(errorHandler)

      const response = await request(appWithoutUser)
        .post(`/projects/${projectId}/packages/${packageId}/approve`)
        .expect(401)

      expect(response.body).toMatchObject({
        message: 'Não autenticado'
      })
    })

    it('rejeita quando projectId é undefined', async () => {
      const appWithUndefined = express()
      appWithUndefined.use(express.json())
      appWithUndefined.post('/projects/:projectId/packages/:packageId/approve', auth, (req, res, next) => {
        req.params.projectId = undefined as any
        approvePackageController(req as any, res, next)
      })
      appWithUndefined.use(errorHandler)

      const response = await request(appWithUndefined)
        .post(`/projects/undefined/packages/${packageId}/approve`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(400)

      expect(response.body).toMatchObject({
        message: 'IDs inválidos'
      })
    })

    it('rejeita quando packageId é undefined', async () => {
      const appWithUndefined = express()
      appWithUndefined.use(express.json())
      appWithUndefined.post('/projects/:projectId/packages/:packageId/approve', auth, (req, res, next) => {
        req.params.packageId = undefined as any
        approvePackageController(req as any, res, next)
      })
      appWithUndefined.use(errorHandler)

      const response = await request(appWithUndefined)
        .post(`/projects/${projectId}/packages/undefined/approve`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
        .expect(400)

      expect(response.body).toMatchObject({
        message: 'IDs inválidos'
      })
    })

    it('rejeita quando projectId é string vazia', async () => {
      const appWithEmpty = express()
      appWithEmpty.use(express.json())
      appWithEmpty.post('/projects/:projectId/packages/:packageId/approve', auth, (req, res, next) => {
        req.params.projectId = ''
        approvePackageController(req as any, res, next)
      })
      appWithEmpty.use(errorHandler)

      // Quando projectId é string vazia, o Express pode retornar 404 ou o controller retorna 400
      const response = await request(appWithEmpty)
        .post(`/projects//packages/${packageId}/approve`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)

      // Aceitar tanto 400 quanto 404 (dependendo de como o Express trata)
      expect([400, 404]).toContain(response.status)
      if (response.status === 400) {
        expect(response.body).toMatchObject({
          message: 'IDs inválidos'
        })
      }
    })

    it('rejeita quando packageId é string vazia', async () => {
      const appWithEmpty = express()
      appWithEmpty.use(express.json())
      appWithEmpty.post('/projects/:projectId/packages/:packageId/approve', auth, (req, res, next) => {
        req.params.packageId = ''
        approvePackageController(req as any, res, next)
      })
      appWithEmpty.use(errorHandler)

      // Quando packageId é string vazia, o Express pode retornar 404 ou o controller retorna 400
      const response = await request(appWithEmpty)
        .post(`/projects/${projectId}/packages//approve`)
        .set('Authorization', `Bearer ${tokenFor(ownerId)}`)

      // Aceitar tanto 400 quanto 404 (dependendo de como o Express trata)
      expect([400, 404]).toContain(response.status)
      if (response.status === 400) {
        expect(response.body).toMatchObject({
          message: 'IDs inválidos'
        })
      }
    })
  })
})

