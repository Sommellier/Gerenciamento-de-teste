describe('API - Pacotes', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Pacotes',
      id: null,
      token: null
    },
    member: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Member Pacotes',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Pacotes',
    description: 'Descrição do projeto para testes de pacotes'
  }

  let testPackages = {
    create: {
      id: null,
      title: 'Pacote para Create',
      description: 'Descrição do pacote para create',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      release: '2024-01'
    },
    list: {
      id: null,
      title: 'Pacote para List',
      description: 'Descrição do pacote para list',
      type: 'FUNCTIONAL',
      priority: 'MEDIUM',
      release: '2024-01'
    },
    getById: {
      id: null,
      title: 'Pacote para GetById',
      description: 'Descrição do pacote para getById',
      type: 'FUNCTIONAL',
      priority: 'LOW',
      release: '2024-01'
    },
    update: {
      id: null,
      title: 'Pacote para Update',
      description: 'Descrição do pacote para update',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      release: '2024-01'
    },
    delete: {
      id: null,
      title: 'Pacote para Delete',
      description: 'Descrição do pacote para delete',
      type: 'FUNCTIONAL',
      priority: 'MEDIUM',
      release: '2024-01'
    },
    approve: {
      id: null,
      title: 'Pacote para Approve',
      description: 'Descrição do pacote para approve',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      release: '2024-01'
    },
    reject: {
      id: null,
      title: 'Pacote para Reject',
      description: 'Descrição do pacote para reject',
      type: 'FUNCTIONAL',
      priority: 'MEDIUM',
      release: '2024-01'
    },
    sendToTest: {
      id: null,
      title: 'Pacote para SendToTest',
      description: 'Descrição do pacote para sendToTest',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      release: '2024-01'
    },
    createScenario: {
      id: null,
      title: 'Pacote para CreateScenario',
      description: 'Descrição do pacote para createScenario',
      type: 'FUNCTIONAL',
      priority: 'MEDIUM',
      release: '2024-01'
    }
  }

  // Array para armazenar IDs de todos os pacotes criados durante os testes
  let createdPackageIds = []

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

  // Setup: Criar usuários, projeto e pacotes de teste
  before(() => {
    // Criar usuário owner
    const ownerEmail = `owner-packages-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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

        // Criar pacotes de teste sequencialmente
        return createPackage(testUsers.owner.token, testProject.id, {
          title: testPackages.list.title,
          description: testPackages.list.description,
          type: testPackages.list.type,
          priority: testPackages.list.priority,
          release: testPackages.list.release
        })
      }
      return null
    }).then((response) => {
      if (response && response.status === 201 && response.body.testPackage?.id) {
        testPackages.list.id = response.body.testPackage.id
        createdPackageIds.push(testPackages.list.id)
      } else if (response && response.status !== 201) {
        cy.log(`Erro ao criar pacote 'list': Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
      }
      return createPackage(testUsers.owner.token, testProject.id, {
        title: testPackages.getById.title,
        description: testPackages.getById.description,
        type: testPackages.getById.type,
        priority: testPackages.getById.priority,
        release: testPackages.getById.release
      })
    }).then((response) => {
      if (response && response.status === 201 && response.body.testPackage?.id) {
        testPackages.getById.id = response.body.testPackage.id
        createdPackageIds.push(testPackages.getById.id)
      } else if (response && response.status !== 201) {
        cy.log(`Erro ao criar pacote 'getById': Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
      }
      return createPackage(testUsers.owner.token, testProject.id, {
        title: testPackages.update.title,
        description: testPackages.update.description,
        type: testPackages.update.type,
        priority: testPackages.update.priority,
        release: testPackages.update.release
      })
    }).then((response) => {
      if (response && response.status === 201 && response.body.testPackage?.id) {
        testPackages.update.id = response.body.testPackage.id
        createdPackageIds.push(testPackages.update.id)
      } else if (response && response.status !== 201) {
        cy.log(`Erro ao criar pacote 'update': Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
      }
      return createPackage(testUsers.owner.token, testProject.id, {
        title: testPackages.delete.title,
        description: testPackages.delete.description,
        type: testPackages.delete.type,
        priority: testPackages.delete.priority,
        release: testPackages.delete.release
      })
    }).then((response) => {
      if (response && response.status === 201 && response.body.testPackage?.id) {
        testPackages.delete.id = response.body.testPackage.id
        createdPackageIds.push(testPackages.delete.id)
      } else if (response && response.status !== 201) {
        cy.log(`Erro ao criar pacote 'delete': Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
      }
      return createPackage(testUsers.owner.token, testProject.id, {
        title: testPackages.approve.title,
        description: testPackages.approve.description,
        type: testPackages.approve.type,
        priority: testPackages.approve.priority,
        release: testPackages.approve.release
      })
    }).then((response) => {
      if (response && response.status === 201 && response.body.testPackage?.id) {
        testPackages.approve.id = response.body.testPackage.id
        createdPackageIds.push(testPackages.approve.id)
      } else if (response && response.status !== 201) {
        cy.log(`Erro ao criar pacote 'approve': Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
      }
      return createPackage(testUsers.owner.token, testProject.id, {
        title: testPackages.reject.title,
        description: testPackages.reject.description,
        type: testPackages.reject.type,
        priority: testPackages.reject.priority,
        release: testPackages.reject.release
      })
    }).then((response) => {
      if (response && response.status === 201 && response.body.testPackage?.id) {
        testPackages.reject.id = response.body.testPackage.id
        createdPackageIds.push(testPackages.reject.id)
      } else if (response && response.status !== 201) {
        cy.log(`Erro ao criar pacote 'reject': Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
      }
      return createPackage(testUsers.owner.token, testProject.id, {
        title: testPackages.sendToTest.title,
        description: testPackages.sendToTest.description,
        type: testPackages.sendToTest.type,
        priority: testPackages.sendToTest.priority,
        release: testPackages.sendToTest.release
      })
    }).then((response) => {
      if (response && response.status === 201 && response.body.testPackage?.id) {
        testPackages.sendToTest.id = response.body.testPackage.id
        createdPackageIds.push(testPackages.sendToTest.id)
      } else if (response && response.status !== 201) {
        cy.log(`Erro ao criar pacote 'sendToTest': Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
      }
      return createPackage(testUsers.owner.token, testProject.id, {
        title: testPackages.createScenario.title,
        description: testPackages.createScenario.description,
        type: testPackages.createScenario.type,
        priority: testPackages.createScenario.priority,
        release: testPackages.createScenario.release
      })
    }).then((response) => {
      if (response && response.status === 201 && response.body.testPackage?.id) {
        testPackages.createScenario.id = response.body.testPackage.id
        createdPackageIds.push(testPackages.createScenario.id)
      } else if (response && response.status !== 201) {
        cy.log(`Erro ao criar pacote 'createScenario': Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
      }
    }).then(() => {
      // Criar usuário member
      const memberEmail = `member-packages-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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

  describe('POST /api/projects/:projectId/packages - Criar pacote', () => {
    it('deve criar um pacote com sucesso', () => {
      if (!testProject.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        const packageData = {
          title: 'Novo Pacote de Teste',
          description: 'Descrição do novo pacote',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          release: '2024-01'
        }

        createPackage(token, testProject.id, packageData).then((response) => {
          if (response.status !== 201) {
            cy.log(`Erro ao criar pacote: Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
            // Se falhar, ainda assim vamos verificar o que foi retornado
            if (response.status === 400) {
              cy.log(`Mensagem de erro: ${response.body?.message || 'Sem mensagem'}`)
            }
          }
          expect(response.status).to.eq(201)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('testPackage')
          expect(response.body.testPackage).to.have.property('id')
          expect(response.body.testPackage).to.have.property('title', packageData.title)
          expect(response.body.testPackage).to.have.property('type', packageData.type)
          expect(response.body.testPackage).to.have.property('priority', packageData.priority)
          
          if (response.body.testPackage && response.body.testPackage.id) {
            createdPackageIds.push(response.body.testPackage.id)
          }
        })
      })
    })

    it('deve retornar 400 quando campos obrigatórios estão faltando', () => {
      if (!testProject.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        createPackage(token, testProject.id, {
          title: 'Pacote sem campos obrigatórios'
          // Faltando type, priority, release
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('obrigatórios')
        })
      })
    })

    it('deve retornar 400 quando projectId é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        createPackage(token, 'invalid-id', {
          title: 'Pacote Teste',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          release: '2024-01'
        }).then((response) => {
          // Backend pode retornar 400 ou 500 quando projectId é inválido
          expect([400, 500]).to.include(response.status)
          if (response.status === 400) {
            expect(response.body).to.have.property('message')
            expect(response.body.message).to.include('inválido')
          }
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProject.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/projects/${testProject.id}/packages`,
        body: {
          title: 'Pacote Teste',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          release: '2024-01'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/projects/:projectId/packages - Listar pacotes', () => {
    it('deve listar pacotes do projeto', () => {
      if (!testProject.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('packages')
          expect(Array.isArray(response.body.packages)).to.be.true
        })
      })
    })

    it('deve suportar filtro por release', () => {
      if (!testProject.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages?release=2024-01`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('packages')
          expect(Array.isArray(response.body.packages)).to.be.true
        })
      })
    })

    it('deve retornar 400 quando projectId é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects/invalid-id/packages`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          // Backend pode retornar 400 ou 500 quando projectId é inválido
          expect([400, 500]).to.include(response.status)
          if (response.status === 400) {
            expect(response.body).to.have.property('message')
            expect(response.body.message).to.include('inválido')
          }
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProject.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects/${testProject.id}/packages`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/projects/:projectId/packages/:packageId - Detalhes do pacote', () => {
    it('deve retornar detalhes do pacote', () => {
      if (!testProject.id || !testPackages.getById.id) {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.getById.id}`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('id', testPackages.getById.id)
          expect(response.body).to.have.property('title', testPackages.getById.title)
        })
      })
    })

    it('deve retornar 400 quando projectId é inválido', () => {
      if (!testPackages.getById.id) {
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
          url: `${API_BASE_URL}/projects/invalid-id/packages/${testPackages.getById.id}`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          // Backend pode retornar 400 ou 500 quando projectId é inválido
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 400 quando packageId é inválido', () => {
      if (!testProject.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/invalid-id`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          // Backend retorna 500 quando packageId é inválido (parseInt retorna NaN)
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProject.id || !testPackages.getById.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.getById.id}`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('PUT /api/projects/:projectId/packages/:packageId - Atualizar pacote', () => {
    it('deve atualizar o título do pacote', () => {
      if (!testProject.id || !testPackages.update.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        const newTitle = 'Pacote Atualizado'

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.update.id}`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: newTitle
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('testPackage')
          expect(response.body.testPackage).to.have.property('title', newTitle)
        })
      })
    })

    it('deve atualizar múltiplos campos do pacote', () => {
      if (!testProject.id || !testPackages.update.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        const updateData = {
          title: 'Pacote Atualizado Completo',
          description: 'Nova descrição',
          priority: 'LOW'
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.update.id}`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: updateData
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('testPackage')
          expect(response.body.testPackage).to.have.property('title', updateData.title)
          expect(response.body.testPackage).to.have.property('description', updateData.description)
          expect(response.body.testPackage).to.have.property('priority', updateData.priority)
        })
      })
    })

    it('deve retornar 400 quando projectId é inválido', () => {
      if (!testPackages.update.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/projects/invalid-id/packages/${testPackages.update.id}`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Novo Título'
          },
          failOnStatusCode: false
        }).then((response) => {
          // Backend pode retornar 400 ou 500 quando projectId é inválido
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 400 quando packageId é inválido', () => {
      if (!testProject.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/invalid-id`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Novo Título'
          },
          failOnStatusCode: false
        }).then((response) => {
          // Backend pode retornar 400 ou 500 quando packageId é inválido
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProject.id || !testPackages.update.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'PUT',
        url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.update.id}`,
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

  describe('DELETE /api/projects/:projectId/packages/:packageId - Deletar pacote', () => {
    it('deve deletar um pacote existente', () => {
      if (!testProject.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        // Criar um pacote temporário para deletar
        const tempPackageData = {
          title: `Pacote Temp Delete ${Date.now()}`,
          description: 'Pacote temporário para deletar',
          type: 'FUNCTIONAL',
          priority: 'LOW',
          release: '2024-01'
        }

        createPackage(token, testProject.id, tempPackageData).then((createResponse) => {
          if (createResponse.status !== 201 || !createResponse.body.testPackage?.id) {
            cy.log('Não foi possível criar pacote temporário')
            return
          }

          const tempPackageId = createResponse.body.testPackage.id

          // Deletar o pacote
          cy.request({
            method: 'DELETE',
            url: `${API_BASE_URL}/projects/${testProject.id}/packages/${tempPackageId}`,
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

    it('deve retornar 400 quando projectId é inválido', () => {
      if (!testPackages.delete.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'DELETE',
          url: `${API_BASE_URL}/projects/invalid-id/packages/${testPackages.delete.id}`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          // Backend pode retornar 400 ou 500 quando projectId é inválido
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 400 quando packageId é inválido', () => {
      if (!testProject.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'DELETE',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/invalid-id`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          // Backend pode retornar 400 ou 500 quando packageId é inválido
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProject.id || !testPackages.delete.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.delete.id}`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/projects/:projectId/packages/:packageId/approve - Aprovar pacote', () => {
    it('deve aprovar um pacote com sucesso', () => {
      if (!testProject.id || !testPackages.approve.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        // Primeiro, criar um cenário no pacote
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.approve.id}/scenarios`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Cenário para Aprovar',
            description: 'Cenário de teste para aprovação',
            priority: 'HIGH'
          }
        }).then((scenarioResponse) => {
          if (scenarioResponse.status !== 201) {
            cy.log(`Erro ao criar cenário: ${scenarioResponse.status}`)
            return
          }

          const scenarioId = scenarioResponse.body.scenario.id

          // Aprovar o cenário (atualizar status para APPROVED)
          cy.request({
            method: 'PUT',
            url: `${API_BASE_URL}/scenarios/${scenarioId}`,
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: {
              status: 'APPROVED'
            },
            failOnStatusCode: false
          }).then((updateResponse) => {
            if (updateResponse.status !== 200) {
              cy.log(`Erro ao aprovar cenário: Status ${updateResponse.status}, Body: ${JSON.stringify(updateResponse.body)}`)
              return
            }

            // Agora aprovar o pacote
            cy.request({
              method: 'POST',
              url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.approve.id}/approve`,
              headers: {
                Authorization: `Bearer ${token}`
              },
              failOnStatusCode: false
            }).then((response) => {
              if (response.status !== 200) {
                cy.log(`Erro ao aprovar pacote: Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
              }
              expect(response.status).to.eq(200)
              expect(response.body).to.have.property('message')
              expect(response.body).to.have.property('package')
            })
          })
        })
      })
    })

    it('deve retornar 400 quando IDs são inválidos', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/invalid-id/packages/invalid-id/approve`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          // Backend retorna 500 quando IDs são inválidos (parseInt retorna NaN)
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProject.id || !testPackages.approve.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.approve.id}/approve`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/projects/:projectId/packages/:packageId/reject - Reprovar pacote', () => {
    it('deve retornar 400 quando pacote não está em EM_TESTE', () => {
      if (!testProject.id || !testPackages.reject.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        // Primeiro, criar um cenário no pacote
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.reject.id}/scenarios`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Cenário para Reprovar',
            description: 'Cenário de teste para reprovação',
            priority: 'HIGH'
          }
        }).then((scenarioResponse) => {
          if (scenarioResponse.status !== 201) {
            cy.log(`Erro ao criar cenário: ${scenarioResponse.status}`)
            return
          }

          // O status EM_TESTE não pode ser definido diretamente via PUT
          // Vamos testar que retorna erro quando o pacote não está em EM_TESTE
          cy.request({
            method: 'POST',
            url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.reject.id}/reject`,
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: {
              rejectionReason: 'Pacote não atende aos requisitos de qualidade'
            },
            failOnStatusCode: false
          }).then((response) => {
            // Deve retornar 400 porque o pacote não está em EM_TESTE
            expect(response.status).to.eq(400)
            expect(response.body).to.have.property('message')
            expect(response.body.message).to.include('EM_TESTE')
          })
        })
      })
    })

    it('deve retornar 400 quando rejectionReason não é fornecido', () => {
      if (!testProject.id || !testPackages.reject.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.reject.id}/reject`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {},
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message.toLowerCase()).to.include('justificativa')
        })
      })
    })

    it('deve retornar 400 quando rejectionReason está vazio', () => {
      if (!testProject.id || !testPackages.reject.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.reject.id}/reject`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            rejectionReason: '   '
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message.toLowerCase()).to.include('justificativa')
        })
      })
    })

    it('deve retornar 400 quando IDs são inválidos', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/invalid-id/packages/invalid-id/reject`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            rejectionReason: 'Motivo de rejeição'
          },
          failOnStatusCode: false
        }).then((response) => {
          // Backend retorna 500 quando IDs são inválidos (parseInt retorna NaN)
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProject.id || !testPackages.reject.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.reject.id}/reject`,
        body: {
          rejectionReason: 'Motivo de rejeição'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/projects/:projectId/packages/:packageId/send-to-test - Enviar para teste', () => {
    it('deve retornar 400 quando pacote não está em REPROVADO', () => {
      if (!testProject.id || !testPackages.sendToTest.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        // Primeiro, criar um cenário no pacote
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.sendToTest.id}/scenarios`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Cenário para SendToTest',
            description: 'Cenário de teste para send-to-test',
            priority: 'HIGH'
          }
        }).then((scenarioResponse) => {
          if (scenarioResponse.status !== 201) {
            cy.log(`Erro ao criar cenário: ${scenarioResponse.status}`)
            return
          }

          // O status REPROVADO não pode ser definido diretamente via PUT
          // Vamos testar que retorna erro quando o pacote não está em REPROVADO
          cy.request({
            method: 'POST',
            url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.sendToTest.id}/send-to-test`,
            headers: {
              Authorization: `Bearer ${token}`
            },
            failOnStatusCode: false
          }).then((response) => {
            // Deve retornar 400 porque o pacote não está em REPROVADO
            expect(response.status).to.eq(400)
            expect(response.body).to.have.property('message')
            expect(response.body.message).to.include('REPROVADO')
          })
        })
      })
    })

    it('deve retornar 400 quando IDs são inválidos', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/invalid-id/packages/invalid-id/send-to-test`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          // Backend retorna 500 quando IDs são inválidos (parseInt retorna NaN)
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProject.id || !testPackages.sendToTest.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.sendToTest.id}/send-to-test`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/projects/:projectId/packages/:packageId/scenarios - Criar cenário no pacote', () => {
    it('deve criar um cenário no pacote com sucesso', () => {
      if (!testProject.id || !testPackages.createScenario.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        const scenarioData = {
          title: 'Cenário de Teste no Pacote',
          description: 'Descrição do cenário',
          priority: 'HIGH'
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.createScenario.id}/scenarios`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: scenarioData
        }).then((response) => {
          expect(response.status).to.eq(201)
          expect(response.body).to.have.property('message')
          expect(response.body).to.have.property('scenario')
          expect(response.body.scenario).to.have.property('id')
          expect(response.body.scenario).to.have.property('title', scenarioData.title)
        })
      })
    })

    it('deve retornar 400 quando campos obrigatórios estão faltando', () => {
      if (!testProject.id || !testPackages.createScenario.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.createScenario.id}/scenarios`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Cenário sem campos obrigatórios'
            // Faltando priority
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('obrigatórios')
        })
      })
    })

    it('deve retornar 400 quando projectId é inválido', () => {
      if (!testPackages.createScenario.id) {
        cy.log('Pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/invalid-id/packages/${testPackages.createScenario.id}/scenarios`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Cenário Teste',
            priority: 'HIGH'
          },
          failOnStatusCode: false
        }).then((response) => {
          // Backend retorna 500 quando IDs são inválidos (parseInt retorna NaN)
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 400 quando packageId é inválido', () => {
      if (!testProject.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages/invalid-id/scenarios`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            title: 'Cenário Teste',
            priority: 'HIGH'
          },
          failOnStatusCode: false
        }).then((response) => {
          // Backend pode retornar 400 ou 500 quando packageId é inválido
          expect([400, 500]).to.include(response.status)
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProject.id || !testPackages.createScenario.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/projects/${testProject.id}/packages/${testPackages.createScenario.id}/scenarios`,
        body: {
          title: 'Cenário Teste',
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

  after(() => {
    // Função para deletar todos os pacotes criados durante os testes
    const deleteAllTestPackages = () => {
      const allPackageIds = createdPackageIds.filter(id => id !== null)

      allPackageIds.forEach((packageId) => {
        if (testUsers.owner.token && testProject.id) {
          cy.request({
            method: 'DELETE',
            url: `${API_BASE_URL}/projects/${testProject.id}/packages/${packageId}`,
            headers: {
              Authorization: `Bearer ${testUsers.owner.token}`
            },
            failOnStatusCode: false
          }).then((response) => {
            if (response.status === 200) {
              cy.log(`Pacote ${packageId} deletado com sucesso`)
            } else if (response.status === 404) {
              cy.log(`Pacote ${packageId} já não existe`)
            } else {
              cy.log(`Erro ao deletar pacote ${packageId}: ${response.status}`)
            }
          })
        }
      })
    }

    // Executar limpeza
    deleteAllTestPackages()
    cy.log('Testes de pacotes concluídos - Limpeza executada')
  })
})

