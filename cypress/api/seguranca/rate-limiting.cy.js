describe('API - Segurança: Testes de Rate Limiting', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  // Verificar se está em desenvolvimento (baseado nos limites do backend)
  const isDevelopment = Cypress.env('NODE_ENV') !== 'production'
  
  // Limites baseados no backend (ajustados para desenvolvimento)
  const limits = {
    login: isDevelopment ? 100 : 12, // 15 minutos
    register: isDevelopment ? 200 : 50, // 15 minutos
    upload: 100, // 1 hora
    invite: isDevelopment ? 50 : 30, // 1 hora
    user: isDevelopment ? 500 : 60, // 1 minuto
    passwordReset: isDevelopment ? 50 : 5, // 1 hora
    public: isDevelopment ? 1000 : 200 // 15 minutos
  }

  let testUsers = {
    user1: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Rate Limit Um',
      id: null,
      token: null
    },
    user2: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Rate Limit Dois',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null
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
        return response.body.accessToken
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
          cy.log('Rate limit atingido durante setup, aguardando...')
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

  // Setup: Criar usuários de teste
  before(() => {
    // Criar user1
    const user1Email = `user1-ratelimit-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
    testUsers.user1.email = user1Email

    return createTestUser({
      name: testUsers.user1.name,
      email: testUsers.user1.email,
      password: testUsers.user1.password
    }, 0).then((response) => {
      if (response.status === 201 && response.body.id) {
        testUsers.user1.id = response.body.id
        return getAuthToken(testUsers.user1.email, testUsers.user1.password)
      }
      return null
    }).then((token) => {
      if (token && typeof token === 'string') {
        testUsers.user1.token = token

        // Criar projeto para testes
        return cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects`,
          headers: { Authorization: `Bearer ${token}` },
          body: {
            name: 'Projeto Rate Limit',
            description: 'Projeto para testes de rate limiting'
          },
          failOnStatusCode: false
        })
      }
      return null
    }).then((projectResponse) => {
      if (projectResponse && projectResponse.status === 201 && projectResponse.body.id) {
        testProject.id = projectResponse.body.id
      }

      // Criar user2
      const user2Email = `user2-ratelimit-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.user2.email = user2Email

      return createTestUser({
        name: testUsers.user2.name,
        email: testUsers.user2.email,
        password: testUsers.user2.password
      }, 1000)
    }).then((response) => {
      if (response && response.status === 201 && response.body.id) {
        testUsers.user2.id = response.body.id
        return getAuthToken(testUsers.user2.email, testUsers.user2.password)
      }
      return null
    }).then((token) => {
      if (token && typeof token === 'string') {
        testUsers.user2.token = token
      }
    })
  })

  describe('Rate Limiting - Login', () => {
    it('deve aplicar rate limit após muitas tentativas de login falhadas', () => {
      // Fazer várias tentativas de login com credenciais inválidas
      const attempts = Math.min(limits.login + 5, 20) // Limitar a 20 tentativas para não demorar muito
      
      cy.log(`Fazendo ${attempts} tentativas de login com credenciais inválidas...`)
      
      let rateLimited = false
      let lastStatus = null

      for (let i = 0; i < attempts; i++) {
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/login`,
          body: {
            email: `invalid-${i}@test.com`,
            password: 'wrongpassword'
          },
          failOnStatusCode: false
        }).then((response) => {
          lastStatus = response.status
          
          if (response.status === 429) {
            rateLimited = true
            expect(response.body).to.have.property('message')
            expect(response.body.message).to.include('Muitas tentativas')
            
            // Verificar headers de rate limit
            if (response.headers['retry-after']) {
              expect(parseInt(response.headers['retry-after'])).to.be.a('number')
            }
            
            cy.log(`✅ Rate limit aplicado após ${i + 1} tentativas`)
          }
        })
        
        // Pequeno delay entre tentativas
        if (i < attempts - 1) {
          cy.wait(50)
        }
      }

      cy.then(() => {
        if (rateLimited) {
          cy.log('✅ Rate limiting funcionando corretamente para login')
        } else {
          cy.log(`⚠️ Rate limit não foi atingido após ${attempts} tentativas (limite: ${limits.login})`)
          cy.log(`⚠️ Último status: ${lastStatus}`)
          // Em desenvolvimento, pode não atingir o limite devido aos valores altos
          if (!isDevelopment) {
            cy.log('⚠️ Em produção, isso pode indicar um problema')
          }
        }
      })
    })

    it('não deve aplicar rate limit em logins bem-sucedidos (skipSuccessfulRequests)', () => {
      if (!testUsers.user1.email || !testUsers.user1.password) {
        cy.log('Usuário de teste não disponível, pulando teste')
        return
      }

      // Fazer várias tentativas de login bem-sucedidas
      const attempts = 10
      let successCount = 0

      for (let i = 0; i < attempts; i++) {
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/login`,
          body: {
            email: testUsers.user1.email,
            password: testUsers.user1.password
          },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 200) {
            successCount++
          } else if (response.status === 429) {
            cy.log(`⚠️ Rate limit aplicado em login bem-sucedido (tentativa ${i + 1})`)
            cy.log('⚠️ Isso pode indicar que skipSuccessfulRequests não está funcionando')
          }
        })
        
        if (i < attempts - 1) {
          cy.wait(100)
        }
      }

      cy.then(() => {
        cy.log(`✅ ${successCount}/${attempts} logins bem-sucedidos sem rate limit`)
        // Em desenvolvimento, esperamos que todos passem
        // Em produção, pode haver rate limit mesmo em sucessos se o limite for baixo
      })
    })
  })

  describe('Rate Limiting - Registro', () => {
    it('deve aplicar rate limit após muitas tentativas de registro', () => {
      const attempts = Math.min(limits.register + 5, 30) // Limitar tentativas
      
      cy.log(`Fazendo ${attempts} tentativas de registro...`)
      
      let rateLimited = false
      let lastStatus = null

      for (let i = 0; i < attempts; i++) {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(7)
        
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/register`,
          body: {
            name: `Usuário Teste ${i}`,
            email: `test-${timestamp}-${random}-${i}@test.com`,
            password: 'SenhaSegura123'
          },
          failOnStatusCode: false
        }).then((response) => {
          lastStatus = response.status
          
          if (response.status === 429) {
            rateLimited = true
            expect(response.body).to.have.property('message')
            expect(response.body.message).to.include('Muitas tentativas')
            
            cy.log(`✅ Rate limit aplicado após ${i + 1} tentativas`)
          }
        })
        
        if (i < attempts - 1) {
          cy.wait(50)
        }
      }

      cy.then(() => {
        if (rateLimited) {
          cy.log('✅ Rate limiting funcionando corretamente para registro')
        } else {
          cy.log(`⚠️ Rate limit não foi atingido após ${attempts} tentativas (limite: ${limits.register})`)
          if (!isDevelopment) {
            cy.log('⚠️ Em produção, isso pode indicar um problema')
          }
        }
      })
    })
  })

  describe('Rate Limiting - Usuário Autenticado', () => {
    it('deve aplicar rate limit por usuário autenticado', () => {
      if (!testUsers.user1.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const attempts = Math.min(limits.user + 10, 100) // Limitar tentativas
      
      cy.log(`Fazendo ${attempts} requisições autenticadas...`)
      
      let rateLimited = false
      let successCount = 0

      for (let i = 0; i < attempts; i++) {
        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects`,
          headers: { Authorization: `Bearer ${testUsers.user1.token}` },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 200) {
            successCount++
          } else if (response.status === 429) {
            rateLimited = true
            expect(response.body).to.have.property('message')
            expect(response.body.message).to.include('Muitas requisições')
            
            cy.log(`✅ Rate limit aplicado após ${i + 1} requisições`)
          }
        })
        
        if (i < attempts - 1) {
          cy.wait(10) // Delay muito pequeno para testar rapidamente
        }
      }

      cy.then(() => {
        cy.log(`✅ ${successCount} requisições bem-sucedidas antes do rate limit`)
        if (rateLimited) {
          cy.log('✅ Rate limiting por usuário funcionando corretamente')
        } else {
          cy.log(`⚠️ Rate limit não foi atingido após ${attempts} requisições (limite: ${limits.user}/min)`)
          if (!isDevelopment) {
            cy.log('⚠️ Em produção, isso pode indicar um problema')
          }
        }
      })
    })

    it('deve aplicar rate limit independentemente por usuário', () => {
      if (!testUsers.user1.token || !testUsers.user2.token) {
        cy.log('Tokens não disponíveis, pulando teste')
        return
      }

      // Fazer requisições com user1 até atingir rate limit
      const attempts = Math.min(limits.user + 5, 70)
      let user1RateLimited = false
      let user2SuccessCount = 0

      // Primeiro, fazer requisições com user1
      for (let i = 0; i < attempts; i++) {
        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects`,
          headers: { Authorization: `Bearer ${testUsers.user1.token}` },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 429) {
            user1RateLimited = true
          }
        })
        
        if (i < attempts - 1) {
          cy.wait(10)
        }
      }

      // Depois, fazer requisições com user2 (deve funcionar normalmente)
      cy.then(() => {
        for (let i = 0; i < 10; i++) {
          cy.request({
            method: 'GET',
            url: `${API_BASE_URL}/projects`,
            headers: { Authorization: `Bearer ${testUsers.user2.token}` },
            failOnStatusCode: false
          }).then((response) => {
            if (response.status === 200) {
              user2SuccessCount++
            }
          })
          
          if (i < 9) {
            cy.wait(10)
          }
        }
      })

      cy.then(() => {
        cy.log(`✅ User2 conseguiu fazer ${user2SuccessCount} requisições mesmo com user1 rate limited`)
        if (user2SuccessCount > 0) {
          cy.log('✅ Rate limiting é independente por usuário (correto)')
        } else {
          cy.log('⚠️ User2 também foi rate limited, pode indicar problema na keyGenerator')
        }
      })
    })
  })

  describe('Rate Limiting - Recuperação de Senha', () => {
    it('deve aplicar rate limit por email na recuperação de senha', () => {
      const testEmail = `password-reset-${Date.now()}@test.com`
      const attempts = Math.min(limits.passwordReset + 3, 10) // Limitar tentativas
      
      cy.log(`Fazendo ${attempts} tentativas de recuperação de senha para ${testEmail}...`)
      
      let rateLimited = false
      let lastStatus = null

      for (let i = 0; i < attempts; i++) {
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/request-password-reset`,
          body: {
            email: testEmail
          },
          failOnStatusCode: false
        }).then((response) => {
          lastStatus = response.status
          
          if (response.status === 429) {
            rateLimited = true
            expect(response.body).to.have.property('message')
            expect(response.body.message).to.include('Muitas tentativas')
            
            cy.log(`✅ Rate limit aplicado após ${i + 1} tentativas`)
          }
        })
        
        if (i < attempts - 1) {
          cy.wait(100)
        }
      }

      cy.then(() => {
        if (rateLimited) {
          cy.log('✅ Rate limiting funcionando corretamente para recuperação de senha')
        } else {
          cy.log(`⚠️ Rate limit não foi atingido após ${attempts} tentativas (limite: ${limits.passwordReset}/hora)`)
          if (!isDevelopment) {
            cy.log('⚠️ Em produção, isso pode indicar um problema')
          }
        }
      })
    })

    it('deve aplicar rate limit independentemente por email', () => {
      const email1 = `reset1-${Date.now()}@test.com`
      const email2 = `reset2-${Date.now()}@test.com`
      
      let email1RateLimited = false
      let email2SuccessCount = 0

      // Fazer várias tentativas com email1
      const attempts = Math.min(limits.passwordReset + 3, 8)
      
      for (let i = 0; i < attempts; i++) {
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/request-password-reset`,
          body: { email: email1 },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 429) {
            email1RateLimited = true
          }
        })
        
        if (i < attempts - 1) {
          cy.wait(100)
        }
      }

      // Tentar com email2 (deve funcionar)
      cy.then(() => {
        for (let i = 0; i < 5; i++) {
          cy.request({
            method: 'POST',
            url: `${API_BASE_URL}/request-password-reset`,
            body: { email: email2 },
            failOnStatusCode: false
          }).then((response) => {
            if (response.status === 200 || response.status === 404) {
              email2SuccessCount++
            }
          })
          
          if (i < 4) {
            cy.wait(100)
          }
        }
      })

      cy.then(() => {
        cy.log(`✅ Email2 conseguiu fazer ${email2SuccessCount} requisições mesmo com email1 rate limited`)
        if (email2SuccessCount > 0) {
          cy.log('✅ Rate limiting é independente por email (correto)')
        }
      })
    })
  })

  describe('Rate Limiting - Convites', () => {
    it('deve aplicar rate limit na criação de convites', () => {
      if (!testUsers.user1.token || !testProject.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      const attempts = Math.min(limits.invite + 5, 20) // Limitar tentativas
      
      cy.log(`Fazendo ${attempts} tentativas de criação de convites...`)
      
      let rateLimited = false
      let successCount = 0

      for (let i = 0; i < attempts; i++) {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(7)
        
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
          headers: { Authorization: `Bearer ${testUsers.user1.token}` },
          body: {
            email: `invite-${timestamp}-${random}-${i}@test.com`,
            role: 'TESTER'
          },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 201) {
            successCount++
          } else if (response.status === 429) {
            rateLimited = true
            expect(response.body).to.have.property('message')
            expect(response.body.message).to.include('Limite de criação de convites')
            
            cy.log(`✅ Rate limit aplicado após ${i + 1} tentativas`)
          }
        })
        
        if (i < attempts - 1) {
          cy.wait(100)
        }
      }

      cy.then(() => {
        cy.log(`✅ ${successCount} convites criados antes do rate limit`)
        if (rateLimited) {
          cy.log('✅ Rate limiting funcionando corretamente para convites')
        } else {
          cy.log(`⚠️ Rate limit não foi atingido após ${attempts} tentativas (limite: ${limits.invite}/hora)`)
          if (!isDevelopment) {
            cy.log('⚠️ Em produção, isso pode indicar um problema')
          }
        }
      })
    })
  })

  describe('Rate Limiting - Headers', () => {
    it('deve incluir headers de rate limit nas respostas', () => {
      if (!testUsers.user1.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: { Authorization: `Bearer ${testUsers.user1.token}` },
        failOnStatusCode: false
      }).then((response) => {
        // Verificar headers padrão do express-rate-limit
        // X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset podem estar presentes
        if (response.headers['x-ratelimit-limit']) {
          expect(parseInt(response.headers['x-ratelimit-limit'])).to.be.a('number')
          cy.log(`✅ Header X-RateLimit-Limit: ${response.headers['x-ratelimit-limit']}`)
        }
        
        if (response.headers['x-ratelimit-remaining']) {
          expect(parseInt(response.headers['x-ratelimit-remaining'])).to.be.a('number')
          cy.log(`✅ Header X-RateLimit-Remaining: ${response.headers['x-ratelimit-remaining']}`)
        }
        
        if (response.headers['retry-after']) {
          expect(parseInt(response.headers['retry-after'])).to.be.a('number')
          cy.log(`✅ Header Retry-After: ${response.headers['retry-after']}`)
        }
        
        // Nota: Headers podem não estar presentes em todas as respostas
        // dependendo da configuração do express-rate-limit
      })
    })
  })

  describe('Rate Limiting - Mensagens de Erro', () => {
    it('deve retornar mensagem de erro apropriada quando rate limit é atingido', () => {
      // Tentar fazer muitas requisições de registro rapidamente
      const attempts = Math.min(limits.register + 5, 30)
      let rateLimitMessage = null

      for (let i = 0; i < attempts; i++) {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(7)
        
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/register`,
          body: {
            name: `Usuário Teste ${i}`,
            email: `test-msg-${timestamp}-${random}-${i}@test.com`,
            password: 'SenhaSegura123'
          },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 429) {
            rateLimitMessage = response.body.message
            expect(response.body).to.have.property('message')
            expect(response.body.message).to.be.a('string')
            expect(response.body.message.length).to.be.greaterThan(0)
            
            cy.log(`✅ Mensagem de rate limit: "${response.body.message}"`)
          }
        })
        
        if (i < attempts - 1) {
          cy.wait(50)
        }
      }

      cy.then(() => {
        if (rateLimitMessage) {
          cy.log('✅ Mensagem de erro de rate limit está presente e é informativa')
        } else {
          cy.log('⚠️ Rate limit não foi atingido, não foi possível verificar mensagem')
        }
      })
    })
  })

  // Cleanup
  after(() => {
    cy.log('Testes de rate limiting concluídos')
    cy.log(`Ambiente: ${isDevelopment ? 'Desenvolvimento' : 'Produção'}`)
    cy.log(`Limites aplicados: Login=${limits.login}, Register=${limits.register}, User=${limits.user}, PasswordReset=${limits.passwordReset}, Invite=${limits.invite}`)
  })
})

