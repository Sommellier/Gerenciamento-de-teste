describe('API - Integração: Fluxo Completo', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Completo',
      id: null,
      token: null
    },
    manager: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Manager Completo',
      id: null,
      token: null
    },
    tester: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Tester Completo',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Fluxo Completo',
    description: 'Descrição do projeto para testes de integração completo'
  }

  let testPackage = {
    id: null,
    title: 'Pacote para Fluxo Completo',
    description: 'Descrição do pacote para testes de fluxo completo',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    release: '2024-01'
  }

  let testScenario = {
    id: null,
    title: 'Cenário para Fluxo Completo',
    description: 'Descrição do cenário para testes de fluxo completo',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    steps: []
  }

  let testReport = {
    id: null,
    downloadUrl: null
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

  // Função auxiliar para gerar ECT
  const generateECT = (token, scenarioId) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/scenarios/${scenarioId}/ect`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para fazer download do relatório
  const downloadReport = (token, reportId) => {
    return cy.request({
      method: 'GET',
      url: `${API_BASE_URL}/reports/${reportId}/download`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para adicionar membro ao projeto
  const addMemberByEmail = (token, projectId, email, role) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/projects/${projectId}/members/by-email`,
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

  // Setup: Criar usuários e projeto
  before(() => {
    // Criar usuário owner
    const ownerEmail = `owner-complete-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
      const managerEmail = `manager-complete-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.manager.email = managerEmail

      return createTestUser({
        name: testUsers.manager.name,
        email: testUsers.manager.email,
        password: testUsers.manager.password
      }, 1000).then((response) => {
        if (response.status === 201 && response.body.id) {
          testUsers.manager.id = response.body.id
          return getAuthToken(testUsers.manager.email, testUsers.manager.password)
        } else {
          cy.log(`Falha ao criar usuário manager: Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
        }
        return null
      }).then((token) => {
        if (token && typeof token === 'string') {
          testUsers.manager.token = token
        }
      })
    }).then(() => {
      // Criar usuário tester
      const testerEmail = `tester-complete-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.tester.email = testerEmail

      return createTestUser({
        name: testUsers.tester.name,
        email: testUsers.tester.email,
        password: testUsers.tester.password
      }, 1500).then((response) => {
        if (response.status === 201 && response.body.id) {
          testUsers.tester.id = response.body.id
          return getAuthToken(testUsers.tester.email, testUsers.tester.password)
        } else {
          cy.log(`Falha ao criar usuário tester: Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
        }
        return null
      }).then((token) => {
        if (token && typeof token === 'string') {
          testUsers.tester.token = token
        }
      })
    }).then(() => {
      // Adicionar manager e tester ao projeto (após criar os usuários)
      if (testProject.id && testUsers.manager.email && testUsers.tester.email) {
        return ensureToken(testUsers.owner).then((ownerToken) => {
          if (!ownerToken) return null
          
          // Adicionar manager
          return addMemberByEmail(ownerToken, testProject.id, testUsers.manager.email, 'MANAGER')
            .then((managerResponse) => {
              if (managerResponse && managerResponse.status === 201 && managerResponse.body.invited) {
                // Se retornou convite, buscar token e aceitar
                return ensureToken(testUsers.manager).then((managerToken) => {
                  if (!managerToken) return null
                  return listUserInvites(managerToken).then((invites) => {
                    if (invites && invites.status === 200 && invites.body.items) {
                      const invite = invites.body.items.find((inv) => 
                        inv.email === testUsers.manager.email && inv.projectId === testProject.id && inv.status === 'PENDING'
                      )
                      if (invite && invite.token) {
                        return acceptInvite(managerToken, invite.token)
                      }
                    }
                    return null
                  })
                })
              }
              return null
            })
            .then(() => {
              // Adicionar tester
              return addMemberByEmail(ownerToken, testProject.id, testUsers.tester.email, 'TESTER')
            })
            .then((testerResponse) => {
              if (testerResponse && testerResponse.status === 201 && testerResponse.body.invited) {
                // Se retornou convite, buscar token e aceitar
                return ensureToken(testUsers.tester).then((testerToken) => {
                  if (!testerToken) return null
                  return listUserInvites(testerToken).then((invites) => {
                    if (invites && invites.status === 200 && invites.body.items) {
                      const invite = invites.body.items.find((inv) => 
                        inv.email === testUsers.tester.email && inv.projectId === testProject.id && inv.status === 'PENDING'
                      )
                      if (invite && invite.token) {
                        return acceptInvite(testerToken, invite.token)
                      }
                    }
                    return null
                  })
                })
              }
              return null
            })
        })
      }
      return null
    })
  })

  describe('Cenário 1.1: Fluxo completo de sucesso', () => {
    it('deve criar projeto, pacote, cenário, executar e gerar ECT', () => {
      if (!testProject.id || !testUsers.owner.id || !testUsers.manager.id || !testUsers.tester.id) {
        cy.log('Projeto ou usuários não disponíveis')
        throw new Error('Setup incompleto: projeto ou usuários não foram criados corretamente')
      }

      let packageId
      let scenarioId
      let stepId
      let reportId

      // 1. Owner cria pacote
      ensureToken(testUsers.owner).then((ownerToken) => {
        if (!ownerToken) {
          cy.log('Não foi possível obter token do owner, pulando teste')
          return
        }

        return createPackage(ownerToken, testProject.id, {
          title: testPackage.title,
          description: testPackage.description,
          type: testPackage.type,
          priority: testPackage.priority,
          release: testPackage.release
        })
      }).then((packageResponse) => {
        if (!packageResponse || packageResponse.status !== 201) {
          cy.log(`Erro ao criar pacote: Status ${packageResponse?.status}, Body: ${JSON.stringify(packageResponse?.body)}`)
          throw new Error(`Falha ao criar pacote. Status: ${packageResponse?.status}`)
        }
        
        packageId = packageResponse.body.testPackage.id
        testPackage.id = packageId
        cy.log(`Pacote criado com ID: ${packageId}`)

        // 2. Manager cria cenário
        return ensureToken(testUsers.manager).then((managerToken) => {
          return createScenario(managerToken, packageId, {
            title: testScenario.title,
            description: testScenario.description,
            type: testScenario.type,
            priority: testScenario.priority,
            steps: [
              { action: 'Ação 1', expected: 'Resultado esperado 1' },
              { action: 'Ação 2', expected: 'Resultado esperado 2' },
              { action: 'Ação 3', expected: 'Resultado esperado 3' }
            ]
          })
        })
      }).then((scenarioResponse) => {
        if (!scenarioResponse || scenarioResponse.status !== 201) {
          cy.log(`Erro ao criar cenário: Status ${scenarioResponse?.status}, Body: ${JSON.stringify(scenarioResponse?.body)}`)
          throw new Error(`Falha ao criar cenário. Status: ${scenarioResponse?.status}`)
        }
        
        scenarioId = scenarioResponse.body.scenario.id
        testScenario.id = scenarioId
        cy.log(`Cenário criado com ID: ${scenarioId}`)
        
        // Validar que o cenário tem steps
        if (scenarioResponse.body.scenario.steps && scenarioResponse.body.scenario.steps.length > 0) {
          stepId = scenarioResponse.body.scenario.steps[0].id
          cy.log(`Step ID: ${stepId}`)
        }

        // 3. Tester executa cenário (cria execução)
        return ensureToken(testUsers.tester).then((testerToken) => {
          return executeScenario(testerToken, scenarioId, 'PASSED')
        })
      }).then((executionResponse) => {
        if (!executionResponse || executionResponse.status !== 201) {
          cy.log(`Erro ao executar cenário: Status ${executionResponse?.status}, Body: ${JSON.stringify(executionResponse?.body)}`)
          throw new Error(`Falha ao executar cenário. Status: ${executionResponse?.status}`)
        }
        
        cy.log('Cenário executado com sucesso')
        expect(executionResponse.body).to.have.property('execution')
        expect(executionResponse.body.execution).to.have.property('id')

        // 4. Gerar ECT para o cenário
        if (!scenarioId) {
          throw new Error('scenarioId não foi definido')
        }
        
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return generateECT(ownerToken, scenarioId)
        })
      }).then((ectResponse) => {
        // ECT pode retornar 200 (relatório existente) ou 201 (novo relatório)
        if (!ectResponse || (ectResponse.status !== 200 && ectResponse.status !== 201)) {
          cy.log(`Erro ao gerar ECT: Status ${ectResponse?.status}, Body: ${JSON.stringify(ectResponse?.body)}`)
          throw new Error(`Falha ao gerar ECT. Status: ${ectResponse?.status}`)
        }
        
        expect(ectResponse.body).to.have.property('reportId')
        expect(ectResponse.body).to.have.property('downloadUrl')
        
        reportId = ectResponse.body.reportId
        testReport.id = reportId
        testReport.downloadUrl = ectResponse.body.downloadUrl
        
        cy.log(`ECT gerado com sucesso. Report ID: ${reportId}`)
        cy.log(`Download URL: ${testReport.downloadUrl}`)

        // 5. Fazer download do relatório
        if (!reportId) {
          throw new Error('reportId não foi definido')
        }
        
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return downloadReport(ownerToken, reportId)
        })
      }).then((downloadResponse) => {
        if (!downloadResponse || downloadResponse.status !== 200) {
          cy.log(`Erro ao fazer download do relatório: Status ${downloadResponse?.status}`)
          throw new Error(`Falha ao fazer download do relatório. Status: ${downloadResponse?.status}`)
        }
        
        expect(downloadResponse.headers['content-type']).to.include('application/pdf')
        cy.log('Download do relatório realizado com sucesso')
        cy.log('Fluxo completo executado com sucesso: projeto → pacote → cenário → execução → ECT → download')
      })
    })
  })

  describe('Cenário 1.2: Erro - gerar ECT sem etapas', () => {
    it('deve retornar erro ao tentar gerar ECT para cenário sem etapas', () => {
      if (!testProject.id || !testUsers.owner.id || !testUsers.manager.id) {
        cy.log('Projeto ou usuários não disponíveis')
        throw new Error('Setup incompleto: projeto ou usuários não foram criados corretamente')
      }

      let packageId
      let scenarioId

      // 1. Owner cria pacote
      ensureToken(testUsers.owner).then((ownerToken) => {
        if (!ownerToken) {
          cy.log('Não foi possível obter token do owner, pulando teste')
          return
        }

        return createPackage(ownerToken, testProject.id, {
          title: 'Pacote sem Etapas',
          description: 'Pacote para testar ECT sem etapas',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          release: '2024-01'
        })
      }).then((packageResponse) => {
        if (!packageResponse || packageResponse.status !== 201) {
          cy.log(`Erro ao criar pacote: Status ${packageResponse?.status}`)
          throw new Error(`Falha ao criar pacote. Status: ${packageResponse?.status}`)
        }
        
        packageId = packageResponse.body.testPackage.id

        // 2. Manager cria cenário SEM etapas
        return ensureToken(testUsers.manager).then((managerToken) => {
          return createScenario(managerToken, packageId, {
            title: 'Cenário sem Etapas',
            description: 'Cenário sem etapas para testar erro',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            steps: [] // Sem etapas
          })
        })
      }).then((scenarioResponse) => {
        if (!scenarioResponse || scenarioResponse.status !== 201) {
          cy.log(`Erro ao criar cenário: Status ${scenarioResponse?.status}`)
          throw new Error(`Falha ao criar cenário. Status: ${scenarioResponse?.status}`)
        }
        
        scenarioId = scenarioResponse.body.scenario.id

        // 3. Tentar gerar ECT (deve falhar)
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return generateECT(ownerToken, scenarioId)
        })
      }).then((ectResponse) => {
        expect(ectResponse.status).to.eq(400)
        expect(ectResponse.body).to.have.property('message')
        expect(ectResponse.body.message).to.include('etapas')
        cy.log('Erro esperado ao gerar ECT sem etapas')
      })
    })
  })

  describe('Cenário 1.3: Erro - gerar ECT sem execução', () => {
    it('deve gerar ECT mesmo sem execução (ECT pode ser gerado antes da execução)', () => {
      if (!testProject.id || !testUsers.owner.id || !testUsers.manager.id) {
        cy.log('Projeto ou usuários não disponíveis')
        throw new Error('Setup incompleto: projeto ou usuários não foram criados corretamente')
      }

      let packageId
      let scenarioId

      // 1. Owner cria pacote
      ensureToken(testUsers.owner).then((ownerToken) => {
        if (!ownerToken) {
          cy.log('Não foi possível obter token do owner, pulando teste')
          return
        }

        return createPackage(ownerToken, testProject.id, {
          title: 'Pacote para ECT sem Execução',
          description: 'Pacote para testar ECT sem execução',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          release: '2024-01'
        })
      }).then((packageResponse) => {
        if (!packageResponse || packageResponse.status !== 201) {
          cy.log(`Erro ao criar pacote: Status ${packageResponse?.status}`)
          throw new Error(`Falha ao criar pacote. Status: ${packageResponse?.status}`)
        }
        
        packageId = packageResponse.body.testPackage.id

        // 2. Manager cria cenário COM etapas
        return ensureToken(testUsers.manager).then((managerToken) => {
          return createScenario(managerToken, packageId, {
            title: 'Cenário para ECT sem Execução',
            description: 'Cenário com etapas mas sem execução',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            steps: [
              { action: 'Ação 1', expected: 'Resultado esperado 1' }
            ]
          })
        })
      }).then((scenarioResponse) => {
        if (!scenarioResponse || scenarioResponse.status !== 201) {
          cy.log(`Erro ao criar cenário: Status ${scenarioResponse?.status}`)
          throw new Error(`Falha ao criar cenário. Status: ${scenarioResponse?.status}`)
        }
        
        scenarioId = scenarioResponse.body.scenario.id

        // 3. Gerar ECT sem executar (deve funcionar)
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return generateECT(ownerToken, scenarioId)
        })
      }).then((ectResponse) => {
        // ECT pode ser gerado mesmo sem execução
        // Pode retornar 200 (relatório existente) ou 201 (novo relatório)
        expect(ectResponse.status).to.be.oneOf([200, 201])
        expect(ectResponse.body).to.have.property('reportId')
        expect(ectResponse.body).to.have.property('downloadUrl')
        cy.log('ECT gerado com sucesso mesmo sem execução')
      })
    })
  })

  // Cleanup
  after(() => {
    cy.log('Testes de fluxo completo concluídos')
  })
})

