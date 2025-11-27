// Função para adicionar membro por email (envia convite)
Cypress.Commands.add('adicionarMembroPorEmail', (email, role = 'Testador') => {
    // Navegar para a seção de membros
    cy.get('.members-section', { timeout: 5000 }).should('be.visible');
    
    // Clicar no botão "Adicionar Membro"
    cy.get('[data-cy="btn-add-member"]', { timeout: 5000 })
      .should('be.visible')
      .click();
    
    // Validar que o diálogo de adicionar membro está aberto
    cy.get('[data-cy="dialog-add-member"]', { timeout: 5000 })
      .should('be.visible');
    
    // Preencher o formulário de adicionar membro
    cy.get('[data-cy="input-member-email"]', { timeout: 5000 })
      .should('be.visible')
      .type(email);
    
    // Selecionar a role (função) do membro
    cy.get('[data-cy="select-member-role"]', { timeout: 5000 })
      .should('be.visible')
      .click({ force: true });
    
    // Aguardar o menu de opções abrir e selecionar a role
    cy.get('[role="listbox"]', { timeout: 5000 })
      .should('be.visible')
      .contains('[role="option"]', role)
      .click();
    
    // Submeter o formulário
    cy.get('[data-cy="btn-submit-add-member"]', { timeout: 5000 })
      .should('be.visible')
      .and('not.be.disabled')
      .click();
    
    // Validar notificação de sucesso
    cy.contains(/convite enviado com sucesso/i, { timeout: 15000 }).should('be.visible');
    
    // Validar que o diálogo foi fechado
    cy.get('[data-cy="dialog-add-member"]').should('not.exist');
})

// Função para aceitar convite de projeto
Cypress.Commands.add('aceitarConvite', (nomeProjeto) => {
    // Acessar página de convites
    cy.get('[data-cy="card-dashboard-invites"]', { timeout: 5000 })
      .should('be.visible')
      .click();
    
    // Validar que está na página de convites
    cy.url({ timeout: 10000 }).should('include', '/invites');
    
    // Aguardar os convites carregarem
    cy.get('[data-cy="grid-invites"]', { timeout: 10000 }).should('be.visible');
    
    // Encontrar o convite pendente do projeto
    cy.get('[data-cy^="card-invite-"]', { timeout: 10000 })
      .should('have.length.at.least', 1)
      .contains(nomeProjeto)
      .parents('[data-cy^="card-invite-"]')
      .within(() => {
        // Validar que o status é PENDING
        cy.contains(/pendente/i).should('be.visible');
        
        // Clicar no botão de aceitar convite
        cy.get('[data-cy^="btn-accept-invite-"]', { timeout: 5000 })
          .should('be.visible')
          .click();
      });
    
    // Validar que o diálogo de aceitar convite está aberto
    cy.get('[data-cy="dialog-accept-invite"]', { timeout: 5000 })
      .should('be.visible');
    
    // Confirmar aceitação do convite
    cy.get('[data-cy="btn-confirm-accept-invite"]', { timeout: 5000 })
      .should('be.visible')
      .click();
    
    // Aguardar um pouco para a requisição ser processada
    cy.wait(1000);
    
    // Validar notificação de sucesso (pode estar em uma notificação do Quasar)
    // A notificação pode aparecer como um elemento com a classe .q-notification ou similar
    cy.get('body', { timeout: 10000 }).then(($body) => {
      // Verificar se a mensagem aparece na página ou em uma notificação
      if ($body.text().includes('Convite aceito com sucesso') || 
          $body.text().includes('convite aceito com sucesso') ||
          $body.find('.q-notification').length > 0) {
        cy.log('✅ Notificação de sucesso encontrada')
      } else {
        // Se não encontrou, verificar se o convite foi aceito verificando o status
        cy.contains(/pendente/i).should('not.exist')
        cy.log('✅ Convite aceito (verificado pela ausência do status pendente)')
      }
    })
})

// Função para validar que um membro aparece na lista
Cypress.Commands.add('validarMembroNaLista', (email, nomeContem = null) => {
    // Validar que a tabela de membros está visível
    cy.get('[data-cy="table-members"]', { timeout: 10000 }).should('be.visible');
    
    // Aguardar que a tabela carregue completamente
    cy.get('[data-cy="table-members"]').within(() => {
      cy.get('tbody tr', { timeout: 15000 }).should('have.length.at.least', 1);
    });
    
    // Validar pelo nome se fornecido
    if (nomeContem) {
      cy.get('[data-cy="table-members"]', { timeout: 15000 })
        .should('contain.text', nomeContem);
    }
    
    // Validar pelo email (case-insensitive)
    cy.get('[data-cy="table-members"]').then(($table) => {
      const tableText = $table.text().toLowerCase();
      expect(tableText).to.include(email.toLowerCase());
    });
})

