// src/tests/integration/user/updateUser.controller.spec.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import type { Request, Response } from 'express'
import { AppError } from '../../../utils/AppError'

// Mocka EXATAMENTE o caminho usado pelo controller
jest.mock('../../../application/use-cases/user/updateUser.use-case', () => ({
  updateUser: jest.fn(),
}))

import { updateUser } from '../../../application/use-cases/user/updateUser.use-case'
import { updateUserController } from '../../../controllers/user/updateUser.controller'

const mockedUpdateUser = updateUser as jest.MockedFunction<typeof updateUser>

const makeRes = () => {
  const res: Partial<Response> = {}
  ;(res as any).status = jest.fn().mockReturnValue(res)
  ;(res as any).json = jest.fn().mockReturnValue(res)
  return res as Response & { status: jest.Mock; json: jest.Mock }
}

describe('updateUserController (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('200 quando sucesso; chama o use-case com id + payload e retorna o usuário atualizado', async () => {
    const req = {
      params: { id: '42' },
      body: { name: 'Alice', email: 'alice@example.com', password: 'Secret#1' },
    } as unknown as Request
    const res = makeRes()

    const now = new Date()
    const updated = {
      id: 42,
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: now,
      updatedAt: now,
    }

    mockedUpdateUser.mockResolvedValueOnce(updated as any)

    await updateUserController(req, res)

    expect(mockedUpdateUser).toHaveBeenCalledWith('42', {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'Secret#1',
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(updated)
  })

  it('propaga statusCode do AppError (ex.: 404 usuário não encontrado)', async () => {
    const req = {
      params: { id: '99' },
      body: { name: 'Zoe' },
    } as unknown as Request
    const res = makeRes()

    mockedUpdateUser.mockRejectedValueOnce(
      new AppError('Usuário não encontrado', 404),
    )

    await updateUserController(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuário não encontrado' })
  })

  it('400 quando erro genérico (Error) é lançado pelo use-case', async () => {
    const req = {
      params: { id: '10' },
      body: { email: 'invalid' },
    } as unknown as Request
    const res = makeRes()

    mockedUpdateUser.mockRejectedValueOnce(new Error('falha inesperada'))

    await updateUserController(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'falha inesperada' })
  })

  it('400 quando erro não-Error (ex.: string) retorna mensagem padrão "Erro desconhecido"', async () => {
    const req = {
      params: { id: '7' },
      body: { name: 'Bob' },
    } as unknown as Request
    const res = makeRes()

    mockedUpdateUser.mockRejectedValueOnce('PANIC!')

    await updateUserController(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro desconhecido' })
  })
})
