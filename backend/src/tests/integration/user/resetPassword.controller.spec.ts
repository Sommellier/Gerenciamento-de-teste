// src/tests/integration/user/resetPassword.controller.spec.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import type { Request, Response } from 'express'
import { AppError } from '../../../utils/AppError'

jest.mock('../../../application/use-cases/user/resetPassword.use-case', () => ({
  resetPassword: jest.fn(),
}))

import { resetPassword } from '../../../application/use-cases/user/resetPassword.use-case'
import { resetPasswordController } from '../../../controllers/user/resetPassword.controller'

const mockedResetPassword =
  resetPassword as jest.MockedFunction<typeof resetPassword>

const makeRes = () => {
  const res: Partial<Response> = {}
  ;(res as any).status = jest.fn().mockReturnValue(res)
  ;(res as any).json = jest.fn().mockReturnValue(res)
  return res as Response & { status: jest.Mock; json: jest.Mock }
}

describe('resetPasswordController (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('200 quando sucesso; chama o use-case com token e nova senha', async () => {
    const req = { body: { token: 'tok123', newPassword: 'NovaSenha#1' } } as unknown as Request
    const res = makeRes()

    mockedResetPassword.mockResolvedValueOnce(undefined as any)

    await resetPasswordController(req, res)

    expect(mockedResetPassword).toHaveBeenCalledWith('tok123', 'NovaSenha#1')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ message: 'Senha redefinida com sucesso' })
  })

  it('propaga statusCode do AppError (ex.: 400 token/senha inválidos)', async () => {
    const req = { body: { token: '', newPassword: '' } } as unknown as Request
    const res = makeRes()

    mockedResetPassword.mockRejectedValueOnce(
      new AppError('Token e nova senha são obrigatórios', 400),
    )

    await resetPasswordController(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token e nova senha são obrigatórios' })
  })

  it('propaga statusCode do AppError (ex.: 410 token expirado)', async () => {
    const req = { body: { token: 'tok', newPassword: 'A@1aaaaaa' } } as unknown as Request
    const res = makeRes()

    mockedResetPassword.mockRejectedValueOnce(new AppError('Token expirado', 410))

    await resetPasswordController(req, res)

    expect(res.status).toHaveBeenCalledWith(410)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expirado' })
  })

  it('400 quando erro genérico (Error) é lançado pelo use-case', async () => {
    const req = { body: { token: 'tok', newPassword: 'A@1aaaaaa' } } as unknown as Request
    const res = makeRes()

    mockedResetPassword.mockRejectedValueOnce(new Error('falha inesperada'))

    await resetPasswordController(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'falha inesperada' })
  })

  it('400 quando erro não-Error (ex.: string) retorna mensagem padrão "Erro desconhecido"', async () => {
    const req = { body: { token: 'tok', newPassword: 'A@1aaaaaa' } } as unknown as Request
    const res = makeRes()

    mockedResetPassword.mockRejectedValueOnce('PANIC!')

    await resetPasswordController(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro desconhecido' })
  })
})
