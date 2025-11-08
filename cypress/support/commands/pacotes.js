// Função para o fluxo "Criação de pacotes"
Cypress.Commands.add('criarPacote', () => {
    const tipoPacote = ['Funcional', 'Regressão', 'Smoke', 'End-to-End']
    const prioridadePacote = ['Baixa', 'Média', 'Alta', 'Crítica']
    const ambientePacote = ['Desenvolvimento', 'QA', 'Staging', 'Produção']
    const tipoPacoteEscolhido = Cypress._.sample(tipoPacote)
    const prioridadePacoteEscolhido = Cypress._.sample(prioridadePacote)
    const ambientePacoteEscolhido = Cypress._.sample(ambientePacote)
    const hoje = new Date().getDate() + 1

    // Clicar no botão "Criar primeiro pacote"
    cy.findByRole('button', { name: /criar primeiro pacote/i })
        .click()

    // Preencher o campo "Título do Pacote"
    cy.get('input[aria-label="Título do Pacote *"]')
        .clear()
        .type('Meu pacote automatizado');

    // Preencher o campo "Descrição"
    cy.get('textarea[aria-label="Descrição"]')
        .clear()
        .type('Descrição do pacote gerada no teste');

    // Selecionar o tipo de pacote
    cy.contains('i.q-icon.material-icons', 'arrow_drop_down')
        .click({ force: true });
    cy.contains('span', tipoPacoteEscolhido).click()

    // Selecionar a prioridade do pacote
    cy.get('i.q-icon.q-select__dropdown-icon').eq(1)
        .click({ force: true });
    cy.contains('span', prioridadePacoteEscolhido).click()

    // Selecionar o ambiente do pacote
    cy.get('i.q-icon.q-select__dropdown-icon').eq(2)
        .click({ force: true });
    cy.contains('span', ambientePacoteEscolhido).click()

    // Selecionar a release do pacote
    cy.contains('button', 'Nova Release').click()
    // abre o datepicker
    cy.contains('i.material-icons', /^event$/).click({ force: true })
    // Seleciona a data de hoje
    cy.get('.q-date').should('be.visible').within(() => {
        // pega apenas botões de dias habilitados
        cy.get('.q-date__calendar .q-btn:not(.q-btn--disabled)')
            .contains(hoje)
            .click()
    })
    cy.contains('button', /fechar/i).click()
    cy.contains('button', /criar release/i).click()

    //Clica no email do responsável
    cy.get('i.q-icon.q-select__dropdown-icon').eq(4).click()

    //Clicar em criar pacote
    cy.contains('button', 'Criar Pacote')
        .should('be.visible')
        .and('not.be.disabled')
        .click();
})

