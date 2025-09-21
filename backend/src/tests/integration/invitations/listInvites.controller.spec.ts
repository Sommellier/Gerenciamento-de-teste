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
import { listInvitesController } from '../../../controllers/invitations/listInvites.controller'
import { AppError } from '../../../utils/AppError'

// mock do use-case
jest.mock('../../../application/use-cases/invitations/listInvites.use-case', () => ({
  listInvites: jest.fn(),
}))
import { listInvites } from '../../../application/use-cases/invitations/listInvites.use-case'

// tipa o mock
type ListArgs = {
  projectId: number
  requesterId: number
  status?: Array<'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'>
  q?: string
  page?: number
  pageSize?: number
  orderBy?: 'createdAt' | 'expiresAt' | 'status'
  sort?: 'asc' | 'desc'
}
const listInvitesMock = listInvites as unknown as jest.MockedFunction<
  (args: ListArgs) => Promise<any>
>

// helper para montar app
function makeApp(setUser?: (req: Request, _res: Response, next: NextFunction) => void) {
  const app = express()
  app.use(express.json())
  if (setUser) app.use(setUser)

  const handler: RequestHandler = (req, res, next) => {
    listInvitesController(req as any, res, next).catch(next)
  }
  app.get('/projects/:projectId/invites', handler)

  const eh: ErrorRequestHandler = (err, _req, res, _next) => {
    res.status(500).json({ error: 'unhandled', message: err?.message || 'error' })
  }
  app.use(eh)
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

describe('listInvites.controller', () => {
  it('401 quando não autenticado', async () => {
    const app = makeApp() // sem auth
    const res = await request(app).get('/projects/7/invites')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: 'Não autenticado' })
    expect(listInvitesMock).not.toHaveBeenCalled()
  })

  it('200 sucesso com todos os filtros válidos (status via string com vírgula)', async () => {
    const app = makeApp(setAuth(10))
    const fake = {
      items: [],
      total: 0,
      page: 2,
      pageSize: 50,
      hasNextPage: false,
    }
    listInvitesMock.mockResolvedValue(fake as any)

    const res = await request(app)
      .get('/projects/7/invites')
      .query({
        status: 'PENDING,ACCEPTED',
        q: 'tester@',
        page: '2',
        pageSize: '50',
        orderBy: 'expiresAt',
        sort: 'asc',
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual(fake)
    expect(listInvitesMock).toHaveBeenCalledTimes(1)
    const arg = listInvitesMock.mock.calls[0][0]
    expect(arg).toEqual({
      projectId: 7,
      requesterId: 10,
      status: ['PENDING', 'ACCEPTED'],
      q: 'tester@',
      page: 2,
      pageSize: 50,
      orderBy: 'expiresAt',
      sort: 'asc',
    })
  })

  it('status como array (?status=PENDING&status=DECLINED) é aceito e normalizado', async () => {
    const app = makeApp(setAuth(33))
    listInvitesMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNextPage: false })

    const res = await request(app)
      .get('/projects/1/invites')
      .query({ status: ['PENDING', 'DECLINED'] }) // supertest envia como repetido

    expect(res.status).toBe(200)
    const arg = listInvitesMock.mock.calls[0][0]
    expect(arg.status).toEqual(['PENDING', 'DECLINED'])
  })

  it('status inválido é ignorado → undefined (', async () => {
    const app = makeApp(setAuth(22))
    listInvitesMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNextPage: false })

    await request(app).get('/projects/2/invites').query({ status: 'FOO,BAR' })
    const arg1 = listInvitesMock.mock.calls[0][0]
    expect(arg1.status).toBeUndefined()

    await request(app).get('/projects/2/invites').query({ status: '' })
    const arg2 = listInvitesMock.mock.calls[1][0]
    expect(arg2.status).toBeUndefined()
  })

  it('status mistura válidos e inválidos → mantém apenas os válidos', async () => {
    const app = makeApp(setAuth(77))
    listInvitesMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNextPage: false })

    await request(app).get('/projects/8/invites').query({ status: ['NOPE', 'PENDING', 'XYZ'] })
    const arg = listInvitesMock.mock.calls[0][0]
    expect(arg.status).toEqual(['PENDING'])
  })

  it('q não-string (ex.: ?q=a&q=b) é ignorado (undefined)', async () => {
    const app = makeApp(setAuth(9))
    listInvitesMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNextPage: false })

    await request(app).get('/projects/5/invites').query({ q: ['a', 'b'] })
    const arg = listInvitesMock.mock.calls[0][0]
    expect(arg.q).toBeUndefined()
  })

  it('orderBy inválido e sort inválido viram undefined; page/pageSize parseados como number', async () => {
    const app = makeApp(setAuth(9))
    listInvitesMock.mockResolvedValue({ items: [], total: 0, page: 3, pageSize: 10, hasNextPage: true })

    await request(app)
      .get('/projects/12/invites')
      .query({ orderBy: 'name', sort: 'up', page: '3', pageSize: '10' })

    const arg = listInvitesMock.mock.calls[0][0]
    expect(arg.orderBy).toBeUndefined()
    expect(arg.sort).toBeUndefined()
    expect(arg.page).toBe(3)
    expect(arg.pageSize).toBe(10)
  })

  it('propaga 404/403/400 do use-case (AppError)', async () => {
    const app = makeApp(setAuth(5))

    listInvitesMock.mockRejectedValueOnce(new AppError('Projeto não encontrado', 404) as any)
    let res = await request(app).get('/projects/999/invites')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Projeto não encontrado' })

    listInvitesMock.mockRejectedValueOnce(new AppError('Acesso negado ao projeto', 403) as any)
    res = await request(app).get('/projects/1/invites')
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ message: 'Acesso negado ao projeto' })

    listInvitesMock.mockRejectedValueOnce(new AppError('projectId inválido', 400) as any)
    res = await request(app).get('/projects/abc/invites') // projectId vira NaN
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'projectId inválido' })

    // garante que passamos NaN ao use-case nesse último caso
    const lastArgs = listInvitesMock.mock.calls[listInvitesMock.mock.calls.length - 1][0]
    expect(Number.isNaN(lastArgs.projectId)).toBe(true)
  })

  it('erros não mapeados vão para o error handler (500)', async () => {
    const app = makeApp(setAuth(3))
    listInvitesMock.mockRejectedValue(new Error('boom') as any)

    const res = await request(app).get('/projects/4/invites')
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({ error: 'unhandled', message: 'boom' })
  })

  it('aceita sort=desc', async () => {
    const app = makeApp(setAuth(10))
    listInvitesMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, hasNextPage: false })

    const res = await request(app)
      .get('/projects/7/invites')
      .query({ sort: 'desc' })

    expect(res.status).toBe(200)
    expect(listInvitesMock).toHaveBeenCalledTimes(1)
    const arg = listInvitesMock.mock.calls[0][0]
    expect(arg.sort).toBe('desc')
  })
})
