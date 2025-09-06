import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import express from 'express'
import request from 'supertest'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'

// Mocks dos controllers
jest.mock('../../controllers/project/createProject.controller', () => ({
  createProjectController: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(201).json({ ok: true, route: 'create', body: req.body })
  }),
}))
jest.mock('../../controllers/project/listProjects.controller', () => ({
  listProjects: jest.fn(async (_req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'list' })
  }),
}))
jest.mock('../../controllers/project/getProjectById.controller', () => ({
  getProjectByIdController: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'getById', id: req.params.id })
  }),
}))
jest.mock('../../controllers/project/updateProject.controller', () => ({
  updateProjectController: jest.fn(async (req: ExpressRequest, res: ExpressResponse) => {
    return res.status(200).json({ ok: true, route: 'update', id: req.params.id, body: req.body })
  }),
}))
jest.mock('../../controllers/project/deleteProject.controller', () => ({
  deleteProjectController: jest.fn(async (_req: ExpressRequest, res: ExpressResponse) => {
    return res.status(204).end()
  }),
}))

import projectRouter from '../../routes/project.routes'

// Helpers para acessar as funções mockadas
import { createProjectController } from '../../controllers/project/createProject.controller'
import { listProjects } from '../../controllers/project/listProjects.controller'
import { getProjectByIdController } from '../../controllers/project/getProjectById.controller'
import { updateProjectController } from '../../controllers/project/updateProject.controller'
import { deleteProjectController } from '../../controllers/project/deleteProject.controller'

describe('project.routes', () => {
  let app: express.Express

  beforeEach(() => {
    jest.clearAllMocks()
    app = express()
    app.use(express.json())

    app.use(projectRouter)

    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status = Number.isFinite(err?.status) ? err.status : 500
      res.status(status).json({ message: err?.message || 'Internal error' })
    })
  })

  it('POST /projects → chama createProjectController e responde 201', async () => {
    const res = await request(app)
      .post('/projects')
      .send({ name: 'Proj 1', description: 'desc' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true, route: 'create', body: { name: 'Proj 1', description: 'desc' } })
    expect(createProjectController).toHaveBeenCalledTimes(1)
  })

  it('GET /projects → chama listProjects e responde 200', async () => {
    const res = await request(app).get('/projects')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, route: 'list' })
    expect(listProjects).toHaveBeenCalledTimes(1)
  })

  it('GET /projects/:id → chama getProjectByIdController com o param id e responde 200', async () => {
    const res = await request(app).get('/projects/123')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, route: 'getById', id: '123' })
    expect(getProjectByIdController).toHaveBeenCalledTimes(1)
  })

  it('PUT /projects/:id → chama updateProjectController e responde 200', async () => {
    const res = await request(app)
      .put('/projects/55')
      .send({ name: 'Novo nome' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, route: 'update', id: '55', body: { name: 'Novo nome' } })
    expect(updateProjectController).toHaveBeenCalledTimes(1)
  })

  it('DELETE /projects/:id → chama deleteProjectController e responde 204', async () => {
    const res = await request(app).delete('/projects/77')
    expect(res.status).toBe(204)
    expect(res.text).toBe('')
    expect(deleteProjectController).toHaveBeenCalledTimes(1)
  })

  it('asyncH: se o controller rejeitar, cai no error handler com 500 por padrão', async () => {
    ;(getProjectByIdController as jest.Mock).mockImplementationOnce(async () => {
      const err: any = new Error('boom')
      // opcional: err.status = 418 para testar status customizado
      throw err
    })

    const res = await request(app).get('/projects/999')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'boom' })
  })
})