// Função para buscar membro na tabela
Cypress.Commands.add('buscarMembro', (textoBusca) => {
    // Primeiro, garantir que não há busca ativa
    cy.get('[data-cy="input-search-members"]', { timeout: 5000 })
      .should('be.visible')
      .clear();
    
    // Aguardar que a busca seja limpa
    cy.wait(500);
    
    // Preencher o campo de busca
    cy.get('[data-cy="input-search-members"]')
      .should('be.visible')
      .type(textoBusca);
    
    // Aguardar debounce da busca
    cy.wait(1000);
    
    // Validar que a busca filtra os resultados
    cy.get('[data-cy="table-members"]').within(() => {
      cy.get('tbody tr', { timeout: 10000 }).should('have.length.at.least', 1);
    });
    
    // Validar que o texto buscado aparece na tabela (case-insensitive)
    cy.get('[data-cy="table-members"]', { timeout: 10000 }).then(($table) => {
      const tableText = $table.text().toLowerCase();
      const searchText = textoBusca.toLowerCase();
      expect(tableText).to.include(searchText);
    });
})

// Função para limpar busca de membros
Cypress.Commands.add('limparBuscaMembros', () => {
    cy.get('[data-cy="btn-clear-member-search"]', { timeout: 5000 })
      .should('be.visible')
      .click();
    
    // Aguardar que a busca seja limpa
    cy.wait(500);
})

// Função para encontrar linha do membro na tabela (helper interno)
Cypress.Commands.add('encontrarLinhaMembro', (email) => {
    return cy.get('[data-cy="table-members"]').within(() => {
      return cy.get('tbody tr').filter((index, el) => {
        return el.textContent.toLowerCase().includes(email.toLowerCase());
      }).first();
    });
})

// Função para editar role de membro
Cypress.Commands.add('editarRoleMembro', (email, novoRole) => {
    // Mapear roles para labels em português
    const roleLabels = {
      'OWNER': 'Dono',
      'MANAGER': 'Gerente',
      'TESTER': 'Testador',
      'APPROVER': 'Aprovador'
    };
    
    const roleLabel = roleLabels[novoRole] || novoRole;
    
    // Encontrar o membro na tabela e clicar no botão de editar role
    cy.get('[data-cy="table-members"]', { timeout: 10000 }).within(() => {
      cy.get('tbody tr').filter((index, el) => {
        return el.textContent.toLowerCase().includes(email.toLowerCase());
      }).first().within(() => {
        // Clicar no botão de editar role
        cy.get('[data-cy^="btn-edit-role-member-"]', { timeout: 5000 })
          .should('be.visible')
          .click();
      });
    });
    
    // Validar que o select de role está visível e abrir
    cy.get('[data-cy="table-members"]').within(() => {
      cy.get('tbody tr').filter((index, el) => {
        return el.textContent.toLowerCase().includes(email.toLowerCase());
      }).first().within(() => {
        cy.get('.q-select').should('be.visible').click({ force: true });
      });
    });
    
    // Selecionar nova role
    cy.get('[role="listbox"]', { timeout: 10000 })
      .should('be.visible')
      .contains('[role="option"]', roleLabel)
      .click();
    
    // Validar notificação de sucesso
    cy.contains(/cargo do membro atualizado com sucesso/i, { timeout: 5000 }).should('be.visible');
    
    // Validar que o role foi atualizado na tabela
    cy.get('[data-cy="table-members"]').within(() => {
      cy.get('tbody tr').filter((index, el) => {
        return el.textContent.toLowerCase().includes(email.toLowerCase());
      }).first().within(() => {
        // Validar que agora é o novo role (o chip mostra o valor em inglês)
        cy.contains(novoRole).should('be.visible');
      });
    });
})

// Função para remover membro
Cypress.Commands.add('removerMembro', (email) => {
    // Encontrar o membro na tabela e clicar no botão de remover
    cy.get('[data-cy="table-members"]').within(() => {
      cy.get('tbody tr').filter((index, el) => {
        return el.textContent.toLowerCase().includes(email.toLowerCase());
      }).first().within(() => {
        // Clicar no botão de remover membro
        cy.get('[data-cy^="btn-remove-member-"]', { timeout: 5000 })
          .should('be.visible')
          .click();
      });
    });
    
    // Validar que o diálogo de remover membro está aberto
    cy.get('[data-cy="dialog-remove-member"]', { timeout: 5000 })
      .should('be.visible');
    
    // Confirmar remoção
    cy.get('[data-cy="btn-confirm-remove-member"]', { timeout: 5000 })
      .should('be.visible')
      .click();
    
    // Validar notificação de sucesso
    cy.contains(/membro removido com sucesso/i, { timeout: 5000 }).should('be.visible');
    
    // Validar que o membro não aparece mais na lista
    cy.get('[data-cy="table-members"]', { timeout: 10000 }).within(() => {
      cy.contains('td', email).should('not.exist');
    });
})

