// Carregar variáveis de ambiente ANTES do New Relic
import 'dotenv/config'

// Importar New Relic apenas se a license key estiver configurada
if (process.env.NEW_RELIC_LICENSE_KEY) {
  try {
    require('newrelic')
  } catch (error) {
    console.warn('New Relic não pôde ser carregado:', error)
  }
} else {
  console.warn('New Relic desabilitado: NEW_RELIC_LICENSE_KEY não configurado')
}

import app from './server'
import { logger } from './utils/logger'

// Render SEMPRE fornece process.env.PORT em produção
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000

app.listen(PORT, '0.0.0.0', () => {
  logger.log(`Server running on port ${PORT}`)
})
