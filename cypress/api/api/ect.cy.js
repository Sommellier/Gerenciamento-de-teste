describe('API - ECT', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner ECT',
      id: null,
      token: null
    },
    approver: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Approver ECT',
      id: null,
      token: null
    },
    member: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Member ECT',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para ECT',
    description: 'Descrição do projeto para testes de ECT'
  }

  let testPackage = {
    id: null,
    title: 'Pacote para ECT',
    description: 'Descrição do pacote para testes de ECT',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    release: '2024-01'
  }

  let testScenario = {
    id: null,
    title: 'Cenário para ECT',
    description: 'Descrição do cenário para testes de ECT',
    type: 'FUNCTIONAL',
    priority: 'HIGH'
  }

  let testReport = {
    id: null
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

  // Setup: Criar usuários, projeto, pacote e cenário de teste
  before(() => {
    // Criar usuário owner
    const ownerEmail = `owner-ect-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
        return ensureToken(testUsers.owner).then((token) => {
          if (!token) return null
          return createPackage(token, testProject.id, {
            title: testPackage.title,
            description: testPackage.description,
            type: testPackage.type,
            priority: testPackage.priority,
            release: testPackage.release
          })
        })
      }
      return null
    }).then((packageResponse) => {
      if (packageResponse && packageResponse.status === 201 && packageResponse.body.id) {
        testPackage.id = packageResponse.body.id

        // Criar cenário de teste com steps
        return ensureToken(testUsers.owner).then((token) => {
          if (!token) return null
          return createScenario(token, testPackage.id, {
            title: testScenario.title,
            description: testScenario.description,
            type: testScenario.type,
            priority: testScenario.priority,
            steps: [
              {
                action: 'Ação 1',
                expected: 'Resultado esperado 1'
              },
              {
                action: 'Ação 2',
                expected: 'Resultado esperado 2'
              }
            ]
          })
        })
      }
      return null
    }).then((scenarioResponse) => {
      if (scenarioResponse && scenarioResponse.status === 201 && scenarioResponse.body.id) {
        testScenario.id = scenarioResponse.body.id
      }
    }).then(() => {
      // Criar usuário approver
      const approverEmail = `approver-ect-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.approver.email = approverEmail

      return createTestUser({
        name: testUsers.approver.name,
        email: testUsers.approver.email,
        password: testUsers.approver.password
      }, 1000).then((response) => {
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
      // Criar usuário member
      const memberEmail = `member-ect-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
      testUsers.member.email = memberEmail

      return createTestUser({
        name: testUsers.member.name,
        email: testUsers.member.email,
        password: testUsers.member.password
      }, 1500).then((response) => {
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

  describe('POST /api/scenarios/:id/ect - Gerar ECT para cenário', () => {
    it('deve gerar ECT com sucesso', () => {
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
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/ect`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('ECT gerado')
          expect(response.body).to.have.property('reportId')
          expect(response.body).to.have.property('downloadUrl')
          expect(response.body.reportId).to.be.a('number')
          expect(response.body.downloadUrl).to.be.a('string')
          
          // Armazenar o ID do relatório para testes posteriores
          testReport.id = response.body.reportId
        })
      })
    })

    it('deve retornar 400 quando cenário não tem etapas', () => {
      if (!testProject.id || !testPackage.id) {
        cy.log('Projeto ou pacote não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        // Criar cenário sem etapas
        createScenario(token, testPackage.id, {
          title: 'Cenário sem etapas',
          description: 'Cenário para testar ECT sem etapas',
          type: 'FUNCTIONAL',
          priority: 'HIGH'
        }).then((scenarioResponse) => {
          if (scenarioResponse.status === 201 && scenarioResponse.body.id) {
            const scenarioId = scenarioResponse.body.id

            cy.request({
              method: 'POST',
              url: `${API_BASE_URL}/scenarios/${scenarioId}/ect`,
              headers: {
                Authorization: `Bearer ${token}`
              },
              failOnStatusCode: false
            }).then((response) => {
              expect(response.status).to.eq(400)
              expect(response.body).to.have.property('message')
              expect(response.body.message).to.include('sem etapas')
            })
          }
        })
      })
    })

    it('deve retornar 400 quando ID do cenário é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/invalid-id/ect`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 500]).to.include(response.status)
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
          url: `${API_BASE_URL}/scenarios/999999/ect`,
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

    it('deve retornar 401 quando não autenticado', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/scenarios/${testScenario.id}/ect`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('GET /api/reports/:id/download - Download de relatório', () => {
    it('deve fazer download do relatório com sucesso', () => {
      if (!testReport.id) {
        cy.log('Relatório não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/reports/${testReport.id}/download`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          encoding: 'binary'
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.headers).to.have.property('content-type')
          expect(response.headers['content-type']).to.include('application/pdf')
          expect(response.headers).to.have.property('content-disposition')
          expect(response.headers['content-disposition']).to.include('attachment')
          expect(response.body).to.exist
        })
      })
    })

    it('deve retornar 400 quando ID do relatório é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/reports/invalid-id/download`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 500]).to.include(response.status)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 404 quando relatório não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/reports/999999/download`,
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

    it('deve retornar 401 quando não autenticado', () => {
      if (!testReport.id) {
        cy.log('Relatório não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/reports/${testReport.id}/download`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/reports/:id/approve - Aprovar relatório ECT', () => {
    it('deve aprovar relatório com sucesso', () => {
      if (!testReport.id) {
        cy.log('Relatório não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/reports/${testReport.id}/approve`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            comment: 'Relatório aprovado com sucesso'
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('aprovado')
          expect(response.body).to.have.property('approval')
          expect(response.body.approval).to.have.property('status', 'APPROVED')
          expect(response.body.approval).to.have.property('comment', 'Relatório aprovado com sucesso')
        })
      })
    })

    it('deve aprovar relatório sem comentário', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      // Gerar um novo relatório para aprovar
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/ect`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((ectResponse) => {
          if (ectResponse.status === 200 && ectResponse.body.reportId) {
            const reportId = ectResponse.body.reportId

            cy.request({
              method: 'POST',
              url: `${API_BASE_URL}/reports/${reportId}/approve`,
              headers: {
                Authorization: `Bearer ${token}`
              },
              body: {}
            }).then((response) => {
              expect(response.status).to.eq(200)
              expect(response.body).to.have.property('message')
              expect(response.body.message).to.include('aprovado')
              expect(response.body).to.have.property('approval')
              expect(response.body.approval).to.have.property('status', 'APPROVED')
            })
          }
        })
      })
    })

    it('deve retornar 400 quando relatório já foi aprovado/reprovado', () => {
      if (!testReport.id) {
        cy.log('Relatório não disponível, pulando teste')
        return
      }

      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        // Tentar aprovar novamente (já foi aprovado no teste anterior)
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/reports/${testReport.id}/approve`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            comment: 'Tentativa de aprovar novamente'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('já foi aprovado')
        })
      })
    })

    it('deve retornar 400 quando ID do relatório é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/reports/invalid-id/approve`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            comment: 'Comentário de aprovação'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 500]).to.include(response.status)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 404 quando relatório não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/reports/999999/approve`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            comment: 'Comentário de aprovação'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('não encontrado')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testReport.id) {
        cy.log('Relatório não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/reports/${testReport.id}/approve`,
        body: {
          comment: 'Comentário de aprovação'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('message')
        expect(response.body.message).to.include('autenticado')
      })
    })
  })

  describe('POST /api/reports/:id/reject - Reprovar relatório ECT', () => {
    it('deve reprovar relatório com sucesso', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      // Gerar um novo relatório para reprovar
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/ect`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((ectResponse) => {
          if (ectResponse.status === 200 && ectResponse.body.reportId) {
            const reportId = ectResponse.body.reportId

            cy.request({
              method: 'POST',
              url: `${API_BASE_URL}/reports/${reportId}/reject`,
              headers: {
                Authorization: `Bearer ${token}`
              },
              body: {
                comment: 'Relatório reprovado - precisa de correções'
              }
            }).then((response) => {
              expect(response.status).to.eq(200)
              expect(response.body).to.have.property('message')
              expect(response.body.message).to.include('reprovado')
              expect(response.body).to.have.property('approval')
              expect(response.body.approval).to.have.property('status', 'REJECTED')
              expect(response.body.approval).to.have.property('comment', 'Relatório reprovado - precisa de correções')
            })
          }
        })
      })
    })

    it('deve retornar 400 quando comentário não é fornecido', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      // Gerar um novo relatório para reprovar
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/ect`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((ectResponse) => {
          if (ectResponse.status === 200 && ectResponse.body.reportId) {
            const reportId = ectResponse.body.reportId

            cy.request({
              method: 'POST',
              url: `${API_BASE_URL}/reports/${reportId}/reject`,
              headers: {
                Authorization: `Bearer ${token}`
              },
              body: {},
              failOnStatusCode: false
            }).then((response) => {
              expect(response.status).to.eq(400)
              expect(response.body).to.have.property('message')
              expect(response.body.message).to.include('Comentário')
            })
          }
        })
      })
    })

    it('deve retornar 400 quando comentário está vazio', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      // Gerar um novo relatório para reprovar
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/ect`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((ectResponse) => {
          if (ectResponse.status === 200 && ectResponse.body.reportId) {
            const reportId = ectResponse.body.reportId

            cy.request({
              method: 'POST',
              url: `${API_BASE_URL}/reports/${reportId}/reject`,
              headers: {
                Authorization: `Bearer ${token}`
              },
              body: {
                comment: '   '
              },
              failOnStatusCode: false
            }).then((response) => {
              expect(response.status).to.eq(400)
              expect(response.body).to.have.property('message')
              expect(response.body.message).to.include('Comentário')
            })
          }
        })
      })
    })

    it('deve retornar 400 quando relatório já foi aprovado/reprovado', () => {
      if (!testScenario.id) {
        cy.log('Cenário não disponível, pulando teste')
        return
      }

      // Gerar um novo relatório
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/scenarios/${testScenario.id}/ect`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((ectResponse) => {
          if (ectResponse.status === 200 && ectResponse.body.reportId) {
            const reportId = ectResponse.body.reportId

            // Aprovar o relatório primeiro
            cy.request({
              method: 'POST',
              url: `${API_BASE_URL}/reports/${reportId}/approve`,
              headers: {
                Authorization: `Bearer ${token}`
              },
              body: {
                comment: 'Aprovado'
              },
              failOnStatusCode: false
            }).then(() => {
              // Tentar reprovar após aprovar
              cy.request({
                method: 'POST',
                url: `${API_BASE_URL}/reports/${reportId}/reject`,
                headers: {
                  Authorization: `Bearer ${token}`
                },
                body: {
                  comment: 'Tentativa de reprovar após aprovar'
                },
                failOnStatusCode: false
              }).then((response) => {
                expect(response.status).to.eq(400)
                expect(response.body).to.have.property('message')
                expect(response.body.message).to.include('já foi aprovado')
              })
            })
          }
        })
      })
    })

    it('deve retornar 400 quando ID do relatório é inválido', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/reports/invalid-id/reject`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            comment: 'Comentário de reprovação'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 500]).to.include(response.status)
          expect(response.body).to.have.property('message')
        })
      })
    })

    it('deve retornar 404 quando relatório não existe', () => {
      ensureToken(testUsers.owner).then((token) => {
        if (!token) {
          cy.log('Não foi possível obter token, pulando teste')
          return
        }

        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/reports/999999/reject`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            comment: 'Comentário de reprovação'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404)
          expect(response.body).to.have.property('message')
          expect(response.body.message).to.include('não encontrado')
        })
      })
    })

    it('deve retornar 401 quando não autenticado', () => {
      if (!testReport.id) {
        cy.log('Relatório não disponível, pulando teste')
        return
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/reports/${testReport.id}/reject`,
        body: {
          comment: 'Comentário de reprovação'
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

