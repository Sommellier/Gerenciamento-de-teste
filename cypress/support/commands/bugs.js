// Função para criar bug na página de execução de cenário
Cypress.Commands.add('criarBug', (tituloBug, descricaoBug, severidade = 'MEDIUM') => {
    // Validar que estamos na página de execução (pode ser /execute ou /execution)
    cy.url({ timeout: 10000 }).should('include', '/scenarios/');
    cy.url({ timeout: 10000 }).should('satisfy', (url) => {
        return url.includes('/execute') || url.includes('/execution');
    });
    
    // Clicar no botão "Criar Bug" - o botão está no header da página de execução
    // Usar o seletor pela classe action-button-secondary que é específica do botão no header
    cy.get('.execution-header .action-button-secondary, .header-actions .action-button-secondary', { timeout: 10000 })
        .should('exist')
        .click({ force: true });
    
    // Se não encontrar pela classe, tentar pelo ícone bug_report no header
    cy.get('body').then(($body) => {
        if ($body.find('.execution-header .action-button-secondary, .header-actions .action-button-secondary').length === 0) {
            cy.get('.execution-header, .header-actions', { timeout: 10000 })
                .should('exist')
                .within(() => {
                    cy.get('button .q-icon[name="bug_report"]', { timeout: 10000 })
                        .should('exist')
                        .parent('button')
                        .click({ force: true });
                });
        }
    });
    
    // Aguardar o diálogo abrir
    cy.get('.q-dialog', { timeout: 5000 }).should('be.visible');
    cy.contains('.text-h6, .q-card-section, .dialog-header', /criar bug/i, { timeout: 5000 }).should('be.visible');
    
    // Preencher título do bug - tentar diferentes seletores
    cy.get('body').then(($body) => {
        if ($body.find('input[label="Título *"]').length > 0) {
            cy.get('input[label="Título *"]', { timeout: 5000 })
                .should('be.visible')
                .clear()
                .type(tituloBug || `Bug de teste ${Date.now()}`);
        } else if ($body.find('input[aria-label*="Título"]').length > 0) {
            cy.get('input[aria-label*="Título"]', { timeout: 5000 })
                .should('be.visible')
                .clear()
                .type(tituloBug || `Bug de teste ${Date.now()}`);
        } else {
            // Fallback: primeiro input no diálogo
            cy.get('.q-dialog input[type="text"]', { timeout: 5000 })
                .first()
                .should('be.visible')
                .clear()
                .type(tituloBug || `Bug de teste ${Date.now()}`);
        }
    });
    
    // Preencher descrição se fornecida
    if (descricaoBug) {
        cy.get('body').then(($body) => {
            if ($body.find('textarea[label="Descrição"]').length > 0) {
                cy.get('textarea[label="Descrição"]', { timeout: 5000 })
                    .should('be.visible')
                    .clear()
                    .type(descricaoBug);
            } else if ($body.find('textarea[aria-label*="Descrição"]').length > 0) {
                cy.get('textarea[aria-label*="Descrição"]', { timeout: 5000 })
                    .should('be.visible')
                    .clear()
                    .type(descricaoBug);
            } else {
                // Fallback: primeiro textarea no diálogo
                cy.get('.q-dialog textarea', { timeout: 5000 })
                    .first()
                    .should('be.visible')
                    .clear()
                    .type(descricaoBug);
            }
        });
    }
    
    // Selecionar severidade
    cy.get('body').then(($body) => {
        if ($body.find('label:contains("Gravidade"), .q-field__label:contains("Gravidade")').length > 0) {
            // Encontrar o label de "Gravidade" e clicar no select associado
            cy.contains('label', /gravidade/i, { timeout: 5000 })
                .should('be.visible')
                .parent()
                .find('.q-select, [role="combobox"]')
                .first()
                .should('be.visible')
                .click({ force: true });
        } else {
            // Tentar encontrar o select de severidade/gravidade pelo label ou pelo contexto do diálogo
            // Procurar pelo select que está próximo ao label "Gravidade" ou "Severidade"
            cy.get('.q-dialog', { timeout: 5000 }).within(() => {
                // Procurar pelo label primeiro
                cy.contains('label, .q-field__label', /gravidade|severidade/i, { timeout: 5000 })
                    .should('be.visible')
                    .parent()
                    .find('.q-select, [role="combobox"]')
                    .first()
                    .should('be.visible')
                    .click({ force: true });
            });
        }
    });
    
    cy.get('[role="listbox"]', { timeout: 5000 }).should('be.visible');
    
    // Mapear severidade para português
    const severidadeMap = {
        'LOW': 'Baixa',
        'MEDIUM': 'Média',
        'HIGH': 'Alta',
        'CRITICAL': 'Crítica'
    };
    const severidadeLabel = severidadeMap[severidade] || 'Média';
    
    cy.contains('[role="option"]', severidadeLabel, { timeout: 5000 })
        .should('be.visible')
        .click();
    
    // Clicar no botão "Criar Bug" dentro do diálogo (botão de submit)
    // O botão de submit tem cor "negative" (vermelho) e está dentro do diálogo
    cy.get('.q-dialog', { timeout: 5000 }).within(() => {
        // Procurar pelo botão que tem a cor negative (vermelho) e o texto "Criar Bug"
        cy.get('button.bg-negative, button[color="negative"]', { timeout: 5000 })
            .contains(/criar bug/i)
            .should('exist')
            .and('not.be.disabled')
            .click({ force: true });
    });
    
    // Aguardar notificação de sucesso
    cy.contains(/bug criado com sucesso/i, { timeout: 10000 }).should('be.visible');
    
    // Aguardar o diálogo fechar
    cy.get('.q-dialog', { timeout: 5000 }).should('not.exist');
})

