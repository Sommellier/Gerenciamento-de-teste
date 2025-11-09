// Função para o fluxo "Criação de pacotes"
Cypress.Commands.add('criarPacote', () => {
    const tipoPacote = ['Funcional', 'Regressão', 'Smoke', 'End-to-End']
    const prioridadePacote = ['Baixa', 'Média', 'Alta', 'Crítica']
    const ambientePacote = ['Desenvolvimento', 'QA', 'Staging', 'Produção']
    const tipoPacoteEscolhido = Cypress._.sample(tipoPacote)
    const prioridadePacoteEscolhido = Cypress._.sample(prioridadePacote)
    const ambientePacoteEscolhido = Cypress._.sample(ambientePacote)

    // Obtém o dia de amanhã usando helper
    const diaAmanha = Cypress.helpers.getTomorrowDay()

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
    // Seleciona a data de amanhã
    cy.get('.q-date').should('be.visible').within(() => {
        // pega apenas botões de dias habilitados
        cy.get('.q-date__calendar .q-btn:not(.q-btn--disabled)')
            .contains(diaAmanha)
            .click()
    })
    cy.contains('button', /fechar/i).click()
    cy.contains('button', /criar release/i).click()

    // Seleciona o responsável pelo pacote
    cy.findByLabelText(/email do responsável/i)     // pega o [role="combobox"]
        .scrollIntoView()
        .click({ force: true });                      // força o clique mesmo com opacity: 0

    cy.get('[role="listbox"]').should('be.visible');


    // Aguarda o menu abrir e seleciona a primeira opção disponível
    cy.get('.q-menu, [role="listbox"]')
        .should('be.visible')
        .find('[role="option"]:not([aria-disabled="true"])')
        .first()
        .click();

    //Clicar em criar pacote
    cy.contains('button', 'Criar Pacote')
        .should('be.visible')
        .and('not.be.disabled')
        .click();
})

Cypress.Commands.add('validarCriacaoPacote', () => {
    cy.findByRole('button', { name: /ver pacotes/i })
        .click()
    // espera o card aparecer
    cy.get('.package-header', { timeout: 10000 })
        .should('be.visible')
        .within(() => {
            // título
            cy.contains('h3', /^Meu pacote automatizado$/).should('be.visible');

            // chip de status
            cy.get('.status-chip')
                .should('be.visible')
                .and('contain.text', 'Criado');

            // botão de menu 
            cy.findByRole('button', { name: /expand/i }).should('be.visible');
        });
})

Cypress.Commands.add('editarPacote', () => {
    cy.findByRole('button', { name: /expand/i })
        .click();
    //Entrar na opção de editar
    cy.contains('div', 'Editar')
        .click()

    // Editar nome do pacote
    cy.get('input[aria-label="Nome do Pacote *"]')
        .should('be.visible')
        .clear()
        .type('Novo nome do pacote')
        .should('have.value', 'Novo nome do pacote');

    //Editar descrição do pacote

    cy.get('textarea[aria-label="Descrição"]')
        .should('be.visible')
        .clear()
        .type('Descrição atualizada do pacote')
        .should('have.value', 'Descrição atualizada do pacote');

    // abre o select "Tipo" do pacote
    cy.findByLabelText(/tipo \*/i).click();

    // captura todas as opções visíveis e clica em uma aleatória
    cy.get('.q-menu, [role="listbox"]').should('be.visible')
        .find('[role="option"] .q-item__label span, .q-item .q-item__label span') // cobre variações
        .then($spans => {
            expect($spans.length, 'qtd de opções').to.be.greaterThan(0);
            const idx = Cypress._.random(0, $spans.length - 1);
            const textoEscolhido = $spans[idx].innerText.trim();
            cy.wrap($spans[idx]).click();

            // validação: o valor do select ficou igual ao escolhido
            cy.findByLabelText(/tipo \*/i).should('have.value', textoEscolhido);
        });

    // Usar helper reutilizável para seleção aleatória
    Cypress.helpers.selectRandomFromQSelect(/prioridade \*/i);

    // Trocar ambiente do pacote usando helper reutilizável
    Cypress.helpers.selectRandomFromQSelect(/ambiente/i);

    // selecionar e-mail
    // abrir o select
    cy.findByLabelText(/responsável pelo pacote/i).click();

    // garantir que o menu abriu e terminou a animação
    cy.get('.q-menu, [role="listbox"]').should('be.visible');

    // Usar helper reutilizável para selecionar responsável
    Cypress.helpers.pickFromQSelect(/responsável pelo pacote/i, 'first');

    //Confirmar edição
    cy.findByRole('button', { name: /Salvar alterações/i })
        .click()

    // Aguardar confirmação de edição
    cy.findByRole('button', { name: /ok/i }).should('be.visible').click();
})

Cypress.Commands.add('deletarPacote', () => {
    cy.intercept('DELETE', '**/packages/**').as('deletePackage');

    cy.findByRole('button', { name: /expand/i })
        .click();
    //Entrar na opção de excluir
    cy.contains('div', 'Excluir')
        .click()

    //Deletar pacote
    cy.findByRole('button', { name: /excluir/i }).click();

    // Aguardar confirmação da deleção
    cy.wait('@deletePackage').its('response.statusCode').should('be.oneOf', [200, 204]);
})