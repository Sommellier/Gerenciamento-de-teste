describe('Fluxo de criação de pacote @regressao', () => {
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

  it('cria um pacote, editar e deletar com sucesso', () => {
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
    
    cy.criarProjeto(nomeProjeto, descricaoProjeto);
    cy.validarCriacaoProjeto(nomeProjeto, descricaoProjeto).click();
    
    cy.criarPacote();
    cy.validarCriacaoPacote();
    
    cy.editarPacote();
    // Validação após edição
    cy.contains('h3', /novo nome do pacote/i).should('be.visible');
    
    cy.deletarPacote();
    // Validação após deleção
    cy.contains('h3', /novo nome do pacote|meu pacote automatizado/i).should('not.exist');
    
    // Limpar conta de teste
    cy.deleçãoDeConta();
  });
});

