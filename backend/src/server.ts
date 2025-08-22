import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import userRoutes from './routes/user.routes' 
import projectRoutes from './routes/project.routes'

const app = express()

app.use(cors())
app.use(helmet())
app.use(morgan('dev'))
app.use(express.json())

app.use('/api', userRoutes)

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack)
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal Server Error' })
})

export default app
