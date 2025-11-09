// Função para o fluxo "Criar cenário de teste
Cypress.Commands.add('criarCenario', (nomeCenario, descricaoCenario) => {
    cy.contains('span.block', 'Criar Cenário')
        .click();
    // nome do cenário
    cy.findByPlaceholderText(/digite o nome do cenário de teste/i)
        .should('be.visible')
        .clear()
        .type(nomeCenario || 'Cadastro de cenário para teste automatizado');

    // descrição
    cy.findByPlaceholderText(/descreva o objetivo e contexto do cenário/i)
        .should('be.visible')
        .clear()
        .type(descricaoCenario || 'Descrição de cenário para teste automatizado');

    // Tipo do Cenário
    cy.get('div[placeholder="Selecione o tipo do cenário"]').click();
    cy.get('.q-menu .q-item').then($items => {
        cy.wrap($items[Math.floor(Math.random() * $items.length)]).click();
    });

    // Prioridade do Cenário
    cy.get('div[placeholder="Selecione a prioridade do cenário"]').click();
    cy.get('.q-menu .q-item').then($items => {
        cy.wrap($items[Math.floor(Math.random() * $items.length)]).click().click({ force: true });
    });

    // Clicar em criar cenário
    cy.findByRole('button', { name: /criar cenário/i })
        .should('be.visible')
        .and('not.be.disabled')
        .click();
})

// Função para validar criação de cenário
Cypress.Commands.add('validarCriacaoCenario', (nomeCenario) => {
    cy.contains('h3, h2, .scenario-title, .card-title', nomeCenario || /cadastro de cenário para teste automatizado/i)
        .should('be.visible');
})

// Função para editar cenário
// Função para editar cenário (versão melhorada)
Cypress.Commands.add('editarCenario', (nomeCenarioEditado, nomeCenarioOriginal, descricaoEditada) => {
    // Abrir modal de edição
    if (nomeCenarioOriginal) {
        cy.contains('h3, h2, .scenario-title, .card-title', nomeCenarioOriginal)
            .parents('.scenario-card, .card')
            .within(() => {
                cy.get('i.material-icons')
                    .contains('edit')
                    .should('be.visible')
                    .click({ force: true });
            });
    } else {
        cy.get('.scenario-card, .card').first()
            .within(() => {
                cy.get('i.material-icons')
                    .contains('edit')
                    .should('be.visible')
                    .click({ force: true });
            });
    }

    // Aguardar modal aparecer
    cy.contains(/editar cenário/i).should('be.visible');

    // Função auxiliar para selecionar opção aleatória
    const selecionarOpcaoAleatoria = (opcoes) => {
        const opcaoAleatoria = opcoes[Math.floor(Math.random() * opcoes.length)];
        cy.contains('.q-item__label, .q-item', opcaoAleatoria)
            .should('be.visible')
            .click();
    };

    // 1. Editar TÍTULO
    cy.findByPlaceholderText(/título/i)
        .should('be.visible')
        .invoke('val')
        .then(originalTitle => cy.log(`Título original: ${originalTitle}`));

    cy.findByPlaceholderText(/digite o nome do cenário de teste/i)
        .clear()
        .type(nomeCenarioEditado || `Cenário Editado ${Date.now()}`);

    // 2. Editar DESCRIÇÃO
    cy.findByPlaceholderText(/descreva o objetivo e contexto do cenário/i)
        .should('be.visible')
        .invoke('val')
        .then(originalDescription => cy.log(`Descrição original: ${originalDescription}`));

    cy.findByPlaceholderText(/descreva o objetivo e contexto do cenário/i)
        .clear()
        .type(descricaoEditada || 'Descrição editada para teste automatizado');

    // 3. Trocar TIPO (aleatório)
    cy.get('div[placeholder="Selecione o tipo do cenário"]')
        .should('be.visible')
        .invoke('text')
        .then(originalType => cy.log(`Tipo original: ${originalType}`));

    cy.get('div[placeholder="Selecione o tipo do cenário"]').click();
    cy.get('.q-menu').should('be.visible');
    selecionarOpcaoAleatoria(['Funcional', 'Regressão', 'Smoke', 'End-to-End']);

    // 4. Trocar PRIORIDADE (aleatório)
    cy.get('div[placeholder="Selecione a prioridade do cenário"]')
        .should('be.visible')
        .invoke('text')
        .then(originalPriority => cy.log(`Prioridade original: ${originalPriority}`));

    cy.get('div[placeholder="Selecione a prioridade do cenário"]').click();
    cy.get('.q-menu').should('be.visible');
    selecionarOpcaoAleatoria(['Baixa', 'Média', 'Alta', 'Crítica']);

    // 5. Clicar em SALVAR
    cy.contains('button', /salvar/i)
        .should('be.visible')
        .and('not.be.disabled')
        .click();

    // Aguardar e fechar confirmação
    cy.findByRole('button', { name: /ok/i })
        .should('be.visible')
        .click();

    // Validação
    cy.contains('h3, h2, .scenario-title', nomeCenarioEditado || nomeCenarioOriginal)
        .should('be.visible');
})

// Função para deletar cenário
Cypress.Commands.add('deletarCenario', (nomeCenario) => {
    // Abrir menu do cenário
    cy.contains('h3, h2, .scenario-title', nomeCenario)
        .parents('.scenario-card, .card')
        .within(() => {
            cy.get('button[aria-label*="Ações"], button[aria-label*="Menu"]')
                .should('be.visible')
                .click({ force: true });
        });

    cy.intercept('DELETE', '**/scenarios/**').as('deleteScenario');

    cy.contains('button, div', /excluir|deletar/i)
        .should('be.visible')
        .click();

    cy.contains('button', /excluir|confirmar/i)
        .should('be.visible')
        .click();

    cy.wait('@deleteScenario').its('response.statusCode').should('be.oneOf', [200, 204]);

    // Validação após deleção
    cy.contains('h3, h2, .scenario-title', nomeCenario).should('not.exist');
})