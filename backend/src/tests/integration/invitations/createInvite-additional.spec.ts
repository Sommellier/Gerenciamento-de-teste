// Testes adicionais para cobrir branches faltantes do createInvite.controller
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

describe('createInvite.controller - branches faltantes', () => {
  it('cobre ramo err?.code !== P2002: erro com código diferente', async () => {
    const app = makeApp(setAuth(9))
    createInviteMock.mockRejectedValue({ code: 'P2003' } as any)

    const res = await request(app)
      .post('/projects/5/invites')
      .send({ email: 'test@example.com', role: 'TESTER' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'unhandled', message: 'error' })
  })

  it('cobre ramo err?.code é undefined: erro sem código', async () => {
    const app = makeApp(setAuth(9))
    createInviteMock.mockRejectedValue(new Error('Erro sem código') as any)

    const res = await request(app)
      .post('/projects/5/invites')
      .send({ email: 'test@example.com', role: 'TESTER' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'unhandled', message: 'Erro sem código' })
  })

  it('cobre ramo err é null: erro null', async () => {
    const app = makeApp(setAuth(9))
    createInviteMock.mockRejectedValue(null as any)

    const res = await request(app)
      .post('/projects/5/invites')
      .send({ email: 'test@example.com', role: 'TESTER' })

    expect(res.status).toBe(404)
    expect(res.body).toEqual({})
  })
})
