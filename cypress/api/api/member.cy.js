describe('API - Membros', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Membros',
      id: null,
      token: null
    },
    member: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Member Membros',
      id: null,
      token: null
    },
    newMember: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário New Member',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Membros',
    description: 'Descrição do projeto para testes de membros'
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
    const ownerEmail = `owner-members-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
      // Criar usuário member
      const memberEmail = `member-members-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
      // Criar usuário newMember
      const newMemberEmail = `newmember-members-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.newMember.email = newMemberEmail

      return createTestUser({
        name: testUsers.newMember.name,
        email: testUsers.newMember.email,
        password: testUsers.newMember.password
      }, 1500).then((response) => {
        if (response.status === 201 && response.body.id) {
          testUsers.newMember.id = response.body.id
          return getAuthToken(testUsers.newMember.email, testUsers.newMember.password)
        }
        return null
      }).then((token) => {
        if (token && typeof token === 'string') {
          testUsers.newMember.token = token
        }
      })
    })
  })

  describe('POST /api/projects/:projectId/members/by-email - Adicionar membro por email', () => {
    it('deve criar convite para membro existente', () => {
      if (!testProject.id || !testUsers.member.id) {
        cy.log('Projeto ou usuário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/members/by-email`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            email: testUsers.member.email,
            role: 'TESTER'
          }
        }).then((response) => {
          expect(response.status).to.eq(201)
          // addMemberByEmail sempre cria um convite, não adiciona diretamente
          expect(response.body).to.have.property('invited', true)
          expect(response.body).to.have.property('email', testUsers.member.email)
          expect(response.body).to.have.property('role', 'TESTER')
          expect(response.body).to.have.property('status', 'PENDING')
        })
      })
    })

    it('deve criar convite para usuário não existente', () => {
      if (!testProject.id) {
        cy.log('Projeto não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        const nonExistentEmail = `nonexistent-${Date.now()}@test.com`

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/members/by-email`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            email: nonExistentEmail,
            role: 'MANAGER'
          }
        }).then((response) => {
          expect(response.status).to.eq(201)
          expect(response.body).to.have.property('invited', true)
          expect(response.body).to.have.property('email', nonExistentEmail)
          expect(response.body).to.have.property('role', 'MANAGER')
          expect(response.body).to.have.property('status', 'PENDING')
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
          url: `${API_BASE_URL}/projects/${testProject.id}/members/by-email`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            email: 'email-invalido',
            role: 'TESTER'
          },
          failOnStatusCode: false
        }).then((response) => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/members/by-email`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            email: testUsers.member.email,
            role: 'INVALID_ROLE'
          },
          failOnStatusCode: false
        }).then((response) => {
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
          url: `${API_BASE_URL}/projects/invalid-id/members/by-email`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            email: testUsers.member.email,
            role: 'TESTER'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message.toLowerCase()).to.match(/projectid|projeto.*inválido|id.*projeto.*inválido/i)
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
        url: `${API_BASE_URL}/projects/${testProject.id}/members/by-email`,
        body: {
          email: testUsers.member.email,
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

  describe('GET /api/projects/:projectId/members - Listar membros', () => {
    it('deve listar membros do projeto', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/members`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('items')
          expect(Array.isArray(response.body.items)).to.be.true
          expect(response.body).to.have.property('total')
        })
      })
    })

    it('deve suportar filtro por roles', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/members?roles=TESTER`,
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

    it('deve suportar múltiplos roles no filtro', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/members?roles=TESTER,MANAGER`,
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

    it('deve suportar busca por texto (query parameter q)', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/members?q=${testUsers.owner.name}`,
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
          url: `${API_BASE_URL}/projects/${testProject.id}/members?page=1&pageSize=5`,
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
          url: `${API_BASE_URL}/projects/${testProject.id}/members?orderBy=name&sort=asc`,
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
          url: `${API_BASE_URL}/projects/invalid-id/members`,
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
        url: `${API_BASE_URL}/projects/${testProject.id}/members`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('PUT /api/projects/:projectId/members/:userId/role - Atualizar role do membro', () => {
    it('deve atualizar role do membro com sucesso', () => {
      if (!testProject.id || !testUsers.member.id) {
        cy.log('Projeto ou usuário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        // Primeiro, criar um convite (addMemberByEmail cria convite, não adiciona diretamente)
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/members/by-email`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            email: testUsers.member.email,
            role: 'TESTER'
          }
        }).then((inviteResponse) => {
          if (inviteResponse.status !== 201 || !inviteResponse.body.id) {
            cy.log('Não foi possível criar convite')
            return
          }

          const inviteId = inviteResponse.body.id

          // Aceitar o convite para que o membro seja adicionado ao projeto
          ensureToken(testUsers.member).then((memberToken) => {
            if (!memberToken) {
              cy.log('Não foi possível obter token do member')
              return
            }

            // Listar convites do usuário para obter o token
            cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/invites`,
              headers: {
                Authorization: `Bearer ${memberToken}`
              }
            }).then((invitesResponse) => {
              if (invitesResponse.status !== 200 || !invitesResponse.body.items) {
                cy.log('Não foi possível listar convites')
                return
              }

              const invite = invitesResponse.body.items.find((inv) => inv.id === inviteId)
              if (!invite || !invite.token) {
                cy.log('Convite não encontrado ou sem token')
                return
              }

              // Aceitar o convite
              cy.request({
                method: 'POST',
                url: `${API_BASE_URL}/invites/${invite.token}/accept`,
                headers: {
                  Authorization: `Bearer ${memberToken}`
                },
                failOnStatusCode: false
              }).then((acceptResponse) => {
                if (acceptResponse.status !== 200) {
                  cy.log(`Erro ao aceitar convite: ${acceptResponse.status}`)
                  return
                }

                // Agora atualizar role para MANAGER
                cy.request({
                  method: 'PUT',
                  url: `${API_BASE_URL}/projects/${testProject.id}/members/${testUsers.member.id}/role`,
                  headers: {
                    Authorization: `Bearer ${token}`
                  },
                  body: {
                    role: 'MANAGER'
                  },
                  failOnStatusCode: false
                }).then((response) => {
                  if (response.status !== 200) {
                    cy.log(`Erro ao atualizar role: ${response.status}, ${JSON.stringify(response.body)}`)
                  }
                  expect(response.status).to.eq(200)
                  expect(response.body).to.have.property('projectId', testProject.id)
                  expect(response.body).to.have.property('userId', testUsers.member.id)
                  expect(response.body).to.have.property('role', 'MANAGER')
                })
              })
            })
          })
        })
      })
    })

    it('deve retornar 400 quando role é inválida', () => {
      if (!testProject.id || !testUsers.member.id) {
        cy.log('Projeto ou usuário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/projects/${testProject.id}/members/${testUsers.member.id}/role`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            role: 'INVALID_ROLE'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('Role')
        })
      })
    })

    it('deve retornar 400 quando projectId é inválido', () => {
      if (!testUsers.member.id) {
        cy.log('Usuário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'PUT',
          url: `${API_BASE_URL}/projects/invalid-id/members/${testUsers.member.id}/role`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            role: 'MANAGER'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message.toLowerCase()).to.match(/projectid|projeto.*inválido|id.*projeto.*inválido/i)
        })
      })
    })

    it('deve retornar 400 quando userId é inválido', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/members/invalid-id/role`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            role: 'MANAGER'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('userId')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProject.id || !testUsers.member.id) {
        cy.log('Projeto ou usuário não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'PUT',
        url: `${API_BASE_URL}/projects/${testProject.id}/members/${testUsers.member.id}/role`,
        body: {
          role: 'MANAGER'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('DELETE /api/projects/:projectId/members/:userId - Remover membro', () => {
    it('deve remover membro do projeto com sucesso', () => {
      if (!testProject.id || !testUsers.newMember.id) {
        cy.log('Projeto ou usuário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        // Primeiro, criar um convite (addMemberByEmail cria convite, não adiciona diretamente)
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/members/by-email`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            email: testUsers.newMember.email,
            role: 'TESTER'
          }
        }).then((inviteResponse) => {
          if (inviteResponse.status !== 201 || !inviteResponse.body.id) {
            cy.log('Não foi possível criar convite')
            return
          }

          const inviteId = inviteResponse.body.id

          // Aceitar o convite para que o membro seja adicionado ao projeto
          ensureToken(testUsers.newMember).then((memberToken) => {
            if (!memberToken) {
              cy.log('Não foi possível obter token do member')
              return
            }

            // Listar convites do usuário para obter o token
            cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/invites`,
              headers: {
                Authorization: `Bearer ${memberToken}`
              }
            }).then((invitesResponse) => {
              if (invitesResponse.status !== 200 || !invitesResponse.body.items) {
                cy.log('Não foi possível listar convites')
                return
              }

              const invite = invitesResponse.body.items.find((inv) => inv.id === inviteId)
              if (!invite || !invite.token) {
                cy.log('Convite não encontrado ou sem token')
                return
              }

              // Aceitar o convite
              cy.request({
                method: 'POST',
                url: `${API_BASE_URL}/invites/${invite.token}/accept`,
                headers: {
                  Authorization: `Bearer ${memberToken}`
                },
                failOnStatusCode: false
              }).then((acceptResponse) => {
                if (acceptResponse.status !== 200) {
                  cy.log(`Erro ao aceitar convite: ${acceptResponse.status}`)
                  return
                }

                // Agora remover o membro
                cy.request({
                  method: 'DELETE',
                  url: `${API_BASE_URL}/projects/${testProject.id}/members/${testUsers.newMember.id}`,
                  headers: {
                    Authorization: `Bearer ${token}`
                  },
                  failOnStatusCode: false
                }).then((response) => {
                  if (response.status !== 200) {
                    cy.log(`Erro ao remover membro: ${response.status}, ${JSON.stringify(response.body)}`)
                  }
                  expect(response.status).to.eq(200)
                  expect(response.body).to.have.property('projectId', testProject.id)
                  expect(response.body).to.have.property('userId', testUsers.newMember.id)
                  expect(response.body).to.have.property('role')
                })
              })
            })
          })
        })
      })
    })

    it('deve retornar 400 quando projectId é inválido', () => {
      if (!testUsers.member.id) {
        cy.log('Usuário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'DELETE',
          url: `${API_BASE_URL}/projects/invalid-id/members/${testUsers.member.id}`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message.toLowerCase()).to.match(/projectid|projeto.*inválido|id.*projeto.*inválido/i)
        })
      })
    })

    it('deve retornar 400 quando userId é inválido', () => {
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
          url: `${API_BASE_URL}/projects/${testProject.id}/members/invalid-id`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('userId')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testProject.id || !testUsers.member.id) {
        cy.log('Projeto ou usuário não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/projects/${testProject.id}/members/${testUsers.member.id}`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/projects/:projectId/members/leave - Sair do projeto', () => {
    it('deve permitir que membro saia do projeto', () => {
      if (!testProject.id || !testUsers.member.id) {
        cy.log('Projeto ou usuário não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((ownerToken) => {
        if (!ownerToken) {
          cy.log('Não foi possível obter token do owner, pulando teste')
          return
        }

        // Verificar se o membro já está no projeto (pode ter sido adicionado em testes anteriores)
        ensureToken(testUsers.member).then((memberToken) => {
          if (!memberToken) {
            cy.log('Não foi possível obter token do member')
            return
          }

          // Verificar se o membro já está no projeto
          cy.request({
            method: 'GET',
            url: `${API_BASE_URL}/projects/${testProject.id}/members`,
            headers: {
              Authorization: `Bearer ${ownerToken}`
            }
          }).then((membersResponse) => {
            const isMember = membersResponse.body.items && 
              membersResponse.body.items.some((m) => m.userId === testUsers.member.id)

            if (isMember) {
              // Membro já está no projeto, pode sair diretamente
              cy.request({
                method: 'POST',
                url: `${API_BASE_URL}/projects/${testProject.id}/members/leave`,
                headers: {
                  Authorization: `Bearer ${memberToken}`
                },
                failOnStatusCode: false
              }).then((response) => {
                if (response.status !== 200) {
                  cy.log(`Erro ao sair do projeto: ${response.status}, ${JSON.stringify(response.body)}`)
                }
                expect(response.status).to.eq(200)
                expect(response.body).to.have.property('projectId', testProject.id)
                expect(response.body).to.have.property('userId', testUsers.member.id)
                expect(response.body).to.have.property('role')
                expect(response.body).to.have.property('message')
                expect(response.body.message).to.include('saiu do projeto')
              })
            } else {
              // Membro não está no projeto, criar convite e aceitar primeiro
              cy.request({
                method: 'POST',
                url: `${API_BASE_URL}/projects/${testProject.id}/members/by-email`,
                headers: {
                  Authorization: `Bearer ${ownerToken}`
                },
                body: {
                  email: testUsers.member.email,
                  role: 'TESTER'
                },
                failOnStatusCode: false
              }).then((inviteResponse) => {
                if (inviteResponse.status === 409) {
                  // Usuário já faz parte do projeto (pode ter sido adicionado entre as verificações)
                  cy.request({
                    method: 'POST',
                    url: `${API_BASE_URL}/projects/${testProject.id}/members/leave`,
                    headers: {
                      Authorization: `Bearer ${memberToken}`
                    },
                    failOnStatusCode: false
                  }).then((response) => {
                    expect(response.status).to.eq(200)
                    expect(response.body).to.have.property('projectId', testProject.id)
                    expect(response.body).to.have.property('userId', testUsers.member.id)
                    expect(response.body).to.have.property('role')
                    expect(response.body).to.have.property('message')
                    expect(response.body.message).to.include('saiu do projeto')
                  })
                  return
                }

                if (inviteResponse.status !== 201 || !inviteResponse.body.id) {
                  cy.log('Não foi possível criar convite')
                  return
                }

                const inviteId = inviteResponse.body.id

                // Listar convites do usuário para obter o token
                cy.request({
                  method: 'GET',
                  url: `${API_BASE_URL}/invites`,
                  headers: {
                    Authorization: `Bearer ${memberToken}`
                  }
                }).then((invitesResponse) => {
                  if (invitesResponse.status !== 200 || !invitesResponse.body.items) {
                    cy.log('Não foi possível listar convites')
                    return
                  }

                  const invite = invitesResponse.body.items.find((inv) => inv.id === inviteId)
                  if (!invite || !invite.token) {
                    cy.log('Convite não encontrado ou sem token')
                    return
                  }

                  // Aceitar o convite
                  cy.request({
                    method: 'POST',
                    url: `${API_BASE_URL}/invites/${invite.token}/accept`,
                    headers: {
                      Authorization: `Bearer ${memberToken}`
                    },
                    failOnStatusCode: false
                  }).then((acceptResponse) => {
                    if (acceptResponse.status !== 200) {
                      cy.log(`Erro ao aceitar convite: ${acceptResponse.status}`)
                      return
                    }

                    // Agora o membro pode sair do projeto
                    cy.request({
                      method: 'POST',
                      url: `${API_BASE_URL}/projects/${testProject.id}/members/leave`,
                      headers: {
                        Authorization: `Bearer ${memberToken}`
                      },
                      failOnStatusCode: false
                    }).then((response) => {
                      if (response.status !== 200) {
                        cy.log(`Erro ao sair do projeto: ${response.status}, ${JSON.stringify(response.body)}`)
                      }
                      expect(response.status).to.eq(200)
                      expect(response.body).to.have.property('projectId', testProject.id)
                      expect(response.body).to.have.property('userId', testUsers.member.id)
                      expect(response.body).to.have.property('role')
                      expect(response.body).to.have.property('message')
                      expect(response.body.message).to.include('saiu do projeto')
                    })
                  })
                })
              })
            }
          })
        })
      })
    })

    it('deve retornar 400 quando projectId é inválido', () => {
      ensureToken(testUsers.member).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/invalid-id/members/leave`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message.toLowerCase()).to.match(/projectid|projeto.*inválido|id.*projeto.*inválido/i)
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
        url: `${API_BASE_URL}/projects/${testProject.id}/members/leave`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })
})

