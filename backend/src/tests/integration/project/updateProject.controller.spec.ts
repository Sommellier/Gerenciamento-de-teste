// src/tests/integration/project/updateProject.controller.spec.ts
import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { createProject } from '../../../application/use-cases/projects/createProject.use-case'
import { updateProjectController } from '../../../controllers/project/updateProject.controller'
import * as updateModule from '../../../application/use-cases/projects/updateProject.use-case'


const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`
const tokenFor = (id: number) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' })

const auth = (req: Request, res: Response, next: NextFunction) => {
  const [, token] = (req.headers.authorization || '').split(' ')
  if (!token) { res.status(401).json({ message: 'Não autenticado' }); return }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as { id: number }
      ; (req as any).user = { id: payload.id }
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido' })
  }
}

const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = Number.isFinite(err?.status) ? err.status : 500
  res.status(status).json({ message: err?.message || 'Internal server error' })
}

let app: express.Express
let ownerId: number
let otherUserId: number
let projectId: number

beforeAll(() => {
  app = express()
  app.use(express.json())
  app.put('/projects/:id', auth, updateProjectController)
  app.use(errorHandler)
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

  const owner = await createUser({
    name: 'Owner',
    email: `${unique('own')}@ex.com`,
    password: 'testpass123',
  })
  const other = await createUser({
    name: 'Other',
    email: `${unique('oth')}@ex.com`,
    password: 'testpass123',
  })
  ownerId = owner.id
  otherUserId = other.id

  const proj = await createProject({
    ownerId,
    name: 'Projeto Original',
    description: 'Desc original',
  })
  projectId = proj.id

  await createProject({
    ownerId,
    name: 'Nome Já Existe',
    description: null,
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('PUT /projects/:id (update)', () => {
  it('200: owner atualiza name (trim) e zera description quando vazia', async () => {
    const res = await request(app)
      .put(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: '  Novo Nome  ', description: '   ' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Novo Nome')
    expect(res.body.description).toBeNull()

    const db = await prisma.project.findUnique({ where: { id: projectId } })
    expect(db?.name).toBe('Novo Nome')
    expect(db?.description).toBeNull()
  })

  it('409: não permite nome já existente para o mesmo owner', async () => {
    const res = await request(app)
      .put(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: 'Nome Já Existe' })

    expect(res.status).toBe(409)
    expect(String(res.body?.message || '')).toMatch(/existe|já|conflict|duplic/i)
  })

  it('403: não-owner não pode atualizar', async () => {
    const res = await request(app)
      .put(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenFor(otherUserId)}`)
      .send({ name: 'Mudança indevida' })

    expect(res.status).toBe(403)
  })

  it('404: projeto inexistente', async () => {
    const res = await request(app)
      .put('/projects/999999')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: 'Qualquer' })

    expect(res.status).toBe(404)
  })

  it('400: id inválido', async () => {
    const res = await request(app)
      .put('/projects/abc')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: 'AAA' })

    expect(res.status).toBe(400)
    expect(String(res.body?.message || '')).toMatch(/inválido|param/i)
  })

  it('400: corpo vazio (nada para atualizar)', async () => {
    const res = await request(app)
      .put(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({})

    expect(res.status).toBe(400)
    expect(String(res.body?.message || '')).toMatch(/nada|atualizar|vazio/i)
  })

  it('200: atualiza apenas description quando name não vem', async () => {
    const res = await request(app)
      .put(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ description: '  nova desc  ' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Projeto Original')
    expect(res.body.description).toBe('nova desc')

    const db = await prisma.project.findUnique({ where: { id: projectId } })
    expect(db?.name).toBe('Projeto Original')
    expect(db?.description).toBe('nova desc')
  })

  it('500: erro inesperado sem status usa mensagem padrão do controller', async () => {
    const spy = jest
      .spyOn(updateModule, 'updateProject')
      .mockRejectedValueOnce(new Error(''))

    const res = await request(app)
      .put(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: 'Qualquer' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
    spy.mockRestore()
  })

  it('req.body undefined: aciona o ramo do "?? {}" sem body-parser', async () => {
    const local = express()
    local.put(
      '/raw/:id',
      (req, _res, next) => { (req as any).user = { id: ownerId }; next() },
      updateProjectController
    )
    local.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      res.status(Number.isFinite(err?.status) ? err.status : 500)
        .json({ message: err?.message || 'Internal server error' })
    })

    const mockProject = { id: projectId, ownerId, name: 'Projeto Original', description: 'Desc original' }
    const spy = jest.spyOn(updateModule, 'updateProject').mockResolvedValueOnce(mockProject as any)

    const res = await request(local).put(`/raw/${projectId}`) // sem .send() -> req.body === undefined

    expect(res.status).toBe(200)
    expect(res.body).toEqual(expect.objectContaining({ id: projectId }))
    expect(spy).toHaveBeenCalledWith({
      projectId,
      requesterId: ownerId,
      name: undefined,
      description: undefined,
    })
    spy.mockRestore()
  })

  it('401: sem req.user (rota sem middleware) deve disparar early return do controller', async () => {
    // App local SEM middleware de auth para exercitar a linha 10
    const local = express()
    local.use(express.json())
    local.put('/raw/:id', updateProjectController) // não seta req.user
    local.use(errorHandler)

    const spy = jest.spyOn(updateModule, 'updateProject')

    const res = await request(local)
      .put('/raw/123')
      .send({ name: 'Qualquer' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: 'Não autenticado' })
    expect(spy).not.toHaveBeenCalled() // nem chega a chamar o use-case

    spy.mockRestore()
  })

  it('propaga status e mensagem quando o use-case rejeita com { status: number }', async () => {
    const teapot = { status: 418, message: "I'm a teapot" }
    const spy = jest
      .spyOn(updateModule, 'updateProject')
      .mockRejectedValueOnce(teapot as any)

    const res = await request(app)
      .put(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: 'Novo' })

    expect(res.status).toBe(418)
    expect(res.body).toEqual({ message: teapot.message })

    spy.mockRestore()
  })
  it('500: status não numérico -> usa 500 mas preserva a mensagem do erro', async () => {
    const errObj = { status: 'oops', message: 'Falha do use-case' }
    const spy = jest
      .spyOn(updateModule, 'updateProject')
      .mockRejectedValueOnce(errObj as any)

    const res = await request(app)
      .put(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: 'Novo' })

    expect(res.status).toBe(500) // Number.isFinite('oops') === false
    expect(res.body).toEqual({ message: 'Falha do use-case' })

    spy.mockRestore()
  })

  it('500: rejeição com valor falsy (null) -> usa 500 e mensagem padrão', async () => {
    const spy = jest
      .spyOn(updateModule, 'updateProject')
      .mockRejectedValueOnce(null as any)

    const res = await request(app)
      .put(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: 'Qualquer' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })

    spy.mockRestore()
  })
})
