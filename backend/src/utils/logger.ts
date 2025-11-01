// Logger que desabilita console.log em produção
const isProduction = process.env.NODE_ENV === 'production'

export const logger = {
  log: (...args: any[]) => {
    if (!isProduction) {
      console.log(...args)
    }
  },
  error: (...args: any[]) => {
    // Erros sempre devem ser logados
    console.error(...args)
  },
  warn: (...args: any[]) => {
    // Warnings sempre devem ser logados
    console.warn(...args)
  },
  debug: (...args: any[]) => {
    if (!isProduction) {
      console.debug(...args)
    }
  }
}

export default logger

