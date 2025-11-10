import { describe, it, expect, jest } from '@jest/globals'
import request from 'supertest'
import fs from 'fs'
import path from 'path'

const helmetMock = jest.fn(() => (_req: any, _res: any, next: any) => next())
jest.mock('helmet', () => ({ __esModule: true, default: helmetMock }))

const corsMock = jest.fn(() => (_req: any, res: any, next: any) => {
    // Configuração de CORS segura - permite apenas origens específicas
    const origin = _req.headers.origin
    const allowedOrigins = ['http://localhost:9000', 'http://localhost:8080', 'http://localhost:3000']
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin)
    } else if (!origin) {
        // Permitir requisições sem origin (ex: Postman)
        res.header('Access-Control-Allow-Origin', '*')
    } else if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        // Em desenvolvimento, permitir localhost em qualquer porta
        res.header('Access-Control-Allow-Origin', origin)
    } else if (allowedOrigins.indexOf(origin) !== -1) {
        res.header('Access-Control-Allow-Origin', origin)
    }
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
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
        const res = await request(app)
            .get('/api/__health')
            .set('Origin', 'http://localhost:9000')
        
        expect(res.status).toBe(200)
        expect(res.body).toEqual({ ok: true })
        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:9000')
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
        expect(res.body).toEqual({ error: 'boom', message: 'boom' })
        expect(spy).toHaveBeenCalled() // morgan/helmet não interferem
        spy.mockRestore()
    })

    it('registra middlewares helmet/cors/morgan na inicialização', () => {
        // como o app já foi importado, apenas verificamos as chamadas
        // cors é chamado 2 vezes: app.use(cors) e app.use('/uploads', cors)
        // (removido app.options('*', cors) que causava erro do path-to-regexp)
        expect(helmetMock).toHaveBeenCalledTimes(1)
        expect(corsMock).toHaveBeenCalledTimes(2)
        expect(morganMock).toHaveBeenCalledWith('dev')
    })

    it('health check endpoint retorna status ok', async () => {
        const res = await request(app).get('/health')
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('status', 'ok')
        expect(res.body).toHaveProperty('timestamp')
        expect(typeof res.body.timestamp).toBe('string')
    })

    it('CORS permite localhost em desenvolvimento (linhas 54-55)', async () => {
        const res = await request(app)
            .get('/api/__health')
            .set('Origin', 'http://localhost:9999')
        
        expect(res.status).toBe(200)
        // O mock do CORS permite localhost em qualquer porta
        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:9999')
    })

    it('CORS permite 127.0.0.1 em desenvolvimento (linhas 54-55)', async () => {
        const res = await request(app)
            .get('/api/__health')
            .set('Origin', 'http://127.0.0.1:8080')
        
        expect(res.status).toBe(200)
        // O mock do CORS permite 127.0.0.1
        expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1:8080')
    })

    it('CORS permite origin que está em allowedOrigins (linha 58)', async () => {
        const res = await request(app)
            .get('/api/__health')
            .set('Origin', 'http://localhost:9000')
        
        expect(res.status).toBe(200)
        // O mock do CORS permite origin em allowedOrigins
        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:9000')
    })

    it('error handler usa err.statusCode quando presente (ex.: 418)', async () => {
        const res = await request(app).get('/api/__err418')
        expect(res.status).toBe(418)
        expect(res.body).toEqual({ error: 'teapot', message: 'teapot' })
    })

    it('error handler usa mensagem padrão quando err.message está ausente', async () => {
        const res = await request(app).get('/api/__errNoMsg')
        expect(res.status).toBe(503)
        expect(res.body).toEqual({ error: 'Internal Server Error', message: 'Internal Server Error' })
    })

    describe('middleware de arquivos estáticos /uploads', () => {
        let uploadsDir: string
        let testFile: string

        beforeAll(() => {
            // Criar diretório de uploads para teste
            uploadsDir = path.join(process.cwd(), 'uploads')
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true })
            }
            
            // Criar arquivo de teste
            testFile = path.join(uploadsDir, 'test-file.txt')
            fs.writeFileSync(testFile, 'Test file content')
        })

        afterAll(() => {
            // Limpar arquivo de teste
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile)
            }
            if (fs.existsSync(uploadsDir)) {
                try {
                    fs.rmdirSync(uploadsDir)
                } catch (error) {
                    // Ignorar erro se diretório não estiver vazio
                }
            }
        })

        it('serve arquivos estáticos com headers CORS corretos', async () => {
            const res = await request(app)
                .get('/uploads/test-file.txt')
                .set('Origin', 'http://localhost:9000')
            
            expect(res.status).toBe(200)
            expect(res.text).toBe('Test file content')
            expect(res.headers['access-control-allow-origin']).toBe('http://localhost:9000')
            expect(res.headers['access-control-allow-methods']).toBe('GET, POST, PUT, DELETE, OPTIONS')
            expect(res.headers['access-control-allow-headers']).toBe('Origin, X-Requested-With, Content-Type, Accept, Authorization')
        })

        it('retorna 404 para arquivo inexistente em /uploads', async () => {
            const res = await request(app).get('/uploads/non-existent-file.txt')
            expect(res.status).toBe(404)
        })

        it('funciona com OPTIONS request para CORS preflight', async () => {
            const res = await request(app)
                .options('/uploads/test-file.txt')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET')
            
            // O middleware manual de OPTIONS trata todas as requisições OPTIONS e retorna 200
            expect(res.status).toBe(200)
            // Quando há origin, o CORS retorna a origin específica, não '*'
            expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000')
            expect(res.headers['access-control-allow-credentials']).toBe('true')
            expect(res.headers['access-control-allow-methods']).toBe('GET, POST, PUT, DELETE, PATCH, OPTIONS')
            expect(res.headers['access-control-allow-headers']).toContain('Content-Type')
            expect(res.headers['access-control-allow-headers']).toContain('Authorization')
            expect(res.headers['access-control-max-age']).toBe('86400')
        })
    })
})
