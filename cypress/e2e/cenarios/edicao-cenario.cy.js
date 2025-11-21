describe('Scenario editing flow @regressao', () => {
  let testData;
  let projectName;
  let projectDescription;
  let packageName;
  let packageDescription;
  let scenarioName;
  let scenarioDescription;
  let editedScenarioName;
  let editedScenarioDescription;
  let uniqueEmail;
  let projectId;
  let packageId;
  let scenarioId;

  // Helper functions
  const extractIdFromUrl = (pattern, index = 1) => {
    cy.url({ timeout: 10000 }).then((url) => {
      const match = url.match(pattern);
      if (match && match[index]) {
        return match[index];
      }
      return null;
    });
  };

  const selectOptionInSelect = (dataCy, optionIndex) => {
    cy.get('.q-dialog', { timeout: 5000 }).within(() => {
      cy.get(`[data-cy="${dataCy}"]`, { timeout: 5000 })
        .should('exist')
        .click({ force: true });
    });

    cy.get('.q-menu, [role="listbox"]', { timeout: 5000 }).should('be.visible');
    cy.get('.q-menu, [role="listbox"]')
      .find('.q-item')
      .then(($items) => {
        const itemCount = $items.length;
        expect(itemCount).to.be.greaterThan(0);
        cy.wrap($items).eq(optionIndex).click({ force: true });
      });
  };

  const editFieldInDialog = (dataCy, value) => {
    cy.get('.q-dialog', { timeout: 5000 }).within(() => {
      cy.get(`[data-cy="${dataCy}"]`, { timeout: 5000 })
        .should('be.visible')
        .clear()
        .type(value);
    });
  };

  const saveAndValidateDialog = (successMessage) => {
    cy.get('.q-dialog', { timeout: 5000 }).within(() => {
      cy.contains('button', /salvar/i, { timeout: 5000 })
        .should('be.visible')
        .and('not.be.disabled')
        .click();
    });

    cy.contains(new RegExp(successMessage, 'i'), { timeout: 10000 }).should('be.visible');
    cy.get('.q-dialog', { timeout: 5000 }).should('not.exist');
  };

  const editFieldByLabel = (labelRegex, value) => {
    cy.get('.q-dialog', { timeout: 5000 }).within(() => {
      cy.contains('label', labelRegex, { timeout: 5000 })
        .parent()
        .find('textarea, input[type="text"]')
        .first()
        .should('be.visible')
        .clear()
        .type(value);
    });
  };

  beforeEach(() => {
    cy.fixture('testData').then((data) => {
      testData = data;
      const id = Cypress._.random(0, 1e6);
      projectName = `${testData.project.baseName} ${Date.now()}-${id}`;
      projectDescription = testData.project.baseDescription;
      packageName = 'Pacote para edição';
      packageDescription = 'Descrição do pacote para teste de edição';
      scenarioName = 'Cenário para edição';
      scenarioDescription = 'Descrição do cenário para teste de edição';
      editedScenarioName = `Cenário Editado ${Date.now()}-${id}`;
      editedScenarioDescription = 'Descrição editada do cenário para teste automatizado';
      uniqueEmail = Cypress.helpers.generateUniqueEmail(testData.testUser.emailBase);
    });
  });

  it('should edit scenario completely: information and steps', () => {
    cy.visit('/');

    // Create account
    cy.criarConta({
      nome: testData.testUser.nome,
      email: uniqueEmail,
      senha: testData.testUser.senha
    });

    cy.findByRole('heading', { name: /Bem-vindo de volta!/i }).should('be.visible');

    // Login
    cy.visit('/login');
    cy.login({ email: uniqueEmail, senha: testData.testUser.senha });

    cy.url().should('include', '/dashboard');

    // Create project
    cy.criarProjeto(projectName, projectDescription);
    cy.validarCriacaoProjeto(projectName, projectDescription);

    // Access project details
    cy.acessarDetalhesProjeto(projectName);

    // Extract projectId from URL
    cy.url({ timeout: 10000 }).then((url) => {
      const match = url.match(/\/projects\/(\d+)/);
      if (match) {
        projectId = match[1];
      }
    });

    // Create package
    cy.criarPacote(packageName, packageDescription);

    // Wait for package to be created and navigate to packages page
    cy.url({ timeout: 10000 }).then((url) => {
      if (!url.includes('/packages')) {
        cy.get('[data-cy="btn-view-packages"]', { timeout: 10000 }).should('be.visible').click();
        cy.url({ timeout: 10000 }).should('include', '/packages');
      }
    });

    cy.validarCriacaoPacote(packageName);

    // Access package details
    cy.acessarDetalhesPacote(packageName);

    // Extract packageId from URL
    cy.url({ timeout: 10000 }).then((url) => {
      const match = url.match(/\/projects\/(\d+)\/packages\/(\d+)/);
      if (match) {
        projectId = match[1];
        packageId = match[2];
      }
    });

    // Create scenario
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="btn-create-first-scenario"]').length > 0) {
        cy.get('[data-cy="btn-create-first-scenario"]', { timeout: 10000 }).click();
      } else if ($body.find('[data-cy="btn-create-scenario"]').length > 0) {
        cy.get('[data-cy="btn-create-scenario"]', { timeout: 10000 }).click();
      } else {
        cy.visit(`/projects/${projectId}/packages/${packageId}/scenarios`);
      }
    });

    cy.url({ timeout: 10000 }).should('include', '/scenarios');
    cy.criarCenario(scenarioName, scenarioDescription);
    cy.validarCriacaoCenario(scenarioName);

    // Wait for redirect after creating scenario
    cy.wait(2000);
    cy.url({ timeout: 10000 }).then((currentUrl) => {
      const match = currentUrl.match(/\/projects\/(\d+)\/packages\/(\d+)/);
      if (match) {
        projectId = match[1];
        packageId = match[2];

        if (!currentUrl.includes(`/packages/${packageId}`) || currentUrl.includes('/scenarios')) {
          cy.visit(`/projects/${projectId}/packages/${packageId}`);
        }
      }
    });

    // Navigate to scenario details
    cy.contains('.scenario-title', scenarioName, { timeout: 10000 })
      .parents('.scenario-card')
      .click();

    cy.url({ timeout: 10000 }).should('include', '/scenarios/');
    cy.url({ timeout: 10000 }).should('not.include', '/execution');

    // Extract scenarioId from URL
    cy.url({ timeout: 10000 }).then((currentUrl) => {
      const scenarioMatch = currentUrl.match(/\/scenarios\/(\d+)/);
      if (scenarioMatch) {
        scenarioId = scenarioMatch[1];
      }
    });

    // Add steps to scenario
    cy.adicionarEtapaCenario('Ação 1: Acessar a página inicial', 'Resultado esperado 1: Página inicial carregada');
    cy.wait(1000);
    cy.adicionarEtapaCenario('Ação 2: Preencher formulário', 'Resultado esperado 2: Formulário preenchido');
    cy.wait(1000);

    // ===== PART 1: Edit scenario information =====
    // Click "Edit" button in header
    cy.get('[data-cy="btn-edit-scenario"]', { timeout: 10000 })
      .should('be.visible')
      .click();

    // Wait for edit dialog to appear
    cy.get('[data-cy="dialog-edit-scenario"], .q-dialog', { timeout: 10000 })
      .should('be.visible');
    cy.contains(/editar cenário/i, { timeout: 10000 }).should('be.visible');

    // Edit form fields
    editFieldInDialog('input-edit-scenario-title', editedScenarioName);
    editFieldInDialog('input-edit-scenario-description', editedScenarioDescription);

    // Change type and priority
    selectOptionInSelect('select-edit-scenario-type', 1);
    cy.wait(300);
    selectOptionInSelect('select-edit-scenario-priority', 2);

    // Save and validate
    saveAndValidateDialog('cenário.*atualizado|cenário.*editado');

    // Validate that title was updated
    cy.get('.page-title', { timeout: 10000 }).should('contain.text', editedScenarioName);

    // ===== PART 2: Edit existing step =====
    // Wait for steps list to appear
    cy.get('[data-cy="list-steps"]', { timeout: 10000 }).should('be.visible');

    // Click edit button of first step
    cy.get('[data-cy^="btn-edit-step-"]', { timeout: 10000 })
      .first()
      .should('be.visible')
      .click({ force: true });

    // Wait for step edit dialog to appear
    cy.get('.q-dialog', { timeout: 5000 }).should('be.visible');
    cy.contains(/editar etapa/i, { timeout: 5000 }).should('be.visible');

    // Edit step fields
    editFieldByLabel(/ação/i, 'Ação editada: Acessar página inicial e validar elementos');
    editFieldByLabel(/resultado esperado/i, 'Resultado esperado editado: Página inicial carregada com todos os elementos visíveis');

    // Save and validate
    saveAndValidateDialog('etapa.*atualizada|etapa.*editada');

    // Validate that step was updated
    cy.get('[data-cy="list-steps"]', { timeout: 10000 }).should('be.visible');
    cy.contains('Ação editada: Acessar página inicial e validar elementos', { timeout: 10000 }).should('be.visible');
    cy.contains('Resultado esperado editado: Página inicial carregada com todos os elementos visíveis', { timeout: 10000 }).should('be.visible');

    // Clean up test account
    cy.visit('/dashboard');
    cy.deleçãoDeConta();
  });
});

