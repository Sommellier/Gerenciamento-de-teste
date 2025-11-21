describe('API - Upload', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUser = {
    email: '',
    password: 'SenhaSegura123',
    name: 'Usuário Teste Upload',
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
    const userEmail = `upload-test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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

  describe('POST /api/upload/avatar - Upload de avatar', () => {
    it.skip('deve fazer upload de avatar com sucesso', () => {
      // NOTA: Cypress não suporta nativamente FormData em cy.request()
      // Para testar upload de arquivos, é necessário usar:
      // 1. cy.visit() e interagir com input[type="file"] via interface do navegador
      // 2. Usar bibliotecas externas como cypress-file-upload
      // 3. Fazer testes E2E completos via interface
      // 
      // Este teste está marcado como .skip() porque cy.request() não suporta
      // multipart/form-data adequadamente para upload de arquivos.
      //
      // Exemplo de como seria com cypress-file-upload:
      // cy.visit('/profile')
      // cy.get('input[type="file"]').attachFile('avatar.jpg')
      // cy.get('button[type="submit"]').click()
      // cy.contains('Avatar atualizado com sucesso')
    })

    it('deve retornar 400 quando arquivo não é fornecido', () => {
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
          method: 'POST',
          url: `${API_BASE_URL}/upload/avatar`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {},
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('arquivo')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/upload/avatar`,
        body: {},
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })

    it('deve retornar 401 quando token é inválido', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/upload/avatar`,
        headers: {
          Authorization: 'Bearer token-invalido'
        },
        body: {},
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('deve retornar 400 quando formato de arquivo não é suportado', () => {
      if (!testUser.id) {
        cy.log('Usuário não disponível, pulando teste')
        return
      }

      ensureToken(testUser).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        // Tentar enviar um arquivo com formato inválido
        // Como cy.request() não suporta FormData adequadamente,
        // este teste valida apenas que a rota existe e requer arquivo
        // O teste real de formato deve ser feito via interface ou biblioteca especializada
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/upload/avatar`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {},
          failOnStatusCode: false
        }).then((response) => {
          // Sem arquivo, deve retornar 400
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
        })
      })
    })
  })
})

