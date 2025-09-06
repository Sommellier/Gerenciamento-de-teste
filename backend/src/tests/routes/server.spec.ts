import { describe, it, expect, jest } from '@jest/globals'
import request from 'supertest'

const helmetMock = jest.fn(() => (_req: any, _res: any, next: any) => next())
jest.mock('helmet', () => ({ __esModule: true, default: helmetMock }))

const corsMock = jest.fn(() => (_req: any, res: any, next: any) => {
    res.set('access-control-allow-origin', '*')
    next()
})
jest.mock('cors', () => ({ __esModule: true, default: corsMock }))

const morganMock = jest.fn(() => (_req: any, _res: any, next: any) => next())
jest.mock('morgan', () => ({ __esModule: true, default: morganMock }))

jest.mock('../../routes/user.routes', () => {
    const express = require('express')
    const r = express.Router()
    r.get('/__health', (_req: any, res: any) => res.status(200).json({ ok: true }))
    r.post('/__echo', (req: any, res: any) => res.status(200).json({ ok: true, echo: req.body }))
    r.get('/__err', (_req: any, _res: any, next: any) => next(new Error('boom')))

    r.get('/__err418', (_req: any, _res: any, next: any) => {
        const err: any = new Error('teapot')
        err.statusCode = 418
        next(err)
    })
    r.get('/__errNoMsg', (_req: any, _res: any, next: any) => {
        next({ statusCode: 503 })
    })

    return { __esModule: true, default: r }
})

import app from '../../server'

describe('server.ts (Express app)', () => {
    it('monta /api (GET /api/__health) e adiciona header de CORS', async () => {
        const res = await request(app).get('/api/__health')
        expect(res.status).toBe(200)
        expect(res.body).toEqual({ ok: true })
        expect(res.headers['access-control-allow-origin']).toBe('*')
    })

    it('faz parse de JSON (POST /api/__echo)', async () => {
        const payload = { a: 1, b: 'x' }
        const res = await request(app).post('/api/__echo').send(payload)
        expect(res.status).toBe(200)
        expect(res.body).toEqual({ ok: true, echo: payload })
    })

    it('retorna 404 para rota inexistente', async () => {
        const res = await request(app).get('/nao-existe')
        expect(res.status).toBe(404)
    })

    it('error handler: converte erro em { error } com status 500 e loga no console', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => { })
        const res = await request(app).get('/api/__err')
        expect(res.status).toBe(500)
        expect(res.body).toEqual({ error: 'boom' })
        expect(spy).toHaveBeenCalled() // morgan/helmet não interferem
        spy.mockRestore()
    })

    it('registra middlewares helmet/cors/morgan na inicialização', () => {
        // como o app já foi importado, apenas verificamos as chamadas
        expect(helmetMock).toHaveBeenCalledTimes(1)
        expect(corsMock).toHaveBeenCalledTimes(1)
        expect(morganMock).toHaveBeenCalledWith('dev')
    })

    it('error handler usa err.statusCode quando presente (ex.: 418)', async () => {
        const res = await request(app).get('/api/__err418')
        expect(res.status).toBe(418)
        expect(res.body).toEqual({ error: 'teapot' })
    })

    it('error handler usa mensagem padrão quando err.message está ausente', async () => {
        const res = await request(app).get('/api/__errNoMsg')
        expect(res.status).toBe(503)
        expect(res.body).toEqual({ error: 'Internal Server Error' })
    })
})
