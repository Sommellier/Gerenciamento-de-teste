describe('Fluxo de criação de conta @regressao', () => {
  let testData;
  let uniqueEmail;

  beforeEach(() => {
    cy.fixture('testData').then((data) => {
      testData = data;
      // Gerar email único para evitar conflitos
      uniqueEmail = Cypress.helpers.generateUniqueEmail(testData.testUser.emailBase);
    });
  });

  it('cria uma nova conta com sucesso e validar login', () => {
    cy.visit('/');
    cy.criarConta({
      nome: testData.testUser.nome,
      email: uniqueEmail,
      senha: testData.testUser.senha
    });

    // Validação após criação de conta
    cy.findByRole('heading', { name: /Bem-vindo de volta!/i }).should('be.visible');

    cy.login({ email: uniqueEmail, senha: testData.testUser.senha });

    // Validação após login
    cy.url().should('include', '/dashboard');
    cy.findByText(/Bem-vindo ao QA Manager/i).should('be.visible');

    cy.deleçãoDeConta();
  });

  it('deve falhar ao criar conta com email inválido', () => {
    cy.visit('/');
    cy.findByRole('button', { name: /criar conta/i }).click();

    cy.findByLabelText(/nome completo/i).type(testData.testUser.nome);
    cy.findByLabelText(/email/i).type('email_invalido');
    cy.findByLabelText(/senha/i).type(testData.testUser.senha, { log: false });

    // Tentar criar conta
    cy.findByRole('button', { name: /criar conta/i })
      .should('be.visible')
      .click();

    // Validar que há mensagem de erro ou que o botão está desabilitado
    cy.get('body').then(($body) => {
      const sel = '[role="alert"], .q-field--error, .error-message, .q-field__messages .text-negative';
      if ($body.find(sel).length > 0) {
        cy.contains(sel, /(email\s*inválido|inválido|error)/i).should('be.visible');
      } else {
        cy.get('button[type="submit"], [type="submit"]').should('be.disabled');
      }
    });

  });

  it('deve falhar ao fazer login com credenciais inválidas', () => {
    cy.visit('/');

    cy.login({
      email: testData.invalidCredentials.email,
      senha: testData.invalidCredentials.senha
    });

    // Validar que o login falhou
    cy.url({ timeout: 5000 }).should('not.include', '/dashboard');

    // Verificar mensagem de erro
    cy.get('.q-notification, [role="alert"], .error-message')
    .should('be.visible')
    .invoke('text')
    .then(t => t
      .replace(/\s+/g, ' ')                // normaliza espaços
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .toLowerCase()
    )
    .should(s => {
      expect(s).to.match(/invalid credentials|credenciais? invalidas|credencial|invalido|erro|incorreto|incorrect/);
    });
  });
});