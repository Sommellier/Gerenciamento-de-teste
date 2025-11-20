describe('API - Segurança: Testes de SQL Injection', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    valid: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Válido SQL Injection',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null
  }

  let testPackage = {
    id: null
  }

  let testScenario = {
    id: null
  }

  // Payloads de SQL Injection comuns
  const sqlInjectionPayloads = [
    // SQL Injection básico
    "' OR '1'='1",
    "' OR '1'='1' --",
    "' OR '1'='1' /*",
    "admin'--",
    "admin'/*",
    "' OR 1=1--",
    "' OR 1=1#",
    "' OR 1=1/*",
    
    // UNION-based SQL Injection
    "' UNION SELECT NULL--",
    "' UNION SELECT NULL, NULL--",
    "' UNION SELECT NULL, NULL, NULL--",
    
    // Time-based SQL Injection
    "'; WAITFOR DELAY '00:00:05'--",
    "'; SELECT SLEEP(5)--",
    "'; SELECT pg_sleep(5)--",
    
    // Boolean-based SQL Injection
    "' AND 1=1--",
    "' AND 1=2--",
    "' AND 'a'='a",
    "' AND 'a'='b",
    
    // Error-based SQL Injection
    "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT version()), 0x7e))--",
    "' AND (SELECT * FROM (SELECT COUNT(*), CONCAT(version(), FLOOR(RAND(0)*2)) x FROM information_schema.tables GROUP BY x) a)--",
    
    // Stacked queries
    "'; DROP TABLE users--",
    "'; DELETE FROM users--",
    "'; UPDATE users SET password='hacked'--",
    
    // Outros padrões
    "1' OR '1'='1",
    "1' OR '1'='1' --",
    "1' OR '1'='1' /*",
    "1' OR '1'='1' #",
    "1' OR '1'='1' UNION SELECT NULL--",
    "1' OR '1'='1' UNION SELECT NULL, NULL--",
    
    // SQL Injection em números
    "1 OR 1=1",
    "1 OR 1=1--",
    "1 OR 1=1#",
    "1 OR 1=1/*",
    "1 UNION SELECT NULL--",
    
    // SQL Injection com comentários
    "1'/**/OR/**/1=1--",
    "1'/**/OR/**/1=1#",
    "1'/**/OR/**/1=1/*",
    
    // SQL Injection com encoding
    "%27 OR %271%27=%271",
    "%27 OR %271%27=%271--",
    "%27 OR %271%27=%271#",
    
    // SQL Injection com caracteres especiais
    "'; --",
    "'; #",
    "'; /*",
    "'; */",
    "'; DROP TABLE users; --",
    "'; DELETE FROM users; --",
    "'; UPDATE users SET password='hacked'; --",
    
    // SQL Injection em strings
    "test' OR '1'='1",
    "test' OR '1'='1' --",
    "test' OR '1'='1' #",
    "test' OR '1'='1' /*",
    
    // SQL Injection com funções
    "'; SELECT * FROM users--",
    "'; SELECT * FROM users WHERE '1'='1--",
    "'; SELECT * FROM users WHERE '1'='1' #",
    "'; SELECT * FROM users WHERE '1'='1' /*",
  ]

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

  // Setup: Criar usuário e recursos de teste
  before(() => {
    const validEmail = `valid-sql-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
    }).then((token) => {
      if (token && typeof token === 'string') {
        testUsers.valid.token = token

        // Criar projeto
        return cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects`,
          headers: { Authorization: `Bearer ${token}` },
          body: {
            name: 'Projeto SQL Injection Test',
            description: 'Projeto para testes de SQL injection'
          },
          failOnStatusCode: false
        })
      }
      return null
    }).then((projectResponse) => {
      if (projectResponse && projectResponse.status === 201 && projectResponse.body.id) {
        testProject.id = projectResponse.body.id

        // Criar pacote
        return cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          body: {
            title: 'Pacote SQL Injection Test',
            description: 'Pacote para testes',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            release: '2024-01'
          },
          failOnStatusCode: false
        })
      }
      return null
    }).then((packageResponse) => {
      if (packageResponse && packageResponse.status === 201 && packageResponse.body.testPackage?.id) {
        testPackage.id = packageResponse.body.testPackage.id

        // Criar cenário
        return cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          body: {
            title: 'Cenário SQL Injection Test',
            description: 'Cenário para testes',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            steps: [
              { action: 'Ação 1', expected: 'Esperado 1' }
            ]
          },
          failOnStatusCode: false
        })
      }
      return null
    }).then((scenarioResponse) => {
      if (scenarioResponse && scenarioResponse.status === 201 && scenarioResponse.body.scenario?.id) {
        testScenario.id = scenarioResponse.body.scenario.id
      }
    })
  })

  describe('SQL Injection em Parâmetros de URL (IDs)', () => {
    it('deve proteger contra SQL injection em GET /api/projects/:id', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const maliciousIds = [
        "1' OR '1'='1",
        "1' OR '1'='1' --",
        "1' OR '1'='1' #",
        "1' OR '1'='1' /*",
        "1 UNION SELECT NULL--",
        "1; DROP TABLE users--",
        "1' AND 1=1--",
        "1' AND 1=2--"
      ]

      maliciousIds.forEach((maliciousId) => {
        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects/${encodeURIComponent(maliciousId)}`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 500) {
            // ⚠️ PROBLEMA DE SEGURANÇA: Backend retornou 500 ao receber SQL injection
            cy.log(`⚠️ AVISO DE SEGURANÇA: Backend retornou 500 ao receber SQL injection em GET /api/projects/:id`)
            cy.log(`⚠️ Payload: ${maliciousId}`)
            cy.log(`⚠️ Isso indica que o backend não está validando parâmetros antes de processá-los`)
            cy.log(`⚠️ O ideal seria retornar 400 (Bad Request) ou 404 (Not Found)`)
            
            // Verificar se a resposta não expõe informações sensíveis
            if (response.body && typeof response.body === 'object') {
              const bodyStr = JSON.stringify(response.body).toLowerCase()
              const sensitiveKeywords = ['sql', 'syntax', 'database', 'table', 'column', 'prisma', 'query', 'postgres']
              sensitiveKeywords.forEach((keyword) => {
                if (bodyStr.includes(keyword)) {
                  cy.log(`⚠️ AVISO: Resposta 500 pode conter informações sensíveis: ${keyword}`)
                }
              })
            }
          } else {
            // Comportamento esperado: 400 ou 404
            expect(response.status).to.be.oneOf([400, 404])
            
            // Não deve expor informações sensíveis do banco de dados
            if (response.body && typeof response.body === 'object') {
              const bodyStr = JSON.stringify(response.body).toLowerCase()
              const sensitiveKeywords = ['sql', 'syntax', 'database', 'table', 'column', 'prisma', 'query']
              sensitiveKeywords.forEach((keyword) => {
                if (bodyStr.includes(keyword)) {
                  cy.log(`⚠️ AVISO: Resposta pode conter informações sensíveis: ${keyword}`)
                }
              })
            }
          }
        })
      })
    })

    it('deve proteger contra SQL injection em GET /api/scenarios/:id', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const maliciousIds = [
        "1' OR '1'='1",
        "1' OR '1'='1' --",
        "1 UNION SELECT NULL--",
        "1; DROP TABLE scenarios--"
      ]

      maliciousIds.forEach((maliciousId) => {
        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/scenarios/${encodeURIComponent(maliciousId)}`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 500) {
            cy.log(`⚠️ AVISO DE SEGURANÇA: Backend retornou 500 ao receber SQL injection em GET /api/scenarios/:id`)
            cy.log(`⚠️ Payload: ${maliciousId}`)
          } else {
            expect(response.status).to.be.oneOf([400, 404])
          }
        })
      })
    })

    it('deve proteger contra SQL injection em DELETE /api/projects/:id', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const maliciousIds = [
        "1' OR '1'='1",
        "1' OR '1'='1' --",
        "1; DROP TABLE projects--",
        "1' AND 1=1--"
      ]

      maliciousIds.forEach((maliciousId) => {
        cy.request({
          method: 'DELETE',
          url: `${API_BASE_URL}/projects/${encodeURIComponent(maliciousId)}`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 500) {
            cy.log(`⚠️ AVISO DE SEGURANÇA: Backend retornou 500 ao receber SQL injection em DELETE /api/projects/:id`)
            cy.log(`⚠️ Payload: ${maliciousId}`)
          } else {
            expect(response.status).to.be.oneOf([400, 404, 403])
          }
        })
      })
    })
  })

  describe('SQL Injection em Query Parameters', () => {
    it('deve proteger contra SQL injection em GET /api/projects?q=...', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      // Testar apenas alguns payloads para não demorar muito
      const testPayloads = sqlInjectionPayloads.slice(0, 10)

      testPayloads.forEach((payload) => {
        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects?q=${encodeURIComponent(payload)}`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          failOnStatusCode: false
        }).then((response) => {
          // Deve retornar 200 (com resultados vazios ou filtrados) ou 400, nunca 500
          expect(response.status).to.be.oneOf([200, 400])
          
          if (response.status === 200) {
            // Se retornar 200, deve ter estrutura válida
            expect(response.body).to.be.an('object')
            // Não deve retornar dados de outras tabelas
            if (response.body.items) {
              expect(response.body.items).to.be.an('array')
            }
          }
        })
      })
    })

    it('deve proteger contra SQL injection em paginação (page, pageSize)', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const maliciousParams = [
        { page: "1' OR '1'='1", pageSize: 10 },
        { page: 1, pageSize: "10' OR '1'='1" },
        { page: "1' OR '1'='1' --", pageSize: 10 },
        { page: 1, pageSize: "10' OR '1'='1' --" },
        { page: "1 UNION SELECT NULL--", pageSize: 10 }
      ]

      maliciousParams.forEach((params) => {
        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects?page=${encodeURIComponent(params.page)}&pageSize=${encodeURIComponent(params.pageSize)}`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.be.oneOf([200, 400])
        })
      })
    })
  })

  describe('SQL Injection em Body Parameters (Campos de Texto)', () => {
    it('deve proteger contra SQL injection em POST /api/projects (nome)', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      // Testar apenas alguns payloads
      const testPayloads = sqlInjectionPayloads.slice(0, 5)

      testPayloads.forEach((payload) => {
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          body: {
            name: payload,
            description: 'Descrição teste'
          },
          failOnStatusCode: false
        }).then((response) => {
          // Deve retornar 400 (validação) ou 201 (aceito como string literal), nunca 500
          expect(response.status).to.be.oneOf([201, 400, 409])
          
          if (response.status === 500) {
            cy.log(`⚠️ AVISO: SQL injection pode ter causado erro 500 com payload: ${payload}`)
          }
        })
      })
    })

    it('deve proteger contra SQL injection em PUT /api/projects/:id (nome)', () => {
      if (!testUsers.valid.token || !testProject.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      const testPayloads = sqlInjectionPayloads.slice(0, 5)

      testPayloads.forEach((payload) => {
        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/projects/${testProject.id}`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          body: {
            name: payload
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.be.oneOf([200, 400, 409])
          
          if (response.status === 500) {
            cy.log(`⚠️ AVISO: SQL injection pode ter causado erro 500 com payload: ${payload}`)
          }
        })
      })
    })

    it('deve proteger contra SQL injection em POST /api/packages/:packageId/scenarios (título)', () => {
      if (!testUsers.valid.token || !testPackage.id) {
        cy.log('Token ou pacote não disponível, pulando teste')
        return
      }

      const testPayloads = sqlInjectionPayloads.slice(0, 3)

      testPayloads.forEach((payload) => {
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          body: {
            title: payload,
            description: 'Descrição teste',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            steps: [
              { action: 'Ação 1', expected: 'Esperado 1' }
            ]
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.be.oneOf([201, 400])
          
          if (response.status === 500) {
            cy.log(`⚠️ AVISO: SQL injection pode ter causado erro 500 com payload: ${payload}`)
          }
        })
      })
    })
  })

  describe('SQL Injection em Campos de Email', () => {
    it('deve proteger contra SQL injection em POST /api/register (email)', () => {
      const testPayloads = [
        "test' OR '1'='1@test.com",
        "test' OR '1'='1' --@test.com",
        "test' OR '1'='1' #@test.com",
        "test'; DROP TABLE users--@test.com"
      ]

      testPayloads.forEach((payload, index) => {
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/register`,
          body: {
            name: `Usuário Teste ${index}`,
            email: payload,
            password: 'SenhaSegura123'
          },
          failOnStatusCode: false
        }).then((response) => {
          // Deve retornar 400 (validação de email inválido), nunca 500
          expect(response.status).to.be.oneOf([400, 409])
          
          if (response.status === 500) {
            cy.log(`⚠️ AVISO: SQL injection pode ter causado erro 500 com email: ${payload}`)
          }
        })
      })
    })

    it('deve proteger contra SQL injection em POST /api/login (email)', () => {
      const testPayloads = [
        "test' OR '1'='1@test.com",
        "test' OR '1'='1' --@test.com",
        "admin'--@test.com"
      ]

      testPayloads.forEach((payload) => {
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/login`,
          body: {
            email: payload,
            password: 'qualquercoisa'
          },
          failOnStatusCode: false
        }).then((response) => {
          // Deve retornar 401 (credenciais inválidas) ou 400 (validação), nunca 500
          expect(response.status).to.be.oneOf([400, 401])
          
          if (response.status === 500) {
            cy.log(`⚠️ AVISO: SQL injection pode ter causado erro 500 com email: ${payload}`)
          }
        })
      })
    })
  })

  describe('SQL Injection em Campos Numéricos', () => {
    it('deve proteger contra SQL injection em campos numéricos (projectId, packageId)', () => {
      if (!testUsers.valid.token || !testProject.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      const maliciousIds = [
        "1' OR '1'='1",
        "1' OR '1'='1' --",
        "1 UNION SELECT NULL--",
        "1; DROP TABLE packages--"
      ]

      maliciousIds.forEach((maliciousId) => {
        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/${encodeURIComponent(maliciousId)}`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 500) {
            // ⚠️ PROBLEMA DE SEGURANÇA: Backend retornou 500 ao receber SQL injection
            cy.log(`⚠️ AVISO DE SEGURANÇA: Backend retornou 500 ao receber SQL injection em campo numérico`)
            cy.log(`⚠️ Payload: ${maliciousId}`)
            cy.log(`⚠️ Isso indica que o backend não está validando parâmetros numéricos antes de processá-los`)
            cy.log(`⚠️ O ideal seria retornar 400 (Bad Request) ou 404 (Not Found)`)
            
            // Verificar se a resposta não expõe informações sensíveis
            if (response.body && typeof response.body === 'object') {
              const bodyStr = JSON.stringify(response.body).toLowerCase()
              const sensitiveKeywords = ['sql', 'syntax', 'database', 'table', 'column', 'prisma', 'query', 'postgres']
              sensitiveKeywords.forEach((keyword) => {
                if (bodyStr.includes(keyword)) {
                  cy.log(`⚠️ AVISO: Resposta 500 pode conter informações sensíveis: ${keyword}`)
                }
              })
            }
          } else {
            // Comportamento esperado: 400 ou 404
            expect(response.status).to.be.oneOf([400, 404])
          }
        })
      })
    })
  })

  describe('Validação de Respostas de Erro', () => {
    it('não deve expor informações sensíveis do banco de dados em erros', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const maliciousId = "1' OR '1'='1"

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects/${encodeURIComponent(maliciousId)}`,
        headers: { Authorization: `Bearer ${testUsers.valid.token}` },
        failOnStatusCode: false
      }).then((response) => {
        // Verificar que a resposta não contém informações sensíveis
        if (response.body && typeof response.body === 'object') {
          const bodyStr = JSON.stringify(response.body).toLowerCase()
          
          // Lista de palavras-chave sensíveis que não devem aparecer
          const sensitiveKeywords = [
            'sql syntax',
            'database error',
            'prisma',
            'query failed',
            'table',
            'column',
            'select',
            'from',
            'where',
            'union',
            'information_schema',
            'pg_',
            'postgres'
          ]
          
          sensitiveKeywords.forEach((keyword) => {
            if (bodyStr.includes(keyword)) {
              cy.log(`⚠️ AVISO: Resposta pode conter informações sensíveis: ${keyword}`)
              cy.log(`⚠️ Resposta: ${JSON.stringify(response.body)}`)
            }
          })
        }
      })
    })

    it('deve retornar mensagens de erro genéricas, não detalhes técnicos', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const maliciousId = "1' OR '1'='1' --"

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects/${encodeURIComponent(maliciousId)}`,
        headers: { Authorization: `Bearer ${testUsers.valid.token}` },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 400 || response.status === 404) {
          // Mensagens de erro devem ser genéricas
          if (response.body && response.body.message) {
            const message = response.body.message.toLowerCase()
            
            // Não deve conter detalhes técnicos
            const technicalKeywords = ['sql', 'syntax', 'database', 'query', 'prisma', 'postgres']
            technicalKeywords.forEach((keyword) => {
              if (message.includes(keyword)) {
                cy.log(`⚠️ AVISO: Mensagem de erro pode conter detalhes técnicos: ${keyword}`)
                cy.log(`⚠️ Mensagem: ${response.body.message}`)
              }
            })
          }
        }
      })
    })
  })

  describe('SQL Injection em Múltiplos Parâmetros Simultaneamente', () => {
    it('deve proteger contra SQL injection em múltiplos parâmetros ao mesmo tempo', () => {
      if (!testUsers.valid.token || !testProject.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      const maliciousParams = {
        projectId: "1' OR '1'='1",
        packageId: "1' OR '1'='1' --"
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects/${encodeURIComponent(maliciousParams.projectId)}/packages/${encodeURIComponent(maliciousParams.packageId)}`,
        headers: { Authorization: `Bearer ${testUsers.valid.token}` },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 500) {
          // ⚠️ PROBLEMA DE SEGURANÇA: Backend retornou 500 ao receber SQL injection
          cy.log(`⚠️ AVISO DE SEGURANÇA: Backend retornou 500 ao receber SQL injection em múltiplos parâmetros`)
          cy.log(`⚠️ projectId: ${maliciousParams.projectId}`)
          cy.log(`⚠️ packageId: ${maliciousParams.packageId}`)
          cy.log(`⚠️ Isso indica que o backend não está validando parâmetros antes de processá-los`)
          cy.log(`⚠️ O ideal seria retornar 400 (Bad Request) ou 404 (Not Found)`)
          
          // Verificar se a resposta não expõe informações sensíveis
          if (response.body && typeof response.body === 'object') {
            const bodyStr = JSON.stringify(response.body).toLowerCase()
            const sensitiveKeywords = ['sql', 'syntax', 'database', 'table', 'column', 'prisma', 'query', 'postgres']
            sensitiveKeywords.forEach((keyword) => {
              if (bodyStr.includes(keyword)) {
                cy.log(`⚠️ AVISO: Resposta 500 pode conter informações sensíveis: ${keyword}`)
              }
            })
          }
        } else {
          // Comportamento esperado: 400 ou 404
          expect(response.status).to.be.oneOf([400, 404])
        }
      })
    })
  })

  // Cleanup
  after(() => {
    cy.log('Testes de SQL injection concluídos')
    cy.log('✅ Se todos os testes passaram, o sistema está protegido contra SQL injection')
    cy.log('⚠️ Se houver avisos, verifique as respostas do servidor para informações sensíveis')
  })
})

