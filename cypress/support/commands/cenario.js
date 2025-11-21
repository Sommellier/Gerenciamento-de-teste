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
    cy.get('div[placeholder="Selecione o tipo do cenário"]')
        .should('be.visible')
        .click();
    
    // Aguardar o menu abrir e selecionar item aleatório
    cy.get('.q-menu, [role="listbox"]', { timeout: 5000 })
        .should('be.visible')
        .find('.q-item')
        .then($items => {
            const itemCount = $items.length;
            expect(itemCount).to.be.greaterThan(0);
            const randomIndex = Math.floor(Math.random() * itemCount);
            return randomIndex;
        })
        .then(randomIndex => {
            cy.get('.q-menu, [role="listbox"]')
                .find('.q-item')
                .eq(randomIndex)
                .should('be.visible')
                .click({ force: true });
        });

    // Aguardar um pouco para garantir que o menu anterior fechou
    cy.wait(300);

    // Prioridade do Cenário
    cy.get('div[placeholder="Selecione a prioridade do cenário"]')
        .should('be.visible')
        .click();
    
    // Aguardar o menu abrir e selecionar item aleatório
    cy.get('.q-menu, [role="listbox"]', { timeout: 5000 })
        .should('be.visible')
        .find('.q-item')
        .then($items => {
            const itemCount = $items.length;
            expect(itemCount).to.be.greaterThan(0);
            const randomIndex = Math.floor(Math.random() * itemCount);
            return randomIndex;
        })
        .then(randomIndex => {
            cy.get('.q-menu, [role="listbox"]')
                .find('.q-item')
                .eq(randomIndex)
                .should('be.visible')
                .click({ force: true });
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
    cy.contains(/editar cenário/i, { timeout: 10000 }).should('be.visible');

    // Aguardar o diálogo estar completamente carregado
    // O diálogo pode ser [data-cy="dialog-scenario"] ou apenas .q-dialog
    cy.get('body').then(($body) => {
        if ($body.find('[data-cy="dialog-scenario"]').length > 0) {
            cy.get('[data-cy="dialog-scenario"]', { timeout: 5000 })
                .should('be.visible');
        } else {
            // Se não encontrar pelo data-cy, usar o seletor genérico do Quasar
            cy.get('.q-dialog', { timeout: 5000 })
                .contains(/editar cenário/i)
                .should('be.visible');
        }
    });

    // Função auxiliar para selecionar opção aleatória
    const selecionarOpcaoAleatoria = (opcoes) => {
        const opcaoAleatoria = opcoes[Math.floor(Math.random() * opcoes.length)];
        cy.get('.q-menu, [role="listbox"]')
            .should('be.visible')
            .contains('.q-item__label, .q-item', opcaoAleatoria)
            .should('be.visible')
            .click({ force: true });
    };

    // 1. Editar TÍTULO
    // Tentar primeiro com label (diálogo de edição), depois com placeholder (diálogo de criação)
    cy.get('body').then(($body) => {
        const hasLabel = $body.find('label:contains("Título"), .q-field__label:contains("Título")').length > 0;
        const hasPlaceholder = $body.find('input[placeholder*="nome do cenário"], input[placeholder*="título"]').length > 0;
        
        if (hasLabel) {
            cy.findByLabelText(/título/i)
                .should('be.visible')
                .invoke('val')
                .then(originalTitle => cy.log(`Título original: ${originalTitle}`));

            cy.findByLabelText(/título/i)
                .clear()
                .type(nomeCenarioEditado || `Cenário Editado ${Date.now()}`);
        } else if (hasPlaceholder) {
            cy.findByPlaceholderText(/digite o nome do cenário de teste|título/i)
                .should('be.visible')
                .invoke('val')
                .then(originalTitle => cy.log(`Título original: ${originalTitle}`));

            cy.findByPlaceholderText(/digite o nome do cenário de teste|título/i)
                .clear()
                .type(nomeCenarioEditado || `Cenário Editado ${Date.now()}`);
        } else {
            // Fallback: procurar qualquer input de texto no diálogo
            cy.get('.q-dialog input[type="text"]').first()
                .should('be.visible')
                .clear()
                .type(nomeCenarioEditado || `Cenário Editado ${Date.now()}`);
        }
    });

    // 2. Editar DESCRIÇÃO
    // Tentar primeiro com label, depois com placeholder
    cy.get('body').then(($body) => {
        const hasLabel = $body.find('label:contains("Descrição"), .q-field__label:contains("Descrição")').length > 0;
        const hasPlaceholder = $body.find('textarea[placeholder*="objetivo"], textarea[placeholder*="descrição"]').length > 0;
        
        if (hasLabel) {
            cy.findByLabelText(/descrição/i)
                .should('be.visible')
                .invoke('val')
                .then(originalDescription => cy.log(`Descrição original: ${originalDescription}`));

            cy.findByLabelText(/descrição/i)
                .clear()
                .type(descricaoEditada || 'Descrição editada para teste automatizado');
        } else if (hasPlaceholder) {
            cy.findByPlaceholderText(/descreva o objetivo e contexto do cenário|descrição/i)
                .should('be.visible')
                .invoke('val')
                .then(originalDescription => cy.log(`Descrição original: ${originalDescription}`));

            cy.findByPlaceholderText(/descreva o objetivo e contexto do cenário|descrição/i)
                .clear()
                .type(descricaoEditada || 'Descrição editada para teste automatizado');
        } else {
            // Fallback: procurar qualquer textarea no diálogo
            cy.get('.q-dialog textarea').first()
                .should('be.visible')
                .clear()
                .type(descricaoEditada || 'Descrição editada para teste automatizado');
        }
    });

    // 3. Trocar TIPO (aleatório)
    // Tentar primeiro com label, depois com placeholder
    cy.get('body').then(($body) => {
        const hasLabel = $body.find('label:contains("Tipo"), .q-field__label:contains("Tipo")').length > 0;
        const hasPlaceholder = $body.find('div[placeholder="Selecione o tipo do cenário"]').length > 0;
        
        if (hasLabel) {
            // O elemento de foco do Quasar tem opacity: 0, então usamos force: true
            cy.findByLabelText(/tipo/i)
                .should('exist')
                .click({ force: true });
        } else if (hasPlaceholder) {
            cy.get('div[placeholder="Selecione o tipo do cenário"]')
                .should('be.visible')
                .click();
        } else {
            // Fallback: procurar qualquer select com "tipo" no label
            cy.get('.q-select').contains('label, .q-field__label', /tipo/i)
                .parents('.q-select')
                .find('.q-field__native, .q-select__focus-target')
                .click({ force: true });
        }
    });
    
    cy.get('.q-menu, [role="listbox"]', { timeout: 5000 }).should('be.visible');
    selecionarOpcaoAleatoria(['Funcional', 'Regressão', 'Smoke', 'End-to-End']);

    // Aguardar um pouco para garantir que o menu anterior fechou
    cy.wait(300);

    // 4. Trocar PRIORIDADE (aleatório)
    // Tentar primeiro com label, depois com placeholder
    cy.get('body').then(($body) => {
        const hasLabel = $body.find('label:contains("Prioridade"), .q-field__label:contains("Prioridade")').length > 0;
        const hasPlaceholder = $body.find('div[placeholder="Selecione a prioridade do cenário"]').length > 0;
        
        if (hasLabel) {
            // O elemento de foco do Quasar tem opacity: 0, então usamos force: true
            cy.findByLabelText(/prioridade/i)
                .should('exist')
                .click({ force: true });
        } else if (hasPlaceholder) {
            cy.get('div[placeholder="Selecione a prioridade do cenário"]')
                .should('be.visible')
                .click();
        } else {
            // Fallback: procurar qualquer select com "prioridade" no label
            cy.get('.q-select').contains('label, .q-field__label', /prioridade/i)
                .parents('.q-select')
                .find('.q-field__native, .q-select__focus-target')
                .click({ force: true });
        }
    });
    
    cy.get('.q-menu, [role="listbox"]', { timeout: 5000 }).should('be.visible');
    selecionarOpcaoAleatoria(['Baixa', 'Média', 'Alta', 'Crítica']);

    // 5. Clicar em SALVAR
    cy.contains('button', /salvar/i)
        .should('be.visible')
        .and('not.be.disabled')
        .click();
})

