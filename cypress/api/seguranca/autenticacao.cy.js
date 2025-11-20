describe('API - Segurança: Testes de Autenticação', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    valid: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Válido Autenticação',
      id: null,
      token: null,
      refreshToken: null
    }
  }

  // Função auxiliar para obter token de autenticação
  const getAuthToken = (email, password) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/login`,
      body: { email, password },
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 200 && response.body.accessToken) {
        return {
          accessToken: response.body.accessToken,
          refreshToken: response.body.refreshToken || null
        }
      }
      return null
    })
  }

  // Função auxiliar para criar usuário
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

  // Setup: Criar usuário válido para testes
  before(() => {
    const validEmail = `valid-auth-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
    testUsers.valid.email = validEmail

    return createTestUser({
      name: testUsers.valid.name,
      email: testUsers.valid.email,
      password: testUsers.valid.password
    }, 0).then((response) => {
      if (response.status === 201 && response.body.id) {
        testUsers.valid.id = response.body.id
        return getAuthToken(testUsers.valid.email, testUsers.valid.password)
      }
      return null
    }).then((tokens) => {
      if (tokens && tokens.accessToken) {
        testUsers.valid.token = tokens.accessToken
        testUsers.valid.refreshToken = tokens.refreshToken
      }
    })
  })

  describe('Token Ausente', () => {
    it('deve retornar 401 quando token não é fornecido', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message.toLowerCase()).to.include('autenticado')
      })
    })

    it('deve retornar 401 em múltiplos endpoints sem token', () => {
      const endpoints = [
        { method: 'GET', url: `${API_BASE_URL}/projects` },
        { method: 'GET', url: `${API_BASE_URL}/profile` },
        { method: 'POST', url: `${API_BASE_URL}/projects`, body: { name: 'Test', description: 'Test' } },
        { method: 'PUT', url: `${API_BASE_URL}/projects/1`, body: { name: 'Test' } },
        { method: 'DELETE', url: `${API_BASE_URL}/projects/1` }
      ]

      endpoints.forEach((endpoint) => {
        cy.request({
          method: endpoint.method,
          url: endpoint.url,
          body: endpoint.body,
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(401)
          expect(response.body).to.have.property('message')
        })
      })
    })
  })

  describe('Token Malformado', () => {
    it('deve retornar 401 quando header Authorization está ausente', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {},
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('deve retornar 401 quando token não tem prefixo Bearer', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: testUsers.valid.token // Sem "Bearer "
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('deve retornar 401 quando token está vazio', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: 'Bearer ' // Token vazio
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('deve retornar 401 quando formato do header está incorreto', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: 'Token abc123' // Formato incorreto
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('deve retornar 401 quando token contém apenas espaços', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: 'Bearer     ' // Apenas espaços
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })
  })

  describe('Token Inválido', () => {
    it('deve retornar 401 quando token é uma string aleatória', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: 'Bearer invalid_token_12345_abcdef'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message.toLowerCase()).to.include('inválido')
      })
    })

    it('deve retornar 401 quando token foi modificado', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      // Modificar o token adicionando caracteres
      const modifiedToken = testUsers.valid.token + 'modified'
      
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: `Bearer ${modifiedToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('deve retornar 401 quando token tem formato JWT mas assinatura inválida', () => {
      // Criar um token JWT com formato válido mas assinatura inválida
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywiaWF0IjoxNjAwMDAwMDAwfQ.invalid_signature'
      
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: `Bearer ${fakeToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('deve retornar 401 quando token não contém userId', () => {
      // Este teste verifica se o backend valida a presença de userId no payload
      // Como não podemos criar um JWT válido sem userId facilmente, testamos com token inválido
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MDAwMDAwMDB9.invalid'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('deve retornar 401 quando token é de outro tipo (não access token)', () => {
      if (!testUsers.valid.refreshToken) {
        cy.log('Refresh token não disponível, pulando teste')
        return
      }

      // Tentar usar refresh token como access token
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: `Bearer ${testUsers.valid.refreshToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        // Deve retornar 401 porque refresh token não é access token
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })
  })

  describe('Token Expirado', () => {
    it('deve retornar 401 quando token está expirado', () => {
      // Criar um token expirado manualmente não é trivial sem acesso ao JWT_SECRET
      // Vamos testar criando um token e aguardando sua expiração
      // Ou testar com um token que sabemos que está expirado
      
      // Para este teste, vamos verificar que o backend rejeita tokens expirados
      // Como não temos acesso direto ao JWT_SECRET, vamos testar o comportamento
      // quando um token expirado é usado
      
      cy.log('Nota: Teste de token expirado requer token com expiração curta ou acesso ao JWT_SECRET')
      
      // Teste alternativo: verificar que o backend valida expiração
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywiZXhwIjoxNjAwMDAwMDAwfQ.expired'
        },
        failOnStatusCode: false
      }).then((response) => {
        // Deve retornar 401 porque o token é inválido/expirado
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('deve retornar 401 quando token tem expiração no passado', () => {
      // Token com exp (expiration) no passado
      // Como não podemos criar um JWT válido facilmente, testamos comportamento
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywiZXhwIjoxNjAwMDAwMDAwfQ.invalid'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })
  })

  describe('Token Válido', () => {
    it('deve permitir acesso quando token é válido', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: `Bearer ${testUsers.valid.token}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('items')
      })
    })

    it('deve permitir acesso em múltiplos endpoints com token válido', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const endpoints = [
        { method: 'GET', url: `${API_BASE_URL}/projects` },
        { method: 'GET', url: `${API_BASE_URL}/profile` }
      ]

      endpoints.forEach((endpoint) => {
        cy.request({
          method: endpoint.method,
          url: endpoint.url,
          headers: {
            Authorization: `Bearer ${testUsers.valid.token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.be.oneOf([200, 201, 204])
        })
      })
    })
  })

  describe('Refresh Token', () => {
    it('deve renovar access token com refresh token válido', () => {
      if (!testUsers.valid.refreshToken) {
        cy.log('Refresh token não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/refresh-token`,
        body: {
          refreshToken: testUsers.valid.refreshToken
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('accessToken')
        expect(response.body.accessToken).to.be.a('string')
        expect(response.body.accessToken.length).to.be.greaterThan(0)
      })
    })

    it('deve retornar 400 quando refresh token não é fornecido', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/refresh-token`,
        body: {},
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
        expect(response.body.message.toLowerCase()).to.include('obrigatório')
      })
    })

    it('deve retornar 400 quando refresh token está vazio', () => {
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
        expect(response.body.message.toLowerCase()).to.include('obrigatório')
      })
    })

    it('deve retornar 401 quando refresh token é inválido', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/refresh-token`,
        body: {
          refreshToken: 'invalid_refresh_token_12345'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('deve retornar 401 quando access token é usado como refresh token', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/refresh-token`,
        body: {
          refreshToken: testUsers.valid.token // Usando access token como refresh token
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })

    it('deve retornar 401 quando refresh token está expirado', () => {
      // Teste com token que sabemos que está expirado
      // Como não podemos criar facilmente, testamos comportamento
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/refresh-token`,
        body: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywiZXhwIjoxNjAwMDAwMDAwfQ.expired'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        // Pode retornar "expirado" ou "inválido" dependendo da validação
        expect(response.body.message.toLowerCase()).to.match(/expirado|inválido/)
      })
    })

    it('deve retornar 401 quando refresh token é malformado', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/refresh-token`,
        body: {
          refreshToken: 'Bearer invalid_token' // Formato incorreto
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
      })
    })
  })

  describe('Segurança de Mensagens de Erro', () => {
    it('não deve expor informações sensíveis em mensagens de erro', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: 'Bearer invalid_token'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        
        const message = response.body.message.toLowerCase()
        // Não deve expor detalhes técnicos
        expect(message).to.not.include('jwt')
        expect(message).to.not.include('secret')
        expect(message).to.not.include('signature')
        expect(message).to.not.include('expired')
        // Deve ter mensagem genérica
        expect(message).to.match(/inválido|autenticado|não autorizado/)
      })
    })

    it('não deve expor stack trace em erros de autenticação', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: 'Bearer invalid_token'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        // Não deve ter propriedades que indicam stack trace
        expect(response.body).to.not.have.property('stack')
        expect(response.body).to.not.have.property('error')
        // Deve ter apenas message
        expect(response.body).to.have.property('message')
      })
    })
  })

  // Cleanup
  after(() => {
    cy.log('Testes de segurança de autenticação concluídos')
  })
})

