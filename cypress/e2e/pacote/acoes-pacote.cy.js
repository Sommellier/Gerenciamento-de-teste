describe('Fluxo de visualização de pacote @regressao', () => {
  let testData;
  let nomeProjeto;
  let descricaoProjeto;
  let nomePacote;
  let descricaoPacote;
  let nomeCenario;
  let descricaoCenario;
  let tituloBug;
  let novoTituloBug;
  let uniqueEmail;

  beforeEach(() => {
    cy.fixture('testData').then((data) => {
      testData = data;
      const id = Cypress._.random(0, 1e6);
      nomeProjeto = `${testData.project.baseName} ${Date.now()}-${id}`;
      descricaoProjeto = testData.project.baseDescription;
      nomePacote = 'Meu pacote automatizado';
      descricaoPacote = 'Descrição do pacote gerada no teste';
      nomeCenario = 'Cenário para teste de visualização';
      descricaoCenario = 'Descrição do cenário para teste';
      tituloBug = `Bug de teste ${Date.now()}-${id}`;
      novoTituloBug = `Bug editado ${Date.now()}-${id}`;
      uniqueEmail = Cypress.helpers.generateUniqueEmail(testData.testUser.emailBase);
    });
  });

  it('visualiza pacote completo com informações, métricas, cenários e bugs', () => {
    cy.visit('/');
    
    // Criar conta antes de fazer login
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
    
    // Criar um pacote
    cy.criarPacote();
    
    // Aguardar o pacote ser criado e navegar para a página de pacotes
    cy.url({ timeout: 10000 }).then((url) => {
      if (!url.includes('/packages')) {
        cy.get('[data-cy="btn-view-packages"]', { timeout: 10000 }).should('be.visible').click();
        cy.url({ timeout: 10000 }).should('include', '/packages');
      }
    });
    
    // Validar criação do pacote
    cy.validarCriacaoPacote();
    
    // Acessar detalhes do pacote
    cy.acessarDetalhesPacote(nomePacote);
    
    // Validar informações do pacote (nome, descrição, status, tipo, prioridade)
    cy.validarInformacoesPacote(nomePacote, descricaoPacote);
    
    // Validar métricas do pacote
    cy.validarMetricasPacote();
    
    // Extrair projectId e packageId da URL antes de criar o cenário
    cy.url({ timeout: 10000 }).then((url) => {
      const match = url.match(/\/projects\/(\d+)\/packages\/(\d+)/);
      if (match) {
        const projectId = match[1];
        const packageId = match[2];
        
        // Criar um cenário para ter dados nas métricas e poder criar um bug
        cy.get('body').then(($body) => {
          if ($body.find('[data-cy="btn-create-first-scenario"]').length > 0) {
            cy.get('[data-cy="btn-create-first-scenario"]', { timeout: 10000 }).click();
          } else if ($body.find('[data-cy="btn-create-scenario"]').length > 0) {
            cy.get('[data-cy="btn-create-scenario"]', { timeout: 10000 }).click();
          } else {
            // Se não há botão, navegar para criar cenário
            cy.visit(`/projects/${projectId}/packages/${packageId}/scenarios`);
          }
        });
        
        // Criar cenário
        cy.url({ timeout: 10000 }).should('include', '/scenarios');
        cy.criarCenario(nomeCenario, descricaoCenario);
        
        // Validar criação do cenário
        cy.validarCriacaoCenario(nomeCenario);
        
        // Após criar o cenário, há um redirecionamento automático para os detalhes do pacote após 1.5s
        // Aguardar o redirecionamento ou navegar diretamente
        cy.wait(2000); // Aguardar o redirecionamento automático
        cy.url({ timeout: 10000 }).then((currentUrl) => {
          // Se não estiver nos detalhes do pacote, navegar diretamente
          if (!currentUrl.includes(`/packages/${packageId}`) || currentUrl.includes('/scenarios')) {
            cy.visit(`/projects/${projectId}/packages/${packageId}`);
          }
        });
        
        // Validar que estamos nos detalhes do pacote
        cy.url({ timeout: 10000 }).should('include', '/packages/');
        cy.url({ timeout: 10000 }).should('not.include', '/scenarios');
        cy.get('.package-title', { timeout: 10000 }).should('contain.text', nomePacote);
      }
    });
    
    // Validar lista de cenários
    cy.validarListaCenarios();
    
    // Navegar para os detalhes do cenário para adicionar uma etapa
    // Extrair projectId e packageId da URL atual
    cy.url({ timeout: 10000 }).then((url) => {
      const match = url.match(/\/projects\/(\d+)\/packages\/(\d+)/);
      if (match) {
        const projectId = match[1];
        const packageId = match[2];
        
        // Encontrar o cenário pelo nome e clicar nele para abrir os detalhes
        cy.get('[data-cy="grid-scenarios"]', { timeout: 10000 }).should('be.visible');
        cy.contains('.scenario-title', nomeCenario, { timeout: 10000 })
          .should('be.visible')
          .click();
        
        // Aguardar navegação para os detalhes do cenário
        cy.url({ timeout: 10000 }).should('include', '/scenarios/');
        cy.url({ timeout: 10000 }).should('not.include', '/execution');
        
        // Adicionar uma etapa ao cenário
        cy.adicionarEtapaCenario('Ação de teste para criar bug', 'Resultado esperado da ação');
        
        // Aguardar a etapa ser salva e a página atualizar
        cy.wait(1000);
        
        // Extrair o scenarioId da URL atual
        cy.url({ timeout: 10000 }).then((currentUrl) => {
          const scenarioMatch = currentUrl.match(/\/scenarios\/(\d+)/);
          if (scenarioMatch) {
            const scenarioId = scenarioMatch[1];
            const executionUrl = `/projects/${projectId}/packages/${packageId}/scenarios/${scenarioId}/execute`;
            
            // Interceptar window.open para capturar a URL
            cy.window().then((win) => {
              cy.stub(win, 'open').as('windowOpen');
            });
            
            // Clicar no botão "EXECUTAR"
            cy.get('[data-cy="btn-execute-scenario"]', { timeout: 10000 })
              .should('be.visible')
              .and('not.be.disabled')
              .click();
            
            // Aguardar o window.open ser chamado e capturar a URL
            cy.get('@windowOpen').should('have.been.called').then((stub) => {
              // Obter a URL que foi passada para window.open
              const calledUrl = stub.getCall(0).args[0];
              // Navegar para a URL na mesma aba
              if (calledUrl) {
                cy.visit(calledUrl);
              } else {
                // Fallback: usar a URL construída
                cy.visit(executionUrl);
              }
            });
          }
        });
      }
    });
    
    // Aguardar a página de execução carregar (URL pode ser /execute ou /execution)
    cy.url({ timeout: 10000 }).should('satisfy', (url) => {
      return url.includes('/execute') || url.includes('/execution');
    });
    
    // Aguardar que a página de execução carregue completamente
    // Verificar se estamos realmente na página de execução (não na página de detalhes)
    cy.get('body', { timeout: 15000 }).should(($body) => {
      // Se ainda estiver na página de detalhes, aguardar mais
      const isDetailsPage = $body.find('.scenario-details-page, [data-cy="btn-execute-scenario"]').length > 0;
      const isExecutionPage = $body.find('.scenario-execution-page, .execution-header, .execution-content').length > 0;
      
      // Se estiver na página de detalhes, pode ser que precise aguardar o redirecionamento
      if (isDetailsPage && !isExecutionPage) {
        cy.wait(2000);
      }
    });
    
    // Aguardar que a página de execução apareça
    cy.get('.scenario-execution-page, .execution-header', { timeout: 15000 }).should('exist');
    
    // Aguardar que o loading desapareça se existir
    cy.get('body').then(($body) => {
      if ($body.find('.loading-container').length > 0) {
        cy.get('.loading-container', { timeout: 10000 }).should('not.exist');
      }
    });
    
    // Aguardar que o header de execução apareça
    cy.get('.execution-header', { timeout: 15000 }).should('be.visible');
    cy.get('.scenario-title', { timeout: 15000 }).should('be.visible');
    
    // Criar bug (o botão está sempre visível, mesmo sem iniciar execução)
    cy.criarBug(tituloBug, 'Descrição do bug de teste', 'MEDIUM');
    
    // Extrair projectId e packageId da URL atual e navegar para os detalhes do pacote
    // A URL atual está na página de execução: /projects/{projectId}/packages/{packageId}/scenarios/{scenarioId}/execute
    cy.url({ timeout: 10000 }).then((url) => {
      // Extrair projectId e packageId da URL (pode estar em /execute ou /execution)
      const match = url.match(/\/projects\/(\d+)\/packages\/(\d+)/);
      if (match) {
        const projectId = match[1];
        const packageId = match[2];
        // Navegar diretamente para os detalhes do pacote
        cy.visit(`/projects/${projectId}/packages/${packageId}`, { timeout: 10000 });
        
        // Aguardar a página carregar completamente
        cy.url({ timeout: 10000 }).should('include', `/projects/${projectId}/packages/${packageId}`);
        cy.url({ timeout: 10000 }).should('not.include', '/scenarios/');
        
        // Aguardar o título do pacote aparecer
        cy.get('.package-title', { timeout: 15000 }).should('be.visible').and('contain.text', nomePacote);
      } else {
        cy.log('Erro: não foi possível extrair projectId e packageId da URL:', url);
        throw new Error(`Não foi possível extrair IDs da URL: ${url}`);
      }
    });
    
    // Validar bugs relacionados
    cy.validarBugsRelacionados(tituloBug);
    
    // Editar bug
    cy.editarBug(
      tituloBug,
      novoTituloBug,
      'Descrição editada do bug de teste',
      'HIGH',
      'IN_PROGRESS'
    );
    
    // Validar que o bug foi editado
    cy.validarBugsRelacionados(novoTituloBug);
    
    // Deletar bug
    cy.deletarBug(novoTituloBug);
    
    // Limpar conta de teste
    cy.deleçãoDeConta();
  });
});


