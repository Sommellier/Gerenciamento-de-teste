// Função para o fluxo "Criação de cenario
Cypress.Commands.add('criarProjeto', (nomeProjeto, descricaoProjeto) => {
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
Cypress.Commands.add('validarCriacaoProjeto', (nomeProjeto, descricaoProjeto) => {
    cy.findByRole('heading', { name: nomeProjeto })
        .should('be.visible')
        .parents('.project-card')
        .within(() => {
            cy.findByRole('heading', { name: nomeProjeto })
                .should('be.visible')
            cy.get('.project-description')
                .should('contain.text', descricaoProjeto)
            cy.findByText(/ativo/i).should('be.visible')
            cy.findByText(/criado em/i).should('be.visible')
        })
})

//Editar projeto
Cypress.Commands.add('editarProjeto', (nomeProjetoEditado, nomeProjetoOriginal) => {
    cy.contains('.project-card .project-title', nomeProjetoOriginal || /meu projeto/i)
        .parents('.project-card')
        .within(() => {
            cy.get('button.project-menu-button[aria-label="Ações do projeto"]').click()
        })
    cy.contains('button', /editar/i).should('be.visible').click()
    cy.findByPlaceholderText(/digite o nome do projeto/i)
        .focus()
        .type('{selectAll}{backspace}')
        .type(nomeProjetoEditado)
       cy.findByPlaceholderText(/Descreva o objetivo do projeto/i)
        .focus()
        .type('{selectAll}{backspace}')
        .type('Nova descrição do projeto')
    cy.findByRole('button', { name: /salvar alterações/i }).click()
    cy.findByRole('button', { name: /ok/i }).click()
    // Validação após edição
    cy.findByRole('heading', { name: nomeProjetoEditado })
        .should('be.visible')
})


// Função para o fluxo "Deletar projeto"
Cypress.Commands.add('deletarProjeto', (nomeProjetoEditado) => {
    cy.contains('h3.project-title', nomeProjetoEditado)
        .parents('.project-card')
        .findByRole('button', { name: /Ações do projeto/i })
        .click()
    cy.intercept('DELETE', '**/projects/**').as('deleteProject')
    cy.contains('button.menu-action.danger', /excluir/i).click()
    cy.contains('button', /excluir/i).click()
    cy.wait('@deleteProject').its('response.statusCode').should('be.oneOf', [200, 204])
    cy.contains('.project-card .project-title', nomeProjetoEditado).should('not.exist')
})

// Função para acessar detalhes do projeto pelo nome
Cypress.Commands.add('acessarDetalhesProjeto', (nomeProjeto) => {
    // Navegar para a página de projetos se não estiver lá
    cy.url().then((url) => {
      if (!url.includes('/projects')) {
        cy.visit('/projects');
        cy.url({ timeout: 10000 }).should('include', '/projects');
      }
    });
    
    // Encontrar e clicar no projeto pelo nome
    cy.findByRole('heading', { name: nomeProjeto }, { timeout: 10000 })
      .should('be.visible')
      .parents('.project-card')
      .click();
    
    // Validar que está na página de detalhes do projeto
    cy.url({ timeout: 10000 }).should('include', '/projects/');
    cy.get('.project-title', { timeout: 15000 }).should('contain.text', nomeProjeto);
})

// Função para validar informações básicas do projeto no header
Cypress.Commands.add('validarHeaderProjeto', (nomeProjeto, descricaoProjeto) => {
    cy.get('.project-title', { timeout: 10000 }).should('contain.text', nomeProjeto);
    if (descricaoProjeto) {
      cy.get('.project-description').should('contain.text', descricaoProjeto);
    }
})

// Função para selecionar release e validar filtro
Cypress.Commands.add('selecionarRelease', () => {
    // Validar que o seletor de release existe
    cy.get('[data-cy="select-release"]', { timeout: 10000 })
      .should('be.visible');
    
    // Clicar no seletor de release
    cy.get('[data-cy="select-release"]').click({ force: true });
    
    // Aguardar o menu de opções abrir
    cy.get('[role="listbox"]', { timeout: 5000 })
      .should('be.visible');
    
    // Capturar o texto da primeira release disponível
    cy.get('[role="listbox"] [role="option"]')
      .first()
      .invoke('text')
      .then((releaseText) => {
        const releaseTextTrimmed = releaseText.trim();
        
        // Selecionar a primeira release
        cy.get('[role="listbox"] [role="option"]').first().click();
        
        // Aguardar o filtro ser aplicado (a página recarrega os dados)
        cy.wait(2000);
        
        // Validar que a release selecionada está visível no seletor
        cy.get('[data-cy="select-release"]', { timeout: 10000 })
          .should('be.visible')
          .and(($select) => {
            const selectText = $select.text();
            expect(selectText).to.include(releaseTextTrimmed);
          });
        
        // Validar que as métricas foram atualizadas com o filtro
        cy.get('.metrics-container', { timeout: 5000 }).should('be.visible');
      });
})

// Função para validar métricas e KPIs do projeto
Cypress.Commands.add('validarMetricasProjeto', () => {
    // Validar que a seção de métricas existe
    cy.get('.kpi-section', { timeout: 10000 }).should('be.visible');
    cy.contains('.section-title', 'Métricas de Teste').should('be.visible');
    
    // Validar gráficos e KPIs
    cy.get('.metrics-container', { timeout: 10000 }).should('be.visible');
    
    // Validar totais (Total de Pacotes e Total de Cenários)
    cy.contains('.total-label', 'Total de Pacotes').should('be.visible');
    cy.contains('.total-label', 'Total de Cenários').should('be.visible');
    
    // Validar valores dos totais (devem ser números)
    cy.get('.total-value').should('be.visible').each(($value) => {
      cy.wrap($value).invoke('text').should('match', /^\d+$/);
    });
    
    // Validar distribuições (Pacotes por status e Cenários por status)
    cy.contains('.legend-subtitle', 'Pacotes por status').should('be.visible');
    cy.contains('.legend-subtitle', 'Cenários por status').should('be.visible');
    
    // Validar legendas de status
    cy.contains('.legend-label', 'Criados').should('be.visible');
    cy.contains('.legend-label', 'Executados').should('be.visible');
    cy.contains('.legend-label', 'Concluídos').should('be.visible');
    cy.contains('.legend-label', 'Falharam').should('be.visible');
    
    // Validar gráfico (pode estar vazio se não houver dados suficientes)
    cy.get('body').then(($body) => {
      if ($body.find('.apexcharts-canvas').length > 0) {
        cy.get('.apexcharts-canvas').should('be.visible');
      } else {
        // Se não houver gráfico, validar mensagem de "Nenhum dado para exibir"
        cy.get('.no-data-chart').should('be.visible');
      }
    });
    
    // Validar gráficos adicionais de analytics
    cy.get('.analytics-section', { timeout: 5000 }).should('be.visible');
    cy.contains('.section-title', 'Pacotes por Prioridade').should('be.visible');
    cy.contains('.section-title', 'Pacotes Criados por Mês').should('be.visible');
    cy.contains('.section-title', 'Status dos Pacotes').should('be.visible');
})

// Função para validar lista de membros do projeto
Cypress.Commands.add('validarListaMembros', () => {
    // Validar seção de membros
    cy.get('.members-section', { timeout: 5000 }).should('be.visible');
    cy.contains('.section-title', 'Membros do Projeto').should('be.visible');
    
    // Validar tabela de membros
    cy.get('[data-cy="table-members"]', { timeout: 5000 }).should('be.visible');
    
    // Validar campo de busca de membros
    cy.get('[data-cy="input-search-members"]').should('be.visible');
    
    // Validar que há pelo menos um membro (o criador do projeto)
    cy.get('[data-cy="table-members"]').within(() => {
      cy.get('tbody tr').should('have.length.at.least', 1);
      
      // Validar colunas da tabela
      cy.contains('th', /nome|name/i).should('be.visible');
      cy.contains('th', /email/i).should('be.visible');
      cy.contains('th', /função|role/i).should('be.visible');
    });
})

// Função para validar lista de pacotes e navegação
Cypress.Commands.add('validarListaPacotes', (nomePacote = 'Meu pacote automatizado') => {
    // Validar seção de pacotes
    cy.contains('.section-title', 'Pacotes de Teste').should('be.visible');
    
    // Validar botão "Ver Pacotes"
    cy.get('[data-cy="btn-view-packages"]', { timeout: 5000 })
      .should('be.visible')
      .and('not.be.disabled');
    
    // Clicar no botão "Ver Pacotes" para validar navegação
    cy.get('[data-cy="btn-view-packages"]').click();
    
    // Validar que foi redirecionado para a página de pacotes
    cy.url({ timeout: 10000 }).should('include', '/packages');
    
    // Validar que a lista de pacotes está visível
    cy.get('[data-cy="grid-packages"]', { timeout: 10000 }).should('be.visible');
    
    // Validar que o pacote criado está na lista (se fornecido)
    if (nomePacote) {
      cy.contains('.package-card h3', nomePacote, { timeout: 10000 })
        .should('be.visible');
    }
})