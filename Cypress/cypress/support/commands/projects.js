

// Função para o fluxo "Criação de cenario
Cypress.Commands.add('criarCenario', (nomeProjeto, descricaoProjeto) => {
    cy.get('.icon-wrapper.projects-icon svg').should('exist').click()
    cy.findByRole('button', { name: /novo projeto/i }).click()
    cy.findByPlaceholderText(/digite o nome do projeto/i)
        .should('be.visible')
        .type(nomeProjeto)
    cy.findByPlaceholderText(/descreva o objetivo do projeto.../i)
        .should('be.visible')
        .type(descricaoProjeto)
    cy.findByRole('button', { name: /criar projeto/i }).click()
    cy.findByRole('button', { name: /ok/i }).click()
})

// Função para o fluxo "Validação da criação do projeto
Cypress.Commands.add('validarCriacaoProjeto', (descricaoProjeto) => {
    cy.findByRole('heading', { name: /meu projeto/i })
        .should('be.visible')
        .parents('.project-card')
        .within(() => {
            cy.findByRole('heading', { name: /meu projeto/i })
                .parents('.project-card')
                .find('.project-description')
                .should('contain.text', descricaoProjeto)   // variável simples
            cy.findByText(/ativo/i).should('be.visible')
            cy.findByText(/criado em/i).should('be.visible')
        })
})

//Editar cenário
Cypress.Commands.add('editarCenario', (nomeProjetoEditado) => {
    cy.contains('.project-card .project-title', /meu projeto/i)
        .parents('.project-card')
        .within(() => {
            cy.get('button.project-menu-button[aria-label="Ações do projeto"]').click()
        })
    cy.contains('button', /editar/i).should('be.visible').click()
    cy.findByLabelText(/nome do projeto/i)
        .focus()
        .type('{selectAll}{backspace}')
        .type(nomeProjetoEditado)
    cy.findByLabelText(/descrição \(opcional\)/i)
        .focus()
        .type('{selectAll}{backspace}')
        .type('Nova descrição do projeto')
    cy.findByRole('button', { name: /salvar alterações/i }).click()
    cy.findByRole('button', { name: /ok/i }).click()
})


// Função para o fluxo "Deletar cenario"
Cypress.Commands.add('deletarCenario', (nomeProjetoEditado) => {
    cy.contains('h3.project-title', nomeProjetoEditado)
        .parents('.project-card')
        .findByRole('button', { name: /Ações do projeto/i })
        .click()
    cy.intercept('DELETE', '**/projects/**').as('deleteProject')
    cy.contains('button.menu-action.danger', /excluir/i).click()
    cy.contains('button', /excluir/i).click()
    cy.wait('@deleteProject').its('response.statusCode').should('be.oneOf', [200, 204])
    cy.contains('.project-card .project-title', /meu projeto/i).should('not.exist')
})
