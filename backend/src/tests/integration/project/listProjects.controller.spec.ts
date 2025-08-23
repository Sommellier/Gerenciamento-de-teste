import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { createProject } from '../../../application/use-cases/projetos/createProject.use-case'
import { listProjects } from '../../../controllers/project/listProjects.controller'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`
const tokenFor = (id: number) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' })

// ✅ middleware de auth que não retorna Response (tipagem RequestHandler compatível)
const auth: express.RequestHandler = (req, res, next) => {
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

const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  res
    .status(Number.isFinite(err?.status) ? err.status : 500)
    .json({ message: err?.message || 'Internal server error' })
}

let app: express.Express
let ownerId: number
let testerId: number
let outsiderId: number
let projectId: number

beforeAll(() => {
  app = express()
  app.use(express.json())
  // ✅ usar o controller real
  app.get('/projects', auth, listProjects)
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

  const owner = await createUser({ name: 'Owner', email: `${unique('own')}@ex.com`, password: 'testpass123' })
  const tester = await createUser({ name: 'Tester', email: `${unique('tes')}@ex.com`, password: 'testpass123' })
  const outsider = await createUser({ name: 'Out', email: `${unique('out')}@ex.com`, password: 'testpass123' })
  ownerId = owner.id; testerId = tester.id; outsiderId = outsider.id

  const p1 = await createProject({ ownerId, name: 'Alpha', description: null })
  const p2 = await createProject({ ownerId, name: 'Beta', description: null })
  const p3 = await createProject({ ownerId, name: 'Gamma', description: null })
  projectId = p1.id

  // tester é membro do projeto p2
  await prisma.userOnProject.create({
    data: { userId: testerId, projectId: p2.id, role: 'TESTER' as any }
  })
})
afterAll(async () => { await prisma.$disconnect() })

describe('GET /projects (lista owner + membership)', () => {
  it('OWNER vê todos os seus (Alpha, Beta, Gamma)', async () => {
    const r = await request(app).get('/projects').set('Authorization', `Bearer ${tokenFor(ownerId)}`)
    expect(r.status).toBe(200)
    expect(r.body.total).toBe(3)
    expect(r.body.items.every((p: any) => p.ownerId === ownerId)).toBe(true)
  })

  it('TESTER vê os que é membro (apenas Beta neste setup)', async () => {
    const r = await request(app).get('/projects').set('Authorization', `Bearer ${tokenFor(testerId)}`)
    expect(r.status).toBe(200)
    expect(r.body.items.length).toBe(1)
    expect(r.body.items[0].name).toBe('Beta')
  })

  it('Filtro q funciona em ambos os casos', async () => {
    const r = await request(app).get('/projects?q=alp').set('Authorization', `Bearer ${tokenFor(ownerId)}`)
    expect(r.status).toBe(200)
    expect(r.body.items.some((p: any) => /alpha/i.test(p.name))).toBe(true)
  })

  it('Fora do projeto não vê nada', async () => {
    const r = await request(app).get('/projects').set('Authorization', `Bearer ${tokenFor(outsiderId)}`)
    expect(r.status).toBe(200)
    expect(r.body.total).toBe(0)
  })

  it('401 sem token', async () => {
    const r = await request(app).get('/projects')
    expect(r.status).toBe(401)
  })
})
