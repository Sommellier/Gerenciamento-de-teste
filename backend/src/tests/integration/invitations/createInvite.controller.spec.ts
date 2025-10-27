import 'dotenv/config'
import express, { Request, Response, NextFunction, RequestHandler } from 'express'
import request from 'supertest'
import { beforeEach, afterAll, describe, expect, it, jest } from '@jest/globals'
import { createInviteController } from '../../../controllers/invitations/createInvite.controller'
import { AppError } from '../../../utils/AppError'
import type { Role } from '@prisma/client'

// mock do use-case
jest.mock('../../../application/use-cases/invitations/createInvite.use-case', () => ({
  createInvite: jest.fn(),
}))
import { createInvite } from '../../../application/use-cases/invitations/createInvite.use-case'

// tipa o mock para evitar 'never'
type CreateInviteArgs = {
  projectId: number
  email: string
  role: Role
  invitedById: number
  resendIfPending?: boolean
}
const createInviteMock = createInvite as unknown as jest.MockedFunction<
  (args: CreateInviteArgs) => Promise<any>
>

// helper para montar app de teste
function makeApp(setUser?: (req: Request, _res: Response, next: NextFunction) => void) {
  const app = express()
  app.use(express.json())

  if (setUser) app.use(setUser)

  // wrapper: não retornar Promise diretamente
  const handler: RequestHandler = (req, res, next) => {
    createInviteController(req as any, res, next).catch(next)
  }

  // rota do controller
  app.post('/projects/:projectId/invites', handler)

  // error handler padrão
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: 'unhandled', message: err?.message || 'error' })
  })

  return app
}

const setAuth =
  (userId?: number) =>
  (req: Request & { user?: { id: number } }, _res: Response, next: NextFunction) => {
    if (userId) req.user = { id: userId }
    next()
  }

beforeEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

afterAll(() => {
  jest.resetAllMocks()
})

describe('createInvite.controller', () => {
  it('401 quando não autenticado', async () => {
    const app = makeApp()
    const res = await request(app).post('/projects/1/invites').send({ email: 'a@b.com', role: 'TESTER' })
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ message: 'Não autenticado' })
    expect(createInviteMock).not.toHaveBeenCalled()
  })

  it('400 quando projectId inválido (não-inteiro/<=0)', async () => {
    const app = makeApp(setAuth(10))
    let res = await request(app).post('/projects/abc/invites').send({ email: 'a@b.com', role: 'APPROVER' })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ message: 'projectId inválido' })
    res = await request(app).post('/projects/0/invites').send({ email: 'a@b.com', role: 'APPROVER' })
    expect(res.status).toBe(400)
    expect(createInviteMock).not.toHaveBeenCalled()
  })

  it('400 quando body.email inválido', async () => {
    const app = makeApp(setAuth(10))
    const res = await request(app).post('/projects/1/invites').send({ email: 'invalido', role: 'TESTER' })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ message: 'E-mail inválido' })
    expect(createInviteMock).not.toHaveBeenCalled()
  })

  it('400 quando body.role inválida', async () => {
    const app = makeApp(setAuth(10))
    const res = await request(app).post('/projects/1/invites').send({ email: 'a@b.com', role: 'INVALID' })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ message: 'Role inválida' })
    expect(createInviteMock).not.toHaveBeenCalled()
  })

  it('201 sucesso: chama use-case com resendIfPending=true e não expõe token', async () => {
    const app = makeApp(setAuth(42))
    const fake = {
      id: 123,
      projectId: 7,
      email: 'user@example.com',
      role: 'MANAGER',
      status: 'PENDING',
      invitedById: 42,
      token: 'secret-token',
      expiresAt: new Date(Date.now() + 7 * 864e5),
      createdAt: new Date(),
    }
    createInviteMock.mockResolvedValue(fake as any)

    const res = await request(app)
      .post('/projects/7/invites')
      .send({ email: 'user@example.com', role: 'MANAGER' })

    expect(res.status).toBe(201)
    expect(createInviteMock).toHaveBeenCalledWith({
      projectId: 7,
      email: 'user@example.com',
      role: 'MANAGER',
      invitedById: 42,
      resendIfPending: true,
    })
    expect(res.body).toMatchObject({
      id: fake.id,
      projectId: fake.projectId,
      email: fake.email,
      role: fake.role,
      status: fake.status,
    })
    expect(res.body.token).toBeUndefined()
    expect(res.body.invitedById).toBeUndefined()
  })

  it('mapeia AppError vindo do use-case (ex.: 403 Acesso negado)', async () => {
    const app = makeApp(setAuth(9))
    createInviteMock.mockRejectedValue(new AppError('Acesso negado ao projeto', 403) as any)

    const res = await request(app)
      .post('/projects/5/invites')
      .send({ email: 'x@y.com', role: 'TESTER' })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ message: 'Acesso negado ao projeto' })
  })

  it('mapeia P2002 (já existe convite) para 409', async () => {
    const app = makeApp(setAuth(9))
    createInviteMock.mockRejectedValue({ code: 'P2002' } as any)

    const res = await request(app)
      .post('/projects/5/invites')
      .send({ email: 'dup@y.com', role: 'TESTER' })
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ message: 'Já existe um convite para esse e-mail' })
  })

  it('erros desconhecidos vão para o error handler (500)', async () => {
    const app = makeApp(setAuth(9))
    createInviteMock.mockRejectedValue(new Error('boom') as any)

    const res = await request(app)
      .post('/projects/5/invites')
      .send({ email: 'z@y.com', role: 'APPROVER' })
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({ error: 'unhandled', message: 'boom' })
  })

  it('400 quando req.body é null', async () => {
    const app = makeApp(setAuth(9))

    const res = await request(app)
      .post('/projects/5/invites')
      .send(null as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'E-mail inválido' })
  })

  it('400 quando req.body é undefined', async () => {
    const app = makeApp(setAuth(9))

    const res = await request(app)
      .post('/projects/5/invites')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'E-mail inválido' })
  })
})
