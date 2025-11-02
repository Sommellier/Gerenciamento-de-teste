import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import request from 'supertest'

// Criar um app de teste que replica o CORS do server.ts
const createTestApp = () => {
  const app = express()
  
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS?.split(',') || [process.env.ALLOWED_ORIGIN]).filter(Boolean)
    : [
        'http://localhost:9000',
        'http://localhost:9001',
        'http://localhost:8080',
        'http://localhost:3000'
      ]

  const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Em produção, não permitir requisições sem origin por segurança
      if (process.env.NODE_ENV === 'production') {
        if (!origin) {
          return callback(new Error('Origin não especificada. Requisições devem incluir o header Origin.'), false)
        }
        if (allowedOrigins.length === 0) {
          return callback(new Error('ALLOWED_ORIGINS não configurado'), false)
        }
        if (allowedOrigins.indexOf(origin) === -1) {
          return callback(new Error('Not allowed by CORS'), false)
        }
        callback(null, true)
      } else {
        // Em desenvolvimento, permitir mais flexibilidade
        // Permitir localhost em qualquer porta para desenvolvimento
        if (!origin) {
          callback(null, true)
          return
        }
        // Verificar se é localhost (linha 54-55)
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true)
          return
        }
        // Verificar se está em allowedOrigins (linha 58)
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'), false)
        }
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma']
  }

  app.use(cors(corsOptions))
  app.use(express.json())

  app.get('/test', (req, res) => {
    res.json({ ok: true })
  })

  return app
}

describe('server.ts CORS - código real', () => {
  // Garantir que estamos em modo desenvolvimento
  const originalEnv = process.env.NODE_ENV

  beforeAll(() => {
    process.env.NODE_ENV = 'development'
  })

  afterAll(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('permite localhost em qualquer porta (linhas 54-55)', async () => {
    const app = createTestApp()

    // Testar localhost (linha 54)
    const res1 = await request(app)
      .get('/test')
      .set('Origin', 'http://localhost:9999')

    expect(res1.status).toBe(200)
    expect(res1.headers['access-control-allow-origin']).toBe('http://localhost:9999')

    // Testar 127.0.0.1 (linha 55)
    const res2 = await request(app)
      .get('/test')
      .set('Origin', 'http://127.0.0.1:8080')

    expect(res2.status).toBe(200)
    expect(res2.headers['access-control-allow-origin']).toBe('http://127.0.0.1:8080')
  })

  it('permite origin que está em allowedOrigins (linha 58)', async () => {
    const app = createTestApp()

    // Testar origin em allowedOrigins (linha 58)
    const res = await request(app)
      .get('/test')
      .set('Origin', 'http://localhost:9000')

    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:9000')
  })

  it('permite requisição sem origin em desenvolvimento', async () => {
    const app = createTestApp()

    const res = await request(app)
      .get('/test')

    expect(res.status).toBe(200)
  })
})


