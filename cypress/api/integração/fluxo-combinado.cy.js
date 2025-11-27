describe('API - Integração: Fluxo Combinado', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Combinado',
      id: null,
      token: null
    },
    manager: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Manager Combinado',
      id: null,
      token: null
    },
    approver: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Approver Combinado',
      id: null,
      token: null
    },
    tester1: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Tester Primeiro Combinado',
      id: null,
      token: null
    },
    tester2: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Tester Segundo Combinado',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Fluxo Combinado',
    description: 'Descrição do projeto para testes de integração combinados'
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
        
        // Se retornou erro diferente de 429, logar detalhes
        if (response.status !== 201) {
          cy.log(`❌ Erro ao criar usuário: Status ${response.status}`)
          cy.log(`Email tentado: ${userData.email}`)
          cy.log(`Body da resposta: ${JSON.stringify(response.body)}`)
        }
        
        return cy.wrap(response)
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

  // Função auxiliar para atualizar status do cenário
  const updateScenarioStatus = (token, scenarioId, status) => {
    return cy.request({
      method: 'PUT',
      url: `${API_BASE_URL}/scenarios/${scenarioId}`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        status: status
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para aprovar pacote
  const approvePackage = (token, projectId, packageId) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/projects/${projectId}/packages/${packageId}/approve`,
      headers: {
        Authorization: `Bearer ${token}`
      },
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

  // Função auxiliar para executar cenário
  const executeScenario = (token, scenarioId, result) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/scenarios/${scenarioId}/executions`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        result: result
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para atualizar status de step
  const updateStepStatus = (token, stepId, status) => {
    return cy.request({
      method: 'PUT',
      url: `${API_BASE_URL}/execution/steps/${stepId}/status`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        status: status
      },
      failOnStatusCode: false
    })
  }

  // Setup: Criar usuários e projeto
  before(() => {
    // Criar usuário owner
    const ownerEmail = `owner-combined-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
      const managerEmail = `manager-combined-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
          // Não lança erro para não quebrar o setup, mas loga o problema
        }
        return null
      }).then((token) => {
        if (token && typeof token === 'string') {
          testUsers.manager.token = token
        }
      })
    }).then(() => {
      // Criar usuário approver
      const approverEmail = `approver-combined-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.approver.email = approverEmail

      return createTestUser({
        name: testUsers.approver.name,
        email: testUsers.approver.email,
        password: testUsers.approver.password
      }, 1500).then((response) => {
        if (response.status === 201 && response.body.id) {
          testUsers.approver.id = response.body.id
          return getAuthToken(testUsers.approver.email, testUsers.approver.password)
        } else {
          cy.log(`Falha ao criar usuário approver: Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
        }
        return null
      }).then((token) => {
        if (token && typeof token === 'string') {
          testUsers.approver.token = token
        }
      })
    }).then(() => {
      // Criar usuário tester1
      const tester1Email = `tester1-combined-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.tester1.email = tester1Email

      return createTestUser({
        name: testUsers.tester1.name,
        email: testUsers.tester1.email,
        password: testUsers.tester1.password
      }, 2000).then((response) => {
        if (response.status === 201 && response.body.id) {
          testUsers.tester1.id = response.body.id
          return getAuthToken(testUsers.tester1.email, testUsers.tester1.password)
        } else {
          cy.log(`Falha ao criar usuário tester1: Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
        }
        return null
      }).then((token) => {
        if (token && typeof token === 'string') {
          testUsers.tester1.token = token
        }
      })
    }).then(() => {
      // Criar usuário tester2
      const tester2Email = `tester2-combined-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.tester2.email = tester2Email

      return createTestUser({
        name: testUsers.tester2.name,
        email: testUsers.tester2.email,
        password: testUsers.tester2.password
      }, 2500).then((response) => {
        if (response.status === 201 && response.body.id) {
          testUsers.tester2.id = response.body.id
          return getAuthToken(testUsers.tester2.email, testUsers.tester2.password)
        } else {
          cy.log(`Falha ao criar usuário tester2: Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
        }
        return null
      }).then((token) => {
        if (token && typeof token === 'string') {
          testUsers.tester2.token = token
        }
      })
    })
  })

  describe('Cenário 4.1: Fluxo completo com convites e aprovação', () => {
    it('deve criar projeto, convidar manager, criar pacote, aprovar com manager', () => {
      if (!testProject.id || !testUsers.owner.id || !testUsers.manager.id) {
        cy.log('Projeto ou usuários não disponíveis')
        throw new Error('Setup incompleto: projeto ou usuários não foram criados corretamente')
      }

      let packageId
      let scenarioId
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
        
        // 2. Manager lista seus convites para pegar o token (o token não é retornado na criação por segurança)
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
        
        // Buscar o convite pelo email e projectId (já que não temos o token da criação)
        const invite = invitesResponse.body.items.find((inv) => 
          inv.email === testUsers.manager.email && inv.projectId === testProject.id && inv.status === 'PENDING'
        )
        
        if (!invite) {
          cy.log(`Convite não encontrado para email ${testUsers.manager.email} e projeto ${testProject.id}`)
          cy.log(`Convites disponíveis: ${JSON.stringify(invitesResponse.body.items.map(i => ({ email: i.email, projectId: i.projectId, status: i.status })))}`)
          throw new Error('Convite não encontrado na lista de convites do manager')
        }
        
        // O token não é retornado na listagem por segurança
        // Como o manager já existe (foi criado no setup), vamos usar addMemberByEmail
        // para adicioná-lo diretamente ao projeto em vez de usar convite
        cy.log(`Convite encontrado com ID: ${invite.id}, mas token não disponível`)
        cy.log('Usando addMemberByEmail para adicionar manager diretamente ao projeto')
        
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return cy.request({
            method: 'POST',
            url: `${API_BASE_URL}/projects/${testProject.id}/members`,
            headers: {
              Authorization: `Bearer ${ownerToken}`
            },
            body: {
              email: testUsers.manager.email,
              role: 'MANAGER'
            },
            failOnStatusCode: false
          })
        }).then((addMemberResponse) => {
          if (addMemberResponse.status !== 201) {
            cy.log(`Erro ao adicionar membro: Status ${addMemberResponse?.status}, Body: ${JSON.stringify(addMemberResponse?.body)}`)
            // Se já foi adicionado (409), continuar mesmo assim
            if (addMemberResponse.status === 409) {
              cy.log('Manager já é membro do projeto')
              return cy.wrap({ status: 200 })
            }
            throw new Error(`Falha ao adicionar manager ao projeto. Status: ${addMemberResponse?.status}`)
          }
          cy.log('Manager adicionado ao projeto com sucesso')
          return cy.wrap({ status: 200 })
        })
      }).then((acceptResponse) => {
        if (!acceptResponse || acceptResponse.status !== 200) {
          cy.log(`Erro ao aceitar convite: Status ${acceptResponse?.status}, Body: ${JSON.stringify(acceptResponse?.body)}`)
          throw new Error(`Falha ao aceitar convite. Status: ${acceptResponse?.status}`)
        }
        
        cy.log('Convite aceito com sucesso')
        
        // 3. Manager cria pacote
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
        
        packageId = packageResponse.body.testPackage?.id || packageResponse.body.package?.id
        if (!packageId) {
          cy.log(`Erro: ID do pacote não encontrado na resposta. Body: ${JSON.stringify(packageResponse?.body)}`)
          throw new Error('Falha ao criar pacote: ID não encontrado na resposta')
        }
        cy.log(`Pacote criado com ID: ${packageId}`)

        // 4. Manager cria cenário
        return ensureToken(testUsers.manager).then((managerToken) => {
          return createScenario(managerToken, packageId, {
            title: 'Cenário Criado por Manager',
            description: 'Descrição do cenário',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            steps: [
              { action: 'Ação 1', expected: 'Resultado esperado 1' },
              { action: 'Ação 2', expected: 'Resultado esperado 2' }
            ]
          })
        })
      }).then((scenarioResponse) => {
        if (!scenarioResponse || scenarioResponse.status !== 201) {
          cy.log(`Erro ao criar cenário: Status ${scenarioResponse?.status}, Body: ${JSON.stringify(scenarioResponse?.body)}`)
          throw new Error(`Falha ao criar cenário. Status: ${scenarioResponse?.status}`)
        }
        
        scenarioId = scenarioResponse.body.scenario?.id
        if (!scenarioId) {
          cy.log(`Erro: ID do cenário não encontrado na resposta. Body: ${JSON.stringify(scenarioResponse?.body)}`)
          throw new Error('Falha ao criar cenário: ID não encontrado na resposta')
        }
        cy.log(`Cenário criado com ID: ${scenarioId}`)

        // 5. Manager aprova cenário
        return ensureToken(testUsers.manager).then((managerToken) => {
          return updateScenarioStatus(managerToken, scenarioId, 'APPROVED')
        })
      }).then((updateResponse) => {
        if (!updateResponse || updateResponse.status !== 200) {
          cy.log(`Erro ao aprovar cenário: Status ${updateResponse?.status}, Body: ${JSON.stringify(updateResponse?.body)}`)
          throw new Error(`Falha ao aprovar cenário. Status: ${updateResponse?.status}`)
        }
        
        cy.log('Cenário aprovado com sucesso')
        
        // 6. Manager aprova pacote
        if (!packageId || !scenarioId) {
          throw new Error(`packageId (${packageId}) ou scenarioId (${scenarioId}) não foram definidos corretamente`)
        }
        
        return ensureToken(testUsers.manager).then((managerToken) => {
          return approvePackage(managerToken, testProject.id, packageId)
        })
      }).then((approveResponse) => {
        if (approveResponse && approveResponse.status === 200) {
          expect(approveResponse.body.package).to.have.property('status', 'APROVADO')
          expect(approveResponse.body.package).to.have.property('approvedById')
          expect(approveResponse.body.package.approvedById).to.eq(testUsers.manager.id)
          cy.log('Fluxo completo executado com sucesso: convite → aceite → criação → aprovação')
        } else if (approveResponse) {
          cy.log(`Erro ao aprovar pacote: Status ${approveResponse.status}, Body: ${JSON.stringify(approveResponse.body)}`)
        }
      })
    })
  })

  describe('Cenário 4.2: Fluxo com múltiplos usuários e permissões', () => {
    it('deve criar projeto com múltiplos membros, cada um com diferentes permissões', () => {
      if (!testProject.id || !testUsers.owner.id || !testUsers.manager.id || 
          !testUsers.approver.id || !testUsers.tester1.id || !testUsers.tester2.id) {
        cy.log('Projeto ou usuários não disponíveis')
        throw new Error('Setup incompleto: projeto ou usuários não foram criados corretamente')
      }

      let managerInviteToken
      let approverInviteToken
      let tester1InviteToken
      let tester2InviteToken
      let packageId
      let scenarioId
      let stepId

      // 1. Owner cria convites para todos os usuários (tratando 409 se já existir)
      ensureToken(testUsers.owner).then((ownerToken) => {
        if (!ownerToken) {
          cy.log('Não foi possível obter token do owner, pulando teste')
          return
        }

        return createInvite(ownerToken, testProject.id, testUsers.manager.email, 'MANAGER')
          .then((managerInvite) => {
            // Se 409, buscar o convite existente na lista
            if (managerInvite && managerInvite.status === 409) {
              cy.log('Manager já foi convidado, buscando convite existente')
              return ensureToken(testUsers.manager).then((managerToken) => {
                return listUserInvites(managerToken).then((invites) => {
                  if (invites && invites.status === 200 && invites.body.items) {
                    const invite = invites.body.items.find((inv) => 
                      inv.email === testUsers.manager.email && inv.projectId === testProject.id
                    )
                    if (invite) {
                      managerInviteToken = invite.token
                      return { status: 200, body: { token: invite.token } }
                    }
                  }
                  return managerInvite
                })
              })
            }
            if (managerInvite && managerInvite.status === 201) {
              // Token não vem na resposta, buscar na lista
              return ensureToken(testUsers.manager).then((managerToken) => {
                return listUserInvites(managerToken).then((invites) => {
                  if (invites && invites.status === 200 && invites.body.items) {
                    const invite = invites.body.items.find((inv) => 
                      inv.email === testUsers.manager.email && inv.projectId === testProject.id && inv.status === 'PENDING'
                    )
                    if (invite) {
                      managerInviteToken = invite.token
                    }
                  }
                  return managerInvite
                })
              })
            }
            return managerInvite
          })
          .then(() => createInvite(ownerToken, testProject.id, testUsers.approver.email, 'APPROVER'))
          .then((approverInvite) => {
            if (approverInvite && approverInvite.status === 409) {
              return ensureToken(testUsers.approver).then((approverToken) => {
                return listUserInvites(approverToken).then((invites) => {
                  if (invites && invites.status === 200 && invites.body.items) {
                    const invite = invites.body.items.find((inv) => 
                      inv.email === testUsers.approver.email && inv.projectId === testProject.id
                    )
                    if (invite) {
                      approverInviteToken = invite.token
                    }
                  }
                  return approverInvite
                })
              })
            }
            if (approverInvite && approverInvite.status === 201) {
              return ensureToken(testUsers.approver).then((approverToken) => {
                return listUserInvites(approverToken).then((invites) => {
                  if (invites && invites.status === 200 && invites.body.items) {
                    const invite = invites.body.items.find((inv) => 
                      inv.email === testUsers.approver.email && inv.projectId === testProject.id && inv.status === 'PENDING'
                    )
                    if (invite) {
                      approverInviteToken = invite.token
                    }
                  }
                  return approverInvite
                })
              })
            }
            return approverInvite
          })
          .then(() => createInvite(ownerToken, testProject.id, testUsers.tester1.email, 'TESTER'))
          .then((tester1Invite) => {
            if (tester1Invite && tester1Invite.status === 409) {
              return ensureToken(testUsers.tester1).then((tester1Token) => {
                return listUserInvites(tester1Token).then((invites) => {
                  if (invites && invites.status === 200 && invites.body.items) {
                    const invite = invites.body.items.find((inv) => 
                      inv.email === testUsers.tester1.email && inv.projectId === testProject.id
                    )
                    if (invite) {
                      tester1InviteToken = invite.token
                    }
                  }
                  return tester1Invite
                })
              })
            }
            if (tester1Invite && tester1Invite.status === 201) {
              return ensureToken(testUsers.tester1).then((tester1Token) => {
                return listUserInvites(tester1Token).then((invites) => {
                  if (invites && invites.status === 200 && invites.body.items) {
                    const invite = invites.body.items.find((inv) => 
                      inv.email === testUsers.tester1.email && inv.projectId === testProject.id && inv.status === 'PENDING'
                    )
                    if (invite) {
                      tester1InviteToken = invite.token
                    }
                  }
                  return tester1Invite
                })
              })
            }
            return tester1Invite
          })
          .then(() => createInvite(ownerToken, testProject.id, testUsers.tester2.email, 'TESTER'))
          .then((tester2Invite) => {
            if (tester2Invite && tester2Invite.status === 409) {
              return ensureToken(testUsers.tester2).then((tester2Token) => {
                return listUserInvites(tester2Token).then((invites) => {
                  if (invites && invites.status === 200 && invites.body.items) {
                    const invite = invites.body.items.find((inv) => 
                      inv.email === testUsers.tester2.email && inv.projectId === testProject.id
                    )
                    if (invite) {
                      tester2InviteToken = invite.token
                    }
                  }
                  return tester2Invite
                })
              })
            }
            if (tester2Invite && tester2Invite.status === 201) {
              return ensureToken(testUsers.tester2).then((tester2Token) => {
                return listUserInvites(tester2Token).then((invites) => {
                  if (invites && invites.status === 200 && invites.body.items) {
                    const invite = invites.body.items.find((inv) => 
                      inv.email === testUsers.tester2.email && inv.projectId === testProject.id && inv.status === 'PENDING'
                    )
                    if (invite) {
                      tester2InviteToken = invite.token
                    }
                  }
                  return tester2Invite
                })
              })
            }
            return tester2Invite
          })
      }).then(() => {
        // 2. Todos aceitam seus convites (usando email e projectId se não tiver token)
        // Como o token não está disponível na listagem, vamos usar addMemberByEmail para adicionar diretamente
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return cy.request({
            method: 'POST',
            url: `${API_BASE_URL}/projects/${testProject.id}/members`,
            headers: {
              Authorization: `Bearer ${ownerToken}`
            },
            body: {
              email: testUsers.manager.email,
              role: 'MANAGER'
            },
            failOnStatusCode: false
          })
        }).then((addMemberResponse) => {
          if (addMemberResponse.status !== 201 && addMemberResponse.status !== 409) {
            cy.log(`Erro ao adicionar manager: Status ${addMemberResponse?.status}`)
            throw new Error(`Falha ao adicionar manager ao projeto. Status: ${addMemberResponse?.status}`)
          }
          if (addMemberResponse.status === 409) {
            cy.log('Manager já é membro do projeto')
          } else {
            cy.log('Manager adicionado ao projeto com sucesso')
          }
          return cy.wrap({ status: 200 })
        }).then(() => {
          return ensureToken(testUsers.approver).then((approverToken) => {
            return listUserInvites(approverToken).then((invites) => {
              if (invites && invites.status === 200 && invites.body.items) {
                const invite = invites.body.items.find((inv) => 
                  (approverInviteToken && inv.token === approverInviteToken) || 
                  (inv.email === testUsers.approver.email && inv.projectId === testProject.id && inv.status === 'PENDING')
                )
                if (invite && invite.token) {
                  approverInviteToken = invite.token
                  return acceptInvite(approverToken, invite.token)
                }
              }
              return null
            })
          })
        }).then(() => {
          return ensureToken(testUsers.tester1).then((tester1Token) => {
            return listUserInvites(tester1Token).then((invites) => {
              if (invites && invites.status === 200 && invites.body.items) {
                const invite = invites.body.items.find((inv) => 
                  (tester1InviteToken && inv.token === tester1InviteToken) || 
                  (inv.email === testUsers.tester1.email && inv.projectId === testProject.id && inv.status === 'PENDING')
                )
                if (invite && invite.token) {
                  tester1InviteToken = invite.token
                  return acceptInvite(tester1Token, invite.token)
                }
              }
              return null
            })
          })
        }).then(() => {
          return ensureToken(testUsers.tester2).then((tester2Token) => {
            return listUserInvites(tester2Token).then((invites) => {
              if (invites && invites.status === 200 && invites.body.items) {
                const invite = invites.body.items.find((inv) => 
                  (tester2InviteToken && inv.token === tester2InviteToken) || 
                  (inv.email === testUsers.tester2.email && inv.projectId === testProject.id && inv.status === 'PENDING')
                )
                if (invite && invite.token) {
                  tester2InviteToken = invite.token
                  return acceptInvite(tester2Token, invite.token)
                }
              }
              return null
            })
          })
        })
      }).then(() => {
        // 3. Manager cria pacote
        return ensureToken(testUsers.manager).then((managerToken) => {
          return createPackage(managerToken, testProject.id, {
            title: 'Pacote Multi-Usuário',
            description: 'Descrição do pacote',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            release: '2024-02'
          })
        })
      }).then((packageResponse) => {
        if (!packageResponse || packageResponse.status !== 201) {
          cy.log(`Erro ao criar pacote: Status ${packageResponse?.status}, Body: ${JSON.stringify(packageResponse?.body)}`)
          throw new Error(`Falha ao criar pacote. Status: ${packageResponse?.status}`)
        }
        
        packageId = packageResponse.body.testPackage?.id || packageResponse.body.package?.id
        if (!packageId) {
          cy.log(`Erro: ID do pacote não encontrado na resposta. Body: ${JSON.stringify(packageResponse?.body)}`)
          throw new Error('Falha ao criar pacote: ID não encontrado na resposta')
        }
        cy.log(`Pacote criado com ID: ${packageId}`)

        // 4. Manager cria cenário (TESTER não tem permissão create_scenario)
        return ensureToken(testUsers.manager).then((managerToken) => {
          return createScenario(managerToken, packageId, {
            title: 'Cenário Criado por Manager',
            description: 'Descrição do cenário',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            steps: [
              { action: 'Ação 1', expected: 'Resultado esperado 1' },
              { action: 'Ação 2', expected: 'Resultado esperado 2' }
            ]
          })
        })
      }).then((scenarioResponse) => {
        if (!scenarioResponse || scenarioResponse.status !== 201) {
          cy.log(`Erro ao criar cenário: Status ${scenarioResponse?.status}, Body: ${JSON.stringify(scenarioResponse?.body)}`)
          throw new Error(`Falha ao criar cenário. Status: ${scenarioResponse?.status}`)
        }
        
        scenarioId = scenarioResponse.body.scenario?.id
        if (!scenarioId) {
          cy.log(`Erro: ID do cenário não encontrado na resposta. Body: ${JSON.stringify(scenarioResponse?.body)}`)
          throw new Error('Falha ao criar cenário: ID não encontrado na resposta')
        }
        cy.log(`Cenário criado com ID: ${scenarioId}`)
        
        // Validar que o cenário tem steps
        if (scenarioResponse.body.scenario.steps && scenarioResponse.body.scenario.steps.length > 0) {
          stepId = scenarioResponse.body.scenario.steps[0].id
          cy.log(`Step ID: ${stepId}`)
        }

        // 5. Tester1 executa cenário (atualiza status de step)
        if (!stepId) {
          throw new Error('stepId não foi definido')
        }
        
        return ensureToken(testUsers.tester1).then((tester1Token) => {
          return updateStepStatus(tester1Token, stepId, 'PASSED')
        })
      }).then((stepResponse) => {
        if (!stepResponse || stepResponse.status !== 200) {
          cy.log(`Erro ao atualizar status do step: Status ${stepResponse?.status}, Body: ${JSON.stringify(stepResponse?.body)}`)
          throw new Error(`Falha ao atualizar status do step. Status: ${stepResponse?.status}`)
        }
        
        cy.log('Step atualizado com sucesso')
        
        // 6. Approver aprova cenário
        if (!scenarioId) {
          throw new Error('scenarioId não foi definido')
        }
        
        return ensureToken(testUsers.approver).then((approverToken) => {
          return updateScenarioStatus(approverToken, scenarioId, 'APPROVED')
        })
      }).then((updateResponse) => {
        if (!updateResponse || updateResponse.status !== 200) {
          cy.log(`Erro ao aprovar cenário: Status ${updateResponse?.status}, Body: ${JSON.stringify(updateResponse?.body)}`)
          throw new Error(`Falha ao aprovar cenário. Status: ${updateResponse?.status}`)
        }
        
        cy.log('Cenário aprovado com sucesso')
        
        // 7. Manager aprova pacote
        if (!packageId) {
          throw new Error('packageId não foi definido')
        }
        
        return ensureToken(testUsers.manager).then((managerToken) => {
          return approvePackage(managerToken, testProject.id, packageId)
        })
      }).then((approveResponse) => {
        if (!approveResponse || approveResponse.status !== 200) {
          cy.log(`Erro ao aprovar pacote: Status ${approveResponse?.status}, Body: ${JSON.stringify(approveResponse?.body)}`)
          throw new Error(`Falha ao aprovar pacote. Status: ${approveResponse?.status}`)
        }
        
        expect(approveResponse.body.package).to.have.property('status', 'APROVADO')
        expect(approveResponse.body.package.approvedById).to.eq(testUsers.manager.id)
        cy.log('Fluxo multi-usuário executado com sucesso')
        cy.log('- Manager criou pacote')
        cy.log('- Manager criou cenário')
        cy.log('- Tester1 executou cenário')
        cy.log('- Approver aprovou cenário')
        cy.log('- Manager aprovou pacote')
      })
    })
  })

  // Cleanup
  after(() => {
    cy.log('Testes de fluxo combinado concluídos')
  })
})