// Função para deletar cenário
Cypress.Commands.add('deletarCenario', (nomeCenario) => {
    cy.intercept('DELETE', '**/scenarios/**').as('deleteScenario');

    // Encontrar o card do cenário e clicar no botão de delete
    cy.contains('h3, h2, h4, .scenario-title, .card-title', nomeCenario)
        .parents('.scenario-card, .card')
        .within(() => {
            // Tentar encontrar pelo data-cy primeiro, se não encontrar, tentar pelo ícone
            cy.get('[data-cy*="btn-delete-scenario"]')
                .first()
                .should('exist')
                .click({ force: true });
        });

    // Aguardar o diálogo de confirmação aparecer
    cy.get('.q-dialog', { timeout: 5000 })
        .should('be.visible')
        .contains(/confirmar.*exclusão|tem certeza|excluir este cenário/i);

    // Clicar no botão "Excluir" dentro do diálogo (botão com classe delete-btn ou texto "Excluir")
    cy.get('.q-dialog')
        .find('button.delete-btn, .q-btn.delete-btn')
        .contains(/excluir/i)
        .should('be.visible')
        .click();

    // Aguardar a requisição de delete
    cy.wait('@deleteScenario').its('response.statusCode').should('be.oneOf', [200, 204]);

    // Aguardar um pouco para garantir que a UI foi atualizada
    cy.wait(500);

    // Validação após deleção - aguardar o cenário desaparecer
    cy.contains('h3, h2, h4, .scenario-title, .card-title', nomeCenario, { timeout: 10000 })
        .should('not.exist');
})

