// src/tests/controllers/user/auth.controller.spec.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import type { Request, Response } from 'express'
import { AppError } from '../../../utils/AppError'

// mocks dos use-cases
jest.mock('../../../application/use-cases/user/loginUser.use-case', () => ({
  loginUser: jest.fn(),
}))
jest.mock('../../../application/use-cases/user/createUser.use-case', () => ({
  createUser: jest.fn(),
}))

import { loginUser } from '../../../application/use-cases/user/loginUser.use-case'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import {
  loginUserController,
  registerUserController,
} from '../../../controllers/user/loginUser.controller' // ajuste o path se necessário

const mockedLoginUser = loginUser as jest.MockedFunction<typeof loginUser>
const mockedCreateUser = createUser as jest.MockedFunction<typeof createUser>

const makeRes = () => {
  const res: Partial<Response> = {}
  ;(res as any).status = jest.fn().mockReturnValue(res)
  ;(res as any).json = jest.fn().mockReturnValue(res)
  return res as Response & { status: jest.Mock; json: jest.Mock }
}

describe('loginUserController (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('200 quando sucesso; retorna o resultado do use-case', async () => {
    const req = { body: { email: 'user@example.com', password: 'secret123' } } as unknown as Request
    const res = makeRes()

    const now = new Date()
    const result = {
      token: 'jwt-token',
      user: {
        id: 1,
        email: 'user@example.com',
        name: 'User Example',
        createdAt: now,
        updatedAt: now,
      },
    }

    mockedLoginUser.mockResolvedValueOnce(result as any)

    await loginUserController(req, res)

    expect(mockedLoginUser).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(result)
  })

  it('401 quando erro genérico (Error) é lançado pelo use-case', async () => {
    const req = { body: { email: 'user@example.com', password: 'wrong' } } as unknown as Request
    const res = makeRes()

    mockedLoginUser.mockRejectedValueOnce(new Error('falha inesperada'))

    await loginUserController(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'falha inesperada' })
  })

  it('propaga statusCode do AppError (ex.: 400 inválido/malformado)', async () => {
    const req = { body: { email: '', password: '' } } as unknown as Request
    const res = makeRes()

    mockedLoginUser.mockRejectedValueOnce(new AppError('email e senha são obrigatórios', 400))

    await loginUserController(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'email e senha são obrigatórios' })
  })

  it('propaga statusCode do AppError (ex.: 401 credenciais inválidas)', async () => {
    const req = { body: { email: 'user@example.com', password: 'bad' } } as unknown as Request
    const res = makeRes()

    mockedLoginUser.mockRejectedValueOnce(new AppError('Credenciais inválidas', 401))

    await loginUserController(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Credenciais inválidas' })
  })

  it('ramo de erro não-Error (ex.: string) usa String(err)', async () => {
    const req = { body: { email: 'user@example.com', password: 'bad' } } as unknown as Request
    const res = makeRes()

    // cobre: `const errorMessage = err instanceof Error ? err.message : String(err)`
    mockedLoginUser.mockRejectedValueOnce('PANIC!') // não é Error

    await loginUserController(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'PANIC!' })
  })
})

describe('registerUserController (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('201 quando sucesso; retorna o usuário criado', async () => {
    const req = {
      body: { name: 'Alice', email: 'alice@example.com', password: 'secret123' },
    } as unknown as Request
    const res = makeRes()

    const now = new Date()
    const created = {
      id: 10,
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: now,
      updatedAt: now,
    }
    mockedCreateUser.mockResolvedValueOnce(created as any)

    await registerUserController(req, res)

    expect(mockedCreateUser).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(created)
  })

  it('400 quando AppError com status 400 é lançado (ex.: e-mail duplicado)', async () => {
    const req = {
      body: { name: 'Bob', email: 'bob@example.com', password: 'pass' },
    } as unknown as Request
    const res = makeRes()

    mockedCreateUser.mockRejectedValueOnce(new AppError('Email já cadastrado', 400))

    await registerUserController(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Email já cadastrado' })
  })

  it('400 para erro genérico (Error)', async () => {
    const req = {
      body: { name: 'Carol', email: 'carol@example.com', password: 'x' },
    } as unknown as Request
    const res = makeRes()

    mockedCreateUser.mockRejectedValueOnce(new Error('falha geral'))

    await registerUserController(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'falha geral' })
  })

  it('400 para erro não-Error (string) exerce String(err)', async () => {
    const req = {
      body: { name: 'Dan', email: 'dan@example.com', password: 'x' },
    } as unknown as Request
    const res = makeRes()

    mockedCreateUser.mockRejectedValueOnce('BOOM!') // não é Error

    await registerUserController(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'BOOM!' })
  })
})
