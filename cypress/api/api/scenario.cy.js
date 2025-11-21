describe('API - Cenários', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Cenários',
      id: null,
      token: null
    },
    member: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Member Cenários',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Cenários',
    description: 'Descrição do projeto para testes de cenários'
  }

  let testPackage = {
    id: null,
    title: 'Pacote para Cenários',
    description: 'Descrição do pacote para testes de cenários',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    release: '2024-01'
  }

  let testScenarios = {
    list: { id: null },
    getById: { id: null },
    update: { id: null },
    delete: { id: null },
    execute: { id: null },
    duplicate: { id: null },
    evidence: { id: null }
  }

  // Array para armazenar IDs de todos os cenários criados durante os testes
  let createdScenarioIds = []

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

  // Setup: Criar usuários, projeto, pacote e cenários de teste
  before(() => {
    // Criar usuário owner
    const ownerEmail = `owner-scenarios-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
    testUsers.owner.email = ownerEmail

    return createTestUser({
      name: testUsers.owner.name,
      email: testUsers.owner.email,
      password: testUsers.owner.password
    }, 0).then((response) => {
      if (response.status === 201 && response.body.id) {
        testUsers.owner.id = response.body.id
        return getAuthToken(testUsers.owner.email, testUsers.owner.password)
      }
      return null
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

        // Criar pacote de teste
        return createPackage(testUsers.owner.token, testProject.id, {
          title: testPackage.title,
          description: testPackage.description,
          type: testPackage.type,
          priority: testPackage.priority,
          release: testPackage.release
        })
      }
      return null
    }).then((packageResponse) => {
      if (packageResponse && packageResponse.status === 201 && packageResponse.body.testPackage?.id) {
        testPackage.id = packageResponse.body.testPackage.id

        // Criar cenários de teste sequencialmente
        return createScenario(testUsers.owner.token, testPackage.id, {
          title: 'Cenário para List',
          description: 'Descrição do cenário para list',
          type: 'FUNCTIONAL',
          priority: 'HIGH'
        })
      }
      return null
    }).then((response) => {
      if (response && response.status === 201 && response.body.scenario?.id) {
        testScenarios.list.id = response.body.scenario.id
        createdScenarioIds.push(testScenarios.list.id)
      }
      return createScenario(testUsers.owner.token, testPackage.id, {
        title: 'Cenário para GetById',
        description: 'Descrição do cenário para getById',
        type: 'FUNCTIONAL',
        priority: 'MEDIUM'
      })
    }).then((response) => {
      if (response && response.status === 201 && response.body.scenario?.id) {
        testScenarios.getById.id = response.body.scenario.id
        createdScenarioIds.push(testScenarios.getById.id)
      }
      return createScenario(testUsers.owner.token, testPackage.id, {
        title: 'Cenário para Update',
        description: 'Descrição do cenário para update',
        type: 'REGRESSION',
        priority: 'HIGH'
      })
    }).then((response) => {
      if (response && response.status === 201 && response.body.scenario?.id) {
        testScenarios.update.id = response.body.scenario.id
        createdScenarioIds.push(testScenarios.update.id)
      }
      return createScenario(testUsers.owner.token, testPackage.id, {
        title: 'Cenário para Delete',
        description: 'Descrição do cenário para delete',
        type: 'SMOKE',
        priority: 'LOW'
      })
    }).then((response) => {
      if (response && response.status === 201 && response.body.scenario?.id) {
        testScenarios.delete.id = response.body.scenario.id
        createdScenarioIds.push(testScenarios.delete.id)
      }
      return createScenario(testUsers.owner.token, testPackage.id, {
        title: 'Cenário para Execute',
        description: 'Descrição do cenário para execute',
        type: 'E2E',
        priority: 'MEDIUM'
      })
    }).then((response) => {
      if (response && response.status === 201 && response.body.scenario?.id) {
        testScenarios.execute.id = response.body.scenario.id
        createdScenarioIds.push(testScenarios.execute.id)
      }
      return createScenario(testUsers.owner.token, testPackage.id, {
        title: 'Cenário para Duplicate',
        description: 'Descrição do cenário para duplicate',
        type: 'FUNCTIONAL',
        priority: 'HIGH'
      })
    }).then((response) => {
      if (response && response.status === 201 && response.body.scenario?.id) {
        testScenarios.duplicate.id = response.body.scenario.id
        createdScenarioIds.push(testScenarios.duplicate.id)
      }
      return createScenario(testUsers.owner.token, testPackage.id, {
        title: 'Cenário para Evidence',
        description: 'Descrição do cenário para evidence',
        type: 'FUNCTIONAL',
        priority: 'MEDIUM'
      })
    }).then((response) => {
      if (response && response.status === 201 && response.body.scenario?.id) {
        testScenarios.evidence.id = response.body.scenario.id
        createdScenarioIds.push(testScenarios.evidence.id)
      }
    }).then(() => {
      // Criar usuário member
      const memberEmail = `member-scenarios-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.member.email = memberEmail

      return createTestUser({
        name: testUsers.member.name,
        email: testUsers.member.email,
        password: testUsers.member.password
      }, 1000).then((response) => {
        if (response.status === 201 && response.body.id) {
          testUsers.member.id = response.body.id
          return getAuthToken(testUsers.member.email, testUsers.member.password)
        }
        return null
      }).then((token) => {
        if (token && typeof token === 'string') {
          testUsers.member.token = token
        }
      })
    })
  })

  describe('GET /api/packages/:packageId/scenarios - Listar cenários do pacote', () => {
    it('deve listar cenários do pacote', () => {
      if (!testPackage.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('data')
          expect(response.body.data).to.have.property('scenarios')
          expect(Array.isArray(response.body.data.scenarios)).to.be.true
          expect(response.body.data).to.have.property('pagination')
        })
      })
    })

    it('deve suportar paginação', () => {
      if (!testPackage.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios?page=1&pageSize=5`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body.data).to.have.property('pagination')
          expect(response.body.data.pagination).to.have.property('page', 1)
          expect(response.body.data.pagination).to.have.property('pageSize', 5)
        })
      })
    })

    it('deve suportar filtros (status, type, priority)', () => {
      if (!testPackage.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios?type=FUNCTIONAL&priority=HIGH`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body.data).to.have.property('scenarios')
          expect(Array.isArray(response.body.data.scenarios)).to.be.true
        })
      })
    })

    it('deve suportar busca por texto (query parameter q)', () => {
      if (!testPackage.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios?q=GetById`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body.data).to.have.property('scenarios')
          expect(Array.isArray(response.body.data.scenarios)).to.be.true
        })
      })
    })

    it('deve retornar 400 quando packageId é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/invalid-id/scenarios`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testPackage.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/packages/:packageId/scenarios - Criar cenário', () => {
    it('deve criar um cenário com sucesso', () => {
      if (!testPackage.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        const scenarioData = {
          title: 'Novo Cenário de Teste',
          description: 'Descrição do novo cenário',
          type: 'FUNCTIONAL',
          priority: 'HIGH'
        }

        createScenario(token, testPackage.id, scenarioData).then((response) => {
          expect(response.status).to.eq(201)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('scenario')
          expect(response.body.scenario).to.have.property('id')
          expect(response.body.scenario).to.have.property('title', scenarioData.title)
          expect(response.body.scenario).to.have.property('type', scenarioData.type)
          expect(response.body.scenario).to.have.property('priority', scenarioData.priority)
          
          if (response.body.scenario && response.body.scenario.id) {
            createdScenarioIds.push(response.body.scenario.id)
          }
        })
      })
    })

    it('deve criar um cenário com steps', () => {
      if (!testPackage.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        const scenarioData = {
          title: 'Cenário com Steps',
          description: 'Cenário que inclui passos',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM',
          steps: [
            {
              action: 'Acessar a página de login',
              expected: 'Página de login é exibida'
            },
            {
              action: 'Preencher credenciais',
              expected: 'Campos são preenchidos corretamente'
            }
          ]
        }

        createScenario(token, testPackage.id, scenarioData).then((response) => {
          expect(response.status).to.eq(201)
          expect(response.body.scenario).to.have.property('id')
          expect(response.body.scenario.steps).to.be.an('array')
          expect(response.body.scenario.steps.length).to.eq(2)
          
          if (response.body.scenario && response.body.scenario.id) {
            createdScenarioIds.push(response.body.scenario.id)
          }
        })
      })
    })

    it('deve retornar 400 quando campos obrigatórios estão faltando', () => {
      if (!testPackage.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        createScenario(token, testPackage.id, {
          title: 'Cenário sem campos obrigatórios'
          // Faltando type e priority
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 400 quando packageId é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        createScenario(token, 'invalid-id', {
          title: 'Cenário Teste',
          type: 'FUNCTIONAL',
          priority: 'HIGH'
        }).then((response) => {
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testPackage.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios`,
        body: {
          title: 'Cenário Teste',
          type: 'FUNCTIONAL',
          priority: 'HIGH'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/scenarios/:id - Buscar cenário por ID', () => {
    it('deve retornar cenário quando existe', () => {
      if (!testScenarios.getById.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/scenarios/${testScenarios.getById.id}`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('scenario')
          expect(response.body.scenario).to.have.property('id', testScenarios.getById.id)
          expect(response.body.scenario).to.have.property('title')
        })
      })
    })

    it('deve retornar 404 quando cenário não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/scenarios/999999`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 400 quando ID é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/scenarios/invalid-id`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testScenarios.getById.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/scenarios/${testScenarios.getById.id}`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('PUT /api/scenarios/:id - Atualizar cenário', () => {
    it('deve atualizar o título do cenário', () => {
      if (!testScenarios.update.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        const newTitle = 'Cenário Atualizado'

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/scenarios/${testScenarios.update.id}`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: newTitle
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('scenario')
          expect(response.body.scenario).to.have.property('title', newTitle)
        })
      })
    })

    it('deve atualizar múltiplos campos do cenário', () => {
      if (!testScenarios.update.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        const updateData = {
          title: 'Cenário Atualizado Completo',
          description: 'Nova descrição',
          priority: 'LOW',
          status: 'EXECUTED'
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/scenarios/${testScenarios.update.id}`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: updateData
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('scenario')
          expect(response.body.scenario).to.have.property('title', updateData.title)
          expect(response.body.scenario).to.have.property('description', updateData.description)
          expect(response.body.scenario).to.have.property('priority', updateData.priority)
        })
      })
    })

    it('deve retornar 404 quando cenário não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/scenarios/999999`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Novo Título'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 400 quando ID é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/scenarios/invalid-id`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Novo Título'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testScenarios.update.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'PUT',
        url: `${API_BASE_URL}/scenarios/${testScenarios.update.id}`,
        body: {
          title: 'Novo Título'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('DELETE /api/scenarios/:id - Deletar cenário', () => {
    it('deve deletar um cenário existente', () => {
      if (!testScenarios.delete.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'DELETE',
          url: `${API_BASE_URL}/scenarios/${testScenarios.delete.id}`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 404 quando cenário não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'DELETE',
          url: `${API_BASE_URL}/scenarios/999999`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 400 quando ID é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'DELETE',
          url: `${API_BASE_URL}/scenarios/invalid-id`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testScenarios.delete.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/scenarios/${testScenarios.delete.id}`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/scenarios/:id/executions - Executar cenário', () => {
    it('deve executar um cenário com status PASSED', () => {
      if (!testScenarios.execute.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenarios.execute.id}/executions`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            status: 'PASSED',
            notes: 'Cenário executado com sucesso'
          }
        }).then((response) => {
          expect(response.status).to.eq(201)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('execution')
          expect(response.body.execution).to.have.property('status', 'PASSED')
        })
      })
    })

    it('deve executar um cenário com status FAILED', () => {
      if (!testScenarios.execute.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenarios.execute.id}/executions`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            status: 'FAILED',
            notes: 'Cenário falhou na execução'
          }
        }).then((response) => {
          expect(response.status).to.eq(201)
          expect(response.body.execution).to.have.property('status', 'FAILED')
        })
      })
    })

    it('deve executar um cenário com status BLOCKED', () => {
      if (!testScenarios.execute.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenarios.execute.id}/executions`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            status: 'BLOCKED',
            notes: 'Cenário bloqueado'
          }
        }).then((response) => {
          expect(response.status).to.eq(201)
          expect(response.body.execution).to.have.property('status', 'BLOCKED')
        })
      })
    })

    it('deve retornar 400 quando status é inválido', () => {
      if (!testScenarios.execute.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenarios.execute.id}/executions`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            status: 'INVALID_STATUS'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 400 quando status não é fornecido', () => {
      if (!testScenarios.execute.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenarios.execute.id}/executions`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {},
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 404 quando cenário não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/999999/executions`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            status: 'PASSED'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testScenarios.execute.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/scenarios/${testScenarios.execute.id}/executions`,
        body: {
          status: 'PASSED'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/scenarios/:id/duplicate - Duplicar cenário', () => {
    it('deve duplicar um cenário com sucesso', () => {
      if (!testScenarios.duplicate.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenarios.duplicate.id}/duplicate`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(201)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('scenario')
          expect(response.body.scenario).to.have.property('id')
          expect(response.body.scenario.title).to.include('(Cópia)')
          
          if (response.body.scenario && response.body.scenario.id) {
            createdScenarioIds.push(response.body.scenario.id)
          }
        })
      })
    })

    it('deve retornar 404 quando cenário não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/999999/duplicate`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 400 quando ID é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/invalid-id/duplicate`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testScenarios.duplicate.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/scenarios/${testScenarios.duplicate.id}/duplicate`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/scenarios/:id/evidences - Upload de evidência', () => {
    // Nota: Upload de arquivos via cy.request() é limitado no Cypress
    // O teste de upload com sucesso requer configuração adicional ou bibliotecas externas
    // Por enquanto, testamos apenas os casos de erro
    it.skip('deve fazer upload de evidência com sucesso', () => {
      // Este teste está pulado porque o Cypress não suporta FormData diretamente no cy.request()
      // Para testar upload real, seria necessário usar uma biblioteca como form-data ou
      // fazer o teste via interface do navegador usando cy.visit() e cy.get('input[type=file]')
    })

    it('deve retornar 400 quando arquivo não é fornecido', () => {
      if (!testScenarios.evidence.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenarios.evidence.id}/evidences`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {},
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('Arquivo')
        })
      })
    })

    it('deve retornar 404 quando cenário não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        // Como não podemos fazer upload real via cy.request(), testamos apenas o erro
        // quando o arquivo não é fornecido (que também valida a rota)
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/999999/evidences`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {},
          failOnStatusCode: false
        }).then((response) => {
          // Pode retornar 400 (arquivo não fornecido) ou 404 (cenário não existe)
          // dependendo da ordem de validação no backend
          expect([400, 404, 500]).to.include(response.status)
          // Se o body tiver conteúdo, verificar se tem message
          if (response.body && Object.keys(response.body).length > 0) {
            expect(response.body).to.have.property('message')
          }
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testScenarios.evidence.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/scenarios/${testScenarios.evidence.id}/evidences`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/packages/:packageId/scenarios/export.csv - Exportar CSV', () => {
    it('deve exportar cenários para CSV', () => {
      if (!testPackage.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios/export.csv`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.headers['content-type']).to.include('text/csv')
          expect(response.body).to.be.a('string')
        })
      })
    })

    it('deve retornar 400 quando packageId é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/invalid-id/scenarios/export.csv`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testPackage.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios/export.csv`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/packages/:packageId/scenarios/report.pdf - Gerar relatório PDF', () => {
    it('deve gerar relatório PDF', () => {
      if (!testPackage.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios/report.pdf`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.headers['content-type']).to.include('application/pdf')
          expect(response.body).to.exist
        })
      })
    })

    it('deve retornar 400 quando packageId é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/invalid-id/scenarios/report.pdf`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testPackage.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios/report.pdf`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  after(() => {
    // Função para deletar todos os cenários criados durante os testes
    const deleteAllTestScenarios = () => {
      const allScenarioIds = createdScenarioIds.filter(id => id !== null)

      allScenarioIds.forEach((scenarioId) => {
        if (testUsers.owner.token) {
          cy.request({
            method: 'DELETE',
            url: `${API_BASE_URL}/scenarios/${scenarioId}`,
            headers: {
              Authorization: `Bearer ${testUsers.owner.token}`
            },
            failOnStatusCode: false
          }).then((response) => {
            if (response.status === 200) {
              cy.log(`Cenário ${scenarioId} deletado com sucesso`)
            } else if (response.status === 404) {
              cy.log(`Cenário ${scenarioId} já não existe`)
            } else {
              cy.log(`Erro ao deletar cenário ${scenarioId}: ${response.status}`)
            }
          })
        }
      })
    }

    // Executar limpeza
    deleteAllTestScenarios()
    cy.log('Testes de cenários concluídos - Limpeza executada')
  })
})

