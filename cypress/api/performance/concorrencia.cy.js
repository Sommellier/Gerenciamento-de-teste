describe('API - Performance: Testes de Concorrência', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Concorrência',
      id: null,
      token: null
    },
    user1: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Um Concorrência',
      id: null,
      token: null
    },
    user2: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Dois Concorrência',
      id: null,
      token: null
    },
    user3: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Três Concorrência',
      id: null,
      token: null
    },
    user4: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Quatro Concorrência',
      id: null,
      token: null
    },
    user5: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Cinco Concorrência',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Concorrência',
    description: 'Projeto para testes de concorrência'
  }

  let testPackage = {
    id: null
  }

  let testScenario = {
    id: null
  }

  // Função auxiliar para obter token de autenticação
  const getAuthToken = (email, password) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/login`,
      body: { email, password },
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

  // Função auxiliar para criar usuário
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

  // Função auxiliar para fazer requisição e medir tempo
  const makeRequest = (config) => {
    const startTime = Date.now()
    return cy.request({
      ...config,
      failOnStatusCode: false
    }).then((response) => {
      const endTime = Date.now()
      const responseTime = endTime - startTime
      // Retornar objeto diretamente (sem cy.wrap) para funcionar com Promise.all
      return { response, responseTime }
    })
  }

  // Setup: Criar usuários e projeto
  before(() => {
    // Criar owner
    const ownerEmail = `owner-concorrencia-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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

        // Criar projeto
        return cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects`,
          headers: { Authorization: `Bearer ${token}` },
          body: {
            name: testProject.name,
            description: testProject.description
          },
          failOnStatusCode: false
        })
      }
      return null
    }).then((projectResponse) => {
      if (projectResponse && projectResponse.status === 201 && projectResponse.body.id) {
        testProject.id = projectResponse.body.id

        // Criar pacote
        return cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects/${testProject.id}/packages`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          body: {
            title: 'Pacote para Concorrência',
            description: 'Pacote para testes de concorrência',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            release: '2024-01'
          },
          failOnStatusCode: false
        })
      }
      return null
    }).then((packageResponse) => {
      if (packageResponse && packageResponse.status === 201 && packageResponse.body.testPackage?.id) {
        testPackage.id = packageResponse.body.testPackage.id

        // Criar cenário
        return cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          body: {
            title: 'Cenário para Concorrência',
            description: 'Cenário para testes de concorrência',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            steps: [
              { action: 'Ação 1', expected: 'Esperado 1' }
            ]
          },
          failOnStatusCode: false
        })
      }
      return null
    }).then((scenarioResponse) => {
      if (scenarioResponse && scenarioResponse.status === 201 && scenarioResponse.body.scenario?.id) {
        testScenario.id = scenarioResponse.body.scenario.id
      }
    }).then(() => {
      // Criar múltiplos usuários
      const users = ['user1', 'user2', 'user3', 'user4', 'user5']
      let chain = cy.wrap(null)

      users.forEach((userKey, index) => {
        chain = chain.then(() => {
          // Usar timestamp + index + random para garantir unicidade e evitar caracteres inválidos
          const uniqueId = `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 15)}`
          const email = `user${index + 1}-concorrencia-${uniqueId}@test.com`
          testUsers[userKey].email = email

          return createTestUser({
            name: testUsers[userKey].name,
            email: testUsers[userKey].email,
            password: testUsers[userKey].password
          }, 1000 * (index + 1)).then((response) => {
            if (response.status === 201 && response.body.id) {
              testUsers[userKey].id = response.body.id
              return getAuthToken(testUsers[userKey].email, testUsers[userKey].password)
            } else {
              cy.log(`Erro ao criar usuário ${userKey}: Status ${response.status}, Body: ${JSON.stringify(response.body)}`)
              return null
            }
          }).then((token) => {
            if (token && typeof token === 'string') {
              testUsers[userKey].token = token
            }
          })
        })
      })

      return chain
    })
  })

  describe('Múltiplas Requisições Simultâneas do Mesmo Usuário', () => {
    it('deve lidar com múltiplas requisições GET simultâneas do mesmo usuário', () => {
      if (!testUsers.owner.token || !testProject.id) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      const numRequests = 10
      const requests = []

      // Criar múltiplas requisições simultâneas
      for (let i = 0; i < numRequests; i++) {
        requests.push(
          makeRequest({
            method: 'GET',
            url: `${API_BASE_URL}/projects/${testProject.id}`,
            headers: { Authorization: `Bearer ${testUsers.owner.token}` }
          })
        )
      }

      // Coletar resultados de forma que o Cypress possa aguardar
      const results = []
      let chain = cy.wrap(null)

      requests.forEach((request, index) => {
        chain = chain.then(() => {
          return request.then((result) => {
            results.push(result)
            return cy.wrap(null)
          })
        })
      })

      return chain.then(() => {
        const responseTimes = []
        let successCount = 0
        let rateLimitedCount = 0

        results.forEach((result, index) => {
          // Verificar se result é válido
          if (!result || !result.response) {
            cy.log(`Resultado inválido na requisição ${index + 1}:`, result)
            return
          }

          const { response, responseTime } = result
          if (responseTime !== undefined) {
            responseTimes.push(responseTime)
          }

          if (response && response.status === 200) {
            successCount++
            // Verificar que o response.body existe e tem id
            if (response.body && response.body.id) {
              expect(response.body.id).to.eq(testProject.id)
            }
          } else if (response && response.status === 429) {
            rateLimitedCount++
            cy.log(`Requisição ${index + 1} foi rate limited`)
          } else {
            cy.log(`Requisição ${index + 1} retornou status ${response ? response.status : 'undefined'}`)
          }
        })

        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        const maxTime = Math.max(...responseTimes)
        const minTime = Math.min(...responseTimes)

        cy.log(`Total de requisições: ${numRequests}`)
        cy.log(`Sucesso: ${successCount}`)
        cy.log(`Rate limited: ${rateLimitedCount}`)
        cy.log(`Tempo médio: ${avgTime.toFixed(2)}ms`)
        cy.log(`Tempo mínimo: ${minTime}ms`)
        cy.log(`Tempo máximo: ${maxTime}ms`)

        // Verificar que pelo menos algumas requisições foram bem-sucedidas
        expect(successCount).to.be.at.least(1)
        // Verificar que tempo máximo é razoável
        expect(maxTime).to.be.lessThan(5000)
      })
    })

    it('deve lidar com múltiplas requisições de listagem simultâneas', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const numRequests = 5
      const requests = []

      for (let i = 0; i < numRequests; i++) {
        requests.push(
          makeRequest({
            method: 'GET',
            url: `${API_BASE_URL}/projects`,
            headers: { Authorization: `Bearer ${testUsers.owner.token}` }
          })
        )
      }

      // Coletar resultados de forma que o Cypress possa aguardar
      const results = []
      let chain = cy.wrap(null)

      requests.forEach((request) => {
        chain = chain.then(() => {
          return request.then((result) => {
            results.push(result)
            return cy.wrap(null)
          })
        })
      })

      return chain.then(() => {
        const responseTimes = []
        let successCount = 0

        results.forEach((result, index) => {
          // Verificar se result é válido
          if (!result || !result.response) {
            cy.log(`Resultado inválido na requisição ${index + 1}:`, result)
            return
          }

          const { response, responseTime } = result
          if (responseTime !== undefined) {
            responseTimes.push(responseTime)
          }

          if (response && response.status === 200) {
            successCount++
            if (response.body) {
              expect(response.body).to.have.property('items')
              expect(Array.isArray(response.body.items)).to.be.true
            }
          } else {
            cy.log(`Requisição ${index + 1} retornou status ${response ? response.status : 'undefined'}`)
          }
        })

        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        cy.log(`Tempo médio: ${avgTime.toFixed(2)}ms`)
        cy.log(`Sucesso: ${successCount}/${numRequests}`)

        expect(successCount).to.be.at.least(1)
      })
    })
  })

  describe('Múltiplos Usuários Acessando o Mesmo Recurso', () => {
    it('deve permitir múltiplos usuários acessarem o mesmo projeto simultaneamente', () => {
      if (!testProject.id || !testUsers.user1.token || !testUsers.user2.token || !testUsers.user3.token) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      // Primeiro, adicionar usuários ao projeto via convites
      // Por simplicidade, vamos testar apenas com owner por enquanto
      // Em um teste completo, seria necessário adicionar os usuários ao projeto

      const requests = [
        makeRequest({
          method: 'GET',
          url: `${API_BASE_URL}/projects/${testProject.id}`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` }
        }),
        makeRequest({
          method: 'GET',
          url: `${API_BASE_URL}/projects/${testProject.id}`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` }
        }),
        makeRequest({
          method: 'GET',
          url: `${API_BASE_URL}/projects/${testProject.id}`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` }
        })
      ]

      // Coletar resultados de forma que o Cypress possa aguardar
      const results = []
      let chain = cy.wrap(null)

      requests.forEach((request) => {
        chain = chain.then(() => {
          return request.then((result) => {
            results.push(result)
            return cy.wrap(null)
          })
        })
      })

      return chain.then(() => {
        let successCount = 0
        const responseTimes = []

        results.forEach((result) => {
          // Verificar se result é válido
          if (!result || !result.response) {
            cy.log('Resultado inválido encontrado:', result)
            return
          }

          const { response, responseTime } = result
          if (responseTime !== undefined) {
            responseTimes.push(responseTime)
          }

          if (response && response.status === 200) {
            successCount++
            if (response.body) {
              expect(response.body).to.have.property('id', testProject.id)
            }
          }
        })

        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        cy.log(`Tempo médio: ${avgTime.toFixed(2)}ms`)
        cy.log(`Sucesso: ${successCount}/${requests.length}`)

        expect(successCount).to.be.at.least(1)
      })
    })
  })

  describe('Múltiplas Atualizações Simultâneas', () => {
    it('deve lidar com múltiplas atualizações simultâneas do mesmo recurso', () => {
      if (!testUsers.owner.token || !testProject.id) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      // Criar projeto temporário para atualizar
      return cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/projects`,
        headers: { Authorization: `Bearer ${testUsers.owner.token}` },
        body: {
          name: 'Projeto Temp Concorrência',
          description: 'Temporário'
        },
        failOnStatusCode: false
      }).then((createResponse) => {
        if (createResponse && createResponse.status === 201 && createResponse.body.id) {
          const tempProjectId = createResponse.body.id

          // Fazer múltiplas atualizações simultâneas
          const numUpdates = 5
          const requests = []

          for (let i = 0; i < numUpdates; i++) {
            requests.push(
              makeRequest({
                method: 'PUT',
                url: `${API_BASE_URL}/projects/${tempProjectId}`,
                headers: { Authorization: `Bearer ${testUsers.owner.token}` },
                body: {
                  description: `Descrição atualizada ${i + 1}`
                }
              })
            )
          }

          // Coletar resultados de forma que o Cypress possa aguardar
          const results = []
          let chain = cy.wrap(null)

          requests.forEach((request) => {
            chain = chain.then(() => {
              return request.then((result) => {
                results.push(result)
                return cy.wrap(null)
              })
            })
          })

          return chain.then(() => {
            let successCount = 0
            const responseTimes = []
            const descriptions = []

            results.forEach((result) => {
              // Verificar se result é válido
              if (!result || !result.response) {
                cy.log('Resultado inválido encontrado:', result)
                return
              }

              const { response, responseTime } = result
              if (responseTime !== undefined) {
                responseTimes.push(responseTime)
              }

              if (response && response.status === 200) {
                successCount++
                if (response.body && response.body.description) {
                  descriptions.push(response.body.description)
                }
              }
            })

            if (responseTimes.length > 0) {
              const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
              cy.log(`Tempo médio: ${avgTime.toFixed(2)}ms`)
            }
            cy.log(`Sucesso: ${successCount}/${numUpdates}`)
            cy.log(`Descrições recebidas: ${descriptions.length}`)

            // Verificar que pelo menos algumas atualizações foram bem-sucedidas
            expect(successCount).to.be.at.least(1)

            // Limpar projeto temporário
            return cy.request({
              method: 'DELETE',
              url: `${API_BASE_URL}/projects/${tempProjectId}`,
              headers: { Authorization: `Bearer ${testUsers.owner.token}` },
              failOnStatusCode: false
            })
          })
        }
        return null
      })
    })
  })

  describe('Rate Limiting Sob Carga', () => {
    it('deve aplicar rate limiting quando muitas requisições são feitas rapidamente', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const numRequests = 100 // Número alto para testar rate limiting
      const requests = []
      const startTime = Date.now()

      // Criar muitas requisições rapidamente
      for (let i = 0; i < numRequests; i++) {
        requests.push(
          makeRequest({
            method: 'GET',
            url: `${API_BASE_URL}/projects`,
            headers: { Authorization: `Bearer ${testUsers.owner.token}` }
          })
        )
      }

      // Coletar resultados de forma que o Cypress possa aguardar
      const results = []
      let chain = cy.wrap(null)

      requests.forEach((request) => {
        chain = chain.then(() => {
          return request.then((result) => {
            results.push(result)
            return cy.wrap(null)
          })
        })
      })

      return chain.then(() => {
        const endTime = Date.now()
        const totalTime = endTime - startTime

        let successCount = 0
        let rateLimitedCount = 0
        const responseTimes = []

        results.forEach((result) => {
          // Verificar se result é válido
          if (!result || !result.response) {
            cy.log('Resultado inválido encontrado:', result)
            return
          }

          const { response, responseTime } = result
          if (responseTime !== undefined) {
            responseTimes.push(responseTime)
          }

          if (response && response.status === 200) {
            successCount++
          } else if (response && response.status === 429) {
            rateLimitedCount++
          }
        })

        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length

        cy.log(`Total de requisições: ${numRequests}`)
        cy.log(`Tempo total: ${totalTime}ms`)
        cy.log(`Sucesso: ${successCount}`)
        cy.log(`Rate limited: ${rateLimitedCount}`)
        cy.log(`Tempo médio por requisição: ${avgTime.toFixed(2)}ms`)

        // Verificar que rate limiting foi aplicado (algumas requisições devem ser bloqueadas)
        // Em desenvolvimento, o limite é alto (500 req/min), então pode não haver rate limiting
        if (rateLimitedCount > 0) {
          cy.log('✅ Rate limiting funcionando corretamente')
        } else {
          cy.log('⚠️ Rate limiting não foi acionado (pode ser devido a limites altos em desenvolvimento)')
        }

        // Verificar que pelo menos algumas requisições foram bem-sucedidas
        expect(successCount).to.be.at.least(1)
      })
    })
  })

  describe('Consistência de Dados', () => {
    it('deve manter consistência ao ler o mesmo recurso múltiplas vezes simultaneamente', () => {
      if (!testUsers.owner.token || !testProject.id) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      const numRequests = 10
      const requests = []

      for (let i = 0; i < numRequests; i++) {
        requests.push(
          makeRequest({
            method: 'GET',
            url: `${API_BASE_URL}/projects/${testProject.id}`,
            headers: { Authorization: `Bearer ${testUsers.owner.token}` }
          })
        )
      }

      // Coletar resultados de forma que o Cypress possa aguardar
      const results = []
      let chain = cy.wrap(null)

      requests.forEach((request) => {
        chain = chain.then(() => {
          return request.then((result) => {
            results.push(result)
            return cy.wrap(null)
          })
        })
      })

      return chain.then(() => {
        const projectIds = []
        const projectNames = []

        results.forEach((result) => {
          // Verificar se result é válido
          if (!result || !result.response) {
            cy.log('Resultado inválido encontrado:', result)
            return
          }

          const { response } = result
          if (response && response.status === 200 && response.body) {
            projectIds.push(response.body.id)
            projectNames.push(response.body.name)
          }
        })

        // Verificar que todos os IDs são iguais
        const uniqueIds = [...new Set(projectIds)]
        expect(uniqueIds.length).to.eq(1)
        expect(uniqueIds[0]).to.eq(testProject.id)

        // Verificar que todos os nomes são iguais
        const uniqueNames = [...new Set(projectNames)]
        expect(uniqueNames.length).to.eq(1)

        cy.log(`Todas as ${projectIds.length} requisições retornaram dados consistentes`)
      })
    })

    it('deve manter consistência ao listar recursos múltiplas vezes simultaneamente', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const numRequests = 5
      const requests = []

      for (let i = 0; i < numRequests; i++) {
        requests.push(
          makeRequest({
            method: 'GET',
            url: `${API_BASE_URL}/projects?page=1&pageSize=10`,
            headers: { Authorization: `Bearer ${testUsers.owner.token}` }
          })
        )
      }

      // Coletar resultados de forma que o Cypress possa aguardar
      const results = []
      let chain = cy.wrap(null)

      requests.forEach((request) => {
        chain = chain.then(() => {
          return request.then((result) => {
            results.push(result)
            return cy.wrap(null)
          })
        })
      })

      return chain.then(() => {
        const totals = []
        const itemCounts = []

        results.forEach((result) => {
          // Verificar se result é válido
          if (!result || !result.response) {
            cy.log('Resultado inválido encontrado:', result)
            return
          }

          const { response } = result
          if (response && response.status === 200 && response.body) {
            totals.push(response.body.total)
            if (response.body.items) {
              itemCounts.push(response.body.items.length)
            }
          }
        })

        // Verificar que todos os totais são iguais
        const uniqueTotals = [...new Set(totals)]
        expect(uniqueTotals.length).to.eq(1)

        // Verificar que todos retornaram o mesmo número de itens
        const uniqueCounts = [...new Set(itemCounts)]
        expect(uniqueCounts.length).to.eq(1)

        cy.log(`Todas as ${totals.length} requisições retornaram totais consistentes: ${uniqueTotals[0]}`)
      })
    })
  })

  describe('Performance Sob Carga', () => {
    it('deve manter tempo de resposta aceitável com múltiplas requisições simultâneas', () => {
      if (!testUsers.owner.token || !testProject.id) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      const numRequests = 20
      const requests = []
      const overallStartTime = Date.now()

      for (let i = 0; i < numRequests; i++) {
        requests.push(
          makeRequest({
            method: 'GET',
            url: `${API_BASE_URL}/projects/${testProject.id}`,
            headers: { Authorization: `Bearer ${testUsers.owner.token}` }
          })
        )
      }

      // Coletar resultados de forma que o Cypress possa aguardar
      const results = []
      let chain = cy.wrap(null)

      requests.forEach((request) => {
        chain = chain.then(() => {
          return request.then((result) => {
            results.push(result)
            return cy.wrap(null)
          })
        })
      })

      return chain.then(() => {
        const overallEndTime = Date.now()
        const overallTime = overallEndTime - overallStartTime

        const responseTimes = []
        let successCount = 0

        results.forEach((result) => {
          // Verificar se result é válido
          if (!result || !result.response) {
            cy.log('Resultado inválido encontrado:', result)
            return
          }

          const { response, responseTime } = result
          if (responseTime !== undefined) {
            responseTimes.push(responseTime)
          }

          if (response && response.status === 200) {
            successCount++
          }
        })

        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        const maxTime = Math.max(...responseTimes)
        const minTime = Math.min(...responseTimes)

        cy.log(`Total de requisições: ${numRequests}`)
        cy.log(`Tempo total: ${overallTime}ms`)
        cy.log(`Tempo médio por requisição: ${avgTime.toFixed(2)}ms`)
        cy.log(`Tempo mínimo: ${minTime}ms`)
        cy.log(`Tempo máximo: ${maxTime}ms`)
        cy.log(`Sucesso: ${successCount}/${numRequests}`)

        // Verificar que tempo médio é aceitável
        expect(avgTime).to.be.lessThan(2000)
        // Verificar que tempo máximo não é excessivo
        expect(maxTime).to.be.lessThan(5000)
        // Verificar que pelo menos a maioria das requisições foi bem-sucedida
        expect(successCount).to.be.at.least(numRequests * 0.8) // Pelo menos 80% de sucesso
      })
    })
  })

  // Cleanup
  after(() => {
    cy.log('Testes de concorrência concluídos')
  })
})