// Função para editar bug na aba de bugs do pacote
Cypress.Commands.add('editarBug', (tituloBug, novoTitulo, novaDescricao, novaSeveridade, novoStatus) => {
    // Validar que estamos na aba de bugs
    cy.get('.q-tabs', { timeout: 10000 }).should('be.visible');
    cy.contains('.q-tab', 'Gerenciar Bugs', { timeout: 10000 })
        .should('be.visible')
        .click();
    
    // Aguardar a aba carregar
    cy.contains('.section-title', 'Gerenciar Bugs', { timeout: 10000 }).should('be.visible');
    
    // Encontrar o bug pelo título e clicar no botão de editar
    cy.get('.bugs-grid', { timeout: 10000 }).should('be.visible');
    cy.contains('.bug-title', tituloBug, { timeout: 10000 })
        .parents('.bug-card')
        .within(() => {
            // Procurar pelo botão de editar (ícone edit, cor primary)
            cy.get('.bug-actions', { timeout: 5000 }).should('be.visible');
            
            // O botão de editar é o segundo botão (índice 1) em .bug-actions
            // Ordem: visibility (0), edit (1), check (2), delete (3)
            cy.get('.bug-actions button', { timeout: 5000 })
                .should('have.length.at.least', 2)
                .eq(1) // Segundo botão é o de editar
                .should('be.visible')
                .click({ force: true });
        });
    
    // Aguardar o diálogo de edição abrir
    cy.get('.q-dialog', { timeout: 5000 }).should('be.visible');
    cy.contains('.text-h6, .dialog-header', /editar bug/i, { timeout: 5000 }).should('be.visible');
    
    // Editar título se fornecido
    if (novoTitulo) {
        cy.get('body').then(($body) => {
            if ($body.find('input[label="Título *"]').length > 0) {
                cy.get('input[label="Título *"]', { timeout: 5000 })
                    .should('be.visible')
                    .clear()
                    .type(novoTitulo);
            } else {
                cy.get('.q-dialog input[type="text"]', { timeout: 5000 })
                    .first()
                    .should('be.visible')
                    .clear()
                    .type(novoTitulo);
            }
        });
    }
    
    // Editar descrição se fornecida
    if (novaDescricao) {
        cy.get('body').then(($body) => {
            if ($body.find('textarea[label="Descrição"]').length > 0) {
                cy.get('textarea[label="Descrição"]', { timeout: 5000 })
                    .should('be.visible')
                    .clear()
                    .type(novaDescricao);
            } else {
                cy.get('.q-dialog textarea', { timeout: 5000 })
                    .first()
                    .should('be.visible')
                    .clear()
                    .type(novaDescricao);
            }
        });
    }
    
    // Editar severidade se fornecida
    if (novaSeveridade) {
        // Procurar pelo label de "Severidade" e clicar no select associado
        cy.get('.q-dialog', { timeout: 5000 }).within(() => {
            cy.contains('label, .q-field__label', /severidade/i, { timeout: 5000 })
                .should('be.visible')
                .parent()
                .find('.q-select, [role="combobox"]')
                .first() // Garantir que pegamos apenas o primeiro (o select de severidade)
                .should('be.visible')
                .click({ force: true });
        });
        
        cy.get('[role="listbox"]', { timeout: 5000 }).should('be.visible');
        
        const severidadeMap = {
            'LOW': 'Baixa',
            'MEDIUM': 'Média',
            'HIGH': 'Alta',
            'CRITICAL': 'Crítica'
        };
        const severidadeLabel = severidadeMap[novaSeveridade] || 'Média';
        
        cy.contains('[role="option"]', severidadeLabel, { timeout: 5000 })
            .should('be.visible')
            .click();
    }
    
    // Editar status se fornecido
    if (novoStatus) {
        // Procurar pelo label de "Status" e clicar no select associado
        cy.get('.q-dialog', { timeout: 5000 }).within(() => {
            cy.contains('label, .q-field__label', /status/i, { timeout: 5000 })
                .should('be.visible')
                .parent()
                .find('.q-select, [role="combobox"]')
                .first() // Garantir que pegamos apenas o primeiro (o select de status)
                .should('be.visible')
                .click({ force: true });
        });
        
        cy.get('[role="listbox"]', { timeout: 5000 }).should('be.visible');
        
        const statusMap = {
            'OPEN': 'Aberto',
            'IN_PROGRESS': 'Em Andamento',
            'RESOLVED': 'Resolvido',
            'CLOSED': 'Fechado'
        };
        const statusLabel = statusMap[novoStatus] || 'Aberto';
        
        cy.contains('[role="option"]', statusLabel, { timeout: 5000 })
            .should('be.visible')
            .click();
    }
    
    // Clicar em "Salvar"
    cy.contains('button', /salvar/i, { timeout: 5000 })
        .should('be.visible')
        .and('not.be.disabled')
        .click();
    
    // Aguardar notificação de sucesso
    cy.contains(/bug atualizado com sucesso/i, { timeout: 10000 }).should('be.visible');
    
    // Aguardar o diálogo fechar
    cy.get('.q-dialog', { timeout: 5000 }).should('not.exist');
})

