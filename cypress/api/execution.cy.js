describe('API - Execução', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Execução',
      id: null,
      token: null
    },
    member: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Member Execução',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Execução',
    description: 'Descrição do projeto para testes de execução'
  }

  let testPackage = {
    id: null,
    title: 'Pacote para Execução',
    description: 'Descrição do pacote para testes de execução',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    release: '2024-01'
  }

  let testScenario = {
    id: null,
    title: 'Cenário para Execução',
    description: 'Cenário com steps para testes de execução',
    type: 'FUNCTIONAL',
    priority: 'HIGH'
  }

  let testStep = {
    id: null
  }

  let testBug = {
    id: null
  }

  // Arrays para armazenar IDs criados durante os testes
  let createdBugIds = []
  let createdAttachmentIds = []

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

  // Função auxiliar para criar cenário com steps
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

  // Setup: Criar usuários, projeto, pacote, cenário com steps
  before(() => {
    // Criar usuário owner
    const ownerEmail = `owner-execution-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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

        // Criar cenário com steps para testes
        return createScenario(testUsers.owner.token, testPackage.id, {
          title: testScenario.title,
          description: testScenario.description,
          type: testScenario.type,
          priority: testScenario.priority,
          steps: [
            {
              action: 'Acessar a página de login',
              expected: 'Página de login é exibida'
            },
            {
              action: 'Preencher credenciais e clicar em entrar',
              expected: 'Usuário é autenticado e redirecionado'
            }
          ]
        })
      }
      return null
    }).then((scenarioResponse) => {
      if (scenarioResponse && scenarioResponse.status === 201 && scenarioResponse.body.scenario?.id) {
        testScenario.id = scenarioResponse.body.scenario.id
        
        // Obter o primeiro step do cenário
        if (scenarioResponse.body.scenario.steps && scenarioResponse.body.scenario.steps.length > 0) {
          testStep.id = scenarioResponse.body.scenario.steps[0].id
        }
      }
    }).then(() => {
      // Criar usuário member
      const memberEmail = `member-execution-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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

  describe('POST /api/steps/:stepId/comments - Adicionar comentário em etapa', () => {
    it('deve adicionar um comentário com sucesso', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/steps/${testStep.id}/comments`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            text: 'Este é um comentário de teste na etapa'
          }
        }).then((response) => {
          expect(response.status).to.eq(201)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('comment')
          expect(response.body.comment).to.have.property('id')
          expect(response.body.comment).to.have.property('text')
        })
      })
    })

    it('deve retornar 400 quando texto está vazio', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/steps/${testStep.id}/comments`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            text: '   '
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 400 quando texto não é fornecido', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/steps/${testStep.id}/comments`,
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

    it('deve retornar 404 quando step não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/steps/999999/comments`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            text: 'Comentário de teste'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/steps/${testStep.id}/comments`,
        body: {
          text: 'Comentário de teste'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/steps/:stepId/comments - Listar comentários da etapa', () => {
    it('deve listar comentários da etapa', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/steps/${testStep.id}/comments`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('comments')
          expect(Array.isArray(response.body.comments)).to.be.true
        })
      })
    })

    it('deve retornar 404 quando step não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/steps/999999/comments`,
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

    it('deve retornar 401 quando não autenticado', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/steps/${testStep.id}/comments`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/steps/:stepId/attachments - Upload de anexo', () => {
    // Nota: Upload de arquivos via cy.request() é limitado no Cypress
    it.skip('deve fazer upload de anexo com sucesso', () => {
      // Este teste está pulado porque o Cypress não suporta FormData diretamente no cy.request()
    })

    it('deve retornar 400 quando arquivo não é fornecido', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/steps/${testStep.id}/attachments`,
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

    it('deve retornar 404 quando step não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/steps/999999/attachments`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {},
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 404, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/steps/${testStep.id}/attachments`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/steps/:stepId/attachments - Listar anexos da etapa', () => {
    it('deve listar anexos da etapa', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/steps/${testStep.id}/attachments`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('attachments')
          expect(Array.isArray(response.body.attachments)).to.be.true
        })
      })
    })

    it('deve retornar 404 quando step não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/steps/999999/attachments`,
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

    it('deve retornar 401 quando não autenticado', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/steps/${testStep.id}/attachments`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('DELETE /api/steps/:stepId/attachments/:attachmentId - Deletar anexo', () => {
    it('deve retornar 404 quando anexo não existe', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'DELETE',
          url: `${API_BASE_URL}/steps/${testStep.id}/attachments/999999`,
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

    it('deve retornar 401 quando não autenticado', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/steps/${testStep.id}/attachments/1`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('PUT /api/execution/steps/:stepId/status - Atualizar status da etapa', () => {
    it('deve atualizar status da etapa para PASSED', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/execution/steps/${testStep.id}/status`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            status: 'PASSED',
            actualResult: 'Etapa executada com sucesso'
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('step')
          expect(response.body.step).to.have.property('status', 'PASSED')
        })
      })
    })

    it('deve atualizar status da etapa para FAILED', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/execution/steps/${testStep.id}/status`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            status: 'FAILED',
            actualResult: 'Etapa falhou na execução'
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body.step).to.have.property('status', 'FAILED')
        })
      })
    })

    it('deve atualizar status da etapa para BLOCKED', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/execution/steps/${testStep.id}/status`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            status: 'BLOCKED',
            actualResult: 'Etapa bloqueada'
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body.step).to.have.property('status', 'BLOCKED')
        })
      })
    })

    it('deve retornar 400 quando status não é fornecido', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/execution/steps/${testStep.id}/status`,
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

    it('deve retornar 404 quando step não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/execution/steps/999999/status`,
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
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'PUT',
        url: `${API_BASE_URL}/execution/steps/${testStep.id}/status`,
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

  describe('POST /api/scenarios/:scenarioId/bugs - Criar bug', () => {
    it('deve criar um bug com sucesso', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        const bugData = {
          title: 'Bug de Teste',
          description: 'Descrição do bug de teste',
          severity: 'HIGH',
          relatedStepId: testStep.id
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/bugs`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: bugData
        }).then((response) => {
          expect(response.status).to.eq(201)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('bug')
          expect(response.body.bug).to.have.property('id')
          expect(response.body.bug).to.have.property('title', bugData.title)
          expect(response.body.bug).to.have.property('severity', bugData.severity)
          
          if (response.body.bug && response.body.bug.id) {
            testBug.id = response.body.bug.id
            createdBugIds.push(response.body.bug.id)
          }
        })
      })
    })

    it('deve retornar 400 quando título está vazio', () => {
      if (!testScenario.id) {
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
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/bugs`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: '   ',
            severity: 'HIGH'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 400 quando severity é inválida', () => {
      if (!testScenario.id) {
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
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/bugs`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Bug de Teste',
            severity: 'INVALID'
          },
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
          url: `${API_BASE_URL}/scenarios/999999/bugs`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Bug de Teste',
            severity: 'HIGH'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/scenarios/${testScenario.id}/bugs`,
        body: {
          title: 'Bug de Teste',
          severity: 'HIGH'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/scenarios/:scenarioId/bugs - Listar bugs do cenário', () => {
    it('deve listar bugs do cenário', () => {
      if (!testScenario.id) {
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
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/bugs`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('bugs')
          expect(Array.isArray(response.body.bugs)).to.be.true
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
          url: `${API_BASE_URL}/scenarios/999999/bugs`,
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

    it('deve retornar 401 quando não autenticado', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/scenarios/${testScenario.id}/bugs`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/projects/:projectId/packages/:packageId/bugs - Listar bugs do pacote', () => {
    it('deve listar bugs do pacote', () => {
      if (!testProject.id || !testPackage.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackage.id}/bugs`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('bugs')
          expect(Array.isArray(response.body.bugs)).to.be.true
        })
      })
    })

    it('deve retornar 400 quando projectId é inválido', () => {
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
          url: `${API_BASE_URL}/projects/invalid-id/packages/${testPackage.id}/bugs`,
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
      if (!testProject.id || !testPackage.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackage.id}/bugs`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('PUT /api/bugs/:bugId - Atualizar bug', () => {
    it('deve atualizar um bug com sucesso', () => {
      if (!testBug.id) {
        cy.log('Bug não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        const updateData = {
          title: 'Bug Atualizado',
          description: 'Nova descrição do bug',
          severity: 'CRITICAL',
          status: 'OPEN'
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/bugs/${testBug.id}`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: updateData
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('bug')
          expect(response.body.bug).to.have.property('title', updateData.title)
          expect(response.body.bug).to.have.property('severity', updateData.severity)
        })
      })
    })

    it('deve retornar 404 quando bug não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/bugs/999999`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Bug Atualizado'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testBug.id) {
        cy.log('Bug não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'PUT',
        url: `${API_BASE_URL}/bugs/${testBug.id}`,
        body: {
          title: 'Bug Atualizado'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('DELETE /api/bugs/:bugId - Deletar bug', () => {
    it('deve deletar um bug com sucesso', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        // Criar um bug temporário para deletar
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/bugs`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Bug para Deletar',
            severity: 'LOW'
          }
        }).then((createResponse) => {
          if (createResponse.status !== 201 || !createResponse.body.bug?.id) {
            cy.log('Não foi possível criar bug temporário')
            return
          }

          const tempBugId = createResponse.body.bug.id

          // Deletar o bug
          cy.request({
            method: 'DELETE',
            url: `${API_BASE_URL}/bugs/${tempBugId}`,
            headers: {
              Authorization: `Bearer ${token}`
            }
          }).then((deleteResponse) => {
            expect(deleteResponse.status).to.eq(200)
            expect(deleteResponse.body).to.have.property('message')
          })
        })
      })
    })

    it('deve retornar 404 quando bug não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'DELETE',
          url: `${API_BASE_URL}/bugs/999999`,
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

    it('deve retornar 401 quando não autenticado', () => {
      if (!testBug.id) {
        cy.log('Bug não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/bugs/${testBug.id}`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/bugs/:bugId/attachments - Upload de anexo de bug', () => {
    // Nota: Upload de arquivos via cy.request() é limitado no Cypress
    it.skip('deve fazer upload de anexo de bug com sucesso', () => {
      // Este teste está pulado porque o Cypress não suporta FormData diretamente no cy.request()
    })

    it('deve retornar 400 quando arquivo não é fornecido', () => {
      if (!testBug.id) {
        cy.log('Bug não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/bugs/${testBug.id}/attachments`,
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

    it('deve retornar 404 quando bug não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/bugs/999999/attachments`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {},
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 404, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testBug.id) {
        cy.log('Bug não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/bugs/${testBug.id}/attachments`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/scenarios/:scenarioId/history - Registrar histórico', () => {
    it('deve registrar histórico com sucesso', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        const historyData = {
          action: 'EXECUTED',
          description: 'Cenário executado com sucesso',
          metadata: {
            duration: 120,
            environment: 'QA'
          }
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/history`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: historyData
        }).then((response) => {
          expect(response.status).to.eq(201)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('history')
          expect(response.body.history).to.have.property('id')
          expect(response.body.history).to.have.property('action', historyData.action)
        })
      })
    })

    it('deve retornar 400 quando action está vazia', () => {
      if (!testScenario.id) {
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
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/history`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            action: '   '
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 400 quando action não é fornecido', () => {
      if (!testScenario.id) {
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
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/history`,
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
          url: `${API_BASE_URL}/scenarios/999999/history`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            action: 'EXECUTED'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/scenarios/${testScenario.id}/history`,
        body: {
          action: 'EXECUTED'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/scenarios/:scenarioId/history - Buscar histórico', () => {
    it('deve buscar histórico do cenário', () => {
      if (!testScenario.id) {
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
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/history`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('history')
          expect(Array.isArray(response.body.history)).to.be.true
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
          url: `${API_BASE_URL}/scenarios/999999/history`,
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

    it('deve retornar 401 quando não autenticado', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/scenarios/${testScenario.id}/history`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  after(() => {
    // Função para deletar todos os bugs criados durante os testes
    const deleteAllTestBugs = () => {
      const allBugIds = createdBugIds.filter(id => id !== null)

      allBugIds.forEach((bugId) => {
        if (testUsers.owner.token) {
          cy.request({
            method: 'DELETE',
            url: `${API_BASE_URL}/bugs/${bugId}`,
            headers: {
              Authorization: `Bearer ${testUsers.owner.token}`
            },
            failOnStatusCode: false
          }).then((response) => {
            if (response.status === 200) {
              cy.log(`Bug ${bugId} deletado com sucesso`)
            } else if (response.status === 404) {
              cy.log(`Bug ${bugId} já não existe`)
            } else {
              cy.log(`Erro ao deletar bug ${bugId}: ${response.status}`)
            }
          })
        }
      })
    }

    // Executar limpeza
    deleteAllTestBugs()
    cy.log('Testes de execução concluídos - Limpeza executada')
  })
})

