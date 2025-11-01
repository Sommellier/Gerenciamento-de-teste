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

// IMPORTANTE: CORS deve ser aplicado PRIMEIRO, antes de qualquer outro middleware
// Configurar CORS de forma segura
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.ALLOWED_ORIGINS?.split(',') || [process.env.ALLOWED_ORIGIN]).filter(Boolean)
  : [
      'http://localhost:9000',
      'http://localhost:9001', // Quasar dev server
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
      // Verificar se é localhost
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true)
        return
      }
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

// Aplicar CORS PRIMEIRO (antes de outros middlewares)
app.use(cors(corsOptions))

// Configurar Helmet para não bloquear CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}))

// Middlewares adicionais
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Aplicar rate limiter DEPOIS do CORS (para não interferir nas requisições OPTIONS)
app.use(generalLimiter)

// Servir arquivos estáticos (uploads) com CORS configurado
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin
  if (process.env.NODE_ENV === 'production') {
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin)
    }
  } else {
    // Desenvolvimento: permitir mais flexibilidade
    if (origin && (allowedOrigins.includes(origin) || !process.env.ALLOWED_ORIGIN)) {
      res.header('Access-Control-Allow-Origin', origin)
    } else if (!origin) {
      res.header('Access-Control-Allow-Origin', '*')
    }
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  res.header('Access-Control-Allow-Credentials', 'true')
  next()
}, express.static(path.join(process.cwd(), 'uploads')))

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

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Log erro completo apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack)
  }
  
  res.status(err.statusCode || 500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message || 'Internal Server Error'
  })
})

export default app
