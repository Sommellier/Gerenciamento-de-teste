import 'dotenv/config'
import express from 'express'
import request from 'supertest'
import { prisma } from '../../../infrastructure/prisma'
import * as usecase from '../../../application/use-cases/user/deleteUser.use-case'
import { deleteUserController } from '../../../controllers/user/deleteUser.controller'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

let app: express.Express

beforeAll(() => {
  app = express()
  app.use(express.json())

  app.delete('/users/:id', async (req, res) => {
    await deleteUserController(req, res)
  })
})

beforeEach(async () => {
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany(),
    prisma.execution.deleteMany(),
    prisma.userOnProject.deleteMany(),
    prisma.testCase.deleteMany(),
    prisma.project.deleteMany(),
    prisma.user.deleteMany(),
  ])
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('DELETE /users/:id (deleteUserController)', () => {
  it('204 quando usuário existe e é deletado', async () => {
    const u = await prisma.user.create({
      data: {
        name: 'User Del',
        email: `${unique('del')}@example.com`,
        password: 'hash_aqui',
      },
      select: { id: true },
    })

    const res = await request(app).delete(`/users/${u.id}`).send()
    expect(res.status).toBe(204)

    const db = await prisma.user.findUnique({ where: { id: u.id } })
    expect(db).toBeNull()
  })

  it('404 quando usuário não existe', async () => {
    const res = await request(app).delete(`/users/99999999`).send()
    expect(res.status).toBe(404)
    expect(String(res.body?.error || '')).toMatch(/not found/i)
  })

  it('400 quando id é inválido (NaN)', async () => {
    const res = await request(app).delete(`/users/abc`).send()
    expect(res.status).toBe(400)
    expect(String(res.body?.error || '')).toMatch(/invalid user id/i)
  })

  it('400 quando use-case rejeita com valor não-Error (cobre String(err))', async () => {
    const spy = jest
      .spyOn(usecase, 'deleteUser')
      .mockRejectedValueOnce('Falha em string')

    const res = await request(app).delete(`/users/1`).send()
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'Falha em string')

    spy.mockRestore()
  })
})