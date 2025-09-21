// Teste específico para cobrir o branch faltante do acceptInvite.controller.ts linha 19
import 'dotenv/config'
import express, { Request, Response, NextFunction, RequestHandler } from 'express'
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

describe('acceptInvite.controller - branch faltante linha 19', () => {
  it('cobre ramo específico: req.params undefined e req.body undefined', async () => {
    const app = makeApp(setAuth(66))

    // Usar rota que não tem params e não enviar body
    const res = await request(app)
      .post('/invites/accept')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: req.params.token null e req.body.token null', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token null
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: null })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: req.params.token undefined e req.body.token undefined', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body vazio
    const res = await request(app)
      .post('/invites/accept')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: req.params.token null e req.body.token null', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token null
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: null })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: req.params.token null e req.body.token undefined', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body vazio
    const res = await request(app)
      .post('/invites/accept')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: req.params.token undefined e req.body.token null', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token null
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: null })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: req.params.token null e req.body.token null', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token null
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: null })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: req.params.token undefined e req.body.token undefined', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body vazio
    const res = await request(app)
      .post('/invites/accept')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: req.params.token null e req.body.token undefined', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body vazio
    const res = await request(app)
      .post('/invites/accept')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: tokenRaw não é string (linha 20)', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token como número
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: 123 })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: tokenRaw é objeto (linha 20)', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token como objeto
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: { value: 'test' } })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: tokenRaw é array (linha 20)', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token como array
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: ['test'] })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: tokenRaw é boolean (linha 20)', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token como boolean
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: true })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: tokenRaw é undefined (linha 20)', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token como undefined
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: undefined })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: tokenRaw é null (linha 20)', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token como null
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: null })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: tokenRaw é string vazia (linha 20)', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token como string vazia
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: '' })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: tokenRaw é string com espaços (linha 20)', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token como string com espaços
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: '   ' })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: tokenRaw é string válida (linha 20)', async () => {
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

    // Enviar body com token como string válida
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: 'valid-token' })

    expect(res.status).toBe(200)
    expect(acceptInviteMock).toHaveBeenCalledWith({ token: 'valid-token', userId: 66 })
  })

  it('cobre ramo específico: tokenRaw é string com espaços válida (linha 20)', async () => {
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

    // Enviar body com token como string com espaços válida
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: '  valid-token  ' })

    expect(res.status).toBe(200)
    expect(acceptInviteMock).toHaveBeenCalledWith({ token: 'valid-token', userId: 66 })
  })

  it('cobre ramo específico: tokenRaw é string vazia após trim (linha 20)', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token como string vazia
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: '' })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: tokenRaw é string com espaços após trim (linha 20)', async () => {
    const app = makeApp(setAuth(66))

    // Enviar body com token como string com espaços
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: '   ' })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Token inválido' })
    expect(acceptInviteMock).not.toHaveBeenCalled()
  })

  it('cobre ramo específico: tokenRaw é string válida após trim (linha 20)', async () => {
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

    // Enviar body com token como string válida
    const res = await request(app)
      .post('/invites/accept')
      .send({ token: 'valid-token' })

    expect(res.status).toBe(200)
    expect(acceptInviteMock).toHaveBeenCalledWith({ token: 'valid-token', userId: 66 })
  })
})
