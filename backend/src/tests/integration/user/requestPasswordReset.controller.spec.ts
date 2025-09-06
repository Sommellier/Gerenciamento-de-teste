// src/tests/integration/user/requestPasswordReset.controller.spec.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import type { Request, Response } from 'express'
import { AppError } from '../../../utils/AppError'

jest.mock('../../../application/use-cases/user/requestPasswordReset.use-case', () => ({
  requestPasswordReset: jest.fn(),
}))

import { requestPasswordReset } from '../../../application/use-cases/user/requestPasswordReset.use-case'
import { forgotPasswordController } from '../../../controllers/user/requestPasswordReset.controller'

const mockedRequestPasswordReset =
  requestPasswordReset as jest.MockedFunction<typeof requestPasswordReset>

const makeRes = () => {
  const res: Partial<Response> = {}
  ;(res as any).status = jest.fn().mockReturnValue(res)
  ;(res as any).json = jest.fn().mockReturnValue(res)
  return res as Response & { status: jest.Mock; json: jest.Mock }
}

describe('requestPasswordController (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('200 quando sucesso; chama o use-case com o e-mail e retorna mensagem', async () => {
    const req = { body: { email: 'user@example.com' } } as unknown as Request
    const res = makeRes()

    mockedRequestPasswordReset.mockResolvedValueOnce(undefined as any)

    await forgotPasswordController(req, res)

    expect(mockedRequestPasswordReset).toHaveBeenCalledWith('user@example.com')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      message: 'E-mail de recuperação enviado com sucesso',
    })
  })

  it('propaga statusCode do AppError (ex.: 404 usuário não encontrado)', async () => {
    const req = { body: { email: 'missing@example.com' } } as unknown as Request
    const res = makeRes()

    mockedRequestPasswordReset.mockRejectedValueOnce(
      new AppError('Usuário não encontrado', 404),
    )

    await forgotPasswordController(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuário não encontrado' })
  })

  it('propaga statusCode do AppError (ex.: 429 muitas tentativas)', async () => {
    const req = { body: { email: 'user@example.com' } } as unknown as Request
    const res = makeRes()

    mockedRequestPasswordReset.mockRejectedValueOnce(
      new AppError('Muitas tentativas, tente mais tarde', 429),
    )

    await forgotPasswordController(req, res)

    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Muitas tentativas, tente mais tarde',
    })
  })

  it('400 quando erro genérico (Error) é lançado pelo use-case', async () => {
    const req = { body: { email: 'user@example.com' } } as unknown as Request
    const res = makeRes()

    mockedRequestPasswordReset.mockRejectedValueOnce(new Error('falha inesperada'))

    await forgotPasswordController(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'falha inesperada' })
  })

  it('400 quando erro não-Error (ex.: string) retorna mensagem padrão "Erro desconhecido"', async () => {
    const req = { body: { email: 'user@example.com' } } as unknown as Request
    const res = makeRes()

    mockedRequestPasswordReset.mockRejectedValueOnce('PANIC!')

    await forgotPasswordController(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro desconhecido' })
  })
})
