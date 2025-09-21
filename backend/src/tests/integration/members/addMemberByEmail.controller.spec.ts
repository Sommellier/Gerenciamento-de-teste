import 'dotenv/config'
import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
  ErrorRequestHandler,
} from 'express'
import request from 'supertest'
import { beforeEach, afterAll, describe, expect, it, jest } from '@jest/globals'
import { addMemberByEmailController } from '../../../controllers/members/addMemberByEmail.controller'
import { AppError } from '../../../utils/AppError'

// mock do use-case
jest.mock('../../../application/use-cases/members/addMemberByEmail.use-case', () => ({
  addMemberByEmail: jest.fn(),
}))
import { addMemberByEmail } from '../../../application/use-cases/members/addMemberByEmail.use-case'

// tipa o mock para evitar 'never'
type Role = 'OWNER' | 'MANAGER' | 'TESTER' | 'APPROVER'
type AddArgs = {
  projectId: number
  requesterId: number
  email: string
  role: Role
  resendIfPending?: boolean
}
const addMemberByEmailMock = addMemberByEmail as unknown as jest.MockedFunction<
  (args: AddArgs) => Promise<
    | { kind: 'member'; member: { projectId: number; userId: number; role: Role } }
    | {
        kind: 'invite'
        invite: {
          id: number
          projectId: number
          email: string
          role: Role
          status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
          invitedById: number
          expiresAt: Date
          acceptedAt: Date | null
          declinedAt: Date | null
          createdAt: Date
          token?: string
        }
      }
  >
>

