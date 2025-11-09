// cypress.config.js
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:9000',
    video: true,
    screenshotOnRunFailure: true,
    supportFile: 'cypress/support/e2e.js',              
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    retries: {
      runMode: 2,
      openMode: 0
    },
    env: {
      // Variáveis de ambiente podem ser configuradas aqui
      // Exemplo: apiUrl: 'http://localhost:3000'
    }
  },
})