// Função para adicionar etapa ao cenário
Cypress.Commands.add('adicionarEtapaCenario', (acao, resultadoEsperado) => {
    // Verificar se estamos na página de detalhes do cenário
    cy.url({ timeout: 10000 }).should('include', '/scenarios/');
    cy.url({ timeout: 10000 }).should('not.include', '/execution');
    
    // Clicar no botão de adicionar etapa
    cy.get('body').then(($body) => {
        if ($body.find('[data-cy="btn-add-first-step"]').length > 0) {
            cy.get('[data-cy="btn-add-first-step"]', { timeout: 10000 })
                .should('be.visible')
                .click();
        } else if ($body.find('[data-cy="btn-add-step"]').length > 0) {
            cy.get('[data-cy="btn-add-step"]', { timeout: 10000 })
                .should('be.visible')
                .click();
        } else {
            // Tentar encontrar pelo texto
            cy.contains('button', /adicionar.*etapa/i, { timeout: 10000 })
                .should('be.visible')
                .click();
        }
    });
    
    // Aguardar o diálogo abrir
    cy.get('.q-dialog', { timeout: 5000 }).should('be.visible');
    cy.contains('.dialog-header h3, .q-card-section h3', /nova etapa|editar etapa/i, { timeout: 5000 }).should('be.visible');
    
    // Preencher ação
    cy.get('body').then(($body) => {
        if ($body.find('label:contains("Ação"), .form-label:contains("Ação")').length > 0) {
            cy.contains('label', /ação/i).parent().find('textarea, input[type="text"]').first()
                .should('be.visible')
                .clear()
                .type(acao || 'Ação de teste automatizado');
        } else {
            cy.get('.q-dialog textarea, .q-dialog input[type="text"]').first()
                .should('be.visible')
                .clear()
                .type(acao || 'Ação de teste automatizado');
        }
    });
    
    // Preencher resultado esperado
    cy.get('body').then(($body) => {
        if ($body.find('label:contains("Resultado Esperado"), .form-label:contains("Resultado Esperado")').length > 0) {
            cy.contains('label', /resultado esperado/i).parent().find('textarea, input[type="text"]').first()
                .should('be.visible')
                .clear()
                .type(resultadoEsperado || 'Resultado esperado de teste automatizado');
        } else {
            cy.get('.q-dialog textarea, .q-dialog input[type="text"]').eq(1)
                .should('be.visible')
                .clear()
                .type(resultadoEsperado || 'Resultado esperado de teste automatizado');
        }
    });
    
    // Clicar em Salvar
    cy.contains('button', /salvar/i, { timeout: 5000 })
        .should('be.visible')
        .and('not.be.disabled')
        .click();
    
    // Aguardar notificação de sucesso
    cy.contains(/etapa.*adicionada.*sucesso|etapa.*atualizada.*sucesso/i, { timeout: 10000 }).should('be.visible');
    
    // Aguardar o diálogo fechar
    cy.get('.q-dialog', { timeout: 5000 }).should('not.exist');
})