// helper para montar app
function makeApp(setUser?: (req: Request, _res: Response, next: NextFunction) => void) {
  const app = express()
  app.use(express.json())
  if (setUser) app.use(setUser)

  // wrapper que não retorna Promise pro Express
  const handler: RequestHandler = (req, res, next) => {
    addMemberByEmailController(req as any, res, next).catch(next)
  }

  // defina a rota como quiser no seu app real; aqui usamos esta para o teste
  app.post('/projects/:projectId/members/by-email', handler)

  const eh: ErrorRequestHandler = (err, _req, res, _next) => {
    res.status(500).json({ error: 'unhandled', message: err?.message || 'error' })
  }
  app.use(eh)

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

describe('addMemberByEmail.controller', () => {
  it('401 quando não autenticado', async () => {
    const app = makeApp() // sem auth
    const res = await request(app)
      .post('/projects/7/members/by-email')
      .send({ email: 'x@y.com', role: 'TESTER' })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: 'Não autenticado' })
    expect(addMemberByEmailMock).not.toHaveBeenCalled()
  })

  it('400 quando projectId inválido (0, negativo, NaN)', async () => {
    const app = makeApp(setAuth(10))

    let r = await request(app)
      .post('/projects/0/members/by-email')
      .send({ email: 'x@y.com', role: 'TESTER' })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'projectId inválido' })

    r = await request(app)
      .post('/projects/-1/members/by-email')
      .send({ email: 'x@y.com', role: 'TESTER' })
    expect(r.status).toBe(400)

    r = await request(app)
      .post('/projects/abc/members/by-email')
      .send({ email: 'x@y.com', role: 'TESTER' })
    expect(r.status).toBe(400)

    expect(addMemberByEmailMock).not.toHaveBeenCalled()
  })

  it('400 quando e-mail inválido (sem "@") ou não-string', async () => {
    const app = makeApp(setAuth(10))

    let r = await request(app)
      .post('/projects/1/members/by-email')
      .send({ email: 'invalid', role: 'TESTER' })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'E-mail inválido' })

    r = await request(app)
      .post('/projects/1/members/by-email')
      .send({ email: 12345, role: 'TESTER' })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'E-mail inválido' })

    expect(addMemberByEmailMock).not.toHaveBeenCalled()
  })

  it('400 quando role inválida', async () => {
    const app = makeApp(setAuth(10))
    const res = await request(app)
      .post('/projects/1/members/by-email')
      .send({ email: 'x@y.com', role: 'GUEST' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Role inválida' })
    expect(addMemberByEmailMock).not.toHaveBeenCalled()
  })

  it('201 (kind=member): retorna projectId/userId/role', async () => {
    const app = makeApp(setAuth(33))
    addMemberByEmailMock.mockResolvedValue({
      kind: 'member',
      member: { projectId: 7, userId: 42, role: 'APPROVER' },
    })

    const res = await request(app)
      .post('/projects/7/members/by-email')
      .send({ email: 'aprover@example.com', role: 'APPROVER' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ projectId: 7, userId: 42, role: 'APPROVER' })
    expect(addMemberByEmailMock).toHaveBeenCalledWith({
      projectId: 7,
      requesterId: 33,
      email: 'aprover@example.com',
      role: 'APPROVER',
    })
  })

  it('201 (kind=invite): retorna dados do convite sem expor token', async () => {
    const app = makeApp(setAuth(11))
    const fakeInvite = {
      id: 10,
      projectId: 5,
      email: 'candidate@mail.com',
      role: 'TESTER' as Role,
      status: 'PENDING' as const,
      invitedById: 11,
      expiresAt: new Date(Date.now() + 864e5),
      acceptedAt: null,
      declinedAt: null,
      createdAt: new Date(),
      token: 'should-not-leak',
    }
    addMemberByEmailMock.mockResolvedValue({ kind: 'invite', invite: fakeInvite })

    const res = await request(app)
      .post('/projects/5/members/by-email')
      .send({ email: 'candidate@mail.com', role: 'TESTER' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      invited: true,
      id: fakeInvite.id,
      projectId: fakeInvite.projectId,
      email: fakeInvite.email,
      role: fakeInvite.role,
      status: fakeInvite.status,
      invitedById: fakeInvite.invitedById,
    })
    expect(res.body.token).toBeUndefined()
    expect(addMemberByEmailMock).toHaveBeenCalledWith({
      projectId: 5,
      requesterId: 11,
      email: 'candidate@mail.com',
      role: 'TESTER',
    })
  })

  it('propaga AppError do use-case (404/403/409)', async () => {
    const app = makeApp(setAuth(9))

    addMemberByEmailMock.mockRejectedValueOnce(new AppError('Projeto não encontrado', 404) as any)
    let res = await request(app)
      .post('/projects/999/members/by-email')
      .send({ email: 'x@y.com', role: 'TESTER' })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Projeto não encontrado' })

    addMemberByEmailMock.mockRejectedValueOnce(new AppError('Acesso negado ao projeto', 403) as any)
    res = await request(app)
      .post('/projects/1/members/by-email')
      .send({ email: 'x@y.com', role: 'TESTER' })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ message: 'Acesso negado ao projeto' })

    addMemberByEmailMock.mockRejectedValueOnce(new AppError('Usuário já faz parte do projeto', 409) as any)
    res = await request(app)
      .post('/projects/1/members/by-email')
      .send({ email: 'membro@x.com', role: 'TESTER' })
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ message: 'Usuário já faz parte do projeto' })
  })

  it('erros não mapeados caem no handler 500', async () => {
    const app = makeApp(setAuth(2))
    addMemberByEmailMock.mockRejectedValue(new Error('boom') as any)

    const res = await request(app)
      .post('/projects/3/members/by-email')
      .send({ email: 'z@w.com', role: 'TESTER' })
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({ error: 'unhandled', message: 'boom' })
  })

  it('400 quando req.body é null (linha 23)', async () => {
    const app = makeApp(setAuth(10))

    const res = await request(app)
      .post('/projects/1/members/by-email')
      .send(null as any) // Cast to any to bypass TypeScript error
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'E-mail inválido' })
    expect(addMemberByEmailMock).not.toHaveBeenCalled()
  })

  it('400 quando req.body é undefined (linha 23)', async () => {
    const app = makeApp(setAuth(10))

    const res = await request(app)
      .post('/projects/1/members/by-email')
    // No .send() means req.body is undefined
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'E-mail inválido' })
    expect(addMemberByEmailMock).not.toHaveBeenCalled()
  })
})
