describe('API - Integração: Fluxo de Comentários e Anexos', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Anexos',
      id: null,
      token: null
    },
    manager: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Manager Anexos',
      id: null,
      token: null
    },
    tester: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Tester Anexos',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Fluxo de Anexos',
    description: 'Descrição do projeto para testes de anexos'
  }

  let testPackage = {
    id: null,
    title: 'Pacote para Anexos',
    description: 'Descrição do pacote para testes de anexos',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    release: '2024-01'
  }

  let testScenario = {
    id: null,
    title: 'Cenário para Anexos',
    description: 'Descrição do cenário para testes de anexos',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    steps: []
  }

  let testStep = {
    id: null
  }

  let createdCommentIds = []
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

  // Função auxiliar para adicionar comentário
  const addComment = (token, stepId, text, mentions = null) => {
    const body = { text }
    if (mentions) {
      body.mentions = mentions
    }
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/steps/${stepId}/comments`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: body,
      failOnStatusCode: false
    })
  }

  // Função auxiliar para listar comentários
  const getComments = (token, stepId) => {
    return cy.request({
      method: 'GET',
      url: `${API_BASE_URL}/steps/${stepId}/comments`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para listar anexos
  const getAttachments = (token, stepId) => {
    return cy.request({
      method: 'GET',
      url: `${API_BASE_URL}/steps/${stepId}/attachments`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      failOnStatusCode: false
    })
  }

  // Função auxiliar para deletar anexo
  const deleteAttachment = (token, stepId, attachmentId) => {
    return cy.request({
      method: 'DELETE',
      url: `${API_BASE_URL}/steps/${stepId}/attachments/${attachmentId}`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      failOnStatusCode: false
    })
  }

  // Setup: Criar usuários, projeto, pacote, cenário e step
  before(() => {
    // Criar usuário owner
    const ownerEmail = `owner-anexos-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
      const managerEmail = `manager-anexos-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
      const testerEmail = `tester-anexos-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
      // Criar cenário com etapas
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
        
        // Pegar o primeiro step para os testes
        if (testScenario.steps.length > 0) {
          testStep.id = testScenario.steps[0].id
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

  describe('Cenário 8.1: Adicionar comentário em etapa', () => {
    it('deve adicionar comentário em etapa com sucesso', () => {
      if (!testStep.id) {
        cy.log('Step não disponível')
        throw new Error('Setup incompleto: step não foi criado corretamente')
      }

      // Adicionar comentário
      return ensureToken(testUsers.tester).then((testerToken) => {
        return addComment(testerToken, testStep.id, 'Este é um comentário de teste na etapa')
      }).then((commentResponse) => {
        expect(commentResponse.status).to.eq(201)
        expect(commentResponse.body).to.have.property('message')
        expect(commentResponse.body).to.have.property('comment')
        expect(commentResponse.body.comment).to.have.property('id')
        expect(commentResponse.body.comment).to.have.property('text', 'Este é um comentário de teste na etapa')
        expect(commentResponse.body.comment).to.have.property('user')
        expect(commentResponse.body.comment.user).to.have.property('id', testUsers.tester.id)
        
        createdCommentIds.push(commentResponse.body.comment.id)
        cy.log(`Comentário criado com ID: ${commentResponse.body.comment.id}`)
      })
    })
  })

  describe('Cenário 8.2: Listar comentários com ordenação cronológica', () => {
    it('deve listar comentários e verificar ordenação cronológica', () => {
      if (!testStep.id) {
        cy.log('Step não disponível')
        throw new Error('Setup incompleto: step não foi criado corretamente')
      }

      let comment1Id, comment2Id, comment3Id

      // Criar múltiplos comentários com pequenos delays para garantir timestamps diferentes
      return ensureToken(testUsers.tester).then((testerToken) => {
        return addComment(testerToken, testStep.id, 'Primeiro comentário')
      }).then((comment1Response) => {
        expect(comment1Response.status).to.eq(201)
        comment1Id = comment1Response.body.comment.id
        createdCommentIds.push(comment1Id)
        cy.log(`Comentário 1 criado com ID: ${comment1Id}`)

        // Aguardar um pouco antes de criar o próximo
        return cy.wait(100).then(() => {
          return ensureToken(testUsers.manager).then((managerToken) => {
            return addComment(managerToken, testStep.id, 'Segundo comentário')
          })
        })
      }).then((comment2Response) => {
        expect(comment2Response.status).to.eq(201)
        comment2Id = comment2Response.body.comment.id
        createdCommentIds.push(comment2Id)
        cy.log(`Comentário 2 criado com ID: ${comment2Id}`)

        // Aguardar um pouco antes de criar o próximo
        return cy.wait(100).then(() => {
          return ensureToken(testUsers.owner).then((ownerToken) => {
            return addComment(ownerToken, testStep.id, 'Terceiro comentário')
          })
        })
      }).then((comment3Response) => {
        expect(comment3Response.status).to.eq(201)
        comment3Id = comment3Response.body.comment.id
        createdCommentIds.push(comment3Id)
        cy.log(`Comentário 3 criado com ID: ${comment3Id}`)

        // Listar comentários
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return getComments(ownerToken, testStep.id)
        })
      }).then((commentsResponse) => {
        expect(commentsResponse.status).to.eq(200)
        expect(commentsResponse.body).to.have.property('message')
        expect(commentsResponse.body).to.have.property('comments')
        expect(commentsResponse.body.comments).to.be.an('array')
        expect(commentsResponse.body.comments.length).to.be.at.least(3)
        cy.log(`Encontrados ${commentsResponse.body.comments.length} comentários`)

        // Verificar que os comentários estão ordenados cronologicamente (asc - mais antigo primeiro)
        const comments = commentsResponse.body.comments
        for (let i = 0; i < comments.length - 1; i++) {
          const currentDate = new Date(comments[i].createdAt)
          const nextDate = new Date(comments[i + 1].createdAt)
          expect(currentDate.getTime()).to.be.at.most(nextDate.getTime())
        }
        cy.log('Comentários confirmados como ordenados cronologicamente (asc)')

        // Verificar que os comentários criados estão na lista
        const commentIds = comments.map(c => c.id)
        expect(commentIds).to.include(comment1Id)
        expect(commentIds).to.include(comment2Id)
        expect(commentIds).to.include(comment3Id)
      })
    })
  })

  describe('Cenário 8.3: Fazer upload de anexo em etapa', () => {
    it.skip('deve fazer upload de anexo com sucesso', () => {
      // Nota: Upload de arquivos via Cypress cy.request() é limitado
      // Este teste está marcado como skip devido à limitação do FormData no Cypress
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      // O teste real de upload seria feito via interface ou usando biblioteca específica
      cy.log('Teste de upload de anexo - requer implementação especial')
    })

    it('deve retornar 400 quando arquivo não é fornecido', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      // Tentar fazer upload sem arquivo
      return ensureToken(testUsers.tester).then((testerToken) => {
        return cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/steps/${testStep.id}/attachments`,
          headers: {
            Authorization: `Bearer ${testerToken}`
          },
          failOnStatusCode: false
        })
      }).then((uploadResponse) => {
        expect(uploadResponse.status).to.eq(400)
        expect(uploadResponse.body).to.have.property('message')
        expect(uploadResponse.body.message).to.include('fornecido')
        cy.log('Erro confirmado: arquivo é obrigatório')
      })
    })
  })

  describe('Cenário 8.4: Listar anexos', () => {
    it('deve listar anexos da etapa (mesmo que vazio)', () => {
      if (!testStep.id) {
        cy.log('Step não disponível')
        throw new Error('Setup incompleto: step não foi criado corretamente')
      }

      // Listar anexos (pode estar vazio se não houver uploads)
      return ensureToken(testUsers.owner).then((ownerToken) => {
        return getAttachments(ownerToken, testStep.id)
      }).then((attachmentsResponse) => {
        expect(attachmentsResponse.status).to.eq(200)
        expect(attachmentsResponse.body).to.have.property('message')
        expect(attachmentsResponse.body).to.have.property('attachments')
        expect(attachmentsResponse.body.attachments).to.be.an('array')
        cy.log(`Encontrados ${attachmentsResponse.body.attachments.length} anexos`)

        // Verificar estrutura dos anexos (se houver)
        if (attachmentsResponse.body.attachments.length > 0) {
          const attachment = attachmentsResponse.body.attachments[0]
          expect(attachment).to.have.property('id')
          expect(attachment).to.have.property('filename')
          expect(attachment).to.have.property('uploader')
        }
      })
    })
  })

  describe('Cenário 8.5: Deletar anexo', () => {
    it('deve retornar 404 quando anexo não existe', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      // Tentar deletar anexo inexistente
      return ensureToken(testUsers.owner).then((ownerToken) => {
        return deleteAttachment(ownerToken, testStep.id, 999999)
      }).then((deleteResponse) => {
        expect(deleteResponse.status).to.eq(404)
        expect(deleteResponse.body).to.have.property('message')
        cy.log('Erro confirmado: anexo não encontrado')
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testStep.id) {
        cy.log('Step não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/steps/${testStep.id}/attachments/999999`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  // Cleanup
  after(() => {
    cy.log('Testes de fluxo de comentários e anexos concluídos')
    cy.log(`Total de comentários criados: ${createdCommentIds.length}`)
    cy.log(`Total de anexos criados: ${createdAttachmentIds.length}`)
  })
})

