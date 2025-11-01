import 'dotenv/config'
import app from './server'

// Azure App Service usa variável PORT automaticamente
const PORT = Number(process.env.PORT) || 8080
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})
