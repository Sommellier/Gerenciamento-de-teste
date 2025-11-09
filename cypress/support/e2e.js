// cypress/support/e2e.js
import '@testing-library/cypress/add-commands'
import './commands/auth'
import './commands/projetos.js'
import './commands/pacotes.js'
import './commands/cenario.js'

// Importar helpers para uso global
import * as helpers from './helpers.js'

// Disponibilizar helpers globalmente
Cypress.helpers = helpers