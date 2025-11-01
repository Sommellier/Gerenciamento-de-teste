describe('Fluxo de criação de conta @regressao', () => {
  it('cria uma nova conta com sucesso e validar login', () => {

    //Constantes
    const email = 'Luizteste@gmail.com'
    const senha = 'Segredo123'
    const nomeProjeto = "Meu projeto"
    const nomeProjetoEditado = "Meu projeto editado"
    const descricaoProjeto = "Descrição de projeto para teste automatizado"
    // Cenário
    cy.visit('http://localhost:9000/')
    cy.login({ email, senha})
    cy.criarCenario(nomeProjeto, descricaoProjeto)
    cy.validarCriacaoProjeto(descricaoProjeto)
    cy.editarCenario(nomeProjetoEditado)
    cy.deletarCenario(nomeProjeto)
  })
})