// Função para iniciar execução de cenário
Cypress.Commands.add('iniciarExecucaoCenario', () => {
    // Validar que estamos na página de execução
    cy.url({ timeout: 10000 }).should('satisfy', (url) => {
        return url.includes('/execute') || url.includes('/execution');
    });

    // Aguardar que a página carregue completamente
    cy.get('.execution-header', { timeout: 15000 }).should('be.visible');

    // Clicar no botão "Iniciar Execução"
    cy.contains('button', /iniciar execução/i, { timeout: 10000 })
        .should('be.visible')
        .and('not.be.disabled')
        .click();

    // Aguardar notificação de sucesso
    cy.contains(/execução.*iniciada|execução iniciada/i, { timeout: 10000 }).should('be.visible');
})

// Função para preencher resultado real de uma etapa
Cypress.Commands.add('preencherResultadoEtapa', (resultadoReal) => {
    // Validar que estamos na página de execução
    cy.url({ timeout: 10000 }).should('satisfy', (url) => {
        return url.includes('/execute') || url.includes('/execution');
    });

    // Aguardar que o painel de detalhes da etapa apareça
    cy.get('.step-details-panel', { timeout: 10000 }).should('be.visible');
    cy.get('.step-content', { timeout: 10000 }).should('be.visible');

    // O q-editor do Quasar tem um elemento contenteditable dentro dele
    // Precisamos encontrar o elemento contenteditable dentro do .result-editor
    cy.get('.result-editor', { timeout: 10000 })
        .should('be.visible')
        .within(() => {
            // Encontrar o elemento contenteditable dentro do q-editor
            cy.get('[contenteditable="true"]', { timeout: 5000 })
                .should('be.visible')
                .then(($editor) => {
                    // Limpar o conteúdo existente
                    $editor[0].innerHTML = '';
                    // Digitar o novo conteúdo
                    cy.wrap($editor)
                        .type(resultadoReal || 'Resultado real preenchido no teste automatizado', { force: true });
                });
        });

    // Aguardar um pouco para garantir que o texto foi salvo
    cy.wait(500);
})

// Função para navegar para a próxima etapa
Cypress.Commands.add('navegarProximaEtapa', () => {
    // Validar que estamos na página de execução
    cy.url({ timeout: 10000 }).should('satisfy', (url) => {
        return url.includes('/execute') || url.includes('/execution');
    });

    // Obter o índice da etapa atual
    cy.get('.step-header h2', { timeout: 10000 }).then(($header) => {
        const headerText = $header.text();
        const match = headerText.match(/Etapa (\d+)/);
        if (match) {
            const currentStepNum = parseInt(match[1]);
            
            // Clicar na próxima etapa na lista lateral (usando o número da etapa)
            const nextStepNum = currentStepNum + 1;
            cy.get('.steps-list .step-item', { timeout: 10000 })
                .eq(nextStepNum - 1) // índice é baseado em 0
                .should('be.visible')
                .click({ force: true });
        }
    });

    // Aguardar a próxima etapa carregar
    cy.wait(500);
})

// Função para navegar para a etapa anterior
Cypress.Commands.add('navegarEtapaAnterior', () => {
    // Validar que estamos na página de execução
    cy.url({ timeout: 10000 }).should('satisfy', (url) => {
        return url.includes('/execute') || url.includes('/execution');
    });

    // Obter o índice da etapa atual
    cy.get('.step-header h2', { timeout: 10000 }).then(($header) => {
        const headerText = $header.text();
        const match = headerText.match(/Etapa (\d+)/);
        if (match) {
            const currentStepNum = parseInt(match[1]);
            
            // Só navegar se não estiver na primeira etapa
            if (currentStepNum > 1) {
                const prevStepNum = currentStepNum - 1;
                // Clicar na etapa anterior na lista lateral
                cy.get('.steps-list .step-item', { timeout: 10000 })
                    .eq(prevStepNum - 1) // índice é baseado em 0
                    .should('be.visible')
                    .click({ force: true });
            }
        }
    });

    // Aguardar a etapa anterior carregar
    cy.wait(500);
})

