// Função para o fluxo "Criar Conta"
Cypress.Commands.add('criarConta', ({ nome, email, senha }) => {
    cy.findByRole('button', { name: /criar conta/i }).click()
    cy.findByLabelText(/nome completo/i).type(nome)
    cy.findByLabelText(/email/i).type(email)
    cy.findByLabelText(/senha/i).type(senha, { log: false })
    cy.findByRole('button', { name: /criar conta/i })
        .should('be.visible')
        .and('not.be.disabled')
        .click()
    cy.findByRole('heading', { name: /Bem-vindo de volta!/i }).should('be.visible')
})

// Função para o fluxo "Login"
Cypress.Commands.add('login', ({ email, senha }) => {
    cy.findByLabelText(/email/i).type(email)
    cy.findByLabelText(/senha/i).type(senha, { log: false })
    cy.findByRole('button', { name: /entrar/i })
        .should('be.visible')
        .and('not.be.disabled')
        .click()
})

// Função para o fluxo "Deleção de conta"
Cypress.Commands.add('deleçãoDeConta', () => {
    cy.contains('i.material-icons', 'arrow_drop_down')
        .closest('button, .q-btn, .q-btn-dropdown')
        .click({ force: true })
    cy.get('.q-menu').should('be.visible').click()
    cy.contains('.q-menu .q-item__label', /ver perfil/i).click()
    cy.findByRole('button', { name: /deletar conta/i }).click()
    cy.get('.delete-confirmation-checkbox .confirm-checkbox')
        .click()
        .should('have.attr', 'aria-checked', 'true')
    cy.findByRole('button', { name: /SIM, DELETAR MINHA CONTA/i }).click()
    
    // Aguardar confirmação da deleção e validar redirecionamento
    cy.url({ timeout: 10000 }).should((url) => {
        expect(url).to.satisfy((currentUrl) => {
            return currentUrl.includes('/login') || currentUrl.endsWith('/');
        });
    });
})