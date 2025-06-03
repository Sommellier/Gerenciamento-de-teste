import express from 'express'
import userRoutes from './routes/user.routes'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/users', userRoutes)

app.listen(3000, () => console.log('Server running on port 3000'))
