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
import { declineInviteController } from '../../../controllers/invitations/declineInvite.controller'
import { AppError } from '../../../utils/AppError'

// mock do use-case
jest.mock('../../../application/use-cases/invitations/declineInvite.use-case', () => ({
  declineInvite: jest.fn(),
}))
import { declineInvite } from '../../../application/use-cases/invitations/declineInvite.use-case'

// tipa o mock para evitar 'never'
const declineInviteMock = declineInvite as unknown as jest.MockedFunction<
  (args: { token: string }) => Promise<any>
>

// helper para montar app com a rota real
function makeApp() {
  const app = express()
  app.use(express.json())

  // wrapper que não retorna Promise pro Express
  const handler: RequestHandler = (req, res, next) => {
    declineInviteController(req as any, res, next).catch(next)
  }

  // rotas: params e fallback (body)
  app.post('/invites/:token/decline', handler)
  app.post('/invites/decline', handler)

  // error handler padrão
  const eh: ErrorRequestHandler = (err, _req, res, _next) => {
    res.status(500).json({ error: 'unhandled', message: err?.message || 'error' })
  }
  app.use(eh)

  return app
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

afterAll(() => {
  jest.resetAllMocks()
})

describe('declineInvite.controller', () => {
  it('400 quando token ausente (rota fallback sem body.token)', async () => {
    const app = makeApp()
    const res = await request(app).post('/invites/decline').send({})
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ message: 'Token inválido' })
    expect(declineInviteMock).not.toHaveBeenCalled()
  })

  it('400 quando token só com espaços (parametro)', async () => {
    const app = makeApp()
    const res = await request(app).post('/invites/%20%20%20/decline')
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ message: 'Token inválido' })
    expect(declineInviteMock).not.toHaveBeenCalled()
  })

  it('sucesso com token no body (trim aplicado); não expõe token', async () => {
    const app = makeApp()

    const fakeInvite = {
      id: 10,
      projectId: 99,
      email: 'user@example.com',
      role: 'TESTER',
      status: 'DECLINED',
      invitedById: 7,
      token: 'should-not-leak',
      acceptedAt: null,
      declinedAt: new Date(),
      expiresAt: new Date(Date.now() + 864e5),
      createdAt: new Date(),
    }
    declineInviteMock.mockResolvedValue(fakeInvite as any)

    const res = await request(app).post('/invites/decline').send({ token: ' tok-123 ' })
    expect(res.status).toBe(200)
    expect(declineInviteMock).toHaveBeenCalledWith({ token: 'tok-123' })
    expect(res.body).toMatchObject({
      id: fakeInvite.id,
      projectId: fakeInvite.projectId,
      email: fakeInvite.email,
      role: fakeInvite.role,
      status: fakeInvite.status,
      invitedById: fakeInvite.invitedById,
    })
    expect(res.body.token).toBeUndefined()
  })

  it('sucesso com token nos params (trim aplicado) tem precedência sobre body', async () => {
    const app = makeApp()
    declineInviteMock.mockResolvedValue({
      id: 2,
      projectId: 10,
      email: 'x@y.com',
      role: 'APPROVER',
      status: 'DECLINED',
      invitedById: 9,
      acceptedAt: null,
      declinedAt: new Date(),
      expiresAt: new Date(Date.now() + 864e5),
      createdAt: new Date(),
      token: 'dont-leak',
    } as any)

    const res = await request(app)
      .post('/invites/%20TOKPARAM%20/decline')
      .send({ token: 'body-ignored' })

    expect(res.status).toBe(200)
    expect(declineInviteMock).toHaveBeenCalledWith({ token: 'TOKPARAM' })
  })

  it('mapeia AppError 404 (convite inválido)', async () => {
    const app = makeApp()
    declineInviteMock.mockRejectedValue(new AppError('Convite inválido', 404) as any)

    const res = await request(app).post('/invites/foo/decline')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Convite inválido' })
  })

  it('mapeia AppError 410 (expirado)', async () => {
    const app = makeApp()
    declineInviteMock.mockRejectedValue(new AppError('Convite expirado', 410) as any)

    const res = await request(app).post('/invites/bar/decline')
    expect(res.status).toBe(410)
    expect(res.body).toEqual({ message: 'Convite expirado' })
  })

  it('mapeia AppError 409 (já utilizado/aceito)', async () => {
    const app = makeApp()
    declineInviteMock.mockRejectedValue(new AppError('Convite já utilizado', 409) as any)

    const res = await request(app).post('/invites/baz/decline')
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ message: 'Convite já utilizado' })
  })

  it('erros não mapeados caem no handler 500', async () => {
    const app = makeApp()
    declineInviteMock.mockRejectedValue(new Error('boom') as any)

    const res = await request(app).post('/invites/abc/decline')
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({ error: 'unhandled', message: 'boom' })
  })

  it('400 quando body.token não é string (ex.: objeto) → typeof !== "string"', async () => {
    const app = makeApp()
    const res = await request(app).post('/invites/decline').send({ token: { nope: true } })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ message: 'Token inválido' })
    expect(declineInviteMock).not.toHaveBeenCalled()
  })

  it('params têm precedência mesmo com body não-string', async () => {
    const app = makeApp()
    declineInviteMock.mockResolvedValue({
      id: 3,
      projectId: 5,
      email: 'a@b.com',
      role: 'TESTER',
      status: 'DECLINED',
      invitedById: 1,
      acceptedAt: null,
      declinedAt: new Date(),
      expiresAt: new Date(Date.now() + 864e5),
      createdAt: new Date(),
    } as any)

    const res = await request(app)
      .post('/invites/%20PARAM-TOK%20/decline')
      .send({ token: 12345 }) // não-string

    expect(res.status).toBe(200)
    expect(declineInviteMock).toHaveBeenCalledWith({ token: 'PARAM-TOK' })
  })

  it('params escolhido pelo ?? mas não-string → typeof !== "string" e retorna 400', async () => {
    // precisamos sobrescrever req.params.token imediatamente antes do controller
    const app = express()
    app.use(express.json())

    const handler: RequestHandler = (req, res, next) => {
      ;(req as any).params.token = 9999 // não-string
      declineInviteController(req as any, res, next).catch(next)
    }
    app.post('/invites/:token/decline', handler)

    const eh: ErrorRequestHandler = (err, _req, res, _next) => {
      res.status(500).json({ error: 'unhandled', message: err?.message || 'error' })
    }
    app.use(eh)

    const res = await request(app)
      .post('/invites/foo/decline')
      .send({ token: 'body-ignored' })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ message: 'Token inválido' })
    expect(declineInviteMock).not.toHaveBeenCalled()
  })

  it('params definido porém token === null → cai no body pelo ?? (linha 21 do controller)', async () => {
    const app = express()
    app.use(express.json())

    // handler que injeta null no params e passa o body com token válido
    const handler: RequestHandler = (req, res, next) => {
      ;(req as any).params.token = null
      declineInviteController(req as any, res, next).catch(next)
    }
    app.post('/invites/:token/decline', handler)

    const eh: ErrorRequestHandler = (err, _req, res, _next) => {
      res.status(500).json({ error: 'unhandled', message: err?.message || 'error' })
    }
    app.use(eh)

    declineInviteMock.mockResolvedValue({
      id: 11,
      projectId: 2,
      email: 'ok@x.com',
      role: 'TESTER',
      status: 'DECLINED',
      invitedById: 1,
      acceptedAt: null,
      declinedAt: new Date(),
      expiresAt: new Date(Date.now() + 864e5),
      createdAt: new Date(),
    } as any)

    const res = await request(app)
      .post('/invites/xxx/decline')
      .send({ token: 'from-body' })

    expect(res.status).toBe(200)
    expect(declineInviteMock).toHaveBeenCalledWith({ token: 'from-body' })
  })

  it('400 quando body.token é null (cobre ramo null do ?? no body)', async () => {
    const app = makeApp()
    const res = await request(app).post('/invites/decline').send({ token: null })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ message: 'Token inválido' })
    expect(declineInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo params undefined: usa token do body quando params não existe', async () => {
    const app = makeApp()
    declineInviteMock.mockResolvedValue({
      id: 1,
      projectId: 2,
      email: 'test@example.com',
      role: 'TESTER',
      status: 'DECLINED',
      invitedById: 3,
      acceptedAt: null,
      declinedAt: new Date(),
      expiresAt: new Date(),
      createdAt: new Date(),
    } as any)

    // Usar rota que não tem params (só body)
    const res = await request(app)
      .post('/invites/decline')
      .send({ token: 'from-body-only' })

    expect(res.status).toBe(200)
    expect(declineInviteMock).toHaveBeenCalledWith({ token: 'from-body-only' })
  })

  it('cobre ramo params undefined: usa token do body quando params não existe', async () => {
    const app = makeApp()
    declineInviteMock.mockResolvedValue({
      id: 1,
      projectId: 2,
      email: 'test@example.com',
      role: 'TESTER',
      status: 'DECLINED',
      invitedById: 3,
      acceptedAt: null,
      declinedAt: new Date(),
      expiresAt: new Date(),
      createdAt: new Date(),
    } as any)

    // Usar rota que não tem params (só body)
    const res = await request(app)
      .post('/invites/decline')
      .send({ token: 'from-body-only' })

    expect(res.status).toBe(200)
    expect(declineInviteMock).toHaveBeenCalledWith({ token: 'from-body-only' })
  })
})
