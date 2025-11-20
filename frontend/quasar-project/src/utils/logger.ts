// Logger que desabilita console.log em produção
const isProduction = import.meta.env.PROD

export const logger = {
  log: (...args: unknown[]) => {
    if (!isProduction) {
      console.log(...args)
    }
  },
  error: (...args: unknown[]) => {
    // Erros sempre devem ser logados
    console.error(...args)
  },
  warn: (...args: unknown[]) => {
    // Warnings sempre devem ser logados
    console.warn(...args)
  },
  debug: (...args: unknown[]) => {
    if (!isProduction) {
      console.debug(...args)
    }
  }
}

export default logger

