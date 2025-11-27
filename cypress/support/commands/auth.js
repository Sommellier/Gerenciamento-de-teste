// Função para o fluxo "Criar Conta"
Cypress.Commands.add('criarConta', ({ nome, email, senha }) => {
    cy.get('[data-cy="btn-link-register"]').click()
    cy.get('[data-cy="input-name-register"]').type(nome)
    cy.get('[data-cy="input-email-register"]').type(email)
    cy.get('[data-cy="input-password-register"]').type(senha, { log: false })
    cy.get('[data-cy="btn-submit-register"]')
        .should('be.visible')
        .and('not.be.disabled')
        .click()
    
    // Aguardar a mensagem de sucesso aparecer (indica que o registro foi bem-sucedido)
    cy.get('[data-cy="banner-register-message"]', { timeout: 10000 })
        .should('be.visible')
        .should('contain.text', 'sucesso')
    
    // Aguardar o redirecionamento para a página de login (a página de registro redireciona após 2 segundos)
    cy.url({ timeout: 15000 }).should('include', '/login')
    
    // Aguardar a página de login carregar completamente
    cy.findByRole('heading', { name: /Bem-vindo de volta!/i }, { timeout: 10000 }).should('be.visible')
})

// Função para o fluxo "Login"
Cypress.Commands.add('login', ({ email, senha }) => {
    cy.get('[data-cy="input-email-login"]').type(email)
    cy.get('[data-cy="input-password-login"]').type(senha, { log: false })
    cy.get('[data-cy="btn-submit-login"]')
        .should('be.visible')
        .and('not.be.disabled')
        .click()
    
    // Aguardar o redirecionamento para o dashboard após login bem-sucedido
    cy.url({ timeout: 10000 }).should('include', '/dashboard')
})

// Função para o fluxo "Deleção de conta"
Cypress.Commands.add('deleçãoDeConta', () => {
    // Navegar para o dashboard onde o menu de perfil está disponível
    cy.visit('/dashboard', { timeout: 10000, failOnStatusCode: false });
    
    // Aguardar a URL mudar e verificar se foi redirecionado
    cy.url({ timeout: 10000 }).then((url) => {
        // Se foi redirecionado para login, não podemos fazer limpeza
        if (url.includes('/login') || (url.endsWith('/') && !url.includes('/dashboard'))) {
            cy.log('Usuário não está autenticado, pulando limpeza');
            return;
        }
        
        // Se está no dashboard, continuar com a limpeza
        if (url.includes('/dashboard')) {
            // Aguardar a página carregar completamente - usar timeout maior
            cy.window({ timeout: 15000 }).its('document.readyState').should('eq', 'complete');
            cy.wait(3000); // Aguardar para garantir que elementos renderizaram
            
            // Tentar encontrar o menu de perfil diretamente
            cy.get('[data-cy="btn-profile-menu"]', { timeout: 15000 })
                .should('exist')
                .should('be.visible')
                .click({ force: true });
            
            cy.get('[data-cy="btn-menu-go-to-profile"]', { timeout: 5000 })
                .should('be.visible')
                .click();
            
            // Aguardar a página de perfil carregar
            cy.url({ timeout: 10000 }).should('include', '/profile');
            
            // Clicar no botão de deletar conta
            cy.get('[data-cy="btn-delete-account"]', { timeout: 10000 })
                .should('be.visible')
                .click();
            
            // Marcar checkbox de confirmação
            cy.get('[data-cy="checkbox-confirm-delete-account"]', { timeout: 5000 })
                .should('be.visible')
                .click()
                .should('have.attr', 'aria-checked', 'true');
            
            // Confirmar deleção
            cy.get('[data-cy="btn-confirm-delete-account"]', { timeout: 5000 })
                .should('be.visible')
                .click();
            
            // Aguardar confirmação da deleção e validar redirecionamento
            cy.url({ timeout: 15000 }).should((finalUrl) => {
                expect(finalUrl).to.satisfy((currentUrl) => {
                    return currentUrl.includes('/login') || currentUrl.endsWith('/');
                });
            });
        }
    });
})