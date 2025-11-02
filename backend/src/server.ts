import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { generalLimiter, publicLimiter } from './infrastructure/rateLimiter'

import userRoutes from './routes/user.routes'
import authRoutes from './routes/auth.routes'
import projectRoutes from './routes/project.routes'
import invitationRoutes from './routes/invitation.routes'
import memberRoutes from './routes/member.routes'
import uploadRoutes from './routes/upload.routes'
import profileRoutes from './routes/profile.routes'
import scenarioRoutes from './routes/scenario.routes'
import packageRoutes from './routes/package.routes'
import executionRoutes from './routes/execution.routes'
import ectRoutes from './routes/ect.routes'

const app = express()

// Produção: defina ALLOWED_ORIGINS="https://seu-front1,https://seu-front2"
const parseAllowed = (raw?: string | null): string[] =>
  (raw ? raw.split(',') : [])
    .map(s => s.trim())
    .filter(Boolean)

const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? parseAllowed(process.env.ALLOWED_ORIGINS ?? process.env.ALLOWED_ORIGIN ?? '')
    : [
        'http://localhost:9000',
        'http://localhost:9001', // Quasar dev server
        'http://localhost:8080',
        'http://localhost:3000'
      ]

const isLocalhost = (origin: string) =>
  origin.includes('localhost') || origin.includes('127.0.0.1')

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    const isProd = process.env.NODE_ENV === 'production'

    // Permitir requisições sem Origin (Postman/cURL, health checks)
    if (!origin) return callback(null, true)

    if (!isProd) {
      if (isLocalhost(origin) || allowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error('Not allowed by CORS (dev)'))
    }

    // Produção
    if (allowedOrigins.length === 0)
      return callback(new Error('ALLOWED_ORIGINS não configurado'))

    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS (prod)'))
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma'
  ]
}

// CORS PRIMEIRO + preflight explícito
app.use(cors(corsOptions))
app.options('/*splat', cors(corsOptions))

// Segurança
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false
  })
)

// Proxy (Render, etc.)
app.set('trust proxy', 1)

// Logs e parsers
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rate limiters
app.use(generalLimiter)
app.use('/api/public', publicLimiter) // se tiver rotas públicas, aplica aqui

// Static uploads com CORS aplicado
app.use(
  '/uploads',
  cors(corsOptions),
  express.static(path.join(process.cwd(), 'uploads'))
)

// Rotas API (prefixo /api)
app.use('/api', userRoutes)
app.use('/api', authRoutes)
app.use('/api', projectRoutes)
app.use('/api', invitationRoutes)
app.use('/api', memberRoutes)
app.use('/api', uploadRoutes)
app.use('/api', profileRoutes)
app.use('/api', scenarioRoutes)
app.use('/api', packageRoutes)
app.use('/api', executionRoutes)
app.use('/api', ectRoutes)

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(err?.stack || err)
  }

  const status = err?.statusCode || 500
  const message =
    process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err?.message || 'Internal Server Error'

  res.status(status).json({
    error: message,
    message
  })
})

export default app
