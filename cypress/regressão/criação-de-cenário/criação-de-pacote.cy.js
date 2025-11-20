describe('Fluxo de criação de pacote @regressao', () => {
  let testData;
  let nomeProjeto;
  let descricaoProjeto;

  beforeEach(() => {
    cy.fixture('testData').then((data) => {
      testData = data;
      const id = Cypress._.random(0, 1e6);
      nomeProjeto = `${testData.project.baseName} ${Date.now()}-${id}`;
      descricaoProjeto = testData.project.baseDescription;
    });
  });

  it('cria um pacote, editar e deletar com sucesso', () => {
    cy.visit('/');
    cy.login({ email: testData.credentials.email, senha: testData.credentials.senha });
    
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
  });
});

