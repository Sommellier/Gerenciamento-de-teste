// cypress.config.js
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    video: true,
    supportFile: 'cypress/support/e2e.js',              
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}', 
  },
})
