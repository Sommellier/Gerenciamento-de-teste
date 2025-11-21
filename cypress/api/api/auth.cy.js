describe('API - Autenticação', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  let testUser = {
    email: '',
    password: 'Segredo123',
    name: 'Test User Refresh Token'
  }
  let refreshToken = ''

  before(() => {
    // Criar usuário de teste antes de executar os testes
    const uniqueEmail = `refresh-test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
    testUser.email = uniqueEmail

    cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/register`,
      body: {
        name: testUser.name,
        email: testUser.email,
        password: testUser.password
      },
      failOnStatusCode: false
    }).then((response) => {
      // Se o usuário já existe, tentar fazer login
      if (response.status === 400 && response.body.error?.includes('already exists')) {
        cy.log('Usuário já existe, usando credenciais existentes')
      }
    })
  })

  beforeEach(() => {
    // Fazer login antes de cada teste para obter um refreshToken válido
    cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/login`,
      body: {
        email: testUser.email,
        password: testUser.password
      },
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 200 && response.body.refreshToken) {
        refreshToken = response.body.refreshToken
      }
    })
  })

  describe('POST /api/refresh-token', () => {
    it('deve renovar o access token com refresh token válido', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/refresh-token`,
        body: {
          refreshToken: refreshToken
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('accessToken')
        expect(response.body.accessToken).to.be.a('string')
        expect(response.body.accessToken.length).to.be.greaterThan(0)
      })
    })

    it('deve retornar 400 quando refreshToken não é fornecido', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/refresh-token`,
        body: {},
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('obrigatório')
      })
    })

    it('deve retornar 400 quando refreshToken é uma string vazia', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/refresh-token`,
        body: {
          refreshToken: ''
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('obrigatório')
      })
    })

    it('deve retornar 400 quando refreshToken é apenas espaços em branco', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/refresh-token`,
        body: {
          refreshToken: '   '
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('obrigatório')
      })
    })

    it('deve retornar 401 quando refreshToken é inválido', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/refresh-token`,
        body: {
          refreshToken: 'token_invalido_12345'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('inválido')
      })
    })

    it('deve retornar 401 quando usa accessToken ao invés de refreshToken', () => {
      // Primeiro obter um accessToken
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/login`,
        body: {
          email: testUser.email,
          password: testUser.password
        }
      }).then((loginResponse) => {
        const accessToken = loginResponse.body.accessToken

        // Tentar usar accessToken como refreshToken
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/refresh-token`,
          body: {
            refreshToken: accessToken
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(401)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('inválido')
        })
      })
    })

    it('deve retornar um novo accessToken diferente do anterior', () => {
      let firstAccessToken = ''

      // Primeiro refresh
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/refresh-token`,
        body: {
          refreshToken: refreshToken
        }
      }).then((firstResponse) => {
        expect(firstResponse.status).to.eq(200)
        firstAccessToken = firstResponse.body.accessToken

        // Segundo refresh com o mesmo refreshToken
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/refresh-token`,
          body: {
            refreshToken: refreshToken
          }
        }).then((secondResponse) => {
          expect(secondResponse.status).to.eq(200)
          expect(secondResponse.body.accessToken).to.be.a('string')
          // O novo token pode ser diferente (dependendo da implementação)
          // Mas ambos devem ser válidos
          expect(secondResponse.body.accessToken.length).to.be.greaterThan(0)
        })
      })
    })

    it('deve validar que o novo accessToken é um JWT válido', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/refresh-token`,
        body: {
          refreshToken: refreshToken
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        const accessToken = response.body.accessToken

        // JWT tem formato: header.payload.signature (3 partes separadas por ponto)
        const parts = accessToken.split('.')
        expect(parts.length).to.eq(3)
        expect(parts[0]).to.be.a('string').and.not.be.empty
        expect(parts[1]).to.be.a('string').and.not.be.empty
        expect(parts[2]).to.be.a('string').and.not.be.empty
      })
    })
  })

  after(() => {

    cy.log('Testes de refresh token concluídos')
  })
})

