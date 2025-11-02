// cypress.config.js
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    video: true,
    supportFile: "cypress/cypress/support/e2e.js",      
    specPattern: "cypress/cypress/e2e/**/*.cy.{js,ts}", 
  },
});
