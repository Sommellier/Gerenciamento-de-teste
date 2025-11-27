describe('API - Integração: Fluxo de Criação de Bugs', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Bugs',
      id: null,
      token: null
    },
    manager: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Manager Bugs',
      id: null,
      token: null
    },
    tester: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Tester Bugs',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Fluxo de Bugs',
    description: 'Descrição do projeto para testes de bugs'
  }

  let testPackage = {
    id: null,
    title: 'Pacote para Bugs',
    description: 'Descrição do pacote para testes de bugs',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    release: '2024-01'
  }

  let testScenario = {
    id: null,
    title: 'Cenário para Bugs',
    description: 'Descrição do cenário para testes de bugs',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    steps: []
  }

  let testBugs = {
    create: { id: null },
    update: { id: null },
    delete: { id: null },
    list: { id: null },
    attachment: { id: null }
  }

  // Array para armazenar IDs de todos os bugs criados durante os testes
  let createdBugIds = []

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

  // Função auxiliar para criar bug
  const createBug = (token, scenarioId, bugData) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/scenarios/${scenarioId}/bugs`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: bugData,
      failOnStatusCode: false
    })
  }

  // Função auxiliar para listar bugs do cenário
  const getScenarioBugs = (token, scenarioId) => {
    return cy.request({
      method: 'GET',
      url: `${API_BASE_URL}/scenarios/${scenarioId}/bugs`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para listar bugs do pacote
  const getPackageBugs = (token, projectId, packageId) => {
    return cy.request({
      method: 'GET',
      url: `${API_BASE_URL}/projects/${projectId}/packages/${packageId}/bugs`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para atualizar bug
  const updateBug = (token, bugId, updateData) => {
    return cy.request({
      method: 'PUT',
      url: `${API_BASE_URL}/bugs/${bugId}`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: updateData,
      failOnStatusCode: false
    })
  }

  // Função auxiliar para deletar bug
  const deleteBug = (token, bugId) => {
    return cy.request({
      method: 'DELETE',
      url: `${API_BASE_URL}/bugs/${bugId}`,
      headers: {
        Authorization: `Bearer ${token}`
      },
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

  // Setup: Criar usuários, projeto, pacote e cenário
  before(() => {
    // Criar usuário owner
    const ownerEmail = `owner-bugs-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
      const managerEmail = `manager-bugs-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
      const testerEmail = `tester-bugs-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
      if (packageResponse && packageResponse.status === 201 && packageResponse.body.testPackage?.id) {
        testPackage.id = packageResponse.body.testPackage.id
      } else if (packageResponse && packageResponse.status === 201 && packageResponse.body.package?.id) {
        // Tentar formato alternativo da resposta
        testPackage.id = packageResponse.body.package.id
      }
      if (!testPackage.id) {
        cy.log(`Erro: Pacote não foi criado corretamente. Status: ${packageResponse?.status}, Body: ${JSON.stringify(packageResponse?.body)}`)
        throw new Error('Setup incompleto: pacote não foi criado corretamente')
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
            }
          ]
        })
      })
    }).then((scenarioResponse) => {
      if (scenarioResponse && scenarioResponse.status === 201 && scenarioResponse.body.scenario) {
        testScenario.id = scenarioResponse.body.scenario.id
        testScenario.steps = scenarioResponse.body.scenario.steps || []

        // Se os steps não vieram na resposta inicial, buscar o cenário novamente para garantir que os steps estão lá
        if (testScenario.steps.length === 0) {
          return ensureToken(testUsers.owner).then((ownerToken) => {
            return getScenarioById(ownerToken, testScenario.id).then((fetchedScenarioResponse) => {
              if (fetchedScenarioResponse && fetchedScenarioResponse.status === 200 && fetchedScenarioResponse.body) {
                testScenario.steps = fetchedScenarioResponse.body.steps || []
              }
            })
          })
        }
      } else {
        cy.log('Erro: Cenário não foi criado corretamente')
        throw new Error('Setup incompleto: cenário não foi criado corretamente')
      }
      if (!testScenario.id) {
        cy.log('Erro: ID do cenário não foi definido')
        throw new Error('Setup incompleto: ID do cenário não foi definido')
      }
    })
  })

  describe('Cenário 7.1: Criar bug durante execução', () => {
    it('deve executar cenário e criar bug durante a execução', () => {
      if (!testScenario.id || !testScenario.steps || testScenario.steps.length === 0) {
        cy.log('Cenário ou etapas não disponíveis')
        throw new Error('Setup incompleto: cenário ou etapas não foram criados corretamente')
      }

      let bugId
      let stepId = testScenario.steps[0].id

      // 1. Executar cenário (pode ser PASSED ou FAILED)
      return ensureToken(testUsers.tester).then((testerToken) => {
        return executeScenario(testerToken, testScenario.id, 'PASSED')
      }).then((executionResponse) => {
        expect(executionResponse.status).to.eq(201)
        cy.log('Cenário executado com sucesso')

        // 2. Criar bug durante/após execução
        return ensureToken(testUsers.tester).then((testerToken) => {
          return createBug(testerToken, testScenario.id, {
            title: 'Bug encontrado durante execução',
            description: 'Descrição detalhada do bug encontrado',
            severity: 'HIGH',
            relatedStepId: stepId
          })
        })
      }).then((bugResponse) => {
        expect(bugResponse.status).to.eq(201)
        expect(bugResponse.body).to.have.property('message')
        expect(bugResponse.body).to.have.property('bug')
        expect(bugResponse.body.bug).to.have.property('id')
        expect(bugResponse.body.bug).to.have.property('title', 'Bug encontrado durante execução')
        expect(bugResponse.body.bug).to.have.property('severity', 'HIGH')
        expect(bugResponse.body.bug).to.have.property('status', 'OPEN')
        
        bugId = bugResponse.body.bug.id
        testBugs.create.id = bugId
        createdBugIds.push(bugId)
        cy.log(`Bug criado com ID: ${bugId}`)

        // 3. Verificar que o cenário foi atualizado para FAILED
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return getScenarioById(ownerToken, testScenario.id)
        })
      }).then((scenarioResponse) => {
        expect(scenarioResponse.status).to.eq(200)
        expect(scenarioResponse.body.scenario).to.exist
        expect(scenarioResponse.body.scenario.status).to.eq('FAILED')
        cy.log('Cenário atualizado para FAILED após criação do bug')
      })
    })
  })

  describe('Cenário 7.2: Anexar arquivo ao bug', () => {
    it.skip('deve fazer upload de anexo para o bug', () => {
      // Nota: Upload de arquivos via Cypress cy.request() é limitado
      // Este teste está marcado como skip devido à limitação do FormData no Cypress
      if (!testBugs.create.id) {
        cy.log('Bug não disponível, pulando teste')
        return
      }

      // O teste real de upload seria feito via interface ou usando biblioteca específica
      cy.log('Teste de upload de anexo de bug - requer implementação especial')
    })

    it('deve retornar 400 quando arquivo não é fornecido', () => {
      if (!testBugs.create.id) {
        cy.log('Bug não disponível, pulando teste')
        return
      }

      // Criar um novo bug para este teste
      return ensureToken(testUsers.tester).then((testerToken) => {
        return createBug(testerToken, testScenario.id, {
          title: 'Bug para teste de anexo',
          description: 'Descrição do bug',
          severity: 'MEDIUM'
        })
      }).then((bugResponse) => {
        if (bugResponse.status === 201 && bugResponse.body.bug) {
          const bugId = bugResponse.body.bug.id
          createdBugIds.push(bugId)

          // Tentar fazer upload sem arquivo
          return ensureToken(testUsers.tester).then((testerToken) => {
            return cy.request({
              method: 'POST',
              url: `${API_BASE_URL}/bugs/${bugId}/attachments`,
              headers: {
                Authorization: `Bearer ${testerToken}`
              },
              failOnStatusCode: false
            })
          })
        }
        return null
      }).then((uploadResponse) => {
        if (uploadResponse) {
          expect(uploadResponse.status).to.eq(400)
          expect(uploadResponse.body).to.have.property('message')
          cy.log('Erro confirmado: arquivo é obrigatório')
        }
      })
    })
  })

  describe('Cenário 7.3: Atualizar status do bug', () => {
    it('deve atualizar status do bug com sucesso', () => {
      if (!testBugs.create.id) {
        cy.log('Bug não disponível, pulando teste')
        return
      }

      // Criar um novo bug para atualizar
      return ensureToken(testUsers.tester).then((testerToken) => {
        return createBug(testerToken, testScenario.id, {
          title: 'Bug para atualizar',
          description: 'Descrição do bug',
          severity: 'MEDIUM'
        })
      }).then((bugResponse) => {
        expect(bugResponse.status).to.eq(201)
        const bugId = bugResponse.body.bug.id
        testBugs.update.id = bugId
        createdBugIds.push(bugId)
        cy.log(`Bug criado com ID: ${bugId}`)

        // Atualizar status do bug
        return ensureToken(testUsers.manager).then((managerToken) => {
          return updateBug(managerToken, bugId, {
            status: 'IN_PROGRESS'
          })
        })
      }).then((updateResponse) => {
        expect(updateResponse.status).to.eq(200)
        expect(updateResponse.body).to.have.property('message')
        expect(updateResponse.body).to.have.property('bug')
        expect(updateResponse.body.bug).to.have.property('status', 'IN_PROGRESS')
        cy.log('Status do bug atualizado para IN_PROGRESS')

        // Atualizar para RESOLVED
        return ensureToken(testUsers.manager).then((managerToken) => {
          return updateBug(managerToken, testBugs.update.id, {
            status: 'RESOLVED'
          })
        })
      }).then((updateResponse2) => {
        expect(updateResponse2.status).to.eq(200)
        expect(updateResponse2.body.bug).to.have.property('status', 'RESOLVED')
        cy.log('Status do bug atualizado para RESOLVED')

        // Atualizar para CLOSED
        return ensureToken(testUsers.manager).then((managerToken) => {
          return updateBug(managerToken, testBugs.update.id, {
            status: 'CLOSED'
          })
        })
      }).then((updateResponse3) => {
        expect(updateResponse3.status).to.eq(200)
        expect(updateResponse3.body.bug).to.have.property('status', 'CLOSED')
        cy.log('Status do bug atualizado para CLOSED')
      })
    })
  })

  describe('Cenário 7.4: Listar bugs por cenário e por pacote', () => {
    it('deve listar bugs do cenário e do pacote', () => {
      if (!testScenario.id || !testPackage.id) {
        cy.log('Cenário ou pacote não disponíveis')
        throw new Error('Setup incompleto: cenário ou pacote não foram criados corretamente')
      }

      // Criar múltiplos bugs no cenário
      return ensureToken(testUsers.tester).then((testerToken) => {
        return createBug(testerToken, testScenario.id, {
          title: 'Bug 1 para listagem',
          description: 'Descrição do bug 1',
          severity: 'LOW'
        })
      }).then((bug1Response) => {
        if (bug1Response.status === 201 && bug1Response.body.bug) {
          createdBugIds.push(bug1Response.body.bug.id)
          testBugs.list.id = bug1Response.body.bug.id
        }

        // Criar segundo bug
        return ensureToken(testUsers.tester).then((testerToken) => {
          return createBug(testerToken, testScenario.id, {
            title: 'Bug 2 para listagem',
            description: 'Descrição do bug 2',
            severity: 'CRITICAL'
          })
        })
      }).then((bug2Response) => {
        if (bug2Response.status === 201 && bug2Response.body.bug) {
          createdBugIds.push(bug2Response.body.bug.id)
        }

        // Listar bugs do cenário
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return getScenarioBugs(ownerToken, testScenario.id)
        })
      }).then((scenarioBugsResponse) => {
        expect(scenarioBugsResponse.status).to.eq(200)
        expect(scenarioBugsResponse.body).to.have.property('message')
        expect(scenarioBugsResponse.body).to.have.property('bugs')
        expect(scenarioBugsResponse.body.bugs).to.be.an('array')
        expect(scenarioBugsResponse.body.bugs.length).to.be.greaterThan(0)
        cy.log(`Encontrados ${scenarioBugsResponse.body.bugs.length} bugs no cenário`)

        // Verificar que os bugs criados estão na lista
        const bugIds = scenarioBugsResponse.body.bugs.map(bug => bug.id)
        if (testBugs.list.id) {
          expect(bugIds).to.include(testBugs.list.id)
        }

        // Listar bugs do pacote
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return getPackageBugs(ownerToken, testProject.id, testPackage.id)
        })
      }).then((packageBugsResponse) => {
        expect(packageBugsResponse.status).to.eq(200)
        expect(packageBugsResponse.body).to.have.property('message')
        expect(packageBugsResponse.body).to.have.property('bugs')
        expect(packageBugsResponse.body.bugs).to.be.an('array')
        expect(packageBugsResponse.body.bugs.length).to.be.greaterThan(0)
        cy.log(`Encontrados ${packageBugsResponse.body.bugs.length} bugs no pacote`)

        // Verificar que os bugs do cenário estão na lista do pacote
        const packageBugIds = packageBugsResponse.body.bugs.map(bug => bug.id)
        if (testBugs.list.id) {
          expect(packageBugIds).to.include(testBugs.list.id)
        }
      })
    })
  })

  describe('Cenário 7.5: Deletar bug', () => {
    it('deve deletar um bug existente', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível')
        throw new Error('Setup incompleto: cenário não foi criado corretamente')
      }

      // Criar bug para deletar
      return ensureToken(testUsers.tester).then((testerToken) => {
        return createBug(testerToken, testScenario.id, {
          title: 'Bug para deletar',
          description: 'Descrição do bug que será deletado',
          severity: 'LOW'
        })
      }).then((bugResponse) => {
        expect(bugResponse.status).to.eq(201)
        const bugId = bugResponse.body.bug.id
        testBugs.delete.id = bugId
        cy.log(`Bug criado com ID: ${bugId} para deletar`)

        // Deletar bug
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return deleteBug(ownerToken, bugId)
        })
      }).then((deleteResponse) => {
        expect(deleteResponse.status).to.eq(200)
        expect(deleteResponse.body).to.have.property('message')
        expect(deleteResponse.body.message).to.include('excluído')
        cy.log('Bug deletado com sucesso')

        // Verificar que o bug não existe mais
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return getScenarioBugs(ownerToken, testScenario.id)
        })
      }).then((bugsResponse) => {
        expect(bugsResponse.status).to.eq(200)
        const bugIds = bugsResponse.body.bugs.map(bug => bug.id)
        expect(bugIds).to.not.include(testBugs.delete.id)
        cy.log('Bug confirmado como deletado')
      })
    })
  })

  // Cleanup: Deletar todos os bugs criados durante os testes
  after(() => {
    if (createdBugIds.length > 0) {
      cy.log(`Limpando ${createdBugIds.length} bugs criados durante os testes`)
      
      createdBugIds.forEach((bugId) => {
        ensureToken(testUsers.owner).then((token) => {
          if (token) {
            deleteBug(token, bugId).then((response) => {
              if (response.status === 200) {
                cy.log(`Bug ${bugId} deletado`)
              }
            })
          }
        })
      })
    }
    
    cy.log('Testes de fluxo de criação de bugs concluídos')
  })
})

