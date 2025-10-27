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
import { updateMemberRoleController } from '../../../controllers/members/updateMemberRole.controller'
import { AppError } from '../../../utils/AppError'

// mock do use-case
jest.mock('../../../application/use-cases/members/updateMemberRole.use-case', () => ({
  updateMemberRole: jest.fn(),
}))
import { updateMemberRole } from '../../../application/use-cases/members/updateMemberRole.use-case'

// tipa o mock para evitar 'never'
type Role = 'OWNER' | 'MANAGER' | 'TESTER' | 'APPROVER'
type UpdateArgs = {
  projectId: number
  requesterId: number
  targetUserId: number
  newRole: Role
}
type UpdateResult = { projectId: number; userId: number; role: Role }

const updateMemberRoleMock = updateMemberRole as unknown as jest.MockedFunction<
  (args: UpdateArgs) => Promise<UpdateResult>
>

// helper p/ app de teste
function makeApp(setUser?: (req: Request, _res: Response, next: NextFunction) => void) {
  const app = express()
  app.use(express.json())
  if (setUser) app.use(setUser)

  // wrapper que não retorna Promise ao Express
  const handler: RequestHandler = (req, res, next) => {
    updateMemberRoleController(req as any, res, next).catch(next)
  }

  // ajuste o path conforme seu router real
  app.put('/projects/:projectId/members/:userId/role', handler)

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

describe('updateMemberRole.controller', () => {
  it('401 quando não autenticado', async () => {
    const app = makeApp() // sem auth
    const res = await request(app)
      .put('/projects/1/members/2/role')
      .send({ role: 'TESTER' })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: 'Não autenticado' })
    expect(updateMemberRoleMock).not.toHaveBeenCalled()
  })

  it('400 quando projectId inválido (0, negativo, NaN)', async () => {
    const app = makeApp(setAuth(10))

    let r = await request(app).put('/projects/0/members/2/role').send({ role: 'TESTER' })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'projectId inválido' })

    r = await request(app).put('/projects/-1/members/2/role').send({ role: 'TESTER' })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'projectId inválido' })

    r = await request(app).put('/projects/abc/members/2/role').send({ role: 'TESTER' })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'projectId inválido' })

    expect(updateMemberRoleMock).not.toHaveBeenCalled()
  })

  it('400 quando userId inválido (0, negativo, NaN)', async () => {
    const app = makeApp(setAuth(10))

    let r = await request(app).put('/projects/1/members/0/role').send({ role: 'TESTER' })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'userId inválido' })

    r = await request(app).put('/projects/1/members/-3/role').send({ role: 'TESTER' })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'userId inválido' })

    r = await request(app).put('/projects/1/members/xyz/role').send({ role: 'TESTER' })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'userId inválido' })

    expect(updateMemberRoleMock).not.toHaveBeenCalled()
  })

  it('400 quando role inválida (ausente, null, número ou valor fora da lista)', async () => {
    const app = makeApp(setAuth(10))

    let r = await request(app).put('/projects/1/members/2/role').send({})
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'Role inválida' })

    r = await request(app).put('/projects/1/members/2/role').send({ role: null })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'Role inválida' })

    r = await request(app).put('/projects/1/members/2/role').send({ role: 123 })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'Role inválida' })

    r = await request(app).put('/projects/1/members/2/role').send({ role: 'manager' })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'Role inválida' })

    r = await request(app).put('/projects/1/members/2/role').send({ role: 'GUEST' })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'Role inválida' })

    expect(updateMemberRoleMock).not.toHaveBeenCalled()
  })

  it('200 sucesso: retorna projectId/userId/role e repassa argumentos corretos ao use-case', async () => {
    const app = makeApp(setAuth(55))
    updateMemberRoleMock.mockResolvedValue({ projectId: 7, userId: 42, role: 'APPROVER' })

    const res = await request(app)
      .put('/projects/7/members/42/role')
      .send({ role: 'APPROVER' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ projectId: 7, userId: 42, role: 'APPROVER' })
    expect(updateMemberRoleMock).toHaveBeenCalledWith({
      projectId: 7,
      requesterId: 55,
      targetUserId: 42,
      newRole: 'APPROVER',
    })
  })

  it('propaga AppError do use-case: 404 / 403 / 409', async () => {
    const app = makeApp(setAuth(9))

    updateMemberRoleMock.mockRejectedValueOnce(new AppError('Projeto não encontrado', 404) as any)
    let res = await request(app).put('/projects/999/members/1/role').send({ role: 'TESTER' })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Projeto não encontrado' })

    updateMemberRoleMock.mockRejectedValueOnce(new AppError('Acesso negado ao projeto', 403) as any)
    res = await request(app).put('/projects/1/members/2/role').send({ role: 'TESTER' })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ message: 'Acesso negado ao projeto' })

    updateMemberRoleMock.mockRejectedValueOnce(
      new AppError('Transfira a propriedade antes de rebaixar o último OWNER', 409) as any
    )
    res = await request(app).put('/projects/1/members/3/role').send({ role: 'MANAGER' })
    expect(res.status).toBe(409)
    expect(res.body).toEqual({
      message: 'Transfira a propriedade antes de rebaixar o último OWNER',
    })
  })

  it('erros não mapeados vão para o error handler (500)', async () => {
    const app = makeApp(setAuth(3))
    updateMemberRoleMock.mockRejectedValue(new Error('boom') as any)

    const res = await request(app)
      .put('/projects/1/members/2/role')
      .send({ role: 'TESTER' })
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({ error: 'unhandled', message: 'boom' })
  })

  it('400 quando req.body é null (linha 24)', async () => {
    const app = makeApp(setAuth(10))

    const res = await request(app)
      .put('/projects/1/members/2/role')
      .send(null as any) // Cast to any to bypass TypeScript error
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Role inválida' })
    expect(updateMemberRoleMock).not.toHaveBeenCalled()
  })

  it('400 quando req.body é undefined (linha 24)', async () => {
    const app = makeApp(setAuth(10))

    const res = await request(app)
      .put('/projects/1/members/2/role')
    // No .send() means req.body is undefined
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Role inválida' })
    expect(updateMemberRoleMock).not.toHaveBeenCalled()
  })
})
