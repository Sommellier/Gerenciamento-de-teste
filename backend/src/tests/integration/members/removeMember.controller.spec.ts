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
import { removeMemberController } from '../../../controllers/members/removeMember.controller'
import { AppError } from '../../../utils/AppError'

// mock do use-case
jest.mock('../../../application/use-cases/members/removeMember.use-case', () => ({
  removeMember: jest.fn(),
}))
import { removeMember } from '../../../application/use-cases/members/removeMember.use-case'

// tipa o mock para evitar 'never'
type Role = 'OWNER' | 'MANAGER' | 'TESTER' | 'APPROVER'
type RemoveArgs = { projectId: number; requesterId: number; targetUserId: number }
type RemoveResult = { projectId: number; userId: number; role: Role }
const removeMemberMock = removeMember as unknown as jest.MockedFunction<
  (args: RemoveArgs) => Promise<RemoveResult>
>

// helper p/ app de teste
function makeApp(setUser?: (req: Request, _res: Response, next: NextFunction) => void) {
  const app = express()
  app.use(express.json())
  if (setUser) app.use(setUser)

  // wrapper que não retorna Promise ao Express
  const handler: RequestHandler = (req, res, next) => {
    removeMemberController(req as any, res, next).catch(next)
  }

  // rota (ajuste para o path real do seu router)
  app.delete('/projects/:projectId/members/:userId', handler)

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

describe('removeMember.controller', () => {
  it('401 quando não autenticado', async () => {
    const app = makeApp() // sem auth
    const res = await request(app).delete('/projects/1/members/2')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: 'Não autenticado' })
    expect(removeMemberMock).not.toHaveBeenCalled()
  })

  it('400 quando projectId inválido (0, negativo, NaN)', async () => {
    const app = makeApp(setAuth(10))

    let r = await request(app).delete('/projects/0/members/2')
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'projectId inválido' })

    r = await request(app).delete('/projects/-1/members/2')
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'projectId inválido' })

    r = await request(app).delete('/projects/abc/members/2')
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'projectId inválido' })

    expect(removeMemberMock).not.toHaveBeenCalled()
  })

  it('400 quando userId inválido (0, negativo, NaN)', async () => {
    const app = makeApp(setAuth(10))

    let r = await request(app).delete('/projects/1/members/0')
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'userId inválido' })

    r = await request(app).delete('/projects/1/members/-3')
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'userId inválido' })

    r = await request(app).delete('/projects/1/members/xyz')
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'userId inválido' })

    expect(removeMemberMock).not.toHaveBeenCalled()
  })

  it('200 sucesso: retorna projectId/userId/role e repassa argumentos corretos ao use-case', async () => {
    const app = makeApp(setAuth(55))
    removeMemberMock.mockResolvedValue({ projectId: 7, userId: 42, role: 'TESTER' })

    const res = await request(app).delete('/projects/7/members/42')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ projectId: 7, userId: 42, role: 'TESTER' })
    expect(removeMemberMock).toHaveBeenCalledWith({
      projectId: 7,
      requesterId: 55,
      targetUserId: 42,
    })
  })

  it('propaga AppError do use-case (404/403/409)', async () => {
    const app = makeApp(setAuth(9))

    removeMemberMock.mockRejectedValueOnce(new AppError('Projeto não encontrado', 404) as any)
    let res = await request(app).delete('/projects/999/members/1')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Projeto não encontrado' })

    removeMemberMock.mockRejectedValueOnce(new AppError('Acesso negado ao projeto', 403) as any)
    res = await request(app).delete('/projects/1/members/2')
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ message: 'Acesso negado ao projeto' })

    removeMemberMock.mockRejectedValueOnce(
      new AppError('Transfira a propriedade antes de remover o último OWNER', 409) as any
    )
    res = await request(app).delete('/projects/1/members/3')
    expect(res.status).toBe(409)
    expect(res.body).toEqual({
      message: 'Transfira a propriedade antes de remover o último OWNER',
    })
  })

  it('erros não mapeados vão para o error handler (500)', async () => {
    const app = makeApp(setAuth(3))
    removeMemberMock.mockRejectedValue(new Error('boom') as any)

    const res = await request(app).delete('/projects/1/members/2')
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({ error: 'unhandled', message: 'boom' })
  })
})
