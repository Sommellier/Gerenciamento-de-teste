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
import { listMembersController } from '../../../controllers/members/listMembers.controller'
import { AppError } from '../../../utils/AppError'

// mock do use-case
jest.mock('../../../application/use-cases/members/listMembers.use-case', () => ({
  listMembers: jest.fn(),
}))
import { listMembers } from '../../../application/use-cases/members/listMembers.use-case'

// tipa o mock p/ evitar 'never'
type Role = 'OWNER' | 'MANAGER' | 'TESTER' | 'APPROVER'
type ListArgs = {
  projectId: number
  requesterId: number
  roles?: Role[]
  q?: string
  page?: number
  pageSize?: number
  orderBy?: 'name' | 'email' | 'role'
  sort?: 'asc' | 'desc'
}
const listMembersMock = listMembers as unknown as jest.MockedFunction<
  (args: ListArgs) => Promise<any>
>

// helper para montar app
function makeApp(setUser?: (req: Request, _res: Response, next: NextFunction) => void) {
  const app = express()
  app.use(express.json())
  if (setUser) app.use(setUser)

  const handler: RequestHandler = (req, res, next) => {
    listMembersController(req as any, res, next).catch(next)
  }
  app.get('/projects/:projectId/members', handler)

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

describe('listMembers.controller', () => {
  it('401 quando não autenticado', async () => {
    const app = makeApp() // sem auth
    const res = await request(app).get('/projects/7/members')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: 'Não autenticado' })
    expect(listMembersMock).not.toHaveBeenCalled()
  })

  it('200 sucesso com todos os filtros válidos (roles via string com vírgula)', async () => {
    const app = makeApp(setAuth(10))
    const fake = { items: [], total: 0, page: 2, pageSize: 50, hasNextPage: false }
    listMembersMock.mockResolvedValue(fake as any)

    const res = await request(app)
      .get('/projects/7/members')
      .query({
        roles: 'TESTER,APPROVER',
        q: 'ana',
        page: '2',
        pageSize: '50',
        orderBy: 'email',
        sort: 'asc',
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual(fake)
    expect(listMembersMock).toHaveBeenCalledTimes(1)
    const arg = listMembersMock.mock.calls[0][0]
    expect(arg).toEqual({
      projectId: 7,
      requesterId: 10,
      roles: ['TESTER', 'APPROVER'],
      q: 'ana',
      page: 2,
      pageSize: 50,
      orderBy: 'email',
      sort: 'asc',
    })
  })

  it('roles como array (?roles=TESTER&roles=OWNER) é aceito e normalizado', async () => {
    const app = makeApp(setAuth(33))
    listMembersMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNextPage: false })

    await request(app).get('/projects/1/members').query({ roles: ['TESTER', 'OWNER'] })
    const arg = listMembersMock.mock.calls[0][0]
    expect(arg.roles).toEqual(['TESTER', 'OWNER'])
  })

  it('roles inválidos são ignorados → undefined', async () => {
    const app = makeApp(setAuth(22))
    listMembersMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNextPage: false })

    await request(app).get('/projects/2/members').query({ roles: 'FOO,BAR' })
    const arg1 = listMembersMock.mock.calls[0][0]
    expect(arg1.roles).toBeUndefined()

    await request(app).get('/projects/2/members').query({ roles: '' })
    const arg2 = listMembersMock.mock.calls[1][0]
    expect(arg2.roles).toBeUndefined()
  })

  it('roles mistura válidos e inválidos → mantém apenas os válidos', async () => {
    const app = makeApp(setAuth(77))
    listMembersMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNextPage: false })

    await request(app).get('/projects/8/members').query({ roles: ['NOPE', 'MANAGER', 'XYZ'] })
    const arg = listMembersMock.mock.calls[0][0]
    expect(arg.roles).toEqual(['MANAGER'])
  })

  it('q não-string (ex.: ?q=a&q=b) é ignorado (undefined)', async () => {
    const app = makeApp(setAuth(9))
    listMembersMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNextPage: false })

    await request(app).get('/projects/5/members').query({ q: ['a', 'b'] })
    const arg = listMembersMock.mock.calls[0][0]
    expect(arg.q).toBeUndefined()
  })

  it('orderBy inválido → undefined; sort case-insensitive; valores inválidos → undefined', async () => {
    const app = makeApp(setAuth(9))
    listMembersMock.mockResolvedValue({ items: [], total: 0, page: 3, pageSize: 10, hasNextPage: true })

    // inválidos
    await request(app).get('/projects/12/members').query({ orderBy: 'createdAt', sort: 'up' })
    let arg = listMembersMock.mock.calls[0][0]
    expect(arg.orderBy).toBeUndefined()
    expect(arg.sort).toBeUndefined()

    // sort em caixa alta → normaliza
    await request(app).get('/projects/12/members').query({ orderBy: 'role', sort: 'DESC' })
    arg = listMembersMock.mock.calls[1][0]
    expect(arg.orderBy).toBe('role')
    expect(arg.sort).toBe('desc')

    await request(app).get('/projects/12/members').query({ orderBy: 'name', sort: 'ASC' })
    arg = listMembersMock.mock.calls[2][0]
    expect(arg.orderBy).toBe('name')
    expect(arg.sort).toBe('asc')
  })

  it('page/pageSize são parseados como number', async () => {
    const app = makeApp(setAuth(15))
    listMembersMock.mockResolvedValue({ items: [], total: 0, page: 4, pageSize: 5, hasNextPage: true })

    await request(app).get('/projects/3/members').query({ page: '4', pageSize: '5' })
    const arg = listMembersMock.mock.calls[0][0]
    expect(arg.page).toBe(4)
    expect(arg.pageSize).toBe(5)
  })

  it('propaga 404/403/400 do use-case (AppError) e envia projectId NaN quando rota não-numérica', async () => {
    const app = makeApp(setAuth(5))

    listMembersMock.mockRejectedValueOnce(new AppError('Projeto não encontrado', 404) as any)
    let res = await request(app).get('/projects/999/members')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Projeto não encontrado' })

    listMembersMock.mockRejectedValueOnce(new AppError('Acesso negado ao projeto', 403) as any)
    res = await request(app).get('/projects/1/members')
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ message: 'Acesso negado ao projeto' })

    listMembersMock.mockRejectedValueOnce(new AppError('projectId inválido', 400) as any)
    res = await request(app).get('/projects/abc/members')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'projectId inválido' })

    const lastArgs = listMembersMock.mock.calls[listMembersMock.mock.calls.length - 1][0]
    expect(Number.isNaN(lastArgs.projectId)).toBe(true)
  })

  it('erros não mapeados vão para o error handler (500)', async () => {
    const app = makeApp(setAuth(3))
    listMembersMock.mockRejectedValue(new Error('boom') as any)

    const res = await request(app).get('/projects/4/members')
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({ error: 'unhandled', message: 'boom' })
  })

  it('cobre branch específico: page/pageSize undefined quando não fornecidos', async () => {
    const app = makeApp(setAuth(10))
    listMembersMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNextPage: false })

    const res = await request(app).get('/projects/7/members')

    expect(res.status).toBe(200)
    const arg = listMembersMock.mock.calls[0][0]
    expect(arg.page).toBeUndefined()
    expect(arg.pageSize).toBeUndefined()
  })

  it('cobre branch específico: orderBy undefined quando inválido', async () => {
    const app = makeApp(setAuth(10))
    listMembersMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNextPage: false })

    const res = await request(app)
      .get('/projects/7/members')
      .query({ orderBy: 'invalid' })

    expect(res.status).toBe(200)
    const arg = listMembersMock.mock.calls[0][0]
    expect(arg.orderBy).toBeUndefined()
  })

  it('cobre branch específico: sort undefined quando inválido', async () => {
    const app = makeApp(setAuth(10))
    listMembersMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNextPage: false })

    const res = await request(app)
      .get('/projects/7/members')
      .query({ sort: 'invalid' })

    expect(res.status).toBe(200)
    const arg = listMembersMock.mock.calls[0][0]
    expect(arg.sort).toBeUndefined()
  })

  it('cobre branch específico: q undefined quando não é string', async () => {
    const app = makeApp(setAuth(10))
    listMembersMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNextPage: false })

    const res = await request(app)
      .get('/projects/7/members')
      .query({ q: 123 })

    expect(res.status).toBe(200)
    const arg = listMembersMock.mock.calls[0][0]
    expect(arg.q).toBe('123') // Express converte para string
  })

  it('cobre branch específico: q undefined quando é array', async () => {
    const app = makeApp(setAuth(10))
    listMembersMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNextPage: false })

    const res = await request(app)
      .get('/projects/7/members')
      .query({ q: ['a', 'b'] })

    expect(res.status).toBe(200)
    const arg = listMembersMock.mock.calls[0][0]
    expect(arg.q).toBeUndefined()
  })
})
