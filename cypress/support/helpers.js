/**
 * Helpers reutilizáveis para comandos do Cypress
 * Funções auxiliares para reduzir duplicação de código
 */

/**
 * Seleciona uma opção aleatória de um QSelect (Quasar) pelo label do campo
 * @param {RegExp|string} labelRegex - Regex ou string para encontrar o label do campo
 */
export const selectRandomFromQSelect = (labelRegex) => {
    // O elemento de foco do Quasar tem opacity: 0, então usamos force: true
    cy.findByLabelText(labelRegex)
        .should('exist')
        .click({ force: true });
    
    cy.get('.q-menu, [role="listbox"]', { timeout: 5000 })
        .should('be.visible')
        .and($m => {
            const style = getComputedStyle($m[0]);
            expect(parseFloat(style.opacity)).to.be.greaterThan(0.9);
        });

    cy.get('[role="listbox"] [role="option"]:not([aria-disabled="true"])')
        .then($opts => {
            expect($opts.length, 'qtd de opções').to.be.greaterThan(0);
            const idx = Cypress._.random(0, $opts.length - 1);

            cy.get('[role="listbox"] [role="option"]:not([aria-disabled="true"])')
                .eq(idx)
                .scrollIntoView()
                .should('be.visible')
                .click({ scrollBehavior: 'center', force: true });
        });

    cy.findByLabelText(labelRegex)
        .parent()
        .find('span.ellipsis')
        .invoke('text')
        .should('not.be.empty');
};

/**
 * Seleciona uma opção de QSelect pelo label do campo
 * @param {RegExp|string} labelRegex - Regex ou string para encontrar o label do campo
 * @param {'first'|'last'|'random'|number} which - Qual opção selecionar
 */
export const pickFromQSelect = (labelRegex, which = 'first') => {
    // O elemento de foco do Quasar tem opacity: 0, então usamos force: true
    cy.findByLabelText(labelRegex)
        .should('exist')
        .as('select')
        .click({ force: true });
    
    // Aguardar o menu abrir
    cy.get('[role="listbox"]', { timeout: 5000 })
        .should('be.visible');

    cy.get('[role="listbox"] [role="option"]:not([aria-disabled="true"])')
        .then($opts => {
            const count = $opts.length;
            expect(count, 'qtd de opções').to.be.greaterThan(0);

            const idx =
                typeof which === 'number' ? which :
                    which === 'last' ? count - 1 :
                        which === 'random' ? Cypress._.random(0, count - 1) :
                            0; // first

            cy.focused().type('{home}');
            Cypress._.times(idx, () => cy.focused().type('{downarrow}'));
            cy.focused().type('{enter}');
        });

    cy.get('@select').parent().find('span.ellipsis')
        .invoke('text')
        .should('not.be.empty');
};

/**
 * Gera um email único para testes
 * @param {string} baseEmail - Email base (ex: "teste@gmail.com")
 * @returns {string} - Email único com timestamp e random
 */
export const generateUniqueEmail = (baseEmail = 'teste@gmail.com') => {
    const [localPart, domain] = baseEmail.split('@');
    const timestamp = Date.now();
    const random = Cypress._.random(0, 1e6);
    return `${localPart}+${timestamp}-${random}@${domain}`;
};

/**
 * Obtém uma data futura (amanhã) de forma segura, lidando com mudanças de mês/ano
 * @returns {number} - Dia do mês (1-31)
 */
export const getTomorrowDay = () => {
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    return amanha.getDate();
};

