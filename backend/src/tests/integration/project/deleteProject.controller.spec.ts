import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'

import { prisma } from '../../../infrastructure/prisma'
import { createProject } from '../../../application/use-cases/projetos/createProject.use-case'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { deleteProject } from '../../../application/use-cases/projetos/deleteProject.use-case'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

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
    const secret = process.env.JWT_SECRET || 'test-secret'
    const payload = jwt.verify(token, secret) as { id: number }
    // @ts-expect-error: tipagem de req.user só para teste
    req.user = { id: payload.id }
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido' })
    return
  }
}

const errorHandler: express.ErrorRequestHandler = (err, _req, res, _next) => {
  const status = Number.isFinite(err?.status) ? err.status : 500
  const message = err?.message || 'Internal server error'
  res.status(status).json({ message })
}

let app: express.Express
let ownerA: number
let ownerB: number
let projectId: number

const deleteRouteHandler: express.RequestHandler = async (req, res, next) => {
  try {
    const projectIdNum = Number(req.params.id)
    // @ts-expect-error:
    const requesterId: number | undefined = req.user?.id
    if (!Number.isFinite(projectIdNum)) {
      res.status(400).json({ message: 'Parâmetro inválido: id' })
      return
    }
    if (!requesterId) {
      res.status(401).json({ message: 'Não autenticado' })
      return
    }

    await deleteProject({ projectId: projectIdNum, requesterId })
    res.status(204).end() 
  } catch (err) {
    next(err)
  }
}

beforeAll(() => {
  app = express()
  app.use(express.json())

  app.delete('/projects/:id', auth, deleteRouteHandler)

  app.use(errorHandler)
})

beforeEach(async () => {
  await prisma.passwordResetToken.deleteMany()
  await prisma.execution.deleteMany()
  await prisma.userOnProject.deleteMany()
  await prisma.testCase.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  const u1 = await createUser({
    name: 'Owner A',
    email: `${unique('ownA')}@example.com`,
    password: 'secret123',
  })
  const u2 = await createUser({
    name: 'Owner B',
    email: `${unique('ownB')}@example.com`,
    password: 'secret123',
  })
  ownerA = u1.id
  ownerB = u2.id

  const proj = await createProject({
    name: `Projeto ${unique('QA')}`,
    description: 'Projeto para testes de delete',
    ownerId: ownerA,
  })
  projectId = proj.id

  const tc = await prisma.testCase.create({
    data: {
      title: 'TC 1',
      projectId,
      steps: 'abrir app',
      expected: 'app abre',
    },
  })

  await prisma.execution.create({
    data: {
      status: 'PENDING',
      testCase: { connect: { id: tc.id } },
      user: { connect: { id: ownerA } }, 
    },
  })

  await prisma.userOnProject.create({
    data: {
      userId: ownerA,
      projectId,
      role: 'OWNER',
    },
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('DELETE /projects/:id', () => {
  it('204 quando o dono exclui o projeto', async () => {
    const res = await request(app)
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenFor(ownerA)}`)
      .send()

    expect(res.status).toBe(204)

    const proj = await prisma.project.findUnique({ where: { id: projectId } })
    expect(proj).toBeNull()

    const tcs = await prisma.testCase.findMany({ where: { projectId } })
    const exs = await prisma.execution.findMany({ where: { testCase: { projectId } } })
    const uops = await prisma.userOnProject.findMany({ where: { projectId } })

    expect(tcs.length).toBe(0)
    expect(exs.length).toBe(0)
    expect(uops.length).toBe(0)
  })

  it('403 quando não é o dono', async () => {
    const res = await request(app)
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenFor(ownerB)}`)
      .send()

    expect(res.status).toBe(403)
    expect(String(res.body?.message || '')).toMatch(/perm/i)
  })

  it('404 quando o projeto não existe', async () => {
    const res = await request(app)
      .delete(`/projects/999999`)
      .set('Authorization', `Bearer ${tokenFor(ownerA)}`)
      .send()

    expect(res.status).toBe(404)
  })

  it('401 quando sem token', async () => {
    const res = await request(app).delete(`/projects/${projectId}`).send()
    expect(res.status).toBe(401)
  })
})
