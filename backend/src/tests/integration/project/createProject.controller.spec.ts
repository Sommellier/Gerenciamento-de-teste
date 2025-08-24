// src/tests/integration/project/createProject.controller.spec.ts
import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { createProjectController } from '../../../controllers/project/createProject.controller'
import * as createUC from '../../../application/use-cases/projetos/createProject.use-case'

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

beforeAll(() => {
  app = express()
  app.use(express.json())

  // rota protegida (usa middleware de auth)
  app.post('/projects', auth, createProjectController)

  // rota sem middleware para testar o early-return 401 do controller
  app.post('/__noauth/projects', createProjectController)

  // rota que injeta body com getter que lança -> cobre catch EXTERNO (next(err as any))
  app.post('/__inject/projects', (req, res, next) => {
    // @ts-expect-error campo ad-hoc
    req.user = { id: ownerId }
    const bad: any = {}
    Object.defineProperty(bad, 'name', { value: 'Nome OK', enumerable: true })
    Object.defineProperty(bad, 'description', {
      get() {
        throw new Error('boom-getter')
      },
      enumerable: true,
    })
    ;(req as any).body = bad
    return createProjectController(req as any, res, next)
  })

  // rota que deixa req.body = undefined para acionar o `?? {}` (linha 13)
  app.post('/__nobody/projects', (req, res, next) => {
    // @ts-expect-error campo ad-hoc
    req.user = { id: ownerId }
    delete req.body
    return createProjectController(req as any, res, next)
  })

  app.use(errorHandler)
})

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
  it('201 cria projeto (apara nome/descrição e persiste ownerId do token)', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: '  Meu Projeto  ', description: '  desc  ' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.ownerId).toBe(ownerId)
    expect(res.body.name).toBe('Meu Projeto')
    expect(res.body.description).toBe('desc')

    const saved = await prisma.project.findUnique({
      where: { id: res.body.id },
    })
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
    expect(String(res.body?.message || '')).toMatch(
      /existe|duplicado|conflict|já|exist(s)?/i
    )
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

  it('401 dentro do controller quando req.user ausente (sem middleware)', async () => {
    const res = await request(app)
      .post('/__noauth/projects') // rota montada SEM auth
      .send({ name: 'Qualquer' })

    expect(res.status).toBe(401)
    expect(String(res.body?.message || '')).toMatch(/Não autenticado/i)
  })

  // catch INTERNO → mapeia erro por mensagem (regex)
  it('409: mapeia erro de unicidade (regex unique/constraint)', async () => {
    const spy = jest
      .spyOn(createUC, 'createProject')
      .mockRejectedValueOnce(
        new Error(
          'Unique constraint failed on the fields: (`ownerId`,`name`)'
        )
      )

    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: 'Nome Qualquer' })

    expect(res.status).toBe(409)
    expect(String(res.body?.message || '')).toMatch(
      /unique|constraint|existe|duplic/i
    )

    spy.mockRestore()
  })

  // catch INTERNO → mapeia por status 409
  it('409: mapeia erro com .status=409 do use case', async () => {
    const spy = jest
      .spyOn(createUC, 'createProject')
      .mockRejectedValueOnce(Object.assign(new Error('conflito'), { status: 409 }))

    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: 'Qualquer' })

    expect(res.status).toBe(409)
    expect(String(res.body?.message || '')).toMatch(/conflito|projeto|existe/i)

    spy.mockRestore()
  })

  // catch INTERNO → ramo "next(err)" (vira 500 no errorHandler)
  it('500: propaga erro inesperado do use case (cobre next(err) do catch interno)', async () => {
    const spy = jest
      .spyOn(createUC, 'createProject')
      .mockRejectedValueOnce(new Error('Falha inesperada'))

    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: 'Algum' })

    expect(res.status).toBe(500)
    expect(String(res.body?.message || '')).toMatch(/Falha inesperada|internal/i)

    spy.mockRestore()
  })

  // normalização de description → String(description) via número
  it('201: description número vira string pelo ramo String(description)', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: 'Num Desc', description: 12345 })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Num Desc')
    expect(res.body.description).toBe('12345')

    const db = await prisma.project.findUnique({ where: { id: res.body.id } })
    expect(db?.description).toBe('12345')
  })

  // normalização de description → null quando explícito
  it('201: description null explícito permanece null (ramo description == null)', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: 'Null Desc', description: null })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Null Desc')
    expect(res.body.description).toBeNull()

    const db = await prisma.project.findUnique({ where: { id: res.body.id } })
    expect(db?.description).toBeNull()
  })

  // >>> NOVO: cobre a linha 13 (req.body ?? {})
  it('400: quando req.body é undefined, usa fallback do ?? {} (cobre linha 13)', async () => {
    const res = await request(app)
      .post('/__nobody/projects') // rota remove req.body e chama o controller
      .send()
    expect(res.status).toBe(400)
    expect(String(res.body?.message || '')).toMatch(/Nome do projeto/i)
  })

  // >>> NOVO: reforça ramo String(description) com boolean (mapeamento 35–37)
  it('201: description booleana vira "true" (cobre linhas 35–37)', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      // boolean não é string nem null -> cai no String(description)
      .send({ name: 'Bool Desc', description: true })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Bool Desc')
    expect(res.body.description).toBe('true')

    const db = await prisma.project.findUnique({ where: { id: res.body.id } })
    expect(db?.description).toBe('true')
  })

  // catch EXTERNO → next(err as any)
  it('500: erro síncrono ao acessar description cai no catch externo (next(err as any))', async () => {
    const res = await request(app)
      .post('/__inject/projects') // rota injeta getter que lança no servidor
      .send({})
    expect(res.status).toBe(500)
    expect(String(res.body?.message || '')).toMatch(/boom-getter|internal/i)
  })

  it('201: monta data com name trim e description via String(false) (cobre 25 e 35–37)', async () => {
    const spy = jest
      .spyOn(createUC, 'createProject')
      .mockImplementationOnce(async (data: any) => {
        // -> garante que o objeto "data" foi montado como esperado
        expect(data).toEqual({ ownerId, name: 'Trim', description: 'false' })
        // retorno dummy só para o controller responder 201
        return {
          id: 999,
          ownerId,
          name: 'Trim',
          description: 'false',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any
      })

    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      // boolean -> cai no else final: String(description)
      .send({ name: '  Trim  ', description: false })

    expect(res.status).toBe(201)
    spy.mockRestore()
  })

  it('201: quando description é undefined o controller envia null no data (cobre 25 e branch description == null)', async () => {
    const spy = jest
      .spyOn(createUC, 'createProject')
      .mockImplementationOnce(async (data: any) => {
        expect(data).toEqual({ ownerId, name: 'SemDesc', description: null })
        return {
          id: 1000,
          ownerId,
          name: 'SemDesc',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any
      })

    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: '  SemDesc  ' })

    expect(res.status).toBe(201)
    spy.mockRestore()
  })
})