describe('API - Integração: Fluxo de Duplicação', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Duplicação',
      id: null,
      token: null
    },
    manager: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Manager Duplicação',
      id: null,
      token: null
    },
    tester: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Tester Duplicação',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Fluxo de Duplicação',
    description: 'Descrição do projeto para testes de duplicação'
  }

  let testPackage = {
    id: null,
    title: 'Pacote para Duplicação',
    description: 'Descrição do pacote para testes de duplicação',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    release: '2024-01'
  }

  let testScenario = {
    id: null,
    title: 'Cenário para Duplicação',
    description: 'Descrição do cenário para testes de duplicação',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    steps: []
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

  // Função auxiliar para criar projeto
  const createProject = (token, projectData) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/projects`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: projectData,
      failOnStatusCode: false
    })
  }

  // Função auxiliar para criar convite
  const createInvite = (token, projectId, email, role) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/projects/${projectId}/invites`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        email: email,
        role: role
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para listar convites do usuário
  const listUserInvites = (token) => {
    return cy.request({
      method: 'GET',
      url: `${API_BASE_URL}/invites`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para aceitar convite
  const acceptInvite = (token, inviteToken) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/invites/accept`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        token: inviteToken
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para criar pacote
  const createPackage = (token, projectId, packageData) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/projects/${projectId}/packages`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: packageData,
      failOnStatusCode: false
    })
  }

  // Função auxiliar para criar cenário
  const createScenario = (token, packageId, scenarioData) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/packages/${packageId}/scenarios`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: scenarioData,
      failOnStatusCode: false
    })
  }

  // Função auxiliar para buscar cenário por ID
  const getScenarioById = (token, scenarioId) => {
    return cy.request({
      method: 'GET',
      url: `${API_BASE_URL}/scenarios/${scenarioId}`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para duplicar cenário
  const duplicateScenario = (token, scenarioId) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/scenarios/${scenarioId}/duplicate`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para executar cenário
  const executeScenario = (token, scenarioId, status) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/scenarios/${scenarioId}/executions`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        status: status
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para registrar histórico
  const registerHistory = (token, scenarioId, action, description) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/scenarios/${scenarioId}/history`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        action: action,
        description: description
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para buscar histórico
  const getHistory = (token, scenarioId) => {
    return cy.request({
      method: 'GET',
      url: `${API_BASE_URL}/scenarios/${scenarioId}/history`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      failOnStatusCode: false
    })
  }

  // Setup: Criar usuários, projeto, pacote e cenário
  before(() => {
    // Criar usuário owner
    const ownerEmail = `owner-duplicacao-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
    testUsers.owner.email = ownerEmail

    return createTestUser({
      name: testUsers.owner.name,
      email: testUsers.owner.email,
      password: testUsers.owner.password
    }, 0).then((response) => {
      if (response.status === 201 && response.body.id) {
        testUsers.owner.id = response.body.id
        return getAuthToken(testUsers.owner.email, testUsers.owner.password)
      } else {
        cy.log(`Falha ao criar usuário owner: Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
        throw new Error(`Não foi possível criar usuário owner. Status: ${response.status}`)
      }
    }).then((token) => {
      if (token && typeof token === 'string') {
        testUsers.owner.token = token

        // Criar projeto de teste
        return createProject(token, {
          name: testProject.name,
          description: testProject.description
        })
      }
      return null
    }).then((projectResponse) => {
      if (projectResponse && projectResponse.status === 201 && projectResponse.body.id) {
        testProject.id = projectResponse.body.id
      }
    }).then(() => {
      // Criar usuário manager
      const managerEmail = `manager-duplicacao-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.manager.email = managerEmail

      return createTestUser({
        name: testUsers.manager.name,
        email: testUsers.manager.email,
        password: testUsers.manager.password
      }, 1000).then((response) => {
        if (response.status === 201 && response.body.id) {
          testUsers.manager.id = response.body.id
          return getAuthToken(testUsers.manager.email, testUsers.manager.password)
        }
        return null
      }).then((token) => {
        if (token && typeof token === 'string') {
          testUsers.manager.token = token
        }
      })
    }).then(() => {
      // Criar usuário tester
      const testerEmail = `tester-duplicacao-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.tester.email = testerEmail

      return createTestUser({
        name: testUsers.tester.name,
        email: testUsers.tester.email,
        password: testUsers.tester.password
      }, 1500).then((response) => {
        if (response.status === 201 && response.body.id) {
          testUsers.tester.id = response.body.id
          return getAuthToken(testUsers.tester.email, testUsers.tester.password)
        }
        return null
      }).then((token) => {
        if (token && typeof token === 'string') {
          testUsers.tester.token = token
        }
      })
    }).then(() => {
      // Adicionar manager e tester ao projeto via convites
      return ensureToken(testUsers.owner).then((ownerToken) => {
        // Criar convite para manager
        return createInvite(ownerToken, testProject.id, testUsers.manager.email, 'MANAGER')
      }).then((inviteResponse) => {
        if (inviteResponse && inviteResponse.status === 201) {
          return ensureToken(testUsers.manager).then((managerToken) => {
            return listUserInvites(managerToken)
          })
        }
        return null
      }).then((invitesResponse) => {
        if (invitesResponse && invitesResponse.status === 200 && invitesResponse.body.items) {
          const invite = invitesResponse.body.items.find((inv) => 
            inv.email === testUsers.manager.email && inv.projectId === testProject.id && inv.status === 'PENDING'
          )
          if (invite) {
            return ensureToken(testUsers.manager).then((managerToken) => {
              return acceptInvite(managerToken, invite.token)
            })
          }
        }
        return null
      }).then(() => {
        // Criar convite para tester
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return createInvite(ownerToken, testProject.id, testUsers.tester.email, 'TESTER')
        })
      }).then((inviteResponse) => {
        if (inviteResponse && inviteResponse.status === 201) {
          return ensureToken(testUsers.tester).then((testerToken) => {
            return listUserInvites(testerToken)
          })
        }
        return null
      }).then((invitesResponse) => {
        if (invitesResponse && invitesResponse.status === 200 && invitesResponse.body.items) {
          const invite = invitesResponse.body.items.find((inv) => 
            inv.email === testUsers.tester.email && inv.projectId === testProject.id && inv.status === 'PENDING'
          )
          if (invite) {
            return ensureToken(testUsers.tester).then((testerToken) => {
              return acceptInvite(testerToken, invite.token)
            })
          }
        }
        return null
      })
    }).then(() => {
      // Criar pacote
      return ensureToken(testUsers.owner).then((ownerToken) => {
        return createPackage(ownerToken, testProject.id, {
          title: testPackage.title,
          description: testPackage.description,
          type: testPackage.type,
          priority: testPackage.priority,
          release: testPackage.release
        })
      })
    }).then((packageResponse) => {
      if (packageResponse && packageResponse.status === 201 && packageResponse.body.testPackage) {
        testPackage.id = packageResponse.body.testPackage.id
      }
    }).then(() => {
      // Criar cenário com múltiplas etapas
      return ensureToken(testUsers.manager).then((managerToken) => {
        return createScenario(managerToken, testPackage.id, {
          title: testScenario.title,
          description: testScenario.description,
          type: testScenario.type,
          priority: testScenario.priority,
          steps: [
            {
              action: 'Abrir aplicação',
              expected: 'Aplicação abre corretamente'
            },
            {
              action: 'Fazer login',
              expected: 'Login realizado com sucesso'
            },
            {
              action: 'Navegar para dashboard',
              expected: 'Dashboard é exibido'
            },
            {
              action: 'Verificar dados',
              expected: 'Dados são exibidos corretamente'
            }
          ]
        })
      })
    }).then((scenarioResponse) => {
      if (scenarioResponse && scenarioResponse.status === 201 && scenarioResponse.body.scenario) {
        testScenario.id = scenarioResponse.body.scenario.id
        testScenario.steps = scenarioResponse.body.scenario.steps || []
      }
    })
  })

  describe('Cenário 6.1: Duplicar cenário com steps', () => {
    it('deve duplicar cenário e verificar que steps são duplicados', () => {
      if (!testScenario.id || !testScenario.steps || testScenario.steps.length === 0) {
        cy.log('Cenário ou etapas não disponíveis')
        throw new Error('Setup incompleto: cenário ou etapas não foram criados corretamente')
      }

      let duplicatedScenarioId

      // Duplicar cenário
      return ensureToken(testUsers.owner).then((ownerToken) => {
        return duplicateScenario(ownerToken, testScenario.id)
      }).then((duplicateResponse) => {
        expect(duplicateResponse.status).to.eq(201)
        expect(duplicateResponse.body).to.have.property('message')
        expect(duplicateResponse.body.message).to.include('duplicado')
        expect(duplicateResponse.body.scenario).to.exist
        expect(duplicateResponse.body.scenario.id).to.exist
        expect(duplicateResponse.body.scenario.title).to.include('(Cópia)')
        
        duplicatedScenarioId = duplicateResponse.body.scenario.id
        cy.log(`Cenário duplicado com ID: ${duplicatedScenarioId}`)

        // Verificar que o cenário duplicado tem steps
        expect(duplicateResponse.body.scenario.steps).to.exist
        expect(duplicateResponse.body.scenario.steps).to.be.an('array')
        expect(duplicateResponse.body.scenario.steps.length).to.eq(testScenario.steps.length)
        cy.log(`Cenário duplicado tem ${duplicateResponse.body.scenario.steps.length} steps`)

        // Buscar cenário original para comparar
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return getScenarioById(ownerToken, testScenario.id)
        })
      }).then((originalResponse) => {
        expect(originalResponse.status).to.eq(200)
        const originalScenario = originalResponse.body.scenario
        const originalSteps = originalScenario.steps || []

        // Buscar cenário duplicado
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return getScenarioById(ownerToken, duplicatedScenarioId)
        }).then((duplicatedResponse) => {
          expect(duplicatedResponse.status).to.eq(200)
          const duplicatedScenario = duplicatedResponse.body.scenario
          const duplicatedSteps = duplicatedScenario.steps || []

          // Verificar que o número de steps é o mesmo
          expect(duplicatedSteps.length).to.eq(originalSteps.length)
          cy.log(`Número de steps confirmado: ${duplicatedSteps.length}`)

          // Verificar que os steps têm o mesmo conteúdo (action e expected)
          for (let i = 0; i < originalSteps.length; i++) {
            expect(duplicatedSteps[i].action).to.eq(originalSteps[i].action)
            expect(duplicatedSteps[i].expected).to.eq(originalSteps[i].expected)
            expect(duplicatedSteps[i].stepOrder).to.eq(originalSteps[i].stepOrder)
            cy.log(`Step ${i + 1} duplicado corretamente: ${duplicatedSteps[i].action}`)
          }

          cy.log('Todos os steps foram duplicados com sucesso')
        })
      })
    })
  })

  describe('Cenário 6.2: Verificar que IDs são diferentes', () => {
    it('deve verificar que cenário e steps duplicados têm IDs diferentes do original', () => {
      if (!testScenario.id || !testScenario.steps || testScenario.steps.length === 0) {
        cy.log('Cenário ou etapas não disponíveis')
        throw new Error('Setup incompleto: cenário ou etapas não foram criados corretamente')
      }

      let duplicatedScenarioId

      // Duplicar cenário
      return ensureToken(testUsers.owner).then((ownerToken) => {
        return duplicateScenario(ownerToken, testScenario.id)
      }).then((duplicateResponse) => {
        expect(duplicateResponse.status).to.eq(201)
        duplicatedScenarioId = duplicateResponse.body.scenario.id

        // Verificar que o ID do cenário duplicado é diferente
        expect(duplicatedScenarioId).to.not.eq(testScenario.id)
        cy.log(`ID do cenário original: ${testScenario.id}`)
        cy.log(`ID do cenário duplicado: ${duplicatedScenarioId}`)

        // Buscar cenário original e duplicado para comparar
        return ensureToken(testUsers.owner).then((ownerToken) => {
          // Buscar cenário original
          return getScenarioById(ownerToken, testScenario.id).then((originalResponse) => {
            expect(originalResponse.status).to.eq(200)
            const originalSteps = originalResponse.body.scenario.steps || []

            // Buscar cenário duplicado
            return getScenarioById(ownerToken, duplicatedScenarioId).then((duplicatedResponse) => {
              expect(duplicatedResponse.status).to.eq(200)
              const duplicatedSteps = duplicatedResponse.body.scenario.steps || []

              // Verificar que cada step duplicado tem ID diferente do original
              for (let i = 0; i < originalSteps.length; i++) {
                expect(duplicatedSteps[i].id).to.not.eq(originalSteps[i].id)
                cy.log(`Step ${i + 1} - Original ID: ${originalSteps[i].id}, Duplicado ID: ${duplicatedSteps[i].id}`)
              }

              cy.log('Todos os IDs são diferentes - duplicação confirmada')
            })
          })
        })
      })
    })
  })

  describe('Cenário 6.3: Duplicar cenário com execuções e histórico', () => {
    it('deve duplicar cenário e verificar que execuções e histórico NÃO são duplicados', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível')
        throw new Error('Setup incompleto: cenário não foi criado corretamente')
      }

      let duplicatedScenarioId

      // 1. Executar cenário original
      return ensureToken(testUsers.tester).then((testerToken) => {
        return executeScenario(testerToken, testScenario.id, 'PASSED')
      }).then((executionResponse) => {
        expect(executionResponse.status).to.eq(201)
        cy.log('Cenário original executado')

        // 2. Registrar histórico no cenário original
        return ensureToken(testUsers.tester).then((testerToken) => {
          return registerHistory(testerToken, testScenario.id, 'EXECUTED', 'Cenário executado com sucesso')
        })
      }).then((historyResponse) => {
        expect(historyResponse.status).to.eq(201)
        cy.log('Histórico registrado no cenário original')

        // 3. Verificar histórico do cenário original
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return getHistory(ownerToken, testScenario.id)
        })
      }).then((originalHistoryResponse) => {
        expect(originalHistoryResponse.status).to.eq(200)
        const originalHistory = originalHistoryResponse.body.history || []
        expect(originalHistory.length).to.be.greaterThan(0)
        cy.log(`Cenário original tem ${originalHistory.length} registros de histórico`)

        // 4. Duplicar cenário
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return duplicateScenario(ownerToken, testScenario.id)
        })
      }).then((duplicateResponse) => {
        expect(duplicateResponse.status).to.eq(201)
        duplicatedScenarioId = duplicateResponse.body.scenario.id
        cy.log(`Cenário duplicado com ID: ${duplicatedScenarioId}`)

        // 5. Verificar que o cenário duplicado tem status CREATED (não copia status de execução)
        expect(duplicateResponse.body.scenario.status).to.eq('CREATED')
        cy.log('Cenário duplicado tem status CREATED (não copia status de execução)')

        // 6. Verificar histórico do cenário duplicado (deve estar vazio)
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return getHistory(ownerToken, duplicatedScenarioId)
        })
      }).then((duplicatedHistoryResponse) => {
        expect(duplicatedHistoryResponse.status).to.eq(200)
        const duplicatedHistory = duplicatedHistoryResponse.body.history || []
        
        // O histórico não deve ser duplicado
        expect(duplicatedHistory.length).to.eq(0)
        cy.log('Cenário duplicado não tem histórico (comportamento esperado)')

        // 7. Verificar que o cenário original ainda tem seu histórico
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return getHistory(ownerToken, testScenario.id)
        })
      }).then((originalHistoryResponse2) => {
        expect(originalHistoryResponse2.status).to.eq(200)
        const originalHistory2 = originalHistoryResponse2.body.history || []
        expect(originalHistory2.length).to.be.greaterThan(0)
        cy.log(`Cenário original ainda tem ${originalHistory2.length} registros de histórico`)

        cy.log('Duplicação concluída: execuções e histórico não foram duplicados (comportamento correto)')
      })
    })
  })

  // Cleanup
  after(() => {
    cy.log('Testes de fluxo de duplicação concluídos')
  })
})

