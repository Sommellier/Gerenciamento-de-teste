import 'dotenv/config'
import app from './server'

// Azure App Service usa variável PORT automaticamente
// Em desenvolvimento, usa porta 3000 (padrão do frontend)
// Em produção (Azure), usa process.env.PORT ou 8080 como fallback
const PORT = Number(process.env.PORT) || (process.env.NODE_ENV === 'production' ? 8080 : 3000)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})
