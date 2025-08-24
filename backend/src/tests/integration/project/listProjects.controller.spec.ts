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
  
  it('ignora filtro quando q é array (?q=A&q=B) e retorna todos do owner', async () => {
    const r = await request(app)
      .get('/projects?q=alpha&q=beta')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
    expect(r.status).toBe(200)
    expect(r.body.total).toBe(3) 
  })

  it('paginacao: page=2&pageSize=2 retorna itens remanescentes e total/totalPages coerentes', async () => {
    const r = await request(app)
      .get('/projects?page=2&pageSize=2')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
    expect(r.status).toBe(200)
    expect(r.body.page).toBe(2)
    expect(r.body.pageSize).toBe(2)
    expect(r.body.total).toBe(3)
    expect(r.body.totalPages).toBe(2)
    expect(Array.isArray(r.body.items)).toBe(true)
    expect(r.body.items.length).toBe(1) 
  })

  it('ordena por id desc', async () => {
    const r = await request(app)
      .get('/projects?page=1&pageSize=3')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
    expect(r.status).toBe(200)
    const items = r.body.items
    expect(items.length).toBeGreaterThanOrEqual(2)
    expect(items[0].id).toBeGreaterThan(items[1].id)
  })

  it('filtro q com trim (ex.: "  be  " casa Beta)', async () => {
    const r = await request(app)
      .get('/projects?q=  be  ')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
    expect(r.status).toBe(200)
    expect(r.body.items.some((p: any) => /beta/i.test(p.name))).toBe(true)
  })

  it('page inválido (abc) hoje resulta em 500 (sem validação no controller)', async () => {
    const r = await request(app)
      .get('/projects?page=abc')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
    expect([500, 400]).toContain(r.status) 
  })

  it('pageSize inválido (xyz) hoje resulta em 500 (sem validação no controller)', async () => {
    const r = await request(app)
      .get('/projects?pageSize=xyz')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
    expect([500, 400]).toContain(r.status)
  })

  it('paginacao: somente page=2 usa pageSize default=10', async () => {
    const r = await request(app)
      .get('/projects?page=2')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
    expect(r.status).toBe(200)
    expect(r.body.page).toBe(2)
    expect(r.body.pageSize).toBe(10)
    expect(r.body.total).toBe(3)
    expect(r.body.totalPages).toBe(1) 
    expect(Array.isArray(r.body.items)).toBe(true)
    expect(r.body.items.length).toBe(0) 
  })

  it('paginacao: somente pageSize=2 usa page default=1', async () => {
    const r = await request(app)
      .get('/projects?pageSize=2')
      .set('Authorization', `Bearer ${tokenFor(ownerId)}`)
    expect(r.status).toBe(200)
    expect(r.body.page).toBe(1)       
    expect(r.body.pageSize).toBe(2)
    expect(r.body.total).toBe(3)
    expect(r.body.totalPages).toBe(2) 
    expect(Array.isArray(r.body.items)).toBe(true)
    expect(r.body.items.length).toBe(2) 
  })
})