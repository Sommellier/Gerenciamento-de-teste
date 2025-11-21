// Função para o fluxo "Criação de pacotes"
Cypress.Commands.add('criarPacote', (nomePacote, descricaoPacote) => {
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
        .type(nomePacote || 'Meu pacote automatizado');

    // Preencher o campo "Descrição"
    cy.get('textarea[aria-label="Descrição"]')
        .clear()
        .type(descricaoPacote || 'Descrição do pacote gerada no teste');

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

Cypress.Commands.add('validarCriacaoPacote', (nomePacote) => {
    // Verificar a URL atual para decidir se precisa navegar
    cy.url({ timeout: 10000 }).then((url) => {
        if (!url.includes('/packages')) {
            // Se não estiver na página de pacotes, tentar clicar no botão "Ver Pacotes"
            // que só existe na página de detalhes do projeto
            cy.get('body').then(($body) => {
                if ($body.find('[data-cy="btn-view-packages"]').length > 0) {
                    cy.get('[data-cy="btn-view-packages"]', { timeout: 10000 })
                        .should('be.visible')
                        .click();
                } else {
                    // Se não encontrar o botão, navegar diretamente para a página de pacotes
                    // Extrair projectId da URL atual
                    const match = url.match(/\/projects\/(\d+)/);
                    if (match) {
                        cy.visit(`/projects/${match[1]}/packages`);
                    }
                }
            });
        }
    });
    
    // Aguardar a página de pacotes carregar
    cy.url({ timeout: 10000 }).should('include', '/packages');
    
    // Aguardar o grid de pacotes aparecer
    cy.get('[data-cy="grid-packages"]', { timeout: 10000 })
        .should('be.visible');
    
    // Aguardar que os pacotes sejam carregados
    cy.get('.package-card', { timeout: 10000 }).should('have.length.at.least', 1);
    
    // Se um nome de pacote foi fornecido, validar que ele existe
    // Caso contrário, apenas validar que há pelo menos um pacote criado
    if (nomePacote) {
        // Procurar pelo título do pacote usando o seletor correto
        cy.contains('.package-card .package-title h3', nomePacote, { timeout: 10000 })
            .should('be.visible')
            .parents('.package-card')
            .within(() => {
                // Validar que está no card correto
                cy.get('.package-header').should('be.visible');
                
                // chip de status
                cy.get('.status-chip')
                    .should('be.visible')
                    .and('contain.text', 'Criado');

                // botão de menu 
                cy.get('.package-menu-btn').should('be.visible');
            });
    } else {
        // Validar apenas que há pelo menos um pacote com status "Criado"
        cy.get('.package-card', { timeout: 10000 })
            .first()
            .within(() => {
                cy.get('.package-header').should('be.visible');
                cy.get('.status-chip')
                    .should('be.visible')
                    .and('contain.text', 'Criado');
                cy.get('.package-menu-btn').should('be.visible');
            });
    }
})

Cypress.Commands.add('editarPacote', (nomePacote) => {
    // Encontrar o card do pacote pelo título e clicar no menu
    // Se não fornecer nome, usa o padrão "Meu pacote automatizado"
    const nomeBusca = nomePacote || 'Meu pacote automatizado';
    
    cy.contains('.package-card .package-title h3', nomeBusca, { timeout: 10000 })
        .should('be.visible')
        .parents('.package-card')
        .within(() => {
            // Clicar no botão de menu (ícone more_vert)
            cy.get('.package-menu-btn')
                .should('be.visible')
                .click({ force: true });
        });
    
    // Aguardar o menu abrir e clicar em Editar
    cy.get('.q-menu, [role="listbox"]', { timeout: 5000 })
        .should('be.visible')
        .contains('.q-item, .menu-item', /editar/i)
        .click();

    // Aguardar navegação para a página de edição
    cy.url({ timeout: 10000 }).should('include', '/edit');
    
    // Aguardar o formulário carregar completamente
    cy.get('input[aria-label="Nome do Pacote *"]', { timeout: 10000 })
        .should('be.visible');

    // Editar nome do pacote
    cy.get('input[aria-label="Nome do Pacote *"]')
        .clear()
        .type('Novo nome do pacote')
        .should('have.value', 'Novo nome do pacote');

    //Editar descrição do pacote
    cy.get('textarea[aria-label="Descrição"]')
        .should('be.visible')
        .clear()
        .type('Descrição atualizada do pacote')
        .should('have.value', 'Descrição atualizada do pacote');

    // Aguardar um pouco para garantir que o formulário está pronto
    cy.wait(300);

    // abre o select "Tipo" do pacote
    // O elemento de foco do Quasar tem opacity: 0, então usamos force: true
    cy.findByLabelText(/tipo \*/i)
        .should('exist')
        .click({ force: true });

    // Aguardar o menu do select abrir
    cy.get('.q-menu, [role="listbox"]', { timeout: 5000 })
        .should('be.visible')
        .find('[role="option"] .q-item__label span, .q-item .q-item__label span')
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

    // selecionar e-mail - aguardar um pouco para garantir que os selects anteriores fecharam
    cy.wait(500);
    
    // Abrir o select de responsável
    // O elemento de foco do Quasar tem opacity: 0, então usamos force: true
    cy.findByLabelText(/responsável pelo pacote/i)
        .should('exist')
        .click({ force: true });

    // Aguardar o menu abrir completamente
    cy.get('[role="listbox"]', { timeout: 5000 })
        .should('be.visible')
        .and($menu => {
            // Verificar que o menu está realmente visível e não é o menu anterior
            const style = window.getComputedStyle($menu[0]);
            expect(parseFloat(style.opacity)).to.be.greaterThan(0.9);
        });

    // Selecionar a primeira opção disponível
    cy.get('[role="listbox"] [role="option"]:not([aria-disabled="true"])')
        .first()
        .should('be.visible')
        .click({ force: true });

    //Confirmar edição
    cy.findByRole('button', { name: /Salvar alterações/i })
        .should('be.visible')
        .and('not.be.disabled')
        .click()

    // Aguardar a notificação de sucesso aparecer (opcional)
    cy.get('body').then(($body) => {
        if ($body.find('.q-notification').length > 0) {
            cy.get('.q-notification', { timeout: 5000 })
                .should('be.visible')
                .and('contain.text', 'sucesso');
        }
    });

    // Aguardar redirecionamento para a página de pacotes
    cy.url({ timeout: 10000 })
        .should('include', '/packages')
        .and('not.include', '/edit');
})

Cypress.Commands.add('deletarPacote', (nomePacote) => {
    cy.intercept('DELETE', '**/packages/**').as('deletePackage');

    // Encontrar o card do pacote pelo título e clicar no menu
    // Se o pacote foi editado, procurar pelo novo nome, senão pelo nome fornecido ou padrão
    cy.get('body').then(($body) => {
        const hasNewName = $body.find('h3:contains("Novo nome do pacote")').length > 0;
        const searchText = hasNewName ? 'Novo nome do pacote' : (nomePacote || 'Meu pacote automatizado');
        
        cy.contains('.package-card .package-title h3', searchText, { timeout: 10000 })
            .should('be.visible')
            .parents('.package-card')
            .within(() => {
                // Clicar no botão de menu (ícone more_vert)
                cy.get('.package-menu-btn')
                    .should('be.visible')
                    .click({ force: true });
            });
    });

    // Aguardar o menu abrir e clicar em Excluir
    cy.get('.q-menu, [role="listbox"]', { timeout: 5000 })
        .should('be.visible')
        .contains('.q-item, .menu-item', /excluir/i)
        .click();

    // Confirmar exclusão no diálogo
    cy.get('.q-dialog', { timeout: 5000 })
        .should('be.visible')
        .contains('button, .q-btn', /excluir/i)
        .click();

    // Aguardar confirmação da deleção
    cy.wait('@deletePackage').its('response.statusCode').should('be.oneOf', [200, 204]);
})

// Função para acessar detalhes do pacote
Cypress.Commands.add('acessarDetalhesPacote', (nomePacote) => {
    cy.url().then((url) => {
        if (!url.includes('/packages')) {
            // Se não estiver na página de pacotes, navegar para ela
            if (url.includes('/projects/') && !url.includes('/packages')) {
                // Se estiver nos detalhes do projeto, clicar em "Ver Pacotes"
                cy.get('[data-cy="btn-view-packages"]', { timeout: 10000 }).should('be.visible').click();
            } else {
                // Caso contrário, navegar para projetos e depois para pacotes
                cy.visit('/projects');
                cy.url({ timeout: 10000 }).should('include', '/projects');
                cy.get('[data-cy="grid-packages"]', { timeout: 10000 }).should('be.visible');
            }
        }
    });
    
    // Aguardar a página de pacotes carregar
    cy.url({ timeout: 10000 }).should('include', '/packages');
    cy.get('[data-cy="grid-packages"]', { timeout: 10000 }).should('be.visible');
    
    // Aguardar que os pacotes sejam carregados
    cy.get('.package-card', { timeout: 10000 }).should('have.length.at.least', 1);
    
    // Clicar no card do pacote - o título está em .package-title h3 dentro de .package-card
    // Usar contains para encontrar o texto dentro do h3
    cy.contains('.package-card .package-title h3', nomePacote, { timeout: 10000 })
        .should('be.visible')
        .parents('.package-card')
        .first()
        .click();
    
    // Validar que foi redirecionado para os detalhes do pacote
    cy.url({ timeout: 10000 }).should('include', '/packages/');
    cy.get('.package-title', { timeout: 15000 }).should('contain.text', nomePacote);
})

// Função para validar informações do pacote (nome, descrição, status, tipo, prioridade)
Cypress.Commands.add('validarInformacoesPacote', (nomePacote, descricaoPacote) => {
    cy.get('.package-title', { timeout: 10000 }).should('contain.text', nomePacote);
    if (descricaoPacote) {
        cy.get('.package-description', { timeout: 10000 }).should('contain.text', descricaoPacote);
    }
    
    // Validar que os chips de status, tipo e prioridade estão visíveis
    cy.get('.status-badges', { timeout: 10000 }).should('be.visible');
    cy.get('.status-chip', { timeout: 10000 }).should('have.length.at.least', 3); // Status, Tipo, Prioridade
    
    // Validar que há informações de meta (responsável, data)
    cy.get('.package-meta', { timeout: 10000 }).should('be.visible');
})

// Função para validar métricas do pacote
Cypress.Commands.add('validarMetricasPacote', () => {
    cy.get('.metrics-dashboard', { timeout: 10000 }).should('be.visible');
    cy.get('.metrics-grid', { timeout: 10000 }).should('be.visible');
    
    // Validar que existem os cards de métricas
    cy.get('.metric-card', { timeout: 10000 }).should('have.length.at.least', 4);
    
    // Validar métricas específicas
    cy.contains('.metric-label', 'Cenários').should('be.visible');
    cy.contains('.metric-label', 'Status de Conclusão').should('be.visible');
    cy.contains('.metric-label', 'Taxa de Execução').should('be.visible');
    cy.contains('.metric-label', 'Bugs Reportados').should('be.visible');
    
    // Validar que os valores das métricas são números
    cy.get('.metric-value', { timeout: 10000 }).should('be.visible').each(($value) => {
        cy.wrap($value).invoke('text').should('match', /^\d+%?$/);
    });
})

// Função para validar lista de cenários
Cypress.Commands.add('validarListaCenarios', () => {
    // Validar que a aba de cenários está ativa ou clicar nela
    cy.get('.q-tabs', { timeout: 10000 }).should('be.visible');
    cy.contains('.q-tab', 'Cenários de Teste', { timeout: 10000 }).should('be.visible');
    
    // Se não estiver na aba de cenários, clicar nela
    cy.get('body').then(($body) => {
        if ($body.find('[data-cy="grid-scenarios"]').length === 0) {
            cy.contains('.q-tab', 'Cenários de Teste').click();
        }
    });
    
    // Validar seção de cenários
    cy.contains('.section-title', 'Cenários de Teste', { timeout: 10000 }).should('be.visible');
    
    // Validar que há grid de cenários ou estado vazio
    cy.get('body').then(($body) => {
        if ($body.find('[data-cy="grid-scenarios"]').length > 0) {
            cy.get('[data-cy="grid-scenarios"]', { timeout: 10000 }).should('be.visible');
            cy.get('.scenario-card', { timeout: 10000 }).should('have.length.at.least', 1);
        } else {
            // Se não há cenários, validar estado vazio
            cy.contains('.empty-title', 'Nenhum cenário encontrado', { timeout: 10000 }).should('be.visible');
        }
    });
})

// Função para validar bugs relacionados na aba de bugs
Cypress.Commands.add('validarBugsRelacionados', (tituloBug) => {
    // Navegar para a aba de bugs
    cy.get('.q-tabs', { timeout: 10000 }).should('be.visible');
    cy.contains('.q-tab', 'Gerenciar Bugs', { timeout: 10000 })
        .should('be.visible')
        .click();
    
    // Aguardar a aba carregar
    cy.contains('.section-title', 'Gerenciar Bugs', { timeout: 10000 }).should('be.visible');
    
    // Validar que o bug aparece na lista
    cy.get('body').then(($body) => {
        if ($body.find('.bugs-grid').length > 0) {
            cy.get('.bugs-grid', { timeout: 10000 }).should('be.visible');
            cy.contains('.bug-title', tituloBug, { timeout: 10000 }).should('be.visible');
            
            // Validar informações do bug
            cy.contains('.bug-title', tituloBug)
                .parents('.bug-card')
                .within(() => {
                    cy.get('.bug-header').should('be.visible');
                    cy.get('.bug-description').should('be.visible');
                    cy.get('.bug-meta').should('be.visible');
                });
        } else {
            // Se não há bugs, validar estado vazio
            cy.contains('.empty-title', 'Nenhum bug reportado', { timeout: 10000 }).should('be.visible');
        }
    });
})