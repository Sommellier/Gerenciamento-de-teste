import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'

import { prisma } from '../../../infrastructure/prisma'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { createProject } from '../../../application/use-cases/projetos/createProject.use-case'
import { updateProject } from '../../../application/use-cases/projetos/updateProject.use-case'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`
const tokenFor = (id: number) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' })

function auth(req: Request, res: Response, next: NextFunction) {
  const [, token] = (req.headers.authorization || '').split(' ')
  if (!token) { res.status(401).json({ message: 'Não autenticado' }); return }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as { id: number }
    ;(req as any).user = { id: payload.id }
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido' })
  }
}


function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = Number.isFinite(err?.status) ? err.status : 500
  const message = err?.message || 'Internal server error'
  res.status(status).json({ message })
}

let app: express.Express
let ownerId: number
let otherUserId: number
let projectId: number

beforeAll(() => {
  app = express()
  app.use(express.json())

  app.put('/projects/:id', auth, async (req, res, next) => {
    try {
      const requesterId: number | undefined = (req as any).user?.id
      const projectId = Number(req.params.id)
      if (!requesterId) { res.status(401).json({ message: 'Não autenticado' }); return }
      if (!Number.isFinite(projectId)) { res.status(400).json({ message: 'Parâmetro inválido: id' }); return }

      const { name, description } = req.body ?? {}
      const updated = await updateProject({ projectId, requesterId, name, description })
      res.status(200).json(updated)
    } catch (e) {
      next(e)
    }
  })

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
  it('200: owner atualiza nome e description (trim e null quando vazio)', async () => {
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

  it('409: owner não pode usar nome já existente para ele mesmo', async () => {
    const res = await request(app)
      .put(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ name: 'Nome Já Existe' }) // já existe para o mesmo owner

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

  it('401: sem token', async () => {
    const res = await request(app)
      .put(`/projects/${projectId}`)
      .send({ name: 'Sem token' })

    expect(res.status).toBe(401)
  })

  it('200: atualiza apenas description quando name não vem', async () => {
    const res = await request(app)
      .put(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
      .send({ description: '  nova desc  ' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Projeto Original') // nome intacto
    expect(res.body.description).toBe('nova desc')

    const db = await prisma.project.findUnique({ where: { id: projectId } })
    expect(db?.name).toBe('Projeto Original')
    expect(db?.description).toBe('nova desc')
  })
})

