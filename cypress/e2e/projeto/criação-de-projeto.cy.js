describe('Fluxo de criação de projeto @regressao', () => {
  let testData;
  let nomeProjeto;
  let nomeProjetoEditado;
  let descricaoProjeto;
  let uniqueEmail;

  beforeEach(() => {
    cy.fixture('testData').then((data) => {
      testData = data;
      const id = Cypress._.random(0, 1e6);
      nomeProjeto = `${testData.project.baseName} ${Date.now()}-${id}`;
      nomeProjetoEditado = `${testData.project.baseName} editado ${Date.now()}-${id}`;
      descricaoProjeto = testData.project.baseDescription;
      // Gerar email único para evitar conflitos
      uniqueEmail = Cypress.helpers.generateUniqueEmail(testData.testUser.emailBase);
    });
  });

  it('cria um projeto, editar e deletar com sucesso', () => {
    cy.visit('/');
    
    // Criar conta antes de fazer login
    cy.criarConta({
      nome: testData.testUser.nome,
      email: uniqueEmail,
      senha: testData.testUser.senha
    });
    
    // Fazer login (já estamos na página de login após criarConta)
    cy.login({ email: uniqueEmail, senha: testData.testUser.senha });
    
    cy.criarProjeto(nomeProjeto, descricaoProjeto);
    cy.validarCriacaoProjeto(nomeProjeto, descricaoProjeto);
    
    cy.editarProjeto(nomeProjetoEditado, nomeProjeto);
    
    cy.deletarProjeto(nomeProjetoEditado);
    
    // Limpar conta de teste
    cy.deleçãoDeConta();
  });
});

