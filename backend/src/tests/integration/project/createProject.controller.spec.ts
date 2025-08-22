import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'

import { prisma } from '../../../infrastructure/prisma'
import { createProject } from '../../../application/use-cases/projetos/createProject.use-case'

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
    const secret = process.env.JWT_SECRET || 'test-secret'
    const payload = jwt.verify(token, secret) as { id: number }
    // @ts-expect-error adicionando user ao req só para o teste
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
  res.status(status as number).json({ message })
}

let app: express.Express

beforeAll(() => {
  app = express()
  app.use(express.json())

  const createProjectController: express.RequestHandler = async (req, res, next) => {
    try {
      // @ts-expect-error: user adicionado no auth de teste
      const ownerId: number | undefined = req.user?.id
      const { name, description } = req.body ?? {}

      if (!ownerId) {
        res.status(401).json({ message: 'Não autenticado' })
        return
      }
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ message: 'Nome é obrigatório' })
        return
      }

      const project = await createProject({
        ownerId,
        name: String(name),
        description: description === undefined || description === null
          ? undefined
          : String(description)
      })

      res.status(201).json(project)
    } catch (err) {
      next(err)
    }
  }

  app.post('/projects', auth, createProjectController)

  app.use(errorHandler)
})

let ownerId: number

beforeEach(async () => {
  await prisma.passwordResetToken.deleteMany()
  await prisma.execution.deleteMany()
  await prisma.userOnProject.deleteMany()
  await prisma.testCase.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  const user = await prisma.user.create({
    data: {
      name: 'Owner Test',
      email: `${unique('owner')}@example.com`,
      password: 'hash_aqui_ou_use_createUser', 
    },
    select: { id: true },
  })
  ownerId = user.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /projects (createProject.controller)', () => {
  it('201 cria projeto (aparar nome/descrição e persiste ownerId do token)', async () => {
    const body = { name: '  Meu Projeto  ', description: '  desc  ' }

    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send(body)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.ownerId).toBe(ownerId)
    expect(res.body.name).toBe('Meu Projeto')
    expect(res.body.description).toBe('desc')

    const saved = await prisma.project.findUnique({ where: { id: res.body.id } })
    expect(saved).not.toBeNull()
    expect(saved!.ownerId).toBe(ownerId)
  })

  it('409 quando nome já existe para o mesmo dono', async () => {
    const name = `Projeto ${unique('X')}`

    await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name })

    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name })

    expect(res.status).toBe(409)
    expect(String(res.body?.message || '')).toMatch(/existe|duplicado|conflict|já|exist(s)?/i)
  })

  it('400 quando body inválido (sem nome)', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({})

    expect(res.status).toBe(400)
    expect(String(res.body?.message || '')).toMatch(/nome/i)
  })

  it('401 quando sem token', async () => {
    const res = await request(app).post('/projects').send({ name: 'Sem Token' })
    expect(res.status).toBe(401)
  })
})
