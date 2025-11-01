describe('Fluxo de criação de conta @regressao', () => {
  it('cria uma nova conta com sucesso e validar login', () => {

    //Constantes
    const email = 'Luizteste2@gmail.com'
    const senha = 'Segredo123'

    // Cenário
    cy.visit('http://localhost:9000/')
    cy.criarConta({ nome: 'Luiz Quase Lucas Teste', email, senha})
    cy.login({ email, senha})
    cy.deleçãoDeConta()
  })
})

