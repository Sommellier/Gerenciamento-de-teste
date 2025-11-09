describe('Fluxo de criação de projeto @regressao', () => {
  let testData;
  let nomeProjeto;
  let nomeProjetoEditado;
  let descricaoProjeto;

  beforeEach(() => {
    cy.fixture('testData').then((data) => {
      testData = data;
      const id = Cypress._.random(0, 1e6);
      nomeProjeto = `${testData.project.baseName} ${Date.now()}-${id}`;
      nomeProjetoEditado = `${testData.project.baseName} editado ${Date.now()}-${id}`;
      descricaoProjeto = testData.project.baseDescription;
    });
  });

  it('cria um projeto, editar e deletar com sucesso', () => {
    cy.visit('/');
    cy.login({ email: testData.credentials.email, senha: testData.credentials.senha });
    // Validação após login
    cy.url().should('include', '/dashboard');
    
    cy.criarProjeto(nomeProjeto, descricaoProjeto);
    cy.validarCriacaoProjeto(nomeProjeto, descricaoProjeto);
    
    cy.editarProjeto(nomeProjetoEditado, nomeProjeto);
    
    cy.deletarProjeto(nomeProjetoEditado);
  });
});

