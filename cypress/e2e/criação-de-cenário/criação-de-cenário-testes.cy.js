describe('Fluxo de criação de cenário @regressao', () => {
    let testData;
    let nomeProjeto;
    let descricaoProjeto;
    let nomeCenario;
    let nomeCenarioEditado;
    let descricaoCenario;

    beforeEach(() => {
        cy.fixture('testData').then((data) => {
            testData = data;
            const id = Cypress._.random(0, 1e6);
            nomeProjeto = `${testData.project.baseName} ${Date.now()}-${id}`;
            descricaoProjeto = testData.project.baseDescription;
            nomeCenario = `Cenário de teste automatizado ${Date.now()}-${id}`;
            nomeCenarioEditado = `Cenário editado ${Date.now()}-${id}`;
            descricaoCenario = 'Descrição de cenário para teste automatizado';
        });
    });

    it('cria um cenário de teste, editar e deletar com sucesso', () => {
        cy.visit('/');
        cy.login({ email: testData.credentials.email, senha: testData.credentials.senha });
        
        // Validação após login
        cy.url().should('include', '/dashboard');
        
        cy.criarProjeto(nomeProjeto, descricaoProjeto);
        cy.validarCriacaoProjeto(nomeProjeto, descricaoProjeto).click();
        
        cy.criarPacote();
        cy.validarCriacaoPacote().click();
        
        cy.criarCenario(nomeCenario, descricaoCenario);
        cy.validarCriacaoCenario(nomeCenario);
        
        cy.editarCenario(nomeCenarioEditado, nomeCenario);
        
        cy.deletarCenario(nomeCenarioEditado);
    });
});

