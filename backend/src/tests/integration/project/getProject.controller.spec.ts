import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../infrastructure/prisma'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { createProject } from '../../../application/use-cases/projetos/createProject.use-case'
import { getProjectById } from '../../../application/use-cases/projetos/getProjectById.use-case'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`
const tokenFor = (id: number) => jwt.sign({ id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' })

const auth = (req: Request, res: Response, next: NextFunction) => {
  const [, token] = (req.headers.authorization || '').split(' ')
  if (!token) { res.status(401).json({ message: 'Não autenticado' }); return }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as { id: number }
    ;(req as any).user = { id: payload.id }
    next()
  } catch { res.status(401).json({ message: 'Token inválido' }) }
}
const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(Number.isFinite(err?.status) ? err.status : 500).json({ message: err?.message || 'Internal server error' })
}

let app: express.Express
let ownerId: number
let testerId: number
let approverId: number
let outsiderId: number
let projectId: number

beforeAll(() => {
  app = express()
  app.use(express.json())
  app.get('/projects/:id', auth, async (req, res, next) => {
    try {
      const pid = Number(req.params.id)
      // @ts-expect-error user injetado
      const requesterId: number = req.user?.id
      if (!Number.isFinite(pid)) { res.status(400).json({ message: 'Parâmetro inválido: id' }); return }
      const p = await getProjectById({ projectId: pid, requesterId })
      res.status(200).json(p)
    } catch (e) { next(e) }
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

  const owner = await createUser({ name: 'Owner', email: `${unique('own')}@ex.com`, password: 'teste123' })
  const tester = await createUser({ name: 'Tester', email: `${unique('tes')}@ex.com`, password: 'teste123' })
  const approver = await createUser({ name: 'Approver', email: `${unique('app')}@ex.com`, password: 'teste123' })
  const outsider = await createUser({ name: 'Out', email: `${unique('out')}@ex.com`, password: 'teste123' })
  ownerId = owner.id; testerId = tester.id; approverId = approver.id; outsiderId = outsider.id

  const p = await createProject({ ownerId, name: 'Projeto Read', description: null })
  projectId = p.id

  // Convida/adiciona tester e approver (membros do projeto)
  await prisma.userOnProject.create({ data: { userId: testerId, projectId, role: 'TESTER' as any } })
  await prisma.userOnProject.create({ data: { userId: approverId, projectId, role: 'APPROVER' as any } })
})
afterAll(async () => { await prisma.$disconnect() })

describe('GET /projects/:id com RBAC (OWNER/TESTER/APPROVER)', () => {
  it('200 OWNER pode ler', async () => {
    const r = await request(app).get(`/projects/${projectId}`).set('Authorization', `Bearer ${tokenFor(ownerId)}`)
    expect(r.status).toBe(200)
    expect(r.body.id).toBe(projectId)
  })
  it('200 TESTER (membro) pode ler', async () => {
    const r = await request(app).get(`/projects/${projectId}`).set('Authorization', `Bearer ${tokenFor(testerId)}`)
    expect(r.status).toBe(200)
  })
  it('200 APPROVER (membro) pode ler', async () => {
    const r = await request(app).get(`/projects/${projectId}`).set('Authorization', `Bearer ${tokenFor(approverId)}`)
    expect(r.status).toBe(200)
  })
  it('403 não-membro NÃO pode ler', async () => {
    const r = await request(app).get(`/projects/${projectId}`).set('Authorization', `Bearer ${tokenFor(outsiderId)}`)
    expect(r.status).toBe(403)
  })
  it('404 projeto inexistente', async () => {
    const r = await request(app).get(`/projects/999999`).set('Authorization', `Bearer ${tokenFor(ownerId)}`)
    expect(r.status).toBe(404)
  })
  it('401 sem token', async () => {
    const r = await request(app).get(`/projects/${projectId}`)
    expect(r.status).toBe(401)
  })
})