// Função para marcar etapa como concluída
Cypress.Commands.add('marcarEtapaComoConcluida', () => {
    // Validar que estamos na página de execução
    cy.url({ timeout: 10000 }).should('satisfy', (url) => {
        return url.includes('/execute') || url.includes('/execution');
    });

    // Aguardar que o painel de detalhes da etapa apareça
    cy.get('.step-details-panel', { timeout: 10000 }).should('be.visible');
    cy.get('.step-content', { timeout: 10000 }).should('be.visible');

    // Procurar o botão "Concluído" na seção de status
    // O botão está dentro de .status-buttons que está dentro de uma seção com "Status da Etapa"
    cy.get('.step-section', { timeout: 10000 }).then(($sections) => {
        let found = false;
        $sections.each((index, section) => {
            const $section = Cypress.$(section);
            // Verificar se esta seção contém "Status da Etapa"
            if ($section.find('h3:contains("Status da Etapa"), h3:contains("Status")').length > 0) {
                // Encontrar o botão "Concluído" dentro desta seção
                const $concluidoBtn = $section.find('button:contains("Concluído")');
                if ($concluidoBtn.length > 0 && !$concluidoBtn.is(':disabled')) {
                    cy.wrap($concluidoBtn).click({ force: true });
                    found = true;
                    return false; // break
                }
            }
        });
        
        if (!found) {
            // Fallback: procurar diretamente pelo botão "Concluído" em qualquer lugar
            cy.contains('button', /concluído/i, { timeout: 10000 })
                .should('exist')
                .then(($btn) => {
                    if (!$btn.is(':disabled')) {
                        cy.wrap($btn).click({ force: true });
                    }
                });
        }
    });

    // Aguardar um pouco para garantir que o status foi salvo
    cy.wait(500);
})

// Função para concluir execução de cenário
Cypress.Commands.add('concluirExecucaoCenario', () => {
    // Validar que estamos na página de execução
    cy.url({ timeout: 10000 }).should('satisfy', (url) => {
        return url.includes('/execute') || url.includes('/execution');
    });

    // Aguardar que o botão "Concluir Execução" apareça
    cy.contains('button', /concluir execução/i, { timeout: 10000 })
        .should('be.visible')
        .and('not.be.disabled')
        .click();

    // Aguardar notificação de conclusão (pode ser sucesso ou com falhas)
    cy.contains(/execução concluída|execução finalizada|execução concluída com sucesso|execução concluída com falhas/i, { timeout: 10000 }).should('be.visible');
})

// Função para reexecutar cenário
Cypress.Commands.add('reexecutarCenario', () => {
    // Validar que estamos na página de execução
    cy.url({ timeout: 10000 }).should('satisfy', (url) => {
        return url.includes('/execute') || url.includes('/execution');
    });

    // Aguardar que o botão "Reexecutar" apareça (só aparece quando execução está concluída ou falhou)
    cy.contains('button', /reexecutar/i, { timeout: 10000 })
        .should('be.visible')
        .and('not.be.disabled')
        .click();

    // Aguardar o diálogo de confirmação aparecer e confirmar
    cy.get('.q-dialog', { timeout: 5000 }).should('be.visible');
    cy.contains('.q-dialog', /reexecutar cenário|tem certeza/i, { timeout: 5000 }).should('be.visible');
    
    // O botão pode estar coberto pelo backdrop, então usamos force: true
    cy.get('.q-dialog', { timeout: 5000 }).within(() => {
        cy.contains('button', /reexecutar/i, { timeout: 5000 })
            .should('exist')
            .click({ force: true });
    });

    // Aguardar notificação de reexecução
    // A mensagem é "Cenário reiniciado! Você pode executar novamente."
    cy.contains(/cenário reiniciado|execução iniciada|execução.*iniciada|você pode executar novamente/i, { timeout: 10000 }).should('be.visible');
    
    // Aguardar o diálogo fechar
    cy.get('.q-dialog', { timeout: 5000 }).should('not.exist');
})