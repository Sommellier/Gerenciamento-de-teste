describe('Fluxo de execução de cenário @regressao', () => {
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

  beforeEach(() => {
    cy.fixture('testData').then((data) => {
      testData = data;
      const id = Cypress._.random(0, 1e6);
      nomeProjeto = `${testData.project.baseName} ${Date.now()}-${id}`;
      descricaoProjeto = testData.project.baseDescription;
      nomePacote = 'Pacote para execução';
      descricaoPacote = 'Descrição do pacote para teste de execução';
      nomeCenario = 'Cenário para execução';
      descricaoCenario = 'Descrição do cenário para teste de execução';
      uniqueEmail = Cypress.helpers.generateUniqueEmail(testData.testUser.emailBase);
    });
  });

  it('executa cenário completo: iniciar, preencher etapas, concluir e reexecutar', () => {
    cy.visit('/');

    // Criar conta
    cy.criarConta({
      nome: testData.testUser.nome,
      email: uniqueEmail,
      senha: testData.testUser.senha
    });

    cy.findByRole('heading', { name: /Bem-vindo de volta!/i }).should('be.visible');

    // Fazer login
    cy.visit('/login');
    cy.login({ email: uniqueEmail, senha: testData.testUser.senha });

    cy.url().should('include', '/dashboard');

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

    // Aguardar o pacote ser criado e navegar para a página de pacotes
    cy.url({ timeout: 10000 }).then((url) => {
      if (!url.includes('/packages')) {
        cy.get('[data-cy="btn-view-packages"]', { timeout: 10000 }).should('be.visible').click();
        cy.url({ timeout: 10000 }).should('include', '/packages');
      }
    });

    cy.validarCriacaoPacote();

    // Acessar detalhes do pacote
    cy.acessarDetalhesPacote(nomePacote);

    // Extrair packageId da URL
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

    // Aguardar redirecionamento após criar cenário
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

    // Navegar para os detalhes do cenário
    cy.contains('.scenario-title', nomeCenario, { timeout: 10000 })
      .parents('.scenario-card')
      .click();

    cy.url({ timeout: 10000 }).should('include', '/scenarios/');
    cy.url({ timeout: 10000 }).should('not.include', '/execution');

    // Extrair scenarioId da URL
    cy.url({ timeout: 10000 }).then((currentUrl) => {
      const scenarioMatch = currentUrl.match(/\/scenarios\/(\d+)/);
      if (scenarioMatch) {
        scenarioId = scenarioMatch[1];
      }
    });

    // Adicionar múltiplas etapas ao cenário
    cy.adicionarEtapaCenario('Ação 1: Acessar a página inicial', 'Resultado esperado 1: Página inicial carregada');
    cy.wait(1000);
    cy.adicionarEtapaCenario('Ação 2: Preencher formulário de login', 'Resultado esperado 2: Formulário preenchido');
    cy.wait(1000);
    cy.adicionarEtapaCenario('Ação 3: Clicar em entrar', 'Resultado esperado 3: Login realizado');

    // Navegar para a página de execução
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen');
    });

    cy.get('[data-cy="btn-execute-scenario"]', { timeout: 10000 })
      .should('be.visible')
      .and('not.be.disabled')
      .click();

    cy.get('@windowOpen').should('have.been.called').then((stub) => {
      const calledUrl = stub.getCall(0).args[0];
      if (calledUrl) {
        cy.visit(calledUrl);
      } else {
        cy.visit(`/projects/${projectId}/packages/${packageId}/scenarios/${scenarioId}/execute`);
      }
    });

    // Aguardar a página de execução carregar
    cy.url({ timeout: 10000 }).should('satisfy', (url) => {
      return url.includes('/execute') || url.includes('/execution');
    });

    cy.wait(2000);

    // Verificar se há loading e aguardar desaparecer
    cy.get('body').then(($body) => {
      if ($body.find('.loading-container').length > 0) {
        cy.get('.loading-container', { timeout: 10000 }).should('not.exist');
      }
    });

    // Aguardar que o header de execução apareça
    cy.get('.execution-header', { timeout: 15000 }).should('be.visible');
    cy.get('.scenario-title', { timeout: 15000 }).should('be.visible');

    // ===== PARTE 1: Iniciar Execução =====
    cy.iniciarExecucaoCenario();

    // Validar que a execução foi iniciada
    cy.get('.execution-header', { timeout: 10000 }).within(() => {
      cy.contains('button', /concluir execução/i, { timeout: 10000 }).should('be.visible');
    });

    // ===== PARTE 2: Preencher resultados e marcar etapas como concluídas =====
    // Preencher resultado da primeira etapa
    cy.preencherResultadoEtapa('Resultado real 1: Página inicial carregada com sucesso');
    
    // Marcar primeira etapa como concluída
    cy.marcarEtapaComoConcluida();

    // Navegar para a próxima etapa
    cy.navegarProximaEtapa();

    // Preencher resultado da segunda etapa
    cy.preencherResultadoEtapa('Resultado real 2: Formulário preenchido corretamente');
    
    // Marcar segunda etapa como concluída
    cy.marcarEtapaComoConcluida();

    // Navegar para a próxima etapa
    cy.navegarProximaEtapa();

    // Preencher resultado da terceira etapa
    cy.preencherResultadoEtapa('Resultado real 3: Login realizado com sucesso');
    
    // Marcar terceira etapa como concluída
    cy.marcarEtapaComoConcluida();

    // ===== PARTE 3: Concluir Execução =====

    // Concluir execução
    cy.concluirExecucaoCenario();

    // Validar que a execução foi concluída
    cy.get('.execution-header', { timeout: 10000 }).within(() => {
      cy.contains('button', /reexecutar/i, { timeout: 10000 }).should('be.visible');
    });

    // Validar notificação de sucesso
    cy.contains(/execução concluída|execução finalizada/i, { timeout: 10000 }).should('be.visible');

    // ===== PARTE 4: Reexecutar Cenário =====
    cy.reexecutarCenario();

    // Validar que a execução foi reiniciada
    // Após reexecutar, o botão "Concluir Execução" deve aparecer novamente
    cy.get('.execution-header', { timeout: 10000 }).within(() => {
      cy.contains('button', /concluir execução/i, { timeout: 10000 }).should('be.visible');
    });

    // Validar notificação de reexecução (pode não aparecer ou desaparecer rapidamente)
    // A mensagem é "Cenário reiniciado! Você pode executar novamente."
    cy.get('body').then(($body) => {
      // Tentar encontrar a notificação, mas não falhar se não aparecer
      const hasNotification = $body.find('.q-notification:contains("reiniciado"), .q-notification:contains("execução iniciada")').length > 0;
      if (hasNotification) {
        cy.contains(/cenário reiniciado|execução iniciada|você pode executar novamente/i, { timeout: 5000 }).should('be.visible');
      }
    });

    // Limpar conta de teste
    cy.visit('/dashboard');
    cy.deleçãoDeConta();
  });
});

