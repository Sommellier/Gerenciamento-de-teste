import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import { prisma } from '../../../infrastructure/prisma'
import * as uc from '../../../application/use-cases/user/createUser.use-case'
import { registerUserController } from '../../../controllers/user/createUser.controller'

let app: express.Express

beforeAll(() => {
  app = express()
  app.use(express.json())
  app.post('/users', (req, res) => registerUserController(req, res))
})

beforeEach(async () => {
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany(),
    prisma.execution.deleteMany(),
    prisma.userOnProject.deleteMany(),
    prisma.testCase.deleteMany(),
    prisma.project.deleteMany(),
    prisma.user.deleteMany(),
  ])
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /users (registerUserController)', () => {
  it('201 cria usuário, normaliza name/email e não retorna password', async () => {
    const body = {
      name: '  Ana QA  ',
      email: '  ANA@Example.com ',
      password: 'supersecret',
    }

    const res = await request(app).post('/users').send(body)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toMatchObject({
      name: 'Ana QA',
      email: 'ana@example.com',
    })
    expect('password' in res.body).toBe(false)

    const db = await prisma.user.findUnique({ where: { id: res.body.id } })
    expect(db).not.toBeNull()
    expect(db!.password).not.toBe(body.password)
    expect((db!.password || '').length).toBeGreaterThan(20)
  })

  it('409 quando email já existe (mapeado do use-case)', async () => {
    const data = { name: 'John', email: 'john@example.com', password: 'password1' }
    await request(app).post('/users').send(data) // cria primeiro
    const res = await request(app).post('/users').send(data) // tenta duplicar
    expect(res.status).toBe(409)
    expect(String(res.body?.message || '')).toMatch(/exist|já/i)
  })

  it('400 quando faltar campos obrigatórios (name)', async () => {
    const res = await request(app).post('/users').send({
      email: 'n@test.com',
      password: 'supersecret',
    })
    expect(res.status).toBe(400)
    expect(String(res.body?.message || '')).toMatch(/required|obrigatório/i)
  })

  it('400 quando name < 2 chars', async () => {
    const res = await request(app).post('/users').send({
      name: 'A',
      email: 'a@test.com',
      password: 'supersecret',
    })
    expect(res.status).toBe(400)
    expect(String(res.body?.message || '')).toMatch(/at least 2/i)
  })

  it('400 quando name tem caractere inválido', async () => {
    const res = await request(app).post('/users').send({
      name: 'Ana_123',
      email: 'ana@test.com',
      password: 'supersecret',
    })
    expect(res.status).toBe(400)
    expect(String(res.body?.message || '')).toMatch(/invalid characters/i)
  })

  it('400 quando email inválido', async () => {
    const res = await request(app).post('/users').send({
      name: 'Ana',
      email: 'ana-at-test.com',
      password: 'supersecret',
    })
    expect(res.status).toBe(400)
    expect(String(res.body?.message || '')).toMatch(/invalid email/i)
  })

  it('400 quando password < 8 chars', async () => {
    const res = await request(app).post('/users').send({
      name: 'Ana',
      email: 'ana@test.com',
      password: 'short',
    })
    expect(res.status).toBe(400)
    expect(String(res.body?.message || '')).toMatch(/8 characters/i)
  })

  it('201: faz trim de espaços em volta do email e name', async () => {
    const res = await request(app).post('/users').send({
      name: '  Jose Tester ',
      email: '  tester@EXAMPLE.com  ',
      password: 'supersecret',
    })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Jose Tester')
    expect(res.body.email).toBe('tester@example.com')
  })

  it('400 quando o use-case lança erro não-AppError (controller padroniza 400)', async () => {
    const spy = jest
      .spyOn(uc, 'createUser')
      .mockRejectedValueOnce(new Error('Falha inesperada'))

    const res = await request(app).post('/users').send({
      name: 'Maria',
      email: 'maria@example.com',
      password: 'supersecret',
    })

    expect(res.status).toBe(400)
    expect(String(res.body?.message || '')).toMatch(/falha inesperada|error/i)

    spy.mockRestore()
  })

  it('400 quando body vazio', async () => {
    const res = await request(app).post('/users').send({})
    expect(res.status).toBe(400)
  })

  it('400 quando o use-case rejeita com valor não-Error (ex.: string)', async () => {
    const spy = jest
      .spyOn(uc, 'createUser')
      .mockRejectedValueOnce('Falha em string')

    const res = await request(app).post('/users').send({
      name: 'Jose',
      email: 'jose@example.com',
      password: 'supersecret'
    })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Falha em string')

    spy.mockRestore()
  })

})
