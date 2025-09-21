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
const app = express()

app.use(cors())
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Servir arquivos estáticos (uploads) sem Helmet para evitar conflitos de CORS
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
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

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack)
  res.status(err.statusCode || 500).json({ 
    error: err.message || 'Internal Server Error',
    message: err.message || 'Internal Server Error'
  })
})

export default app
