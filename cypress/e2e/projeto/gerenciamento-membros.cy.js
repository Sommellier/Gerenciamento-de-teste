describe('Fluxo de gerenciamento de membros @regressao', () => {
  let testData;
  let nomeProjeto;
  let descricaoProjeto;
  let ownerEmail;
  let memberEmail;
  let projectId;

  beforeEach(() => {
    cy.fixture('testData').then((data) => {
      testData = data;
      const id = Cypress._.random(0, 1e6);
      nomeProjeto = `${testData.project.baseName} ${Date.now()}-${id}`;
      descricaoProjeto = testData.project.baseDescription;
      // Gerar emails únicos para evitar conflitos
      ownerEmail = Cypress.helpers.generateUniqueEmail(testData.testUser.emailBase);
      memberEmail = Cypress.helpers.generateUniqueEmail(testData.testUser.emailBase);
    });
  });

  it('gerencia membros: adiciona, edita role, remove e busca', () => {
    // ===== PARTE 1: Criar duas contas =====
    cy.visit('/');
    
    // Criar conta do owner (proprietário do projeto)
    cy.criarConta({
      nome: `${testData.testUser.nome} Owner`,
      email: ownerEmail,
      senha: testData.testUser.senha
    });
    
    // Fazer login como owner (já estamos na página de login após criarConta)
    cy.login({ email: ownerEmail, senha: testData.testUser.senha });
    
    // Criar projeto como owner
    cy.criarProjeto(nomeProjeto, descricaoProjeto);
    cy.validarCriacaoProjeto(nomeProjeto, descricaoProjeto);
    
    // Acessar detalhes do projeto
    cy.acessarDetalhesProjeto(nomeProjeto);
    
    // Capturar o ID do projeto da URL
    cy.url().then((url) => {
      const match = url.match(/\/projects\/(\d+)/);
      if (match) {
        projectId = match[1];
      }
    });
    
    // ===== PARTE 2: Adicionar membro por email (enviar convite) =====
    cy.adicionarMembroPorEmail(memberEmail, 'Testador');
    
    // ===== PARTE 3: Criar conta do membro e aceitar convite =====
    // Voltar para a página de projetos (o botão voltar redireciona para /projects)
    cy.get('[data-cy="btn-back"]', { timeout: 5000 }).click();
    
    // Validar que está na página de projetos
    cy.url({ timeout: 10000 }).should('include', '/projects');
    
    // Navegar para o dashboard para fazer logout (o menu de perfil está no dashboard)
    cy.visit('/dashboard');
    cy.url({ timeout: 10000 }).should('include', '/dashboard');
    
    // Fazer logout do owner
    cy.get('[data-cy="btn-profile-menu"]', { timeout: 5000 }).click({ force: true });
    cy.get('[data-cy="btn-menu-logout"]', { timeout: 5000 }).should('be.visible').click();
    
    // Confirmar logout no diálogo
    cy.get('.q-dialog', { timeout: 3000 }).should('be.visible');
    cy.contains('.q-dialog button, .q-btn', /desconectar|confirmar|sim/i).click();
    
    // Validar que foi redirecionado para login
    cy.url({ timeout: 5000 }).should((url) => {
      expect(url).to.satisfy((currentUrl) => {
        return currentUrl.includes('/login') || currentUrl.endsWith('/');
      });
    });
    
    // Criar conta do membro
    cy.visit('/');
    cy.criarConta({
      nome: `${testData.testUser.nome} Member`,
      email: memberEmail,
      senha: testData.testUser.senha
    });
    
    // Fazer login como membro (já estamos na página de login após criarConta)
    cy.login({ email: memberEmail, senha: testData.testUser.senha });
    
    // Aceitar convite do projeto
    cy.aceitarConvite(nomeProjeto);
    
    // ===== PARTE 4: Voltar como owner e validar membro adicionado =====
    // Voltar para o dashboard (o botão voltar na página de convites redireciona para /dashboard)
    cy.get('[data-cy="btn-back"]', { timeout: 5000 }).click();
    
    // Validar que está no dashboard
    cy.url({ timeout: 10000 }).should('include', '/dashboard');
    
    // Fazer logout do membro
    cy.get('[data-cy="btn-profile-menu"]', { timeout: 5000 }).click({ force: true });
    cy.get('[data-cy="btn-menu-logout"]', { timeout: 5000 }).should('be.visible').click();
    
    // Confirmar logout no diálogo
    cy.get('.q-dialog', { timeout: 3000 }).should('be.visible');
    cy.contains('.q-dialog button, .q-btn', /desconectar|confirmar|sim/i).click();
    
    // Validar que foi redirecionado para login
    cy.url({ timeout: 5000 }).should((url) => {
      expect(url).to.satisfy((currentUrl) => {
        return currentUrl.includes('/login') || currentUrl.endsWith('/');
      });
    });
    
    // Fazer login como owner novamente
    cy.visit('/login');
    cy.login({ email: ownerEmail, senha: testData.testUser.senha });
    
    // Acessar detalhes do projeto novamente
    cy.acessarDetalhesProjeto(nomeProjeto);
    
    // Validar que o membro aparece na lista
    cy.validarMembroNaLista(memberEmail, 'Member');
    
    // ===== PARTE 5: Buscar membros na tabela =====
    // Validar que todos os membros estão visíveis antes da busca
    cy.get('[data-cy="table-members"]').within(() => {
      cy.get('tbody tr', { timeout: 10000 }).should('have.length.at.least', 2);
    });
    
    // Buscar membro pela parte local do email
    cy.buscarMembro(memberEmail.split('@')[0]);
    
    // Limpar a busca
    cy.limparBuscaMembros();
    
    // Validar que todos os membros aparecem novamente
    cy.get('[data-cy="table-members"]').within(() => {
      cy.get('tbody tr', { timeout: 10000 }).should('have.length.at.least', 2);
    });
    
    // ===== PARTE 6: Editar role de membro =====
    // Validar que o role atual é TESTER
    cy.get('[data-cy="table-members"]').within(() => {
      cy.get('tbody tr').filter((index, el) => {
        return el.textContent.toLowerCase().includes(memberEmail.toLowerCase());
      }).first().within(() => {
        cy.contains('TESTER').should('be.visible');
      });
    });
    
    // Editar role para MANAGER
    cy.editarRoleMembro(memberEmail, 'MANAGER');
    
    // ===== PARTE 7: Remover membro =====
    cy.removerMembro(memberEmail);
    
    // Validar que apenas o owner permanece na lista
    cy.get('[data-cy="table-members"]', { timeout: 10000 }).within(() => {
      cy.get('tbody tr').should('have.length', 1); // Apenas o owner
    });
    
    // Limpar contas de teste
    // Primeiro, deletar o projeto (o owner não pode deletar a conta enquanto for dono de um projeto)
    cy.visit('/projects');
    cy.url({ timeout: 10000 }).should('include', '/projects');
    
    // Deletar o projeto usando a função existente
    cy.deletarProjeto(nomeProjeto);
    
    // Agora pode deletar a conta do owner
    cy.deleçãoDeConta();
    
    // Fazer logout e limpar conta do membro também
    cy.visit('/login');
    cy.login({ email: memberEmail, senha: testData.testUser.senha });
    cy.url().should('include', '/dashboard');
    cy.deleçãoDeConta();
  });
});

