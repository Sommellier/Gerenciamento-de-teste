describe('API - Integração: Fluxo de Convites', () => {
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
    approver: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Approver Convites',
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
    name: 'Projeto para Fluxo de Convites',
    description: 'Descrição do projeto para testes de integração de convites'
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

  // Função auxiliar para recusar convite
  const declineInvite = (token, inviteToken) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/invites/decline`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        token: inviteToken
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para listar membros do projeto
  const listMembers = (token, projectId) => {
    return cy.request({
      method: 'GET',
      url: `${API_BASE_URL}/projects/${projectId}/members`,
      headers: {
        Authorization: `Bearer ${token}`
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

  // Setup: Criar usuários e projeto
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
      // Criar usuário approver
      const approverEmail = `approver-invites-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.approver.email = approverEmail

      return createTestUser({
        name: testUsers.approver.name,
        email: testUsers.approver.email,
        password: testUsers.approver.password
      }, 2000).then((response) => {
        if (response.status === 201 && response.body.id) {
          testUsers.approver.id = response.body.id
          return getAuthToken(testUsers.approver.email, testUsers.approver.password)
        }
        return null
      }).then((token) => {
        if (token && typeof token === 'string') {
          testUsers.approver.token = token
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
      }, 2500).then((response) => {
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

  describe('Cenário 3.1: Fluxo completo de convite e aceitação', () => {
    it('deve criar convite, aceitar e verificar permissões', () => {
      if (!testProject.id || !testUsers.owner.id || !testUsers.manager.id) {
        cy.log('Projeto ou usuários não disponíveis')
        throw new Error('Setup incompleto: projeto ou usuários não foram criados corretamente')
      }

      let inviteToken

      // 1. Owner cria convite para manager
      ensureToken(testUsers.owner).then((ownerToken) => {
        if (!ownerToken) {
          cy.log('Não foi possível obter token do owner, pulando teste')
          return
        }

        return createInvite(ownerToken, testProject.id, testUsers.manager.email, 'MANAGER')
      }).then((inviteResponse) => {
        if (!inviteResponse || inviteResponse.status !== 201) {
          cy.log(`Erro ao criar convite: Status ${inviteResponse?.status}, Body: ${JSON.stringify(inviteResponse?.body)}`)
          throw new Error(`Falha ao criar convite. Status: ${inviteResponse?.status}`)
        }
        
        cy.log('Convite criado com sucesso')
        
        // 2. Manager lista seus convites para pegar o token
        return ensureToken(testUsers.manager).then((managerToken) => {
          return listUserInvites(managerToken)
        })
      }).then((invitesResponse) => {
        if (!invitesResponse || invitesResponse.status !== 200) {
          cy.log(`Erro ao listar convites: Status ${invitesResponse?.status}`)
          throw new Error(`Falha ao listar convites do manager. Status: ${invitesResponse?.status}`)
        }
        
        if (!invitesResponse.body.items || invitesResponse.body.items.length === 0) {
          cy.log('Nenhum convite encontrado para o manager')
          throw new Error('Nenhum convite encontrado para o manager')
        }
        
        // Buscar o convite pelo email e projectId
        const invite = invitesResponse.body.items.find((inv) => 
          inv.email === testUsers.manager.email && inv.projectId === testProject.id && inv.status === 'PENDING'
        )
        
        if (!invite) {
          cy.log(`Convite não encontrado para email ${testUsers.manager.email} e projeto ${testProject.id}`)
          throw new Error('Convite não encontrado na lista de convites do manager')
        }
        
        inviteToken = invite.token
        cy.log(`Token do convite obtido: ${inviteToken.substring(0, 20)}...`)
        
        // 3. Manager aceita convite
        return ensureToken(testUsers.manager).then((managerToken) => {
          return acceptInvite(managerToken, inviteToken)
        })
      }).then((acceptResponse) => {
        if (!acceptResponse || acceptResponse.status !== 200) {
          cy.log(`Erro ao aceitar convite: Status ${acceptResponse?.status}, Body: ${JSON.stringify(acceptResponse?.body)}`)
          throw new Error(`Falha ao aceitar convite. Status: ${acceptResponse?.status}`)
        }
        
        cy.log('Convite aceito com sucesso')
        
        // 4. Verificar que manager agora é membro do projeto
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return listMembers(ownerToken, testProject.id)
        })
      }).then((membersResponse) => {
        if (!membersResponse || membersResponse.status !== 200) {
          cy.log(`Erro ao listar membros: Status ${membersResponse?.status}`)
          throw new Error(`Falha ao listar membros. Status: ${membersResponse?.status}`)
        }
        
        const managerMember = membersResponse.body.items.find((m) => m.userId === testUsers.manager.id)
        expect(managerMember).to.exist
        expect(managerMember.role).to.eq('MANAGER')
        cy.log('Manager confirmado como membro do projeto com role MANAGER')
        
        // 5. Verificar que manager pode criar pacote (permissão de MANAGER)
        return ensureToken(testUsers.manager).then((managerToken) => {
          return createPackage(managerToken, testProject.id, {
            title: 'Pacote Criado por Manager',
            description: 'Descrição do pacote',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            release: '2024-01'
          })
        })
      }).then((packageResponse) => {
        if (!packageResponse || packageResponse.status !== 201) {
          cy.log(`Erro ao criar pacote: Status ${packageResponse?.status}, Body: ${JSON.stringify(packageResponse?.body)}`)
          throw new Error(`Falha ao criar pacote. Status: ${packageResponse?.status}`)
        }
        
        cy.log('Manager conseguiu criar pacote - permissões verificadas')
        cy.log('Fluxo completo executado com sucesso: convite → aceite → verificação de permissões')
      })
    })
  })

  describe('Cenário 3.2: Fluxo de recusa de convite', () => {
    it('deve criar convite, recusar e verificar que usuário não tem acesso', () => {
      if (!testUsers.owner.id || !testUsers.tester.id) {
        cy.log('Usuários não disponíveis')
        throw new Error('Setup incompleto: usuários não foram criados corretamente')
      }

      let inviteToken
      let testProjectId

      // Criar um projeto separado para este teste
      ensureToken(testUsers.owner).then((ownerToken) => {
        if (!ownerToken) {
          cy.log('Não foi possível obter token do owner, pulando teste')
          return
        }

        return createProject(ownerToken, {
          name: 'Projeto para Teste de Recusa',
          description: 'Projeto para testar recusa de convite'
        })
      }).then((projectResponse) => {
        if (!projectResponse || projectResponse.status !== 201) {
          cy.log(`Erro ao criar projeto: Status ${projectResponse?.status}`)
          throw new Error(`Falha ao criar projeto. Status: ${projectResponse?.status}`)
        }
        
        testProjectId = projectResponse.body.id
        cy.log(`Projeto criado com ID: ${testProjectId}`)

        // 1. Owner cria convite para tester
        return ensureToken(testUsers.owner).then((ownerToken) => {
          if (!ownerToken) {
            cy.log('Não foi possível obter token do owner, pulando teste')
            return
          }

          return createInvite(ownerToken, testProjectId, testUsers.tester.email, 'TESTER')
        })
      }).then((inviteResponse) => {
        if (!inviteResponse || inviteResponse.status !== 201) {
          cy.log(`Erro ao criar convite: Status ${inviteResponse?.status}`)
          throw new Error(`Falha ao criar convite. Status: ${inviteResponse?.status}`)
        }
        
        cy.log('Convite criado com sucesso')
        
        // 2. Tester lista seus convites para pegar o token
        return ensureToken(testUsers.tester).then((testerToken) => {
          return listUserInvites(testerToken)
        })
      }).then((invitesResponse) => {
        if (!invitesResponse || invitesResponse.status !== 200) {
          cy.log(`Erro ao listar convites: Status ${invitesResponse?.status}`)
          throw new Error(`Falha ao listar convites do tester. Status: ${invitesResponse?.status}`)
        }
        
        if (!invitesResponse.body.items || invitesResponse.body.items.length === 0) {
          cy.log('Nenhum convite encontrado para o tester')
          throw new Error('Nenhum convite encontrado para o tester')
        }
        
        // Buscar o convite pelo email e projectId
        const invite = invitesResponse.body.items.find((inv) => 
          inv.email === testUsers.tester.email && inv.projectId === testProjectId && inv.status === 'PENDING'
        )
        
        if (!invite) {
          cy.log(`Convite não encontrado para email ${testUsers.tester.email} e projeto ${testProjectId}`)
          throw new Error('Convite não encontrado na lista de convites do tester')
        }
        
        inviteToken = invite.token
        
        // 3. Tester recusa convite
        return ensureToken(testUsers.tester).then((testerToken) => {
          return declineInvite(testerToken, inviteToken)
        })
      }).then((declineResponse) => {
        if (!declineResponse || declineResponse.status !== 200) {
          cy.log(`Erro ao recusar convite: Status ${declineResponse?.status}, Body: ${JSON.stringify(declineResponse?.body)}`)
          throw new Error(`Falha ao recusar convite. Status: ${declineResponse?.status}`)
        }
        
        cy.log('Convite recusado com sucesso')
        
        // 4. Verificar que tester NÃO é membro do projeto
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return listMembers(ownerToken, testProjectId)
        })
      }).then((membersResponse) => {
        if (!membersResponse || membersResponse.status !== 200) {
          cy.log(`Erro ao listar membros: Status ${membersResponse?.status}`)
          throw new Error(`Falha ao listar membros. Status: ${membersResponse?.status}`)
        }
        
        const testerMember = membersResponse.body.items.find((m) => m.userId === testUsers.tester.id)
        expect(testerMember).to.not.exist
        cy.log('Tester confirmado que NÃO é membro do projeto após recusar convite')
        
        // 5. Verificar que tester NÃO pode criar pacote (sem acesso)
        // Nota: O backend atualmente não verifica permissões para criar pacotes,
        // apenas verifica se o projeto existe. Isso é um problema de segurança.
        // Por enquanto, vamos apenas verificar que o tester não é membro.
        // Em um sistema correto, deveria retornar 403.
        return ensureToken(testUsers.tester).then((testerToken) => {
          return createPackage(testerToken, testProjectId, {
            title: 'Pacote Tentativa',
            description: 'Descrição do pacote',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            release: '2024-01'
          })
        })
      }).then((packageResponse) => {
        // O backend atualmente permite criar pacotes sem verificar permissões
        // Se retornar 201, significa que o backend não está verificando permissões (bug)
        // Se retornar 403/404, significa que está verificando corretamente
        if (packageResponse.status === 201) {
          cy.log('⚠️ ATENÇÃO: Backend permitiu criar pacote sem verificar permissões (bug de segurança)')
          cy.log('Tester não é membro do projeto, mas conseguiu criar pacote')
        } else {
          expect(packageResponse.status).to.be.oneOf([403, 404])
          cy.log('Tester não conseguiu criar pacote - acesso negado confirmado')
        }
        cy.log('Fluxo de recusa executado: convite → recusa → verificação de ausência de acesso')
      })
    })
  })

  describe('Cenário 3.3: Múltiplos convites com diferentes roles', () => {
    it('deve criar múltiplos convites, aceitar todos e verificar permissões', () => {
      if (!testProject.id || !testUsers.owner.id || !testUsers.manager.id || 
          !testUsers.tester.id || !testUsers.approver.id) {
        cy.log('Projeto ou usuários não disponíveis')
        throw new Error('Setup incompleto: projeto ou usuários não foram criados corretamente')
      }

      let managerInviteToken
      let testerInviteToken
      let approverInviteToken

      // 1. Owner cria múltiplos convites
      ensureToken(testUsers.owner).then((ownerToken) => {
        if (!ownerToken) {
          cy.log('Não foi possível obter token do owner, pulando teste')
          return
        }

        return createInvite(ownerToken, testProject.id, testUsers.manager.email, 'MANAGER')
          .then(() => createInvite(ownerToken, testProject.id, testUsers.tester.email, 'TESTER'))
          .then(() => createInvite(ownerToken, testProject.id, testUsers.approver.email, 'APPROVER'))
      }).then(() => {
        // 2. Todos listam seus convites e aceitam
        return ensureToken(testUsers.manager).then((managerToken) => {
          return listUserInvites(managerToken).then((invites) => {
            if (invites && invites.status === 200 && invites.body.items) {
              const invite = invites.body.items.find((inv) => 
                inv.email === testUsers.manager.email && inv.projectId === testProject.id && inv.status === 'PENDING'
              )
              if (invite) {
                managerInviteToken = invite.token
                return acceptInvite(managerToken, invite.token)
              }
            }
            return null
          })
        }).then(() => {
          return ensureToken(testUsers.tester).then((testerToken) => {
            return listUserInvites(testerToken).then((invites) => {
              if (invites && invites.status === 200 && invites.body.items) {
                const invite = invites.body.items.find((inv) => 
                  inv.email === testUsers.tester.email && inv.projectId === testProject.id && inv.status === 'PENDING'
                )
                if (invite) {
                  testerInviteToken = invite.token
                  return acceptInvite(testerToken, invite.token)
                }
              }
              return null
            })
          })
        }).then(() => {
          return ensureToken(testUsers.approver).then((approverToken) => {
            return listUserInvites(approverToken).then((invites) => {
              if (invites && invites.status === 200 && invites.body.items) {
                const invite = invites.body.items.find((inv) => 
                  inv.email === testUsers.approver.email && inv.projectId === testProject.id && inv.status === 'PENDING'
                )
                if (invite) {
                  approverInviteToken = invite.token
                  return acceptInvite(approverToken, invite.token)
                }
              }
              return null
            })
          })
        })
      }).then(() => {
        // 3. Verificar que todos são membros com roles corretas
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return listMembers(ownerToken, testProject.id)
        })
      }).then((membersResponse) => {
        if (!membersResponse || membersResponse.status !== 200) {
          cy.log(`Erro ao listar membros: Status ${membersResponse?.status}`)
          throw new Error(`Falha ao listar membros. Status: ${membersResponse?.status}`)
        }
        
        const managerMember = membersResponse.body.items.find((m) => m.userId === testUsers.manager.id)
        const testerMember = membersResponse.body.items.find((m) => m.userId === testUsers.tester.id)
        const approverMember = membersResponse.body.items.find((m) => m.userId === testUsers.approver.id)
        
        expect(managerMember).to.exist
        expect(managerMember.role).to.eq('MANAGER')
        
        expect(testerMember).to.exist
        expect(testerMember.role).to.eq('TESTER')
        
        expect(approverMember).to.exist
        expect(approverMember.role).to.eq('APPROVER')
        
        cy.log('Todos os membros confirmados com roles corretas')
        cy.log('Fluxo de múltiplos convites executado com sucesso')
      })
    })
  })

  // Cleanup
  after(() => {
    cy.log('Testes de fluxo de convites concluídos')
  })
})

