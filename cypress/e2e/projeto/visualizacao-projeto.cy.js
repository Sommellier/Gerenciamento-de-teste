describe('Fluxo de visualização de projeto @regressao', () => {
  let testData;
  let nomeProjeto;
  let descricaoProjeto;
  let uniqueEmail;

  beforeEach(() => {
    cy.fixture('testData').then((data) => {
      testData = data;
      const id = Cypress._.random(0, 1e6);
      nomeProjeto = `${testData.project.baseName} ${Date.now()}-${id}`;
      descricaoProjeto = testData.project.baseDescription;
      // Gerar email único para evitar conflitos
      uniqueEmail = Cypress.helpers.generateUniqueEmail(testData.testUser.emailBase);
    });
  });

  it('visualiza projeto completo com métricas, membros e pacotes', () => {
    cy.visit('/');
    
    // Criar conta antes de fazer login
    cy.criarConta({
      nome: testData.testUser.nome,
      email: uniqueEmail,
      senha: testData.testUser.senha
    });
    
    // Validação após criação de conta
    cy.findByRole('heading', { name: /Bem-vindo de volta!/i }).should('be.visible');
    
    // Fazer login
    cy.visit('/login');
    cy.login({ email: uniqueEmail, senha: testData.testUser.senha });
    
    // Validação após login
    cy.url().should('include', '/dashboard');
    
    // Criar projeto
    cy.criarProjeto(nomeProjeto, descricaoProjeto);
    cy.validarCriacaoProjeto(nomeProjeto, descricaoProjeto);
    
    // Acessar detalhes do projeto
    cy.acessarDetalhesProjeto(nomeProjeto);
    
    // Validar informações do projeto no header
    cy.validarHeaderProjeto(nomeProjeto, descricaoProjeto);
    
    // Validar que a seção de métricas existe (pode estar vazia inicialmente)
    cy.get('.kpi-section').should('be.visible');
    cy.contains('.section-title', 'Métricas de Teste').should('be.visible');
    
    // Criar um pacote para ter dados nas métricas
    cy.criarPacote();
    
    // Aguardar o pacote ser criado e voltar para a página de detalhes se necessário
    cy.url({ timeout: 10000 }).then((url) => {
      if (url.includes('/packages')) {
        // Voltar para os detalhes do projeto
        cy.get('[data-cy="btn-back"]').click();
      }
    });
    
    // Aguardar a página de detalhes carregar completamente
    cy.url({ timeout: 10000 }).should('include', '/projects/');
    cy.get('.project-title', { timeout: 10000 }).should('contain.text', nomeProjeto);
    
    // Selecionar release e validar filtro
    cy.selecionarRelease();
    
    // Validar métricas e KPIs
    cy.validarMetricasProjeto();
    
    // Validar lista de membros
    cy.validarListaMembros();
    
    // Validar lista de pacotes e navegação
    cy.validarListaPacotes();
    
    // Limpar conta de teste
    cy.deleçãoDeConta();
  });
});

