import 'newrelic' 
import 'dotenv/config'
import app from './server'
import { logger } from './utils/logger'

// Render SEMPRE fornece process.env.PORT em produção
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000

app.listen(PORT, '0.0.0.0', () => {
  logger.log(`Server running on port ${PORT}`)
})
