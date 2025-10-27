import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import userRoutes from './routes/user.routes' 
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

// Configurar CORS de forma segura
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.ALLOWED_ORIGINS?.split(',') || [process.env.ALLOWED_ORIGIN]).filter(Boolean)
  : [
      'http://localhost:9000',
      'http://localhost:8080',
      'http://localhost:3000'
    ]

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Permitir requisições sem origin (ex: Postman, mobile apps)
    if (!origin) {
      return callback(null, true)
    }
    
    // Verificar se a origem está permitida
    if (allowedOrigins.indexOf(origin) !== -1 || !process.env.ALLOWED_ORIGIN) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Servir arquivos estáticos (uploads) com CORS configurado
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin
  if (origin && (allowedOrigins.includes(origin) || !process.env.ALLOWED_ORIGIN)) {
    res.header('Access-Control-Allow-Origin', origin)
  } else if (!origin) {
    res.header('Access-Control-Allow-Origin', '*')
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  res.header('Access-Control-Allow-Credentials', 'true')
  next()
}, express.static(path.join(process.cwd(), 'uploads')))

app.use('/api', userRoutes)
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
  console.error(err.stack)
  res.status(err.statusCode || 500).json({ 
    error: err.message || 'Internal Server Error',
    message: err.message || 'Internal Server Error'
  })
})

export default app
