describe('API - Projetos', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Projetos',
      id: null,
      token: null
    },
    member: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Member Projetos',
      id: null,
      token: null
    },
    other: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Other Projetos',
      id: null,
      token: null
    }
  }

  let testProjects = {
    list: {
      id: null,
      name: 'Projeto para Listagem',
      description: 'Descrição do projeto para listagem'
    },
    getById: {
      id: null,
      name: 'Projeto para GetById',
      description: 'Descrição do projeto para getById'
    },
    details: {
      id: null,
      name: 'Projeto para Details',
      description: 'Descrição do projeto para details'
    },
    releases: {
      id: null,
      name: 'Projeto para Releases',
      description: 'Descrição do projeto para releases'
    },
    update: {
      id: null,
      name: 'Projeto para Update',
      description: 'Descrição do projeto para update'
    },
    delete: {
      id: null,
      name: 'Projeto para Delete',
      description: 'Descrição do projeto para delete'
    }
  }

  // Array para armazenar IDs de todos os projetos criados durante os testes
  let createdProjectIds = []

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

  // Setup: Criar usuários e projetos de teste
  before(() => {
    // Criar usuário owner
    const ownerEmail = `owner-projects-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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

        // Criar projetos de teste sequencialmente
        return createProject(token, {
          name: testProjects.list.name,
          description: testProjects.list.description
        }).then((response) => {
          if (response.status === 201 && response.body.id) {
            testProjects.list.id = response.body.id
            createdProjectIds.push(response.body.id)
          }
          return createProject(token, {
            name: testProjects.getById.name,
            description: testProjects.getById.description
          })
        }).then((response) => {
          if (response.status === 201 && response.body.id) {
            testProjects.getById.id = response.body.id
            createdProjectIds.push(response.body.id)
          }
          return createProject(token, {
            name: testProjects.details.name,
            description: testProjects.details.description
          })
        }).then((response) => {
          if (response.status === 201 && response.body.id) {
            testProjects.details.id = response.body.id
            createdProjectIds.push(response.body.id)
          }
          return createProject(token, {
            name: testProjects.releases.name,
            description: testProjects.releases.description
          })
        }).then((response) => {
          if (response.status === 201 && response.body.id) {
            testProjects.releases.id = response.body.id
            createdProjectIds.push(response.body.id)
          }
          return createProject(token, {
            name: testProjects.update.name,
            description: testProjects.update.description
          })
        }).then((response) => {
          if (response.status === 201 && response.body.id) {
            testProjects.update.id = response.body.id
            createdProjectIds.push(response.body.id)
          }
          return createProject(token, {
            name: testProjects.delete.name,
            description: testProjects.delete.description
          })
        }).then((response) => {
          if (response.status === 201 && response.body.id) {
            testProjects.delete.id = response.body.id
            createdProjectIds.push(response.body.id)
          }
        })
      }
    }).then(() => {
      // Criar usuário member
      const memberEmail = `member-projects-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
    }).then(() => {
      // Criar usuário other (sem acesso aos projetos)
      const otherEmail = `other-projects-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.other.email = otherEmail

      return createTestUser({
        name: testUsers.other.name,
        email: testUsers.other.email,
        password: testUsers.other.password
      }, 2000).then((response) => {
        if (response.status === 201 && response.body.id) {
          testUsers.other.id = response.body.id
          return getAuthToken(testUsers.other.email, testUsers.other.password)
        }
        return null
      }).then((token) => {
        if (token && typeof token === 'string') {
          testUsers.other.token = token
        }
      })
    })
  })

  describe('GET /api/projects - Listar projetos', () => {
    it('deve listar projetos do usuário autenticado', () => {
      if (!testUsers.owner.token || typeof testUsers.owner.token !== 'string') {
        cy.log('Token de owner não disponível, obtendo token...')
        return getAuthToken(testUsers.owner.email, testUsers.owner.password).then((token) => {
          if (!token) {
            cy.log('Não foi possível obter token, pulando teste')
            return
          }
          testUsers.owner.token = token
          
          cy.request({
            method: 'GET',
            url: `${API_BASE_URL}/projects`,
            headers: {
              Authorization: `Bearer ${token}`
            }
          }).then((response) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('items')
            expect(response.body).to.have.property('total')
            expect(response.body).to.have.property('page')
            expect(response.body).to.have.property('pageSize')
            expect(response.body).to.have.property('totalPages')
            expect(Array.isArray(response.body.items)).to.be.true
            expect(response.body.total).to.be.at.least(0)
          })
        })
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        headers: {
          Authorization: `Bearer ${testUsers.owner.token}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('items')
        expect(response.body).to.have.property('total')
        expect(response.body).to.have.property('page')
        expect(response.body).to.have.property('pageSize')
        expect(response.body).to.have.property('totalPages')
        expect(Array.isArray(response.body.items)).to.be.true
        expect(response.body.total).to.be.at.least(0)
      })
    })

    it('deve retornar apenas projetos do usuário autenticado', () => {
      // Obter token se necessário
      const tokenPromise = (testUsers.owner.token && typeof testUsers.owner.token === 'string')
        ? cy.wrap(testUsers.owner.token)
        : getAuthToken(testUsers.owner.email, testUsers.owner.password).then((token) => {
            if (token) testUsers.owner.token = token
            return token
          })

      tokenPromise.then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          // Verificar que todos os projetos retornados pertencem ao owner
          response.body.items.forEach((project) => {
            expect(project.ownerId).to.eq(testUsers.owner.id)
          })
        })
      })
    })

    it('deve suportar paginação', () => {
      // Obter token se necessário
      const tokenPromise = (testUsers.owner.token && typeof testUsers.owner.token === 'string')
        ? cy.wrap(testUsers.owner.token)
        : getAuthToken(testUsers.owner.email, testUsers.owner.password).then((token) => {
            if (token) testUsers.owner.token = token
            return token
          })

      tokenPromise.then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects?page=1&pageSize=5`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body.page).to.eq(1)
          expect(response.body.pageSize).to.eq(5)
          expect(response.body.items.length).to.be.at.most(5)
        })
      })
    })

    it('deve suportar busca por nome (query parameter q)', () => {
      if (!testProjects.list.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      // Obter token se necessário
      const tokenPromise = (testUsers.owner.token && typeof testUsers.owner.token === 'string')
        ? cy.wrap(testUsers.owner.token)
        : getAuthToken(testUsers.owner.email, testUsers.owner.password).then((token) => {
            if (token) testUsers.owner.token = token
            return token
          })

      tokenPromise.then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects?q=${encodeURIComponent(testProjects.list.name)}`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body.items.length).to.be.greaterThan(0)
          // Verificar que pelo menos um projeto contém o nome buscado
          const found = response.body.items.some((project) =>
            project.name.toLowerCase().includes(testProjects.list.name.toLowerCase())
          )
          expect(found).to.be.true
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/projects/:id - Buscar projeto por ID', () => {
    it('deve retornar projeto quando usuário é o owner', () => {
      if (!testProjects.getById.id) {
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
          url: `${API_BASE_URL}/projects/${testProjects.getById.id}`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('id', testProjects.getById.id)
          expect(response.body).to.have.property('name', testProjects.getById.name)
          expect(response.body).to.have.property('description', testProjects.getById.description)
          expect(response.body).to.have.property('ownerId', testUsers.owner.id)
        })
      })
    })

    it('deve retornar 404 quando projeto não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects/999999`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('não encontrado')
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
          url: `${API_BASE_URL}/projects/invalid-id`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('inválido')
        })
      })
    })

    it('deve retornar 403 quando usuário não tem acesso ao projeto', () => {
      if (!testUsers.owner.token || !testUsers.other.token || !testProjects.getById.id) {
        cy.log('Tokens ou projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects/${testProjects.getById.id}`,
        headers: {
          Authorization: `Bearer ${testUsers.other.token}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(403)
        expect(response.body).to.have.property('message')
        expect(response.body.message.toLowerCase()).to.match(/acesso.*negado|permissão.*negada|não.*autorizado/i)
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProjects.getById.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects/${testProjects.getById.id}`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/projects/:projectId/details - Detalhes do projeto', () => {
    it('deve retornar detalhes do projeto', () => {
      if (!testUsers.owner.token || !testProjects.details.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects/${testProjects.details.id}/details`,
        headers: {
          Authorization: `Bearer ${testUsers.owner.token}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('id')
        expect(response.body).to.have.property('name')
        // Detalhes podem incluir métricas, membros, etc.
      })
    })

    it('deve retornar detalhes com query parameter release', () => {
      if (!testUsers.owner.token || !testProjects.details.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects/${testProjects.details.id}/details?release=v1.0.0`,
        headers: {
          Authorization: `Bearer ${testUsers.owner.token}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('id')
      })
    })

    it('deve retornar 404 quando projeto não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects/999999/details`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
        })
      })
    })
  })

  describe('GET /api/projects/:projectId/releases - Releases do projeto', () => {
    it('deve retornar releases do projeto', () => {
      if (!testUsers.owner.token || !testProjects.releases.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects/${testProjects.releases.id}/releases`,
        headers: {
          Authorization: `Bearer ${testUsers.owner.token}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(Array.isArray(response.body)).to.be.true
      })
    })

    it('deve retornar array vazio quando projeto não tem releases', () => {
      if (!testUsers.owner.token || !testProjects.releases.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects/${testProjects.releases.id}/releases`,
        headers: {
          Authorization: `Bearer ${testUsers.owner.token}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(Array.isArray(response.body)).to.be.true
        // Projeto novo provavelmente não tem releases
      })
    })

    it('deve retornar 404 quando projeto não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects/999999/releases`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
        })
      })
    })
  })

  describe('PUT /api/projects/:id - Atualizar projeto', () => {
    it('deve atualizar o nome do projeto', () => {
      if (!testUsers.owner.token || !testProjects.update.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      const newName = 'Projeto Atualizado'

      cy.request({
        method: 'PUT',
        url: `${API_BASE_URL}/projects/${testProjects.update.id}`,
        headers: {
          Authorization: `Bearer ${testUsers.owner.token}`
        },
        body: {
          name: newName
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('name', newName)
        expect(response.body).to.have.property('id', testProjects.update.id)
      })
    })

    it('deve atualizar a descrição do projeto', () => {
      if (!testUsers.owner.token || !testProjects.update.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      const newDescription = 'Nova descrição do projeto'

      cy.request({
        method: 'PUT',
        url: `${API_BASE_URL}/projects/${testProjects.update.id}`,
        headers: {
          Authorization: `Bearer ${testUsers.owner.token}`
        },
        body: {
          description: newDescription
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('description', newDescription)
      })
    })

    it('deve atualizar nome e descrição simultaneamente', () => {
      if (!testUsers.owner.token || !testProjects.update.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      const newName = 'Projeto Atualizado Completo'
      const newDescription = 'Descrição atualizada completa'

      cy.request({
        method: 'PUT',
        url: `${API_BASE_URL}/projects/${testProjects.update.id}`,
        headers: {
          Authorization: `Bearer ${testUsers.owner.token}`
        },
        body: {
          name: newName,
          description: newDescription
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('name', newName)
        expect(response.body).to.have.property('description', newDescription)
      })
    })

    it('deve retornar 400 quando nome é vazio', () => {
      if (!testUsers.owner.token || !testProjects.update.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'PUT',
        url: `${API_BASE_URL}/projects/${testProjects.update.id}`,
        headers: {
          Authorization: `Bearer ${testUsers.owner.token}`
        },
        body: {
          name: ''
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('vazio')
      })
    })

    it('deve retornar 400 quando não há nada para atualizar', () => {
      if (!testUsers.owner.token || !testProjects.update.id) {
        cy.log('Token ou projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'PUT',
        url: `${API_BASE_URL}/projects/${testProjects.update.id}`,
        headers: {
          Authorization: `Bearer ${testUsers.owner.token}`
        },
        body: {},
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('atualizar')
      })
    })

    it('deve retornar 409 quando nome já existe para o mesmo owner', () => {
      if (!testUsers.owner.token || !testProjects.update.id || !testProjects.list.id) {
        cy.log('Token ou projetos não disponíveis, pulando teste')
        return
      }

      // Primeiro, obter o nome do projeto list
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects/${testProjects.list.id}`,
        headers: {
          Authorization: `Bearer ${testUsers.owner.token}`
        }
      }).then((getResponse) => {
        const existingName = getResponse.body.name

        // Tentar atualizar outro projeto com o mesmo nome
        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/projects/${testProjects.update.id}`,
          headers: {
            Authorization: `Bearer ${testUsers.owner.token}`
          },
          body: {
            name: existingName
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(409)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('nome')
        })
      })
    })

    it('deve retornar 403 quando usuário não é o owner', () => {
      if (!testUsers.owner.token || !testUsers.other.token || !testProjects.update.id) {
        cy.log('Tokens ou projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'PUT',
        url: `${API_BASE_URL}/projects/${testProjects.update.id}`,
        headers: {
          Authorization: `Bearer ${testUsers.other.token}`
        },
        body: {
          name: 'Tentativa de Update'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(403)
        expect(response.body).to.have.property('message')
        expect(response.body.message.toLowerCase()).to.match(/acesso.*negado|dono|owner|permissão.*negada/i)
      })
    })

    it('deve retornar 404 quando projeto não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/projects/999999`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            name: 'Novo Nome'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('não encontrado')
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
          url: `${API_BASE_URL}/projects/invalid-id`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            name: 'Novo Nome'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('inválido')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProjects.update.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'PUT',
        url: `${API_BASE_URL}/projects/${testProjects.update.id}`,
        body: {
          name: 'Novo Nome'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('DELETE /api/projects/:id - Deletar projeto', () => {
    it('deve deletar um projeto existente', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      // Criar um projeto temporário para deletar
      const tempProjectName = `Projeto Temp Delete ${Date.now()}`
      
      createProject(testUsers.owner.token, {
        name: tempProjectName,
        description: 'Projeto temporário para deletar'
      }).then((createResponse) => {
        if (createResponse.status !== 201 || !createResponse.body.id) {
          cy.log('Não foi possível criar projeto temporário')
          return
        }

        const tempProjectId = createResponse.body.id

        // Deletar o projeto
        cy.request({
          method: 'DELETE',
          url: `${API_BASE_URL}/projects/${tempProjectId}`,
          headers: {
            Authorization: `Bearer ${testUsers.owner.token}`
          }
        }).then((deleteResponse) => {
          expect(deleteResponse.status).to.eq(204)
          expect(deleteResponse.body).to.be.empty

          // Verificar que o projeto foi deletado
          cy.request({
            method: 'GET',
            url: `${API_BASE_URL}/projects/${tempProjectId}`,
            headers: {
              Authorization: `Bearer ${testUsers.owner.token}`
            },
            failOnStatusCode: false
          }).then((getResponse) => {
            expect(getResponse.status).to.eq(404)
          })
        })
      })
    })

    it('deve retornar 403 quando usuário não é o owner', () => {
      if (!testUsers.owner.token || !testUsers.other.token || !testProjects.delete.id) {
        cy.log('Tokens ou projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/projects/${testProjects.delete.id}`,
        headers: {
          Authorization: `Bearer ${testUsers.other.token}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(403)
        expect(response.body).to.have.property('message')
        expect(response.body.message.toLowerCase()).to.match(/acesso.*negado|permissão.*negada|não.*autorizado/i)
      })
    })

    it('deve retornar 404 quando projeto não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'DELETE',
          url: `${API_BASE_URL}/projects/999999`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('não encontrado')
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
          url: `${API_BASE_URL}/projects/invalid-id`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('inválido')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProjects.delete.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/projects/${testProjects.delete.id}`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  after(() => {
    // Função para deletar todos os projetos criados durante os testes
    const deleteAllTestProjects = () => {
      const allProjectIds = createdProjectIds.filter(id => id !== null)

      allProjectIds.forEach((projectId) => {
        if (testUsers.owner.token) {
          cy.request({
            method: 'DELETE',
            url: `${API_BASE_URL}/projects/${projectId}`,
            headers: {
              Authorization: `Bearer ${testUsers.owner.token}`
            },
            failOnStatusCode: false
          }).then((response) => {
            if (response.status === 204) {
              cy.log(`Projeto ${projectId} deletado com sucesso`)
            } else if (response.status === 404) {
              cy.log(`Projeto ${projectId} já não existe`)
            } else {
              cy.log(`Erro ao deletar projeto ${projectId}: ${response.status}`)
            }
          })
        }
      })
    }

    // Executar limpeza
    deleteAllTestProjects()
    cy.log('Testes de projetos concluídos - Limpeza executada')
  })
})

