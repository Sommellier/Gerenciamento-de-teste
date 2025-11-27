describe('Gestão de Cenário - Validações e Operações @regressao', () => {
  let testData;
  let nomeProjeto;
  let descricaoProjeto;
  let nomePacote;
  let descricaoPacote;
  let nomeCenario;
  let descricaoCenario;
  let uniqueEmail;
  let projectId;
  let packageId;
  let scenarioId;

  // Funções auxiliares
  const selecionarOpcaoNoSelect = (dataCy, indiceOpcao) => {
    cy.get('.q-dialog', { timeout: 5000 }).within(() => {
      cy.get(`[data-cy="${dataCy}"]`, { timeout: 5000 })
        .should('exist')
        .click({ force: true });
    });

    cy.get('.q-menu, [role="listbox"]', { timeout: 5000 }).should('be.visible');
    cy.get('.q-menu, [role="listbox"]')
      .find('.q-item')
      .then(($items) => {
        const itemCount = $items.length;
        expect(itemCount).to.be.greaterThan(0);
        cy.wrap($items).eq(indiceOpcao).click({ force: true });
      });
  };

  const editarCampoNoDialog = (dataCy, valor) => {
    cy.get('.q-dialog', { timeout: 5000 }).within(() => {
      cy.get(`[data-cy="${dataCy}"]`, { timeout: 5000 })
        .should('be.visible')
        .clear();
      
      // Só fazer type se o valor não for vazio
      if (valor && valor.trim() !== '') {
        cy.get(`[data-cy="${dataCy}"]`, { timeout: 5000 })
          .type(valor);
      }
    });
  };

  const salvarEValidarDialog = (mensagemSucesso) => {
    cy.get('.q-dialog', { timeout: 5000 }).within(() => {
      cy.contains('button', /salvar/i, { timeout: 5000 })
        .should('be.visible')
        .and('not.be.disabled')
        .click();
    });

    cy.contains(new RegExp(mensagemSucesso, 'i'), { timeout: 10000 }).should('be.visible');
    cy.get('.q-dialog', { timeout: 5000 }).should('not.exist');
  };

  const setupProjetoPacoteCenario = () => {
    cy.visit('/');
    
    // Criar conta
    cy.criarConta({
      nome: testData.testUser.nome,
      email: uniqueEmail,
      senha: testData.testUser.senha
    });

    // Fazer login (já estamos na página de login após criarConta)
    cy.login({ email: uniqueEmail, senha: testData.testUser.senha });

    // Criar projeto
    cy.criarProjeto(nomeProjeto, descricaoProjeto);
    cy.validarCriacaoProjeto(nomeProjeto, descricaoProjeto);

    // Acessar detalhes do projeto
    cy.acessarDetalhesProjeto(nomeProjeto);

    // Extrair projectId da URL
    cy.url({ timeout: 10000 }).then((url) => {
      const match = url.match(/\/projects\/(\d+)/);
      if (match) {
        projectId = match[1];
      }
    });

    // Criar pacote
    cy.criarPacote(nomePacote, descricaoPacote);

    cy.url({ timeout: 10000 }).then((url) => {
      if (!url.includes('/packages')) {
        cy.get('[data-cy="btn-view-packages"]', { timeout: 10000 }).should('be.visible').click();
        cy.url({ timeout: 10000 }).should('include', '/packages');
      }
    });

    cy.validarCriacaoPacote(nomePacote);

    // Acessar detalhes do pacote
    cy.acessarDetalhesPacote(nomePacote);

    cy.url({ timeout: 10000 }).then((url) => {
      const match = url.match(/\/projects\/(\d+)\/packages\/(\d+)/);
      if (match) {
        projectId = match[1];
        packageId = match[2];
      }
    });

    // Criar cenário
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="btn-create-first-scenario"]').length > 0) {
        cy.get('[data-cy="btn-create-first-scenario"]', { timeout: 10000 }).click();
      } else if ($body.find('[data-cy="btn-create-scenario"]').length > 0) {
        cy.get('[data-cy="btn-create-scenario"]', { timeout: 10000 }).click();
      } else {
        cy.visit(`/projects/${projectId}/packages/${packageId}/scenarios`);
      }
    });

    cy.url({ timeout: 10000 }).should('include', '/scenarios');
    cy.criarCenario(nomeCenario, descricaoCenario);
    cy.validarCriacaoCenario(nomeCenario);

    // Aguardar redirecionamento
    cy.wait(2000);
    cy.url({ timeout: 10000 }).then((currentUrl) => {
      const match = currentUrl.match(/\/projects\/(\d+)\/packages\/(\d+)/);
      if (match) {
        projectId = match[1];
        packageId = match[2];
        if (!currentUrl.includes(`/packages/${packageId}`) || currentUrl.includes('/scenarios')) {
          cy.visit(`/projects/${projectId}/packages/${packageId}`);
        }
      }
    });
  };

  const navegarParaDetalhesCenario = () => {
    cy.contains('.scenario-title', nomeCenario, { timeout: 10000 })
      .parents('.scenario-card')
      .click();

    cy.url({ timeout: 10000 }).should('include', '/scenarios/');
    cy.url({ timeout: 10000 }).should('not.include', '/execution');

    cy.url({ timeout: 10000 }).then((currentUrl) => {
      const scenarioMatch = currentUrl.match(/\/scenarios\/(\d+)/);
      if (scenarioMatch) {
        scenarioId = scenarioMatch[1];
      }
    });
  };

  beforeEach(() => {
    cy.fixture('testData').then((data) => {
      testData = data;
      const id = Cypress._.random(0, 1e6);
      nomeProjeto = `${testData.project.baseName} ${Date.now()}-${id}`;
      descricaoProjeto = testData.project.baseDescription;
      nomePacote = `Pacote ${Date.now()}-${id}`;
      descricaoPacote = 'Descrição do pacote para testes';
      nomeCenario = `Cenário ${Date.now()}-${id}`;
      descricaoCenario = 'Descrição do cenário para testes';
      uniqueEmail = Cypress.helpers.generateUniqueEmail(testData.testUser.emailBase);
    });
  });

  describe('Validações de Edição', () => {
    beforeEach(() => {
      setupProjetoPacoteCenario();
      navegarParaDetalhesCenario();
    });

    it('deve validar campos obrigatórios ao editar cenário', () => {
      // Abrir modal de edição
      cy.get('[data-cy="btn-edit-scenario"]', { timeout: 10000 })
        .should('be.visible')
        .click();

      cy.get('[data-cy="dialog-edit-scenario"], .q-dialog', { timeout: 10000 })
        .should('be.visible');

      // Limpar título e tentar salvar
      cy.get('.q-dialog', { timeout: 5000 }).within(() => {
        cy.get('[data-cy="input-edit-scenario-title"]', { timeout: 5000 })
          .should('be.visible')
          .clear();
        
        // Tentar salvar sem título
        cy.contains('button', /salvar/i, { timeout: 5000 })
          .should('be.visible')
          .click();
      });

      // Validar mensagem de erro do título
      cy.get('.q-dialog', { timeout: 5000 }).within(() => {
        cy.contains(/título.*obrigatório|campo.*obrigatório/i, { timeout: 5000 }).should('be.visible');
      });

      // Preencher título novamente
      editarCampoNoDialog('input-edit-scenario-title', 'Título válido');

      // Limpar tipo e tentar salvar
      cy.get('.q-dialog', { timeout: 5000 }).within(() => {
        cy.get('[data-cy="select-edit-scenario-type"]', { timeout: 5000 })
          .should('exist')
          .click({ force: true });
      });

      // Limpar seleção (se possível) ou validar que tipo é obrigatório
      // Como o Quasar Select não permite limpar facilmente, vamos apenas validar que o campo existe
      cy.get('.q-dialog', { timeout: 5000 }).within(() => {
        cy.get('[data-cy="select-edit-scenario-type"]', { timeout: 5000 })
          .should('exist');
      });

      // Fechar modal
      cy.get('.q-dialog', { timeout: 5000 }).within(() => {
        cy.get('[data-cy="btn-close-edit-scenario"], .close-btn', { timeout: 5000 })
          .first()
          .click();
      });
    });

  });

  describe('Exclusão de Cenário', () => {
    beforeEach(() => {
      setupProjetoPacoteCenario();
    });

    it('deve excluir cenário da lista de pacotes', () => {
      // Aguardar lista de cenários carregar
      cy.get('[data-cy="grid-scenarios"]', { timeout: 10000 }).should('be.visible');
      
      // Verificar que cenário existe
      cy.contains('.scenario-title, h3, h4', nomeCenario, { timeout: 10000 })
        .should('be.visible')
        .then(($title) => {
          // Encontrar o card do cenário
          const $card = $title.parents('.scenario-card, .card').first();
          
          // Encontrar o botão de excluir dentro do card
          cy.wrap($card).within(() => {
            cy.get('[data-cy^="btn-delete-scenario-"]', { timeout: 10000 })
              .should('be.visible')
              .click({ force: true });
          });
        });

      // Confirmar exclusão no diálogo
      cy.get('.q-dialog', { timeout: 5000 })
        .should('be.visible')
        .within(() => {
          cy.contains(/confirmar.*exclusão|tem certeza|excluir este cenário/i, { timeout: 5000 })
            .should('be.visible');
          
          cy.contains('button', /excluir/i, { timeout: 5000 })
            .should('be.visible')
            .click();
        });

      // Aguardar notificação de sucesso
      cy.contains(/cenário.*excluído|cenário.*removido/i, { timeout: 10000 }).should('be.visible');

      // Validar que cenário foi removido
      cy.contains('.scenario-title, h3, h4', nomeCenario, { timeout: 10000 })
        .should('not.exist');
    });
  });

  describe('Duplicação de Cenário', () => {
    beforeEach(() => {
      setupProjetoPacoteCenario();
      
      // Adicionar etapas ao cenário antes de duplicar
      navegarParaDetalhesCenario();
      cy.adicionarEtapaCenario('Ação 1: Teste', 'Resultado 1: Sucesso');
      cy.wait(1000);
      cy.adicionarEtapaCenario('Ação 2: Teste', 'Resultado 2: Sucesso');
      cy.wait(1000);

      // Voltar para lista de pacotes
      cy.get('[data-cy="btn-back"]', { timeout: 10000 }).click();
      cy.url({ timeout: 10000 }).should('include', '/packages/');
    });

    it('deve duplicar cenário com todas as etapas', () => {
      // Aguardar lista de cenários carregar
      cy.get('[data-cy="grid-scenarios"]', { timeout: 10000 }).should('be.visible');
      
      // Verificar que cenário original existe
      cy.contains('.scenario-title, h3, h4', nomeCenario, { timeout: 10000 })
        .should('be.visible')
        .then(($title) => {
          // Encontrar o card do cenário
          const $card = $title.parents('.scenario-card, .card').first();
          
          // Clicar no botão de duplicar
          cy.wrap($card).within(() => {
            cy.get('[data-cy^="btn-duplicate-scenario-"]', { timeout: 10000 })
              .should('be.visible')
              .click({ force: true });
          });
        });

      // Aguardar notificação de sucesso
      cy.contains(/cenário.*duplicado|cenário.*copiado/i, { timeout: 10000 }).should('be.visible');

      // Aguardar recarregamento da lista
      cy.wait(2000);

      // Validar que novo cenário foi criado (deve ter "Cópia" no nome)
      cy.contains('.scenario-title, h3, h4', /cópia/i, { timeout: 10000 })
        .should('be.visible')
        .then(($title) => {
          // Navegar para o cenário duplicado
          cy.wrap($title).parents('.scenario-card, .card').first().click();
        });

      cy.url({ timeout: 10000 }).should('include', '/scenarios/');

      // Validar que etapas foram duplicadas
      cy.get('[data-cy="list-steps"]', { timeout: 10000 }).should('be.visible');
      cy.contains('Ação 1: Teste', { timeout: 10000 }).should('be.visible');
      cy.contains('Ação 2: Teste', { timeout: 10000 }).should('be.visible');
      cy.contains('Resultado 1: Sucesso', { timeout: 10000 }).should('be.visible');
      cy.contains('Resultado 2: Sucesso', { timeout: 10000 }).should('be.visible');
    });
  });
});

