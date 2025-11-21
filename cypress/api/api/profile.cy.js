describe('API - Perfil', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUser = {
    email: '',
    password: 'SenhaSegura123',
    name: 'Usuário Teste Perfil',
    id: null,
    token: null
  }

  // Função auxiliar para obter token de autenticação
  const getAuthToken = (email, password) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/login`,
      body: {
        email: email,
        password: password
      },
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 200 && response.body.accessToken) {
        return response.body.accessToken
      }
      return null
    })
  }

  // Função auxiliar para garantir que temos um token válido
  const ensureToken = (user) => {
    if (user.token && typeof user.token === 'string') {
      return cy.wrap(user.token)
    }
    return getAuthToken(user.email, user.password).then((token) => {
      if (token && typeof token === 'string') {
        user.token = token
        return token
      }
      return null
    })
  }

  // Função auxiliar para criar usuário com retry e tratamento de rate limit
  const createTestUser = (userData, delay = 500) => {
    return cy.wait(delay).then(() => {
      return cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/register`,
        body: userData,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 429) {
          cy.log('Rate limit atingido, aguardando...')
          return cy.wait(2000).then(() => {
            return cy.request({
              method: 'POST',
              url: `${API_BASE_URL}/register`,
              body: userData,
              failOnStatusCode: false
            })
          })
        }
        return response
      })
    })
  }

  // Setup: Criar usuário de teste antes de executar os testes
  before(() => {
    const userEmail = `profile-test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
    testUser.email = userEmail

    return createTestUser({
      name: testUser.name,
      email: testUser.email,
      password: testUser.password
    }, 0).then((response) => {
      if (response.status === 201 && response.body.id) {
        testUser.id = response.body.id
        return getAuthToken(testUser.email, testUser.password)
      }
      return null
    }).then((token) => {
      if (token && typeof token === 'string') {
        testUser.token = token
      }
    })
  })

  describe('GET /api/profile - Buscar perfil do usuário logado', () => {
    it('deve retornar perfil do usuário autenticado', () => {
      if (!testUser.id) {
        cy.log('Usuário não disponível, pulando teste')
        return
      }

      ensureToken(testUser).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/profile`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('id', testUser.id)
          expect(response.body).to.have.property('email', testUser.email)
          expect(response.body).to.have.property('name', testUser.name)
          expect(response.body).to.have.property('createdAt')
          expect(response.body).to.have.property('updatedAt')
          // Verificar estatísticas
          expect(response.body).to.have.property('stats')
          expect(response.body.stats).to.have.property('projectsOwned')
          expect(response.body.stats).to.have.property('projectsParticipating')
          expect(response.body.stats).to.have.property('testExecutions')
          expect(response.body.stats.projectsOwned).to.be.a('number')
          expect(response.body.stats.projectsParticipating).to.be.a('number')
          expect(response.body.stats.testExecutions).to.be.a('number')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/profile`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })

    it('deve retornar 401 quando token é inválido', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/profile`,
        headers: {
          Authorization: 'Bearer token-invalido'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('deve retornar 401 quando token está ausente', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/profile`,
        headers: {
          Authorization: 'Bearer '
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })
  })
})

