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
const parseAllowed = (raw?: string | null): string[] => {
  if (!raw) return []
  
  // Dividir por vírgula, remover espaços e filtrar valores vazios
  const origins = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => s.length > 0)
  
  return origins
}

// Em produção, usar ALLOWED_ORIGINS da variável de ambiente
// Em desenvolvimento, usar ALLOWED_ORIGINS se configurado, senão usar localhost padrão
const envAllowedOrigins = parseAllowed(process.env.ALLOWED_ORIGINS ?? process.env.ALLOWED_ORIGIN ?? '')
const defaultDevOrigins = [
  'http://localhost:9000',
  'http://localhost:9001', // Quasar dev server
  'http://localhost:8080',
  'http://localhost:3000'
]

const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? envAllowedOrigins
    : envAllowedOrigins.length > 0
    ? [...defaultDevOrigins, ...envAllowedOrigins] // Se ALLOWED_ORIGINS estiver configurado em dev, usar ambos
    : defaultDevOrigins // Se não configurado, usar apenas localhost


const isLocalhost = (origin: string) =>
  origin.includes('localhost') || origin.includes('127.0.0.1')

// Normalizar origem para comparação (remover trailing slash, normalizar protocolo)
const normalizeOrigin = (origin: string): string => {
  return origin
    .trim()
    .toLowerCase()
    .replace(/\/$/, '') // Remove trailing slash
}

// Verificar se a origem está na lista permitida (comparação normalizada)
const isOriginAllowed = (origin: string, allowedList: string[]): boolean => {
  const normalizedOrigin = normalizeOrigin(origin)
  return allowedList.some(allowed => normalizeOrigin(allowed) === normalizedOrigin)
}

const corsOptions: cors.CorsOptions = {
  origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const isProd = process.env.NODE_ENV === 'production'

    // Permitir requisições sem Origin (Postman/cURL, health checks)
    if (!origin) return callback(null, true)

    if (!isProd) {
      // Em desenvolvimento, permitir localhost ou origens na lista permitida
      if (isLocalhost(origin) || isOriginAllowed(origin, allowedOrigins)) {
        return callback(null, true)
      }
      return callback(new Error('Not allowed by CORS (dev)'))
    }

    // Produção
    if (allowedOrigins.length === 0) {
      // Se não configurado, permitir temporariamente com aviso (consistente com o middleware OPTIONS)
      if (process.env.NODE_ENV === 'production') {
        console.warn(`[CORS] ALLOWED_ORIGINS não configurado. Permitindo ${origin} temporariamente.`)
      }
      return callback(null, true)
    }

    // Verificar se a origem está na lista (com comparação normalizada)
    if (isOriginAllowed(origin, allowedOrigins)) {
      return callback(null, true)
    }
    
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

// Middleware manual para tratar requisições OPTIONS (preflight) ANTES do CORS
// Isso garante que sempre retornemos uma resposta adequada mesmo quando a origem não está permitida
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin
    const isProd = process.env.NODE_ENV === 'production'
    
    // Verificar se a origem é permitida
    let isAllowed = false
    if (!origin) {
      isAllowed = true // Permitir requisições sem Origin
    } else if (!isProd) {
      isAllowed = isLocalhost(origin) || isOriginAllowed(origin, allowedOrigins)
    } else {
      // Em produção, verificar se está na lista ou se ALLOWED_ORIGINS não está configurado
      if (allowedOrigins.length === 0) {
        // Se não configurado, permitir temporariamente com aviso
        if (process.env.NODE_ENV === 'production') {
          console.warn(`[CORS] ALLOWED_ORIGINS não configurado. Permitindo ${origin} temporariamente.`)
        }
        isAllowed = true
      } else {
        isAllowed = isOriginAllowed(origin, allowedOrigins)
      }
    }
    
    // Adicionar headers CORS
    if (isAllowed && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma')
      res.setHeader('Access-Control-Max-Age', '86400') // 24 horas
      res.status(200).end()
      return
    } else if (!isProd && origin) {
      // Em desenvolvimento, permitir mesmo se não estiver na lista
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma')
      res.setHeader('Access-Control-Max-Age', '86400')
      res.status(200).end()
      return
    } else if (isProd && origin && !isAllowed) {
      // Em produção, se não permitido E ALLOWED_ORIGINS está configurado, retornar 403
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma')
      res.status(403).json({
        error: 'CORS: Origin não permitida',
        message: 'A origem da requisição não está na lista de origens permitidas'
      })
      return
    }
    
    // Requisições sem origin (Postman, etc.)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma')
    res.status(200).end()
    return
  }
  next()
})

// CORS para requisições normais (não OPTIONS)
app.use(cors(corsOptions))

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