// Função para deletar bug na aba de bugs do pacote
Cypress.Commands.add('deletarBug', (tituloBug) => {
    // Validar que estamos na aba de bugs
    cy.get('.q-tabs', { timeout: 10000 }).should('be.visible');
    cy.contains('.q-tab', 'Gerenciar Bugs', { timeout: 10000 })
        .should('be.visible')
        .click();
    
    // Aguardar a aba carregar
    cy.contains('.section-title', 'Gerenciar Bugs', { timeout: 10000 }).should('be.visible');
    
    // Encontrar o bug pelo título e clicar no botão de deletar
    cy.get('.bugs-grid', { timeout: 10000 }).should('be.visible');
    cy.contains('.bug-title', tituloBug, { timeout: 10000 })
        .parents('.bug-card')
        .within(() => {
            // Procurar pelo botão de deletar (ícone delete, cor negative)
            // O botão de deletar é o último botão (índice 3) em .bug-actions
            // Ordem: visibility (0), edit (1), check (2), delete (3)
            cy.get('.bug-actions', { timeout: 5000 }).should('be.visible');
            cy.get('.bug-actions button', { timeout: 5000 })
                .should('have.length.at.least', 1)
                .last() // Último botão é o de deletar
                .should('be.visible')
                .click({ force: true });
        });
    
    // Aguardar o diálogo de confirmação abrir
    cy.get('.q-dialog', { timeout: 5000 }).should('be.visible');
    cy.contains('.text-h5, .delete-bug-dialog-header', /confirmar exclusão/i, { timeout: 5000 }).should('be.visible');
    
    // Confirmar exclusão
    cy.contains('button', /excluir bug/i, { timeout: 5000 })
        .should('be.visible')
        .and('not.be.disabled')
        .click();
    
    // Aguardar notificação de sucesso
    cy.contains(/bug excluído com sucesso/i, { timeout: 10000 }).should('be.visible');
    
    // Aguardar o diálogo fechar
    cy.get('.q-dialog', { timeout: 5000 }).should('not.exist');
    
    // Validar que o bug não aparece mais na lista
    cy.contains('.bug-title', tituloBug, { timeout: 10000 }).should('not.exist');
})

