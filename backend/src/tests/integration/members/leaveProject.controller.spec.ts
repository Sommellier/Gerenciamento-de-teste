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
import { leaveProjectController } from '../../../controllers/members/leaveProject.controller'
import { AppError } from '../../../utils/AppError'

// mock do use-case
jest.mock('../../../application/use-cases/members/leaveProject.use-case', () => ({
  leaveProject: jest.fn(),
}))
import { leaveProject } from '../../../application/use-cases/members/leaveProject.use-case'

// tipa o mock para evitar 'never'
type Role = 'OWNER' | 'MANAGER' | 'TESTER' | 'APPROVER'
type LeaveArgs = { projectId: number; userId: number }
type LeaveResult = { projectId: number; userId: number; role: Role }
const leaveProjectMock = leaveProject as unknown as jest.MockedFunction<
  (args: LeaveArgs) => Promise<LeaveResult>
>

// helper p/ app de teste
function makeApp(setUser?: (req: Request, _res: Response, next: NextFunction) => void) {
  const app = express()
  app.use(express.json())
  if (setUser) app.use(setUser)

  // wrapper que não retorna Promise ao Express
  const handler: RequestHandler = (req, res, next) => {
    leaveProjectController(req as any, res, next).catch(next)
  }

  // rota (ajuste para o path real do seu router)
  app.post('/projects/:projectId/members/leave', handler)

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

describe('leaveProject.controller', () => {
  it('401 quando não autenticado (linha 15)', async () => {
    const app = makeApp() // sem auth
    const res = await request(app).post('/projects/1/members/leave')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: 'Não autenticado' })
    expect(leaveProjectMock).not.toHaveBeenCalled()
  })

  it('400 quando projectId inválido (0, negativo, NaN) (linhas 19-21)', async () => {
    const app = makeApp(setAuth(10))

    let r = await request(app).post('/projects/0/members/leave')
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'projectId inválido' })

    r = await request(app).post('/projects/-1/members/leave')
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'projectId inválido' })

    r = await request(app).post('/projects/abc/members/leave')
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ message: 'projectId inválido' })

    expect(leaveProjectMock).not.toHaveBeenCalled()
  })

  it('200 sucesso: retorna projectId/userId/role/message e repassa argumentos corretos ao use-case (linhas 23-34)', async () => {
    const app = makeApp(setAuth(55))
    leaveProjectMock.mockResolvedValue({ projectId: 7, userId: 55, role: 'TESTER' })

    const res = await request(app).post('/projects/7/members/leave')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      projectId: 7,
      userId: 55,
      role: 'TESTER',
      message: 'Você saiu do projeto com sucesso'
    })
    expect(leaveProjectMock).toHaveBeenCalledWith({
      projectId: 7,
      userId: 55,
    })
  })

  it('propaga AppError do use-case (404/403) (linhas 36-38)', async () => {
    const app = makeApp(setAuth(9))

    leaveProjectMock.mockRejectedValueOnce(new AppError('Projeto não encontrado', 404) as any)
    let res = await request(app).post('/projects/999/members/leave')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Projeto não encontrado' })

    leaveProjectMock.mockRejectedValueOnce(
      new AppError('O dono do projeto não pode sair. Transfira a propriedade primeiro.', 403) as any
    )
    res = await request(app).post('/projects/1/members/leave')
    expect(res.status).toBe(403)
    expect(res.body).toEqual({
      message: 'O dono do projeto não pode sair. Transfira a propriedade primeiro.',
    })

    leaveProjectMock.mockRejectedValueOnce(
      new AppError('Você não é membro deste projeto', 404) as any
    )
    res = await request(app).post('/projects/1/members/leave')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Você não é membro deste projeto' })
  })

  it('erros não mapeados vão para o error handler (500) (linha 39)', async () => {
    const app = makeApp(setAuth(3))
    leaveProjectMock.mockRejectedValue(new Error('boom') as any)

    const res = await request(app).post('/projects/1/members/leave')
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({ error: 'unhandled', message: 'boom' })
  })
})

