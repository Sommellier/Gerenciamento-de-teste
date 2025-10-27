// src/tests/integration/invitations/acceptInvite.controller.spec.ts
import 'dotenv/config'
import express, { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express'
import request from 'supertest'
import { beforeEach, afterAll, describe, expect, it, jest } from '@jest/globals'
import { acceptInviteController } from '../../../controllers/invitations/acceptInvite.controller'
import { AppError } from '../../../utils/AppError'

// mock do use-case
jest.mock('../../../application/use-cases/invitations/acceptInvite.use-case', () => ({
    acceptInvite: jest.fn(),
}))
import { acceptInvite } from '../../../application/use-cases/invitations/acceptInvite.use-case'

// tipa o mock para evitar erros de 'never'
const acceptInviteMock = acceptInvite as unknown as jest.MockedFunction<
    (args: { token: string; userId: number }) => Promise<any>
>

// helper para montar app de teste
function makeApp(setUser?: (req: Request, _res: Response, next: NextFunction) => void) {
    const app = express()
    app.use(express.json())

    if (setUser) app.use(setUser)

    // wrapper para não retornar Promise pro express (evita overload mismatch)
    const acceptHandler: RequestHandler = (req, res, next) => {
        acceptInviteController(req as any, res, next).catch(next)
    }

    // rota com token em params
    app.post('/invites/:token/accept', acceptHandler)
    // rota de fallback com token no body
    app.post('/invites/accept', acceptHandler)

    // error handler padrão do app
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

describe('acceptInvite.controller', () => {
    it('401 quando não autenticado', async () => {
        const app = makeApp() // sem setAuth
        const res = await request(app).post('/invites/any-token/accept')
        expect(res.status).toBe(401)
        expect(res.body).toMatchObject({ message: 'Não autenticado' })
        expect(acceptInviteMock).not.toHaveBeenCalled()
    })

    it('400 quando token ausente (rota fallback sem body.token)', async () => {
        const app = makeApp(setAuth(10))
        const res = await request(app).post('/invites/accept').send({})
        expect(res.status).toBe(400)
        expect(res.body).toMatchObject({ message: 'Token inválido' })
        expect(acceptInviteMock).not.toHaveBeenCalled()
    })

    it('400 quando token só com espaços (parametro)', async () => {
        const app = makeApp(setAuth(10))
        // envia "   " como token param (codificado)
        const res = await request(app).post('/invites/%20%20%20/accept')
        expect(res.status).toBe(400)
        expect(res.body).toMatchObject({ message: 'Token inválido' })
        expect(acceptInviteMock).not.toHaveBeenCalled()
    })

    it('usa token do body quando rota não tem param e retorna 200 no sucesso (sem expor token)', async () => {
        const app = makeApp(setAuth(42))

        const fakeInvite = {
            id: 1,
            projectId: 99,
            email: 'user@example.com',
            role: 'TESTER',
            status: 'ACCEPTED',
            invitedById: 7,
            token: 'should-not-leak',
            acceptedAt: new Date(),
            declinedAt: null,
            expiresAt: new Date(Date.now() + 864e5),
            createdAt: new Date(),
        }

        acceptInviteMock.mockResolvedValue(fakeInvite as any)

        const res = await request(app).post('/invites/accept').send({ token: ' tok-123 ' })
        expect(res.status).toBe(200)
        expect(acceptInviteMock).toHaveBeenCalledWith({ token: 'tok-123', userId: 42 })

        // corpo não deve conter `token`
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

    it('mapeia AppError do use-case (ex.: 404 convite inválido)', async () => {
        const app = makeApp(setAuth(5))
        acceptInviteMock.mockRejectedValue(new AppError('Convite inválido', 404) as any)

        const res = await request(app).post('/invites/some/accept')
        expect(res.status).toBe(404)
        expect(res.body).toEqual({ message: 'Convite inválido' })
    })

    it('mapeia AppError 410 expirado', async () => {
        const app = makeApp(setAuth(5))
        acceptInviteMock.mockRejectedValue(new AppError('Convite expirado', 410) as any)

        const res = await request(app).post('/invites/tok/accept')
        expect(res.status).toBe(410)
        expect(res.body).toEqual({ message: 'Convite expirado' })
    })

    it('erros não mapeados seguem para o error handler (500)', async () => {
        const app = makeApp(setAuth(5))
        acceptInviteMock.mockRejectedValue(new Error('boom') as any)

        const res = await request(app).post('/invites/abc/accept')
        expect(res.status).toBe(500)
        expect(res.body).toMatchObject({ error: 'unhandled', message: 'boom' })
    })

    it('usa token do params quando presente (trim aplicado) e passa userId correto', async () => {
        const app = makeApp(setAuth(123))
        acceptInviteMock.mockResolvedValue({
            id: 2,
            projectId: 10,
            email: 'x@y.com',
            role: 'APPROVER',
            status: 'ACCEPTED',
            invitedById: 9,
            acceptedAt: new Date(),
            declinedAt: null,
            expiresAt: new Date(Date.now() + 864e5),
            createdAt: new Date(),
            token: 'dont-leak',
        } as any)

        const res = await request(app).post('/invites/%20TOKPARAM%20/accept')
        expect(res.status).toBe(200)
        expect(acceptInviteMock).toHaveBeenCalledWith({ token: 'TOKPARAM', userId: 123 })
    })
})

it('400 quando token no body não é string (ex.: objeto) → cai no ramo typeof !== "string"', async () => {
    const app = makeApp(setAuth(10))
    const res = await request(app).post('/invites/accept').send({ token: { nope: true } })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
})

it('params têm precedência sobre body: usa o token do params mesmo com body.token não-string', async () => {
    const app = makeApp(setAuth(77))
    acceptInviteMock.mockResolvedValue({
        id: 9,
        projectId: 3,
        email: 'a@b.com',
        role: 'TESTER',
        status: 'ACCEPTED',
        invitedById: 1,
        acceptedAt: new Date(),
        declinedAt: null,
        expiresAt: new Date(Date.now() + 864e5),
        createdAt: new Date(),
    } as any)

    // params token é válido; body.token é número (não-string) — deve ignorar o body e usar o params
    const res = await request(app)
        .post('/invites/%20PARAM-TOK%20/accept')
        .send({ token: 12345 })

    expect(res.status).toBe(200)
    expect(acceptInviteMock).toHaveBeenCalledWith({ token: 'PARAM-TOK', userId: 77 })
})

it('400 quando body.token é null (cobre o ramo null do ?? na linha 21)', async () => {
    const app = makeApp(setAuth(10))
    const res = await request(app).post('/invites/accept').send({ token: null })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
})

it('cobre ramo params nullish: força req.params = undefined e usa token do body', async () => {
    const app = express()
    app.use(express.json())
    // autentica
    app.use((req: Request & { user?: { id: number } }, _res, next) => { req.user = { id: 33 }; next() })
    // força params nullish -> exercita o ?. da linha 21
    app.use((req, _res, next) => { (req as any).params = undefined; next() })

    const acceptHandler: RequestHandler = (req, res, next) => {
        acceptInviteController(req as any, res, next).catch(next)
    }
    app.post('/invites/accept', acceptHandler)
    const eh1: ErrorRequestHandler = (err, _req, res, _next) => {
        res.status(500).json({ error: 'unhandled', message: err?.message || 'error' })
    }
    app.use(eh1)


    acceptInviteMock.mockResolvedValue({
        id: 77, projectId: 5, email: 'x@y.com', role: 'TESTER', status: 'ACCEPTED',
        invitedById: 1, acceptedAt: new Date(), declinedAt: null,
        expiresAt: new Date(Date.now() + 864e5), createdAt: new Date(),
    } as any)

    const res = await request(app).post('/invites/accept').send({ token: 'from-body' })
    expect(res.status).toBe(200)
    expect(acceptInviteMock).toHaveBeenCalledWith({ token: 'from-body', userId: 33 })
})

it('cobre ramo body nullish: força req.body = undefined e cai no fallback "" (400)', async () => {
    const app = express()
    app.use((req: Request & { user?: { id: number } }, _res, next) => { req.user = { id: 44 }; next() })
    app.use((req, _res, next) => { (req as any).body = undefined; next() })

    const acceptHandler: RequestHandler = (req, res, next) => {
        acceptInviteController(req as any, res, next).catch(next)
    }
    app.post('/invites/accept', acceptHandler)
    const eh2: ErrorRequestHandler = (err, _req, res, _next) => {
        res.status(500).json({ error: 'unhandled', message: err?.message || 'error' })
    }
    app.use(eh2)
    const res = await request(app).post('/invites/accept') // sem body
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
})

it('params escolhido pelo ?? mas não-string → typeof !== "string" e retorna 400', async () => {
  const app = express()
  app.use(express.json())

  // autentica
  app.use((req: Request & { user?: { id: number } }, _res: Response, next: NextFunction) => {
    req.user = { id: 55 }; next()
  })

  // handler que SOBRESCREVE req.params.token para número logo antes do controller
  const handler: RequestHandler = (req, res, next) => {
    ;(req as any).params.token = 12345  // não-string
    acceptInviteController(req as any, res, next).catch(next)
  }
  app.post('/invites/:token/accept', handler)

  const eh: ErrorRequestHandler = (err, _req, res, _next) => {
    res.status(500).json({ error: 'unhandled', message: err?.message || 'error' })
  }
  app.use(eh)

  const res = await request(app)
    .post('/invites/foo/accept')      // valor da rota será sobrescrito no handler
    .send({ token: 'body-will-be-ignored' })

  expect(res.status).toBe(400)
  expect(res.body).toMatchObject({ message: 'Token inválido' })
  expect(acceptInviteMock).not.toHaveBeenCalled()
})

it('params definido porém token === null → cai no body pelo ?? (linha 21)', async () => {
  const app = express()
  app.use(express.json())

  // autentica
  app.use((req: Request & { user?: { id: number } }, _res, next: NextFunction) => {
    req.user = { id: 66 }; next()
  })

  // sobrescreve req.params.token para NULL imediatamente antes do controller
  const handler: RequestHandler = (req, res, next) => {
    ;(req as any).params.token = null  // <-- caso que faltava
    acceptInviteController(req as any, res, next).catch(next)
  }
  app.post('/invites/:token/accept', handler)

  const eh: ErrorRequestHandler = (err, _req, res, _next) => {
    res.status(500).json({ error: 'unhandled', message: err?.message || 'error' })
  }
  app.use(eh)

  acceptInviteMock.mockResolvedValue({
    id: 11,
    projectId: 2,
    email: 'ok@x.com',
    role: 'TESTER',
    status: 'ACCEPTED',
    invitedById: 1,
    acceptedAt: new Date(),
    declinedAt: null,
    expiresAt: new Date(Date.now() + 864e5),
    createdAt: new Date(),
  } as any)

  // body fornece o token válido; params.token é null
  const res = await request(app)
    .post('/invites/xxx/accept')
    .send({ token: 'from-body' })

  expect(res.status).toBe(200)
  expect(acceptInviteMock).toHaveBeenCalledWith({ token: 'from-body', userId: 66 })
})

it('cobre ramo params undefined: usa token do body quando params não existe', async () => {
  const app = makeApp(setAuth(66))
  acceptInviteMock.mockResolvedValue({
    id: 1,
    projectId: 2,
    email: 'test@example.com',
    role: 'TESTER',
    status: 'ACCEPTED',
    invitedById: 3,
    acceptedAt: new Date(),
    declinedAt: null,
    expiresAt: new Date(),
    createdAt: new Date(),
  } as any)

  // Usar rota que não tem params (só body)
  const res = await request(app)
    .post('/invites/accept')
    .send({ token: 'from-body-only' })

  expect(res.status).toBe(200)
  expect(acceptInviteMock).toHaveBeenCalledWith({ token: 'from-body-only', userId: 66 })
})

it('cobre ramo params undefined: usa token do body quando params não existe', async () => {
  const app = makeApp(setAuth(66))
  acceptInviteMock.mockResolvedValue({
    id: 1,
    projectId: 2,
    email: 'test@example.com',
    role: 'TESTER',
    status: 'ACCEPTED',
    invitedById: 3,
    acceptedAt: new Date(),
    declinedAt: null,
    expiresAt: new Date(),
    createdAt: new Date(),
  } as any)

  // Usar rota que não tem params (só body)
  const res = await request(app)
    .post('/invites/accept')
    .send({ token: 'from-body-only' })

  expect(res.status).toBe(200)
  expect(acceptInviteMock).toHaveBeenCalledWith({ token: 'from-body-only', userId: 66 })
})