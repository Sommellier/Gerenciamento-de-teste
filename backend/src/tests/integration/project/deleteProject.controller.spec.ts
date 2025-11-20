import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { createProject } from '../../../application/use-cases/projects/createProject.use-case'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { deleteProjectController } from '../../../controllers/project/deleteProject.controller'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

function tokenFor(id: number) {
  const secret = process.env.JWT_SECRET || 'test-secret'
  return jwt.sign({ id }, secret, { expiresIn: '1h' })
}

// auth fake só p/ teste
const auth: express.RequestHandler = (req, res, next) => {
  const header = req.headers.authorization || ''
  const [, token] = header.split(' ')
  if (!token) {
    res.status(401).json({ message: 'Não autenticado' })
    return
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as { id: number }
    // @ts-expect-error user ad-hoc p/ teste
    req.user = { id: payload.id }
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido' })
  }
}

const errorHandler: express.ErrorRequestHandler = (err, _req, res, _next) => {
  const status = Number.isFinite((err as any)?.status) ? (err as any).status : 500
  const message = (err as any)?.message || 'Internal server error'
  res.status(status).json({ message })
}

let app: express.Express
let ownerA: number
let ownerB: number
let projectId: number

beforeAll(() => {
  app = express()
  app.use(express.json())

  // rota protegida (com auth)
  app.delete('/projects/:id', auth, deleteProjectController)

  // >>> NOVO: rota sem middleware para exercitar o early-return 401 do controller
  app.delete('/__noauth/projects/:id', deleteProjectController)

  // nova rota SEM :id para acionar o ?? '' da linha 7
  app.delete('/__noid/projects', auth, deleteProjectController)

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
    data: { title: 'TC 1', projectId, steps: 'abrir app', expected: 'app abre' },
  })
  await prisma.execution.create({
    data: { status: 'PENDING', testCaseId: tc.id, userId: ownerA },
  })
  // não criar membership do dono aqui; já é criado no use case de createProject
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('DELETE /projects/:id (deleteProject.controller)', () => {
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
    const other = await createProject({
      name: `Projeto ${unique('QA-2')}`,
      description: 'Outro projeto',
      ownerId: ownerA,
    })

    const res = await request(app)
      .delete(`/projects/${other.id}`)
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

  it('401 (controller): quando req.user ausente (rota sem auth)', async () => {
    const res = await request(app).delete(`/__noauth/projects/${projectId}`).send()
    expect(res.status).toBe(401)
    expect(String(res.body?.message || '')).toMatch(/não autenticado/i)
  })

  it('400 quando o parâmetro :id é inválido (NaN)', async () => {
    const res = await request(app)
      .delete(`/projects/abc`)
      .set('Authorization', `Bearer ${tokenFor(ownerA)}`)
      .send()

    expect(res.status).toBe(400)
    expect(String(res.body?.message || '')).toMatch(/id|inválid/i)
  })

  it('404 quando o parâmetro :id é não positivo (comportamento atual)', async () => {
    const resZero = await request(app)
      .delete(`/projects/0`)
      .set('Authorization', `Bearer ${tokenFor(ownerA)}`)
      .send()
    expect(resZero.status).toBe(404)

    const resNeg = await request(app)
      .delete(`/projects/-1`)
      .set('Authorization', `Bearer ${tokenFor(ownerA)}`)
      .send()
    expect(resNeg.status).toBe(404)
  })
})

it('404 quando o parâmetro :id está ausente (rota sem :id)', async () => {
  const res = await request(app)
    .delete('/__noid/projects')                          
    .set('Authorization', `Bearer ${tokenFor(ownerA)}`)  
    .send()

  expect(res.status).toBe(404)  // comportamento atual: id '' -> 0 -> use-case -> 404
})
