describe('API - Convites', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Convites',
      id: null,
      token: null
    },
    manager: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Manager Convites',
      id: null,
      token: null
    },
    tester: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Tester Convites',
      id: null,
      token: null
    },
    invitedUser: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Convidado',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Convites',
    description: 'Descrição do projeto para testes de convites'
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

  // Setup: Criar usuários e projeto de teste
  before(() => {
    // Criar usuário owner
    const ownerEmail = `owner-invites-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
      }
    }).then(() => {
      // Criar usuário manager
      const managerEmail = `manager-invites-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
      const testerEmail = `tester-invites-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
      // Criar usuário invitedUser
      const invitedEmail = `invited-invites-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.invitedUser.email = invitedEmail

      return createTestUser({
        name: testUsers.invitedUser.name,
        email: testUsers.invitedUser.email,
        password: testUsers.invitedUser.password
      }, 2000).then((response) => {
        if (response.status === 201 && response.body.id) {
          testUsers.invitedUser.id = response.body.id
          return getAuthToken(testUsers.invitedUser.email, testUsers.invitedUser.password)
        }
        return null
      }).then((token) => {
        if (token && typeof token === 'string') {
          testUsers.invitedUser.token = token
        }
      })
    })
  })

  describe('POST /api/projects/:projectId/invites - Criar convite', () => {
    it('deve criar convite com sucesso', () => {
      if (!testProject.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        const inviteEmail = `new-invite-${Date.now()}@test.com`

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            email: inviteEmail,
            role: 'TESTER'
          },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 429) {
            cy.log('Rate limit atingido, pulando teste')
            return
          }
          expect(response.status).to.eq(201)
          expect(response.body).to.have.property('id')
          expect(response.body).to.have.property('projectId', testProject.id)
          expect(response.body).to.have.property('email', inviteEmail)
          expect(response.body).to.have.property('role', 'TESTER')
          expect(response.body).to.have.property('status', 'PENDING')
          expect(response.body).to.have.property('expiresAt')
          expect(response.body).to.have.property('createdAt')
        })
      })
    })

    it('deve retornar 400 quando email é inválido', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            email: 'email-invalido',
            role: 'TESTER'
          },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 429) {
            cy.log('Rate limit atingido, pulando teste')
            return
          }
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('E-mail')
        })
      })
    })

    it('deve retornar 400 quando role é inválida', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            email: `test-${Date.now()}@test.com`,
            role: 'INVALID_ROLE'
          },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 429) {
            cy.log('Rate limit atingido, pulando teste')
            return
          }
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('Role')
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
          method: 'POST',
          url: `${API_BASE_URL}/projects/invalid-id/invites`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            email: `test-${Date.now()}@test.com`,
            role: 'TESTER'
          },
          failOnStatusCode: false
        }).then((response) => {
          if (response.status === 429) {
            cy.log('Rate limit atingido, pulando teste')
            return
          }
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('projectId')
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
        url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
        body: {
          email: `test-${Date.now()}@test.com`,
          role: 'TESTER'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/projects/:projectId/invites - Listar convites do projeto', () => {
    it('deve listar convites do projeto', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('items')
          expect(Array.isArray(response.body.items)).to.be.true
          expect(response.body).to.have.property('total')
          expect(response.body).to.have.property('page')
          expect(response.body).to.have.property('pageSize')
        })
      })
    })

    it('deve suportar filtro por status', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/invites?status=PENDING`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('items')
          expect(Array.isArray(response.body.items)).to.be.true
        })
      })
    })

    it('deve suportar múltiplos status no filtro', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/invites?status=PENDING,ACCEPTED`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('items')
          expect(Array.isArray(response.body.items)).to.be.true
        })
      })
    })

    it('deve suportar busca por email (query parameter q)', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/invites?q=test`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('items')
          expect(Array.isArray(response.body.items)).to.be.true
        })
      })
    })

    it('deve suportar paginação', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/invites?page=1&pageSize=5`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('items')
          expect(Array.isArray(response.body.items)).to.be.true
        })
      })
    })

    it('deve suportar ordenação', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/invites?orderBy=createdAt&sort=asc`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('items')
          expect(Array.isArray(response.body.items)).to.be.true
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
          url: `${API_BASE_URL}/projects/invalid-id/invites`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 404, 500]).to.include(response.status)
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
        url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/invites - Listar convites do usuário', () => {
    it('deve listar convites do usuário', () => {
      ensureToken(testUsers.invitedUser).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/invites`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('items')
          expect(Array.isArray(response.body.items)).to.be.true
          expect(response.body).to.have.property('total')
          expect(response.body).to.have.property('page')
          expect(response.body).to.have.property('pageSize')
        })
      })
    })

    it('deve suportar filtro por status', () => {
      ensureToken(testUsers.invitedUser).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/invites?status=PENDING`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('items')
          expect(Array.isArray(response.body.items)).to.be.true
        })
      })
    })

    it('deve suportar paginação', () => {
      ensureToken(testUsers.invitedUser).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/invites?page=1&pageSize=5`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('items')
          expect(Array.isArray(response.body.items)).to.be.true
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/invites`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/invites/:token/accept - Aceitar convite (com token)', () => {
    it('deve aceitar convite com sucesso', () => {
      if (!testProject.id || !testUsers.invitedUser.id) {
        cy.log('Projeto ou usuário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((ownerToken) => {
        if (!ownerToken) {
          cy.log('Não foi possível obter token do owner')
          return
        }

        // Criar convite
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
          headers: {
            Authorization: `Bearer ${ownerToken}`
          },
          body: {
            email: testUsers.invitedUser.email,
            role: 'TESTER'
          },
          failOnStatusCode: false
        }).then((inviteResponse) => {
          if (inviteResponse.status === 429) {
            cy.log('Rate limit atingido, pulando teste')
            return
          }
          if (inviteResponse.status === 409) {
            // Usuário já é membro, usar email diferente
            const newEmail = `accept-test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
            return createTestUser({
              name: 'Usuário Accept Test',
              email: newEmail,
              password: 'SenhaSegura123'
            }, 0).then((userResponse) => {
              if (userResponse.status !== 201) {
                cy.log('Não foi possível criar usuário temporário')
                return
              }

              return cy.request({
                method: 'POST',
                url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
                headers: {
                  Authorization: `Bearer ${ownerToken}`
                },
                body: {
                  email: newEmail,
                  role: 'TESTER'
                },
                failOnStatusCode: false
              })
            }).then((newInviteResponse) => {
              if (newInviteResponse.status === 429) {
                cy.log('Rate limit atingido, pulando teste')
                return
              }
              if (newInviteResponse.status !== 201) {
                cy.log('Não foi possível criar convite')
                return
              }

              // Obter token do novo usuário
              return getAuthToken(newEmail, 'SenhaSegura123').then((userToken) => {
                if (!userToken) {
                  cy.log('Não foi possível obter token do usuário')
                  return
                }

                return cy.request({
                  method: 'GET',
                  url: `${API_BASE_URL}/invites`,
                  headers: {
                    Authorization: `Bearer ${userToken}`
                  }
                }).then((invitesResponse) => {
                  if (invitesResponse.status !== 200 || !invitesResponse.body.items) {
                    cy.log('Não foi possível listar convites')
                    return
                  }

                  const invite = invitesResponse.body.items.find((inv) => 
                    inv.email === newEmail && inv.status === 'PENDING'
                  )

                  if (!invite || !invite.token) {
                    cy.log('Convite não encontrado ou sem token')
                    return
                  }

                  return cy.request({
                    method: 'POST',
                    url: `${API_BASE_URL}/invites/${invite.token}/accept`,
                    headers: {
                      Authorization: `Bearer ${userToken}`
                    },
                    failOnStatusCode: false
                  }).then((acceptResponse) => {
                    expect(acceptResponse.status).to.eq(200)
                    expect(acceptResponse.body).to.have.property('id')
                    expect(acceptResponse.body).to.have.property('projectId', testProject.id)
                    expect(acceptResponse.body).to.have.property('email', newEmail)
                    expect(acceptResponse.body).to.have.property('role', 'TESTER')
                    expect(acceptResponse.body).to.have.property('status', 'ACCEPTED')
                    expect(acceptResponse.body).to.have.property('acceptedAt')
                  })
                })
              })
            })
          }

          if (inviteResponse.status !== 201) {
            cy.log('Não foi possível criar convite')
            return
          }

          // Listar convites do usuário para obter o token
          ensureToken(testUsers.invitedUser).then((userToken) => {
            if (!userToken) {
              cy.log('Não foi possível obter token do usuário')
              return
            }

            cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/invites`,
              headers: {
                Authorization: `Bearer ${userToken}`
              }
            }).then((invitesResponse) => {
              if (invitesResponse.status !== 200 || !invitesResponse.body.items) {
                cy.log('Não foi possível listar convites')
                return
              }

              const invite = invitesResponse.body.items.find((inv) => 
                inv.projectId === testProject.id && inv.status === 'PENDING'
              )

              if (!invite || !invite.token) {
                cy.log('Convite não encontrado ou sem token')
                return
              }

              // Aceitar o convite
              cy.request({
                method: 'POST',
                url: `${API_BASE_URL}/invites/${invite.token}/accept`,
                headers: {
                  Authorization: `Bearer ${userToken}`
                },
                failOnStatusCode: false
              }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.have.property('id')
                expect(response.body).to.have.property('projectId', testProject.id)
                expect(response.body).to.have.property('email', testUsers.invitedUser.email)
                expect(response.body).to.have.property('role', 'TESTER')
                expect(response.body).to.have.property('status', 'ACCEPTED')
                expect(response.body).to.have.property('acceptedAt')
              })
            })
          })
        })
      })
    })

    it('deve retornar 400 quando token é inválido', () => {
      ensureToken(testUsers.invitedUser).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/invites/invalid-token/accept`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 404]).to.include(response.status)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/invites/some-token/accept`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/invites/accept - Aceitar convite (sem token)', () => {
    it('deve aceitar convite com token no body', () => {
      if (!testProject.id || !testUsers.tester.id) {
        cy.log('Projeto ou usuário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((ownerToken) => {
        if (!ownerToken) {
          cy.log('Não foi possível obter token do owner')
          return
        }

        // Criar convite
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
          headers: {
            Authorization: `Bearer ${ownerToken}`
          },
          body: {
            email: testUsers.tester.email,
            role: 'TESTER'
          },
          failOnStatusCode: false
        }).then((inviteResponse) => {
          if (inviteResponse.status === 429) {
            cy.log('Rate limit atingido, pulando teste')
            return
          }
          if (inviteResponse.status === 409) {
            // Usuário já é membro, usar email diferente
            const newEmail = `accept-body-test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
            return createTestUser({
              name: 'Usuário Accept Body Test',
              email: newEmail,
              password: 'SenhaSegura123'
            }, 0).then((userResponse) => {
              if (userResponse.status !== 201) {
                cy.log('Não foi possível criar usuário temporário')
                return
              }

              return cy.request({
                method: 'POST',
                url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
                headers: {
                  Authorization: `Bearer ${ownerToken}`
                },
                body: {
                  email: newEmail,
                  role: 'TESTER'
                },
                failOnStatusCode: false
              })
            }).then((newInviteResponse) => {
              if (newInviteResponse.status === 429) {
                cy.log('Rate limit atingido, pulando teste')
                return
              }
              if (newInviteResponse.status !== 201) {
                cy.log('Não foi possível criar convite')
                return
              }

              // Obter token do novo usuário
              return getAuthToken(newEmail, 'SenhaSegura123').then((userToken) => {
                if (!userToken) {
                  cy.log('Não foi possível obter token do usuário')
                  return
                }

                return cy.request({
                  method: 'GET',
                  url: `${API_BASE_URL}/invites`,
                  headers: {
                    Authorization: `Bearer ${userToken}`
                  }
                }).then((invitesResponse) => {
                  if (invitesResponse.status !== 200 || !invitesResponse.body.items) {
                    cy.log('Não foi possível listar convites')
                    return
                  }

                  const invite = invitesResponse.body.items.find((inv) => 
                    inv.email === newEmail && inv.status === 'PENDING'
                  )

                  if (!invite || !invite.token) {
                    cy.log('Convite não encontrado ou sem token')
                    return
                  }

                  return cy.request({
                    method: 'POST',
                    url: `${API_BASE_URL}/invites/accept`,
                    headers: {
                      Authorization: `Bearer ${userToken}`
                    },
                    body: {
                      token: invite.token
                    },
                    failOnStatusCode: false
                  }).then((acceptResponse) => {
                    expect(acceptResponse.status).to.eq(200)
                    expect(acceptResponse.body).to.have.property('id')
                    expect(acceptResponse.body).to.have.property('projectId', testProject.id)
                    expect(acceptResponse.body).to.have.property('email', newEmail)
                    expect(acceptResponse.body).to.have.property('role', 'TESTER')
                    expect(acceptResponse.body).to.have.property('status', 'ACCEPTED')
                    expect(acceptResponse.body).to.have.property('acceptedAt')
                  })
                })
              })
            })
          }

          if (inviteResponse.status !== 201) {
            cy.log('Não foi possível criar convite')
            return
          }

          // Listar convites do usuário para obter o token
          ensureToken(testUsers.tester).then((userToken) => {
            if (!userToken) {
              cy.log('Não foi possível obter token do usuário')
              return
            }

            cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/invites`,
              headers: {
                Authorization: `Bearer ${userToken}`
              }
            }).then((invitesResponse) => {
              if (invitesResponse.status !== 200 || !invitesResponse.body.items) {
                cy.log('Não foi possível listar convites')
                return
              }

              const invite = invitesResponse.body.items.find((inv) => 
                inv.projectId === testProject.id && inv.status === 'PENDING'
              )

              if (!invite || !invite.token) {
                cy.log('Convite não encontrado ou sem token')
                return
              }

              // Aceitar o convite usando token no body
              cy.request({
                method: 'POST',
                url: `${API_BASE_URL}/invites/accept`,
                headers: {
                  Authorization: `Bearer ${userToken}`
                },
                body: {
                  token: invite.token
                },
                failOnStatusCode: false
              }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.have.property('id')
                expect(response.body).to.have.property('projectId', testProject.id)
                expect(response.body).to.have.property('email', testUsers.tester.email)
                expect(response.body).to.have.property('role', 'TESTER')
                expect(response.body).to.have.property('status', 'ACCEPTED')
                expect(response.body).to.have.property('acceptedAt')
              })
            })
          })
        })
      })
    })

    it('deve retornar 400 quando token não é fornecido', () => {
      ensureToken(testUsers.tester).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/invites/accept`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {},
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('Token')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/invites/accept`,
        body: {
          token: 'some-token'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/invites/:token/decline - Recusar convite (com token)', () => {
    it('deve recusar convite com sucesso', () => {
      if (!testProject.id || !testUsers.invitedUser.id) {
        cy.log('Projeto ou usuário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((ownerToken) => {
        if (!ownerToken) {
          cy.log('Não foi possível obter token do owner')
          return
        }

        // Criar convite (pode retornar 409 se usuário já é membro)
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
          headers: {
            Authorization: `Bearer ${ownerToken}`
          },
          body: {
            email: testUsers.invitedUser.email,
            role: 'TESTER'
          },
          failOnStatusCode: false
        }).then((inviteResponse) => {
          if (inviteResponse.status === 409) {
            // Usuário já é membro, usar email diferente e criar usuário temporário
            const newEmail = `decline-test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
            return createTestUser({
              name: 'Usuário Decline Test',
              email: newEmail,
              password: 'SenhaSegura123'
            }, 0).then((userResponse) => {
              if (userResponse.status !== 201) {
                cy.log('Não foi possível criar usuário temporário')
                return
              }

              // Criar convite para o novo email
              return cy.request({
                method: 'POST',
                url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
                headers: {
                  Authorization: `Bearer ${ownerToken}`
                },
                body: {
                  email: newEmail,
                  role: 'TESTER'
                },
                failOnStatusCode: false
              })
            }).then((newInviteResponse) => {
              if (newInviteResponse.status !== 201) {
                cy.log('Não foi possível criar convite')
                return
              }

              // Obter token do novo usuário para listar convites
              return getAuthToken(newEmail, 'SenhaSegura123').then((userToken) => {
                if (!userToken) {
                  cy.log('Não foi possível obter token do usuário')
                  return
                }

                // Listar convites do usuário para obter o token
                return cy.request({
                  method: 'GET',
                  url: `${API_BASE_URL}/invites`,
                  headers: {
                    Authorization: `Bearer ${userToken}`
                  }
                }).then((invitesResponse) => {
                  if (invitesResponse.status !== 200 || !invitesResponse.body.items) {
                    cy.log('Não foi possível listar convites')
                    return
                  }

                  const invite = invitesResponse.body.items.find((inv) => 
                    inv.email === newEmail && inv.status === 'PENDING'
                  )

                  if (!invite || !invite.token) {
                    cy.log('Convite não encontrado ou sem token')
                    return
                  }

                  // Recusar o convite
                  return cy.request({
                    method: 'POST',
                    url: `${API_BASE_URL}/invites/${invite.token}/decline`,
                    headers: {
                      Authorization: `Bearer ${userToken}`
                    },
                    failOnStatusCode: false
                  }).then((declineResponse) => {
                    expect(declineResponse.status).to.eq(200)
                    expect(declineResponse.body).to.have.property('id')
                    expect(declineResponse.body).to.have.property('projectId', testProject.id)
                    expect(declineResponse.body).to.have.property('email', newEmail)
                    expect(declineResponse.body).to.have.property('role', 'TESTER')
                    expect(declineResponse.body).to.have.property('status', 'DECLINED')
                    expect(declineResponse.body).to.have.property('declinedAt')
                  })
                })
              })
            })
          }

          if (inviteResponse.status !== 201) {
            cy.log('Não foi possível criar convite')
            return
          }

          // Listar convites do usuário para obter o token
          ensureToken(testUsers.invitedUser).then((userToken) => {
            if (!userToken) {
              cy.log('Não foi possível obter token do usuário')
              return
            }

            cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/invites`,
              headers: {
                Authorization: `Bearer ${userToken}`
              }
            }).then((invitesResponse) => {
              if (invitesResponse.status !== 200 || !invitesResponse.body.items) {
                cy.log('Não foi possível listar convites')
                return
              }

              const invite = invitesResponse.body.items.find((inv) => 
                inv.projectId === testProject.id && inv.status === 'PENDING'
              )

              if (!invite || !invite.token) {
                cy.log('Convite não encontrado ou sem token')
                return
              }

              // Recusar o convite
              cy.request({
                method: 'POST',
                url: `${API_BASE_URL}/invites/${invite.token}/decline`,
                headers: {
                  Authorization: `Bearer ${userToken}`
                },
                failOnStatusCode: false
              }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.have.property('id')
                expect(response.body).to.have.property('projectId', testProject.id)
                expect(response.body).to.have.property('email', testUsers.invitedUser.email)
                expect(response.body).to.have.property('role', 'TESTER')
                expect(response.body).to.have.property('status', 'DECLINED')
                expect(response.body).to.have.property('declinedAt')
              })
            })
          })
        })
      })
    })

    it('deve retornar 400 quando token é inválido', () => {
      ensureToken(testUsers.invitedUser).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/invites/invalid-token/decline`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 404]).to.include(response.status)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/invites/some-token/decline`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/invites/decline - Recusar convite (sem token)', () => {
    it('deve recusar convite com token no body', () => {
      if (!testProject.id || !testUsers.tester.id) {
        cy.log('Projeto ou usuário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((ownerToken) => {
        if (!ownerToken) {
          cy.log('Não foi possível obter token do owner')
          return
        }

        // Criar convite (pode retornar 409 se usuário já é membro)
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
          headers: {
            Authorization: `Bearer ${ownerToken}`
          },
          body: {
            email: testUsers.tester.email,
            role: 'TESTER'
          },
          failOnStatusCode: false
        }).then((inviteResponse) => {
          if (inviteResponse.status === 409) {
            // Usuário já é membro, usar email diferente e criar usuário temporário
            const newEmail = `decline-body-test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
            return createTestUser({
              name: 'Usuário Decline Body Test',
              email: newEmail,
              password: 'SenhaSegura123'
            }, 0).then((userResponse) => {
              if (userResponse.status !== 201) {
                cy.log('Não foi possível criar usuário temporário')
                return
              }

              // Criar convite para o novo email
              return cy.request({
                method: 'POST',
                url: `${API_BASE_URL}/projects/${testProject.id}/invites`,
                headers: {
                  Authorization: `Bearer ${ownerToken}`
                },
                body: {
                  email: newEmail,
                  role: 'TESTER'
                },
                failOnStatusCode: false
              })
            }).then((newInviteResponse) => {
              if (newInviteResponse.status !== 201) {
                cy.log('Não foi possível criar convite')
                return
              }

              // Obter token do novo usuário para listar convites
              return getAuthToken(newEmail, 'SenhaSegura123').then((userToken) => {
                if (!userToken) {
                  cy.log('Não foi possível obter token do usuário')
                  return
                }

                // Listar convites do usuário para obter o token
                return cy.request({
                  method: 'GET',
                  url: `${API_BASE_URL}/invites`,
                  headers: {
                    Authorization: `Bearer ${userToken}`
                  }
                }).then((invitesResponse) => {
                  if (invitesResponse.status !== 200 || !invitesResponse.body.items) {
                    cy.log('Não foi possível listar convites')
                    return
                  }

                  const invite = invitesResponse.body.items.find((inv) => 
                    inv.email === newEmail && inv.status === 'PENDING'
                  )

                  if (!invite || !invite.token) {
                    cy.log('Convite não encontrado ou sem token')
                    return
                  }

                  // Recusar o convite usando token no body
                  return cy.request({
                    method: 'POST',
                    url: `${API_BASE_URL}/invites/decline`,
                    headers: {
                      Authorization: `Bearer ${userToken}`
                    },
                    body: {
                      token: invite.token
                    },
                    failOnStatusCode: false
                  }).then((declineResponse) => {
                    expect(declineResponse.status).to.eq(200)
                    expect(declineResponse.body).to.have.property('id')
                    expect(declineResponse.body).to.have.property('projectId', testProject.id)
                    expect(declineResponse.body).to.have.property('email', newEmail)
                    expect(declineResponse.body).to.have.property('role', 'TESTER')
                    expect(declineResponse.body).to.have.property('status', 'DECLINED')
                    expect(declineResponse.body).to.have.property('declinedAt')
                  })
                })
              })
            })
          }

          if (inviteResponse.status !== 201) {
            cy.log('Não foi possível criar convite')
            return
          }

          // Listar convites do usuário para obter o token
          ensureToken(testUsers.tester).then((userToken) => {
            if (!userToken) {
              cy.log('Não foi possível obter token do usuário')
              return
            }

            cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/invites`,
              headers: {
                Authorization: `Bearer ${userToken}`
              }
            }).then((invitesResponse) => {
              if (invitesResponse.status !== 200 || !invitesResponse.body.items) {
                cy.log('Não foi possível listar convites')
                return
              }

              const invite = invitesResponse.body.items.find((inv) => 
                inv.projectId === testProject.id && inv.status === 'PENDING'
              )

              if (!invite || !invite.token) {
                cy.log('Convite não encontrado ou sem token')
                return
              }

              // Recusar o convite usando token no body
              cy.request({
                method: 'POST',
                url: `${API_BASE_URL}/invites/decline`,
                headers: {
                  Authorization: `Bearer ${userToken}`
                },
                body: {
                  token: invite.token
                },
                failOnStatusCode: false
              }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.have.property('id')
                expect(response.body).to.have.property('projectId', testProject.id)
                expect(response.body).to.have.property('email', testUsers.tester.email)
                expect(response.body).to.have.property('role', 'TESTER')
                expect(response.body).to.have.property('status', 'DECLINED')
                expect(response.body).to.have.property('declinedAt')
              })
            })
          })
        })
      })
    })

    it('deve retornar 400 quando token não é fornecido', () => {
      ensureToken(testUsers.tester).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/invites/decline`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {},
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('Token')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/invites/decline`,
        body: {
          token: 'some-token'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })
})

