describe('Fluxo de criação de pacote @regressao', () => {
    it('cria uma nova conta com sucesso e validar login', () => {
  
      //Constantes
      const email = 'Luizteste@gmail.com'
      const senha = 'Segredo123'
      const id = Cypress._.random(0, 1e6);
      const nomeProjeto = `Meu projeto ${Date.now()}-${id}`;
      const descricaoProjeto = "Descrição de projeto para teste automatizado"
      // Cenário
      cy.visit('http://localhost:9001/')
      cy.login({ email, senha})
      cy.criarCenario(nomeProjeto, descricaoProjeto)
      cy.validarCriacaoProjeto(nomeProjeto, descricaoProjeto).click()
      cy.criarPacote()
    })
  })
  
  