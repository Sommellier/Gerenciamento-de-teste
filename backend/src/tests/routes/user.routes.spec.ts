// src/tests/routes/user.routes.spec.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import express from 'express'
import request from 'supertest'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'

// ── Mocks dos controllers (use os MESMOS caminhos do router!) ───────────────
jest.mock('../../controllers/user/createUser.controller', () => ({
  registerUserController: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(201).json({ ok: true, route: 'register', body: req.body })
  }),
}))
jest.mock('../../controllers/user/loginUser.controller', () => ({
  loginUserController: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'login', body: req.body })
  }),
}))
jest.mock('../../controllers/user/deleteUser.controller', () => ({
  deleteUserController: jest.fn(async (_req: ExpressRequest, res: ExpressResponse) => {
    return res.status(204).end()
  }),
}))
jest.mock('../../controllers/user/updateUser.controller', () => ({
  updateUserController: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'update', id: req.params.id, body: req.body })
  }),
}))
jest.mock('../../controllers/user/requestPasswordReset.controller', () => ({
  forgotPasswordController: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'forgot', email: req.body?.email })
  }),
}))
jest.mock('../../controllers/user/resetPassword.controller', () => ({
  resetPasswordController: jest.fn(async (_req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'reset' })
  }),
}))

// importa o router alvo
import userRouter from '../../routes/user.routes'

// Helpers para acessar os mocks e fazer asserts precisos
import { registerUserController } from '../../controllers/user/createUser.controller'
import { loginUserController } from '../../controllers/user/loginUser.controller'
import { deleteUserController } from '../../controllers/user/deleteUser.controller'
import { updateUserController } from '../../controllers/user/updateUser.controller'
import { forgotPasswordController } from '../../controllers/user/requestPasswordReset.controller'
import { resetPasswordController } from '../../controllers/user/resetPassword.controller'

describe('user.routes', () => {
  let app: express.Express

  beforeEach(() => {
    jest.clearAllMocks()
    app = express()
    app.use(express.json())

    // monta só o router de user
    app.use(userRouter)

    // error handler para capturar next(err) do router
    app.use(
      (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        const status = Number.isFinite(err?.status) ? err.status : 500
        res.status(status).json({ message: err?.message || 'Internal error' })
      },
    )
  })

  it('POST /register → chama registerUserController e responde 201', async () => {
    const res = await request(app).post('/register').send({ name: 'Alice', email: 'a@x.com', password: 'Secret#1' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({
      ok: true,
      route: 'register',
      body: { name: 'Alice', email: 'a@x.com', password: 'Secret#1' },
    })
    expect(registerUserController).toHaveBeenCalledTimes(1)
  })

  it('POST /login → chama loginUserController e responde 200', async () => {
    const res = await request(app).post('/login').send({ email: 'a@x.com', password: 'Secret#1' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      ok: true,
      route: 'login',
      body: { email: 'a@x.com', password: 'Secret#1' },
    })
    expect(loginUserController).toHaveBeenCalledTimes(1)
  })

  it('PUT /users/:id → chama updateUserController e responde 200', async () => {
    const res = await request(app).put('/users/42').send({ name: 'Novo Nome' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      ok: true,
      route: 'update',
      id: '42',
      body: { name: 'Novo Nome' },
    })
    expect(updateUserController).toHaveBeenCalledTimes(1)
  })

  it('DELETE /users/:id → chama deleteUserController e responde 204', async () => {
    const res = await request(app).delete('/users/99')
    expect(res.status).toBe(204)
    expect(res.text).toBe('')
    expect(deleteUserController).toHaveBeenCalledTimes(1)
  })

  it('POST /request-password-reset → chama forgotPasswordController e responde 200', async () => {
    const res = await request(app).post('/request-password-reset').send({ email: 'user@example.com' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, route: 'forgot', email: 'user@example.com' })
    expect(forgotPasswordController).toHaveBeenCalledTimes(1)
  })

  it('POST /reset-password → chama resetPasswordController e responde 200', async () => {
    const res = await request(app).post('/reset-password').send({ token: 't', newPassword: 'Nova#1' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, route: 'reset' })
    expect(resetPasswordController).toHaveBeenCalledTimes(1)
  })

  it('propaga erro pelo next (Promise.reject) → errorHandler retorna 500 por padrão', async () => {
    ;(loginUserController as jest.Mock).mockImplementationOnce(async () => {
      const err: any = new Error('boom')
      throw err
    })

    const res = await request(app).post('/login').send({ email: 'x@y.com', password: '123' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'boom' })
  })

  it('propaga erro com status customizado (ex.: 418)', async () => {
    ;(registerUserController as jest.Mock).mockImplementationOnce(async () => {
      const err: any = new Error('teapot')
      err.status = 418
      throw err
    })

    const res = await request(app).post('/register').send({})

    expect(res.status).toBe(418)
    expect(res.body).toEqual({ message: 'teapot' })
  })
})
