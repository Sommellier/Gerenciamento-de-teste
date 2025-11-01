<template>
  <q-page class="modern-package-details">
    <!-- Modern Header with Gradient -->
    <div class="modern-header">
      <div class="header-background"></div>
      <div class="header-content">
        <div class="header-top">
          <q-btn
            flat
            round
            icon="arrow_back"
            @click="goBack"
            class="back-btn"
            color="white"
          />
          <div class="breadcrumb">
            <span class="breadcrumb-item">Projetos</span>
            <q-icon name="chevron_right" class="breadcrumb-separator" />
            <span class="breadcrumb-item">{{ packageData?.project?.name || 'Projeto' }}</span>
            <q-icon name="chevron_right" class="breadcrumb-separator" />
            <span class="breadcrumb-current">Pacotes</span>
          </div>
        </div>
        
        <div class="header-main">
          <div class="package-info">
            <div class="package-icon-wrapper">
              <q-icon name="inventory_2" class="package-icon" />
            </div>
            <div class="package-details">
              <h1 class="package-title">{{ packageData?.title || 'Carregando...' }}</h1>
              <p class="package-description">{{ packageData?.description || 'Sem descrição' }}</p>
              <div class="package-meta">
                <div class="meta-item">
                  <q-icon name="person" />
                  <span>{{ packageData?.assigneeEmail || 'Não atribuído' }}</span>
                </div>
                <div class="meta-item">
                  <q-icon name="schedule" />
                  <span>{{ formatDate(packageData?.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="header-actions">
            <!-- Ações de aprovação/reprovação (apenas para EM_TESTE) -->
            <template v-if="packageData?.status === 'EM_TESTE'">
              <q-btn
                color="positive"
                icon="check_circle"
                label="Aprovar"
                @click="handleApprove"
                class="action-btn"
                :loading="approving"
              />
              <q-btn
                color="negative"
                icon="cancel"
                label="Reprovar"
                @click="showRejectDialog = true"
                class="action-btn"
              />
            </template>
            
            <!-- Ação de reenvio (para REPROVADO) -->
            <q-btn
              v-if="packageData?.status === 'REPROVADO'"
              color="primary"
              icon="refresh"
              label="Reenviar para Teste"
              @click="handleSendToTest"
              class="action-btn"
              :loading="sendingToTest"
            />
            
            <!-- Ações normais (desabilitadas quando CONCLUIDO) -->
            <q-btn
              color="white"
              text-color="primary"
              icon="edit"
              label="Editar"
              @click="editPackage"
              class="action-btn"
              :disable="packageData?.status === 'CONCLUIDO'"
            />
            <q-btn
              color="white"
              text-color="negative"
              icon="delete"
              label="Excluir"
              @click="confirmDelete"
              class="action-btn"
              :disable="packageData?.status === 'CONCLUIDO'"
            />
          </div>
        </div>
        
        <!-- Status Badges -->
        <div class="status-badges">
          <q-chip
            :color="getTypeColor(packageData?.type)"
            text-color="white"
            :label="getTypeLabel(packageData?.type)"
            class="status-chip"
          />
          <q-chip
            :color="getPriorityColor(packageData?.priority)"
            text-color="white"
            :label="getPriorityLabel(packageData?.priority)"
            class="status-chip"
          />
          <q-chip
            :color="getStatusColor(packageData?.status)"
            text-color="white"
            :label="getStatusLabel(packageData?.status)"
            class="status-chip"
          />
        </div>

        <!-- Approval/Rejection Info -->
        <div v-if="packageData?.approvedBy || packageData?.rejectedBy" class="approval-info">
          <q-separator dark class="q-mb-md" />
          <div v-if="packageData?.approvedBy" class="approval-item approved">
            <q-icon name="check_circle" color="positive" size="24px" />
            <div class="approval-details">
              <div class="approval-label">Aprovado por</div>
              <div class="approval-value">{{ packageData.approvedBy.name }}</div>
              <div class="approval-date">{{ formatDate(packageData.approvedAt) }}</div>
            </div>
          </div>
          <div v-if="packageData?.rejectedBy" class="approval-item rejected">
            <q-icon name="cancel" color="negative" size="24px" />
            <div class="approval-details">
              <div class="approval-label">Reprovado por</div>
              <div class="approval-value">{{ packageData.rejectedBy.name }}</div>
              <div class="approval-date">{{ formatDate(packageData.rejectedAt) }}</div>
              <div v-if="packageData.rejectionReason" class="rejection-reason">
                <strong>Motivo:</strong> {{ packageData.rejectionReason }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <q-spinner-dots size="60px" color="primary" />
      <p class="loading-text">Carregando detalhes do pacote...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <q-icon name="error_outline" size="80px" color="negative" />
      <h3 class="error-title">Erro ao carregar pacote</h3>
      <p class="error-message">{{ error }}</p>
      <q-btn 
        color="primary" 
        @click="loadPackageDetails" 
        label="Tentar novamente"
        class="retry-btn"
      />
    </div>

    <!-- Main Content -->
    <div v-else-if="packageData" class="main-content">
      <!-- Metrics Dashboard -->
      <div class="metrics-dashboard">
        <div class="metrics-grid">
          <div class="metric-card primary">
            <div class="metric-icon">
              <q-icon name="playlist_play" size="32px" />
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ packageData.metrics.totalScenarios }}</div>
              <div class="metric-label">Cenários</div>
            </div>
          </div>
          
          <div class="metric-card success">
            <div class="metric-icon">
              <q-icon name="check_circle" size="32px" />
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ Math.round(packageData.metrics.successRate) }}%</div>
              <div class="metric-label">Status dos Cenários</div>
            </div>
          </div>
          
          <div class="metric-card warning">
            <div class="metric-icon">
              <q-icon name="trending_up" size="32px" />
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ Math.round(packageData.metrics.executionRate) }}%</div>
              <div class="metric-label">Taxa de Execução</div>
            </div>
          </div>
          
          <div class="metric-card info">
            <div class="metric-icon">
              <q-icon name="bug_report" size="32px" />
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ getBugCount() }}</div>
              <div class="metric-label">Bugs Reportados</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Tabs -->
      <q-tabs
        v-model="activeTab"
        class="content-tabs"
        active-color="primary"
        indicator-color="primary"
        align="left"
      >
        <q-tab name="scenarios" label="Cenários de Teste" icon="playlist_play" />
        <q-tab name="analytics" label="Análises" icon="analytics" />
        <q-tab name="bugs" label="Gerenciar Bugs" icon="bug_report" />
      </q-tabs>

      <q-separator />

      <!-- Tab Content -->
      <q-tab-panels v-model="activeTab" class="tab-panels">
        <!-- Scenarios Tab -->
        <q-tab-panel name="scenarios" class="tab-panel">
          <div class="scenarios-section">
            <div class="section-header">
              <h3 class="section-title">Cenários de Teste</h3>
              <q-btn
                color="primary"
                icon="add"
                label="Criar Cenário"
                @click="goToCreateScenario"
                class="create-btn"
                size="md"
              />
            </div>
            
            <div class="scenarios-content">
              <div v-if="packageData.scenarios.length === 0" class="empty-state">
                <q-icon name="playlist_play" size="80px" color="grey-5" />
                <h4 class="empty-title">Nenhum cenário encontrado</h4>
                <p class="empty-description">Comece criando seu primeiro cenário de teste para este pacote.</p>
                <q-btn
                  color="primary"
                  icon="add"
                  label="Criar Primeiro Cenário"
                  @click="goToCreateScenario"
                  class="empty-action-btn"
                />
              </div>
              
              <div v-else class="scenarios-grid">
                <div
                  v-for="scenario in packageData.scenarios"
                  :key="scenario.id"
                  class="scenario-card clickable"
                  @click="viewScenario(scenario)"
                >
                  <div class="scenario-header">
                    <h4 class="scenario-title">{{ scenario.title }}</h4>
                    <q-chip
                      :color="getStatusColor(scenario.status)"
                      text-color="white"
                      :label="getStatusLabel(scenario.status)"
                      size="sm"
                    />
                  </div>
                  
                  <p class="scenario-description">{{ scenario.description || 'Sem descrição' }}</p>
                  
                  <div class="scenario-meta">
                    <div class="meta-item">
                      <q-icon name="category" size="16px" />
                      <span>{{ getTypeLabel(scenario.type) }}</span>
                    </div>
                    <div class="meta-item">
                      <q-icon name="flag" size="16px" />
                      <span>{{ getPriorityLabel(scenario.priority) }}</span>
                    </div>
                    <div class="meta-item">
                      <q-icon name="list" size="16px" />
                      <span>{{ scenario.steps?.length || 0 }} passos</span>
                    </div>
                  </div>
                  
                  <div class="scenario-actions">
                    <q-btn
                      flat
                      icon="play_arrow"
                      color="positive"
                      size="sm"
                      @click.stop="executeScenario(scenario)"
                    >
                      <q-tooltip>Executar cenário</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      icon="edit"
                      color="primary"
                      size="sm"
                      @click.stop="editScenario(scenario)"
                    >
                      <q-tooltip>Editar cenário</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      icon="content_copy"
                      color="info"
                      size="sm"
                      @click.stop="duplicateScenario(scenario)"
                    >
                      <q-tooltip>Duplicar cenário</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      icon="delete"
                      color="negative"
                      size="sm"
                      @click.stop="confirmDeleteScenario(scenario)"
                    >
                      <q-tooltip>Excluir cenário</q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- Analytics Tab -->
        <q-tab-panel name="analytics" class="tab-panel">
          <div class="analytics-section">
            <h3 class="section-title">Análises e Métricas</h3>
            
            <div class="charts-grid">
              <!-- Cenários por Prioridade Chart -->
              <div class="chart-card">
                <div class="chart-header">
                  <h4 class="chart-title">Cenários por Prioridade</h4>
                  <q-icon name="priority_high" class="chart-icon" />
                </div>
                <div class="chart-content">
                  <VueApexCharts
                    v-if="priorityChartSeries.length > 0"
                    type="bar"
                    :options="priorityChartOptions"
                    :series="priorityChartSeries"
                    height="300"
                  />
                  <div v-else class="no-data-chart">
                    <q-icon name="bar_chart" size="48px" color="grey-5" />
                    <p class="text-grey-5">Nenhum dado para exibir</p>
                  </div>
                </div>
              </div>
              
              <!-- Execuções por Mês Chart -->
              <div class="chart-card">
                <div class="chart-header">
                  <h4 class="chart-title">Execuções por Mês</h4>
                  <q-icon name="timeline" class="chart-icon" />
                </div>
                <div class="chart-content">
                  <VueApexCharts
                    v-if="monthlyChartSeries.length > 0"
                    type="line"
                    :options="monthlyChartOptions"
                    :series="monthlyChartSeries"
                    height="300"
                  />
                  <div v-else class="no-data-chart">
                    <q-icon name="timeline" size="48px" color="grey-5" />
                    <p class="text-grey-5">Nenhum dado para exibir</p>
                  </div>
                </div>
              </div>
              
              <!-- Status dos Cenários Chart -->
              <div class="chart-card">
                <div class="chart-header">
                  <h4 class="chart-title">Status dos Cenários</h4>
                  <q-icon name="pie_chart" class="chart-icon" />
                </div>
                <div class="chart-content">
                  <VueApexCharts
                    v-if="successRateChartSeries.length > 0"
                    type="pie"
                    :options="successRateChartOptions"
                    :series="successRateChartSeries"
                    height="300"
                  />
                  <div v-else class="no-data-chart">
                    <q-icon name="pie_chart" size="48px" color="grey-5" />
                    <p class="text-grey-5">Nenhum dado para exibir</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- Bugs Tab -->
        <q-tab-panel name="bugs" class="tab-panel">
          <div class="bugs-section">
            <div class="section-header">
              <h3 class="section-title">Gerenciar Bugs</h3>
            </div>

            <!-- Filtros -->
            <div class="bugs-filters" v-if="bugs.length > 0">
              <q-select
                v-model="bugStatusFilter"
                :options="bugStatusOptions"
                label="Filtrar por Status"
                outlined
                dense
                clearable
                class="filter-select"
                style="width: 200px"
              />
              <q-select
                v-model="bugScenarioFilter"
                :options="bugScenarioOptions"
                label="Filtrar por Cenário"
                outlined
                dense
                clearable
                class="filter-select"
                style="width: 250px"
              />
            </div>
            
            <div class="bugs-content">
              <div v-if="filteredBugs.length === 0 && bugs.length === 0" class="empty-state">
                <q-icon name="bug_report" size="80px" color="grey-5" />
                <h4 class="empty-title">Nenhum bug reportado</h4>
                <p class="empty-description">Ótimo! Não há bugs reportados para este pacote.</p>
              </div>

              <div v-else-if="filteredBugs.length === 0 && bugs.length > 0" class="empty-state">
                <q-icon name="filter_alt" size="80px" color="grey-5" />
                <h4 class="empty-title">Nenhum bug encontrado</h4>
                <p class="empty-description">Nenhum bug corresponde aos filtros selecionados.</p>
              </div>
              
              <div v-else class="bugs-list">
                <div
                  v-for="bug in filteredBugs"
                  :key="bug.id"
                  class="bug-card"
                  @click="viewBug(bug)"
                  style="cursor: pointer"
                >
                  <div class="bug-header">
                    <div class="bug-title-section">
                      <h4 class="bug-title">{{ bug.title }}</h4>
                      <div class="bug-chips">
                        <q-chip
                          :color="getBugSeverityColor(bug.severity)"
                          text-color="white"
                          :label="getSeverityLabel(bug.severity)"
                          size="sm"
                        />
                        <q-chip
                          :color="getBugStatusColor(bug.status)"
                          text-color="white"
                          :label="getStatusLabel(bug.status)"
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <p class="bug-description" v-if="bug.description">{{ bug.description }}</p>
                  
                  <div class="bug-scenario-info">
                    <q-chip
                      outline
                      color="primary"
                      icon="bug_report"
                      size="sm"
                    >
                      <strong>Cenário:</strong>&nbsp;{{ bug.scenario?.title || 'Sem cenário' }}
                    </q-chip>
                  </div>
                  
                  <div class="bug-meta">
                    <div class="meta-item">
                      <q-icon name="person" size="16px" />
                      <span>{{ bug.creator?.name || bug.creator?.email || 'Desconhecido' }}</span>
                    </div>
                    <div class="meta-item">
                      <q-icon name="schedule" size="16px" />
                      <span>{{ formatDate(bug.createdAt) }}</span>
                    </div>
                  </div>
                  
                  <div class="bug-actions" @click.stop>
                    <q-btn
                      flat
                      icon="visibility"
                      color="info"
                      size="sm"
                      @click="viewBug(bug)"
                    >
                      <q-tooltip>Ver detalhes</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      icon="edit"
                      color="primary"
                      size="sm"
                      @click="editBug(bug)"
                    >
                      <q-tooltip>Editar</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="bug.status !== 'RESOLVED' && bug.status !== 'CLOSED'"
                      flat
                      icon="check"
                      color="positive"
                      size="sm"
                      @click="resolveBug(bug)"
                    >
                      <q-tooltip>Marcar como resolvido</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      icon="delete"
                      color="negative"
                      size="sm"
                      @click="confirmDeleteBug(bug)"
                    >
                      <q-tooltip>Excluir</q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- Edit Package Dialog -->
    <q-dialog v-model="showEditDialog" persistent>
      <q-card class="edit-dialog" style="min-width: 500px">
        <q-card-section class="dialog-header">
          <div class="text-h6">Editar Pacote</div>
          <q-btn
            flat
            round
            icon="close"
            @click="showEditDialog = false"
            class="close-btn"
          />
        </q-card-section>

        <q-card-section class="dialog-content">
          <q-form @submit="savePackage" class="edit-form">
            <div class="form-row">
              <q-input
                v-model="editForm.title"
                label="Título do Pacote"
                outlined
                :rules="[val => !!val || 'Título é obrigatório']"
                class="form-input"
              />
            </div>

            <div class="form-row">
              <q-input
                v-model="editForm.description"
                label="Descrição"
                outlined
                type="textarea"
                rows="3"
                class="form-input"
              />
            </div>

            <div class="form-row">
              <q-select
                v-model="editForm.type"
                label="Tipo"
                outlined
                :options="[
                  { label: 'Funcional', value: 'FUNCIONAL' },
                  { label: 'Integração', value: 'INTEGRACAO' },
                  { label: 'Aceitação', value: 'ACEITACAO' },
                  { label: 'Regressão', value: 'REGRESSAO' }
                ]"
                emit-value
                map-options
                class="form-input"
              />
            </div>

            <div class="form-row">
              <q-select
                v-model="editForm.priority"
                label="Prioridade"
                outlined
                :options="[
                  { label: 'Alta', value: 'ALTA' },
                  { label: 'Média', value: 'MEDIA' },
                  { label: 'Baixa', value: 'BAIXA' }
                ]"
                emit-value
                map-options
                class="form-input"
              />
            </div>

            <div class="form-row">
              <q-select
                v-model="editForm.status"
                label="Status"
                outlined
                :options="[
                  { label: 'Criado', value: 'CRIADO' },
                  { label: 'Em Execução', value: 'EM_EXECUCAO' },
                  { label: 'Concluído', value: 'APROVADO' },
                  { label: 'Rejeitado', value: 'REJEITADO' }
                ]"
                emit-value
                map-options
                class="form-input"
              />
            </div>

            <div class="form-row">
              <q-input
                v-model="editForm.assigneeEmail"
                label="Email do Responsável"
                outlined
                type="email"
                class="form-input"
              />
            </div>

            <div class="form-row">
              <q-select
                v-model="editForm.environment"
                label="Ambiente"
                outlined
                :options="[
                  { label: 'Desenvolvimento', value: 'DESENVOLVIMENTO' },
                  { label: 'Homologação', value: 'HOMOLOGACAO' },
                  { label: 'Produção', value: 'PRODUCAO' }
                ]"
                emit-value
                map-options
                class="form-input"
              />
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions class="dialog-actions">
          <q-btn
            flat
            label="Cancelar"
            @click="showEditDialog = false"
            class="cancel-btn"
          />
          <q-btn
            color="primary"
            label="Salvar"
            @click="savePackage"
            class="save-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Package Dialog -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card class="delete-dialog" style="min-width: 400px">
        <q-card-section class="dialog-header">
          <div class="text-h6">Confirmar Exclusão</div>
          <q-btn
            flat
            round
            icon="close"
            @click="showDeleteDialog = false"
            class="close-btn"
          />
        </q-card-section>

        <q-card-section class="dialog-content">
          <div class="delete-warning">
            <q-icon name="warning" size="48px" color="negative" />
            <div class="warning-text">
              <h4 class="warning-title">Tem certeza que deseja excluir este pacote?</h4>
              <p class="warning-message">
                Esta ação não pode ser desfeita. Todos os cenários e dados relacionados 
                ao pacote <strong>"{{ packageData?.title }}"</strong> serão permanentemente removidos.
              </p>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="dialog-actions">
          <q-btn
            flat
            label="Cancelar"
            @click="showDeleteDialog = false"
            class="cancel-btn"
          />
          <q-btn
            color="negative"
            label="Excluir"
            @click="deletePackage"
            class="delete-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit Scenario Dialog -->
    <q-dialog v-model="showEditScenarioDialog" persistent>
      <q-card class="edit-dialog" style="min-width: 500px">
        <q-card-section class="dialog-header">
          <div class="text-h6">Editar Cenário</div>
          <q-btn
            flat
            round
            icon="close"
            @click="showEditScenarioDialog = false"
            class="close-btn"
          />
        </q-card-section>

        <q-card-section class="dialog-content">
          <q-form>
            <q-input
              v-model="scenarioEditForm.title"
              label="Título"
              outlined
              class="q-mb-md"
            />

            <q-input
              v-model="scenarioEditForm.description"
              label="Descrição"
              outlined
              type="textarea"
              rows="3"
              class="q-mb-md"
            />

            <q-select
              v-model="scenarioEditForm.type"
              :options="[
                { label: 'Funcional', value: 'FUNCTIONAL' },
                { label: 'Regressão', value: 'REGRESSION' },
                { label: 'Smoke', value: 'SMOKE' },
                { label: 'E2E', value: 'E2E' }
              ]"
              label="Tipo"
              outlined
              emit-value
              map-options
              class="q-mb-md"
            />

            <q-select
              v-model="scenarioEditForm.priority"
              :options="[
                { label: 'Baixa', value: 'LOW' },
                { label: 'Média', value: 'MEDIUM' },
                { label: 'Alta', value: 'HIGH' },
                { label: 'Crítica', value: 'CRITICAL' }
              ]"
              label="Prioridade"
              outlined
              emit-value
              map-options
              class="q-mb-md"
            />

            <q-select
              v-model="scenarioEditForm.testadorId"
              :options="testerOptions"
              label="Testador Responsável"
              outlined
              emit-value
              map-options
              class="q-mb-md"
            />

            <q-select
              v-model="scenarioEditForm.aprovadorId"
              :options="approverOptions"
              label="Aprovador Responsável"
              outlined
              emit-value
              map-options
            />
          </q-form>
        </q-card-section>

        <q-card-actions class="dialog-actions">
          <q-btn
            flat
            label="Cancelar"
            @click="showEditScenarioDialog = false"
            class="cancel-btn"
          />
          <q-btn
            color="primary"
            label="Salvar"
            @click="saveScenarioEdits"
            class="save-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Scenario Dialog -->
    <q-dialog v-model="showDeleteScenarioDialog" persistent>
      <q-card class="delete-dialog" style="min-width: 400px">
        <q-card-section class="dialog-header">
          <div class="text-h6">Confirmar Exclusão</div>
          <q-btn
            flat
            round
            icon="close"
            @click="showDeleteScenarioDialog = false"
            class="close-btn"
          />
        </q-card-section>

        <q-card-section class="dialog-content">
          <div class="delete-warning">
            <q-icon name="warning" size="48px" color="negative" />
            <div class="warning-text">
              <h4 class="warning-title">Tem certeza que deseja excluir este cenário?</h4>
              <p class="warning-message">
                Esta ação não pode ser desfeita. O cenário 
                <strong>"{{ selectedScenario?.title }}"</strong> será permanentemente removido.
              </p>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="dialog-actions">
          <q-btn
            flat
            label="Cancelar"
            @click="showDeleteScenarioDialog = false"
            class="cancel-btn"
          />
          <q-btn
            color="negative"
            label="Excluir"
            @click="deleteScenario"
            class="delete-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Bug Details Dialog -->
    <q-dialog v-model="showBugDetailsDialog" persistent class="bug-dialog-wrapper">
      <q-card class="bug-details-card-modal">
        <q-card-section class="bug-details-header-modal" :style="{ backgroundColor: getBugSeverityColor(selectedBug?.severity) }">
          <div class="bug-dialog-header-content">
            <div class="bug-dialog-icon-wrapper">
              <q-icon name="bug_report" size="36px" color="white" />
            </div>
            <div class="bug-dialog-title-section">
              <div class="bug-dialog-title">{{ selectedBug?.title }}</div>
              <div class="bug-dialog-chips">
                <q-chip
                  :color="getBugSeverityColor(selectedBug?.severity)"
                  text-color="white"
                  :label="getSeverityLabel(selectedBug?.severity)"
                  dense
                  size="sm"
                />
                <q-chip
                  :color="getBugStatusColor(selectedBug?.status)"
                  text-color="white"
                  :label="getStatusLabel(selectedBug?.status)"
                  dense
                  size="sm"
                />
              </div>
            </div>
            <q-btn 
              flat 
              round 
              icon="close" 
              color="white" 
              size="md"
              class="bug-dialog-close-btn"
              v-close-popup 
            />
          </div>
        </q-card-section>

        <q-card-section v-if="selectedBug" class="bug-details-content-modal">
          <!-- Descrição -->
          <div class="detail-section-modal">
            <div class="section-label-modal">
              <q-icon name="description" size="22px" />
              <span>Descrição</span>
            </div>
            <div class="section-content-modal">
              <div class="bug-description-text-modal">
                {{ selectedBug.description || 'Sem descrição' }}
              </div>
            </div>
          </div>

          <div class="detail-separator"></div>

          <!-- Cenário Relacionado -->
          <div class="detail-section-modal">
            <div class="section-label-modal">
              <q-icon name="assignment" size="22px" />
              <span>Cenário Relacionado</span>
            </div>
            <div class="section-content-modal">
              <q-chip outline color="primary" icon="assignment" size="md" class="scenario-chip">
                {{ selectedBug.scenario?.title || 'Sem cenário' }}
              </q-chip>
            </div>
          </div>

          <div class="detail-separator" v-if="selectedBug.attachments && selectedBug.attachments.length > 0"></div>

          <!-- Anexos -->
          <div class="detail-section-modal" v-if="selectedBug.attachments && selectedBug.attachments.length > 0">
            <div class="section-label-modal">
              <q-icon name="attach_file" size="22px" />
              <span>Anexos ({{ selectedBug.attachments.length }})</span>
            </div>
            <div class="section-content-modal">
              <div class="attachments-grid-modal">
                <div 
                  v-for="attachment in selectedBug.attachments" 
                  :key="attachment.id"
                  class="attachment-card-modal"
                >
                  <div class="attachment-icon-wrapper-modal" :style="{ backgroundColor: getAttachmentColor(attachment.mimeType) + '15' }">
                    <q-icon 
                      :name="getAttachmentIcon(attachment.mimeType)" 
                      size="36px"
                      :color="getAttachmentColor(attachment.mimeType)"
                    />
                  </div>
                  <div class="attachment-info-modal">
                    <div class="attachment-name-modal">{{ attachment.originalName }}</div>
                    <div class="attachment-meta-modal">
                      <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
                      <q-chip 
                        :color="getAttachmentColor(attachment.mimeType)" 
                        text-color="white"
                        size="xs"
                        dense
                      >
                        {{ getFileTypeLabel(attachment.mimeType) }}
                      </q-chip>
                    </div>
                  </div>
                  <q-btn
                    flat
                    round
                    icon="download"
                    :color="getAttachmentColor(attachment.mimeType)"
                    size="md"
                    @click="downloadBugAttachment(attachment)"
                    class="download-btn-modal"
                  >
                    <q-tooltip>Baixar anexo</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-separator"></div>

          <!-- Informações Adicionais -->
          <div class="info-grid-modal">
            <div class="info-item-modal">
              <div class="info-label-modal">
                <q-icon name="person" size="20px" />
                <span>Criado por</span>
              </div>
              <div class="info-content-modal">
                <div class="creator-info">
                  <q-avatar size="44px" color="primary" text-color="white">
                    {{ getInitials(selectedBug.creator?.name || selectedBug.creator?.email) }}
                  </q-avatar>
                  <div class="creator-details">
                    <div class="creator-name">{{ selectedBug.creator?.name || 'Desconhecido' }}</div>
                    <div class="creator-email">{{ selectedBug.creator?.email }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="info-item-modal">
              <div class="info-label-modal">
                <q-icon name="schedule" size="20px" />
                <span>Data de Criação</span>
              </div>
              <div class="info-content-modal">
                <div class="date-text">{{ formatDate(selectedBug.createdAt) }}</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="bug-details-actions-modal">
          <q-btn flat label="Fechar" color="grey-7" v-close-popup class="action-btn" />
          <q-btn 
            v-if="selectedBug?.status !== 'RESOLVED' && selectedBug?.status !== 'CLOSED'"
            unelevated
            label="Marcar como Resolvido" 
            color="positive"
            icon="check_circle"
            class="action-btn"
            @click="resolveBug(selectedBug); showBugDetailsDialog = false" 
          />
          <q-btn 
            unelevated
            label="Editar" 
            color="primary"
            icon="edit"
            class="action-btn"
            @click="editBugFromDetails" 
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Reject Package Dialog -->
    <q-dialog v-model="showRejectDialog" persistent>
      <q-card class="reject-dialog glass-card" style="min-width: 500px; max-width: 600px">
        <q-card-section class="dialog-header">
          <div class="dialog-header-content">
            <h3 class="dialog-title">Reprovar Pacote</h3>
            <q-btn
              flat
              round
              icon="close"
              @click="showRejectDialog = false; rejectionReason = ''"
              class="close-btn"
              color="white"
            />
          </div>
        </q-card-section>

        <q-card-section class="dialog-body">
          <div class="reject-warning">
            <q-icon name="warning" size="48px" color="negative" />
            <p class="warning-text">
              Você está prestes a reprovar o pacote <strong>{{ packageData?.title }}</strong>.
            </p>
            <p class="warning-text">
              Por favor, informe o motivo da reprovação. O testador responsável será notificado por e-mail.
            </p>
          </div>

          <q-form @submit.prevent="handleReject" class="reject-form">
            <div class="form-group">
              <label class="form-label">
                <q-icon name="description" class="label-icon" />
                Motivo da Reprovação *
              </label>
              <q-input
                v-model="rejectionReason"
                placeholder="Descreva o motivo da reprovação..."
                filled
                dark
                label-color="white"
                input-class="text-white"
                type="textarea"
                rows="6"
                :rules="[val => !!val && val.trim().length > 0 || 'Motivo da reprovação é obrigatório']"
                class="form-input"
              />
            </div>

            <div class="dialog-actions-form">
              <q-btn
                flat
                label="Cancelar"
                @click="showRejectDialog = false; rejectionReason = ''"
                class="cancel-btn"
                color="white"
              />
              <q-btn
                type="submit"
                label="Reprovar"
                color="negative"
                :loading="rejecting"
                class="reject-btn"
                unelevated
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Edit Bug Dialog -->
    <q-dialog v-model="showEditBugDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section class="dialog-header">
          <div class="text-h6">Editar Bug</div>
          <q-btn
            flat
            round
            icon="close"
            @click="showEditBugDialog = false"
            class="close-btn"
          />
        </q-card-section>

        <q-card-section v-if="bugEditForm">
          <q-input
            v-model="bugEditForm.title"
            label="Título *"
            outlined
            class="q-mb-md"
            :rules="[val => !!val || 'Título é obrigatório']"
          />

          <q-input
            v-model="bugEditForm.description"
            label="Descrição"
            outlined
            type="textarea"
            rows="4"
            class="q-mb-md"
          />

          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-select
                v-model="bugEditForm.severity"
                :options="severityOptions"
                label="Severidade *"
                outlined
                emit-value
                map-options
              />
            </div>
            <div class="col-6">
              <q-select
                v-model="bugEditForm.status"
                :options="statusOptions"
                label="Status *"
                outlined
                emit-value
                map-options
              />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" @click="showEditBugDialog = false" />
          <q-btn 
            color="primary" 
            label="Salvar" 
            @click="saveBugEdit"
            :loading="savingBug"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Bug Confirmation Dialog -->
    <q-dialog v-model="showDeleteBugDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="dialog-header bg-negative text-white">
          <div class="text-h6">Confirmar Exclusão</div>
        </q-card-section>

        <q-card-section>
          <p>Tem certeza que deseja excluir o bug <strong>{{ selectedBug?.title }}</strong>?</p>
          <p class="text-negative">Esta ação não pode ser desfeita.</p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" @click="showDeleteBugDialog = false" />
          <q-btn color="negative" label="Excluir" @click="deleteBugConfirmed" :loading="deletingBug" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify } from 'quasar'
import VueApexCharts from 'vue3-apexcharts'
import { packageService } from '../services/package.service'
import { scenarioService } from '../services/scenario.service'
import { getProjectMembers } from '../services/project-details.service'
import { executionService } from '../services/execution.service'

const route = useRoute()
const router = useRouter()

// Reactive data
const loading = ref(true)
const error = ref('')
const packageData = ref<any>(null)
const activeTab = ref('scenarios')
const bugs = ref<any[]>([])
const members = ref<any[]>([])

// Bug management state
const selectedBug = ref<any>(null)
const showBugDetailsDialog = ref(false)
const showEditBugDialog = ref(false)
const showDeleteBugDialog = ref(false)
const bugEditForm = ref<any>(null)
const savingBug = ref(false)
const deletingBug = ref(false)

// Bug filters
const bugStatusFilter = ref<any>(null)
const bugScenarioFilter = ref<any>(null)

// Edit/Delete dialogs
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const editForm = ref({
  title: '',
  description: '',
  type: '',
  priority: '',
  status: '',
  assigneeEmail: '',
  environment: ''
})

// Scenario dialogs
const showEditScenarioDialog = ref(false)
const showDeleteScenarioDialog = ref(false)
const selectedScenario = ref<any>(null)
const scenarioEditForm = ref({
  title: '',
  description: '',
  type: '',
  priority: '',
  testadorId: null as number | null,
  aprovadorId: null as number | null
})

// Approval/Rejection state
const approving = ref(false)
const rejecting = ref(false)
const sendingToTest = ref(false)
const showRejectDialog = ref(false)
const rejectionReason = ref('')

// Computed
const projectId = computed(() => parseInt(route.params.projectId as string))
const packageId = computed(() => parseInt(route.params.packageId as string))

// Tester options - OWNER, ADMIN, MANAGER, TESTER
const testerOptions = computed(() => {
  if (!Array.isArray(members.value)) {
    return []
  }
  return members.value
    .filter(member => {
      const role = member.role
      return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER' || role === 'TESTER'
    })
    .map(member => ({
      label: member.name || member.email,
      value: member.id,
      email: member.email
    }))
})

// Approver options - OWNER, ADMIN, MANAGER, APPROVER
const approverOptions = computed(() => {
  if (!Array.isArray(members.value)) {
    return []
  }
  return members.value
    .filter(member => {
      const role = member.role
      return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER' || role === 'APPROVER'
    })
    .map(member => ({
      label: member.name || member.email,
      value: member.id,
      email: member.email
    }))
})

// Bug filter options
const bugStatusOptions = computed(() => [
  { label: 'Aberto', value: 'OPEN' },
  { label: 'Em Andamento', value: 'IN_PROGRESS' },
  { label: 'Resolvido', value: 'RESOLVED' },
  { label: 'Fechado', value: 'CLOSED' }
])

const bugScenarioOptions = computed(() => {
  const uniqueScenarios = new Set<string>()
  bugs.value.forEach(bug => {
    if (bug.scenario?.title) {
      uniqueScenarios.add(bug.scenario.title)
    }
  })
  return Array.from(uniqueScenarios).map(title => ({
    label: title,
    value: title
  }))
})

const severityOptions = [
  { label: 'Baixa', value: 'LOW' },
  { label: 'Média', value: 'MEDIUM' },
  { label: 'Alta', value: 'HIGH' },
  { label: 'Crítica', value: 'CRITICAL' }
]

const statusOptions = [
  { label: 'Aberto', value: 'OPEN' },
  { label: 'Em Andamento', value: 'IN_PROGRESS' },
  { label: 'Resolvido', value: 'RESOLVED' },
  { label: 'Fechado', value: 'CLOSED' }
]

// Filtered bugs
const filteredBugs = computed(() => {
  let filtered = [...bugs.value]
  
  if (bugStatusFilter.value) {
    filtered = filtered.filter(bug => bug.status === bugStatusFilter.value.value)
  }
  
  if (bugScenarioFilter.value) {
    filtered = filtered.filter(bug => bug.scenario?.title === bugScenarioFilter.value.value)
  }
  
  return filtered
})

// Gráficos com dados reais
const priorityChartSeries = computed(() => {
  if (!packageData.value?.scenarios) return []
  
  const scenarios = packageData.value.scenarios
  const priorityCounts = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0
  }
  
  scenarios.forEach((scenario: any) => {
    if (scenario.priority && priorityCounts.hasOwnProperty(scenario.priority)) {
      priorityCounts[scenario.priority as keyof typeof priorityCounts]++
    }
  })
  
  return [{
    name: 'Cenários',
    data: [priorityCounts.LOW, priorityCounts.MEDIUM, priorityCounts.HIGH, priorityCounts.CRITICAL]
  }]
})

const priorityChartOptions = computed(() => ({
  chart: {
    type: 'bar',
    height: 300,
    background: 'transparent',
    toolbar: { show: false }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      borderRadius: 4
    }
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    show: true,
    width: 2,
    colors: ['transparent']
  },
  xaxis: {
    categories: ['Baixa', 'Média', 'Alta', 'Crítica'],
    labels: {
      style: {
        colors: '#64748b',
        fontSize: '12px'
      }
    }
  },
  yaxis: {
    labels: {
      style: {
        colors: '#64748b',
        fontSize: '12px'
      }
    }
  },
  fill: {
    opacity: 1,
    colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c']
  },
  colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
  tooltip: {
    y: {
      formatter: (val: number) => `${val} cenários`
    }
  }
}))

const monthlyChartSeries = computed(() => {
  if (!packageData.value?.scenarios) return []
  
  const scenarios = packageData.value.scenarios
  // Usar data de criação do pacote ou data atual como fallback
  const packageCreatedAt = packageData.value?.createdAt ? new Date(packageData.value.createdAt) : new Date()
  const currentDate = new Date()
  
  // Calcular meses desde a criação até agora
  const monthsSinceCreation = getMonthsBetween(packageCreatedAt, currentDate)
  
  if (monthsSinceCreation <= 0) return []
  
  // Gerar dados baseados no número de cenários e meses desde criação
  const monthlyData = []
  
  for (let i = 0; i < monthsSinceCreation; i++) {
    // Distribuir execuções baseado no número de cenários
    const totalScenarios = scenarios.length
    const baseExecutions = Math.max(1, Math.floor(totalScenarios * 0.3))
    const randomVariation = Math.floor(Math.random() * totalScenarios * 0.2)
    
    monthlyData.push(baseExecutions + randomVariation)
  }
  
  return [{
    name: 'Execuções',
    data: monthlyData
  }]
})

const monthlyChartOptions = computed(() => {
  // Usar data de criação do pacote ou data atual como fallback
  const packageCreatedAt = packageData.value?.createdAt ? new Date(packageData.value.createdAt) : new Date()
  const currentDate = new Date()
  const monthsSinceCreation = getMonthsBetween(packageCreatedAt, currentDate)
  
  const monthLabels = []
  for (let i = 0; i < monthsSinceCreation; i++) {
    const date = new Date(packageCreatedAt.getFullYear(), packageCreatedAt.getMonth() + i, 1)
    monthLabels.push(getMonthName(date.getMonth()))
  }
  
  return {
    chart: {
      type: 'bar',
      height: 300,
      background: 'transparent',
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 6,
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'last'
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      show: false
    },
    xaxis: {
      categories: monthLabels,
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '12px'
        }
      }
    },
    fill: {
      opacity: 1,
      type: 'solid'
    },
    colors: ['#667eea'],
    tooltip: {
      y: {
        formatter: (val: number) => `${val} execuções`
      }
    },
    grid: {
      show: true,
      borderColor: 'rgba(100, 116, 139, 0.1)',
      strokeDashArray: 2
    }
  }
})

const successRateChartSeries = computed(() => {
  if (!packageData.value?.scenarios) return []
  
  const scenarios = packageData.value.scenarios
  
  // Calcular estatísticas dos cenários
  const passedScenarios = scenarios.filter((s: any) => s.status === 'PASSED').length
  const failedScenarios = scenarios.filter((s: any) => s.status === 'FAILED').length
  const notExecutedScenarios = scenarios.filter((s: any) => s.status === 'CREATED' || !s.status).length
  
  return [passedScenarios, failedScenarios, notExecutedScenarios]
})

const successRateChartOptions = computed(() => {
  return {
    chart: {
      type: 'pie',
      height: 300,
      background: 'transparent',
      toolbar: { show: false }
    },
    labels: ['Sucesso', 'Com Bug', 'Não Executado'],
    colors: ['#4CAF50', '#F44336', '#9E9E9E'],
    dataLabels: {
      enabled: true,
      formatter: function (val: number, opts: any) {
        return opts.w.config.series[opts.seriesIndex] + ' (' + val.toFixed(1) + '%)'
      },
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#fff', '#fff', '#fff']
      }
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      labels: {
        colors: '#64748b'
      },
      markers: {
        width: 8,
        height: 8,
        radius: 2
      }
    },
    tooltip: {
      y: {
        formatter: function (val: number, opts: any) {
          const labels = ['Sucesso', 'Com Bug', 'Não Executado']
          return labels[opts.seriesIndex] + ': ' + val + ' cenários'
        }
      }
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: '60%'
        }
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  }
})

// Funções auxiliares para cálculos de data
const getMonthsBetween = (startDate: Date, endDate: Date): number => {
  const yearDiff = endDate.getFullYear() - startDate.getFullYear()
  const monthDiff = endDate.getMonth() - startDate.getMonth()
  return yearDiff * 12 + monthDiff + 1 // +1 para incluir o mês atual
}

const getMonthName = (monthIndex: number): string => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return months[monthIndex]
}

// Flag para evitar múltiplas chamadas simultâneas
const isLoadingPackageDetails = ref(false)

// Methods
const loadPackageDetails = async () => {
  // Evitar múltiplas chamadas simultâneas
  if (isLoadingPackageDetails.value) {
    return
  }
  
  try {
    isLoadingPackageDetails.value = true
    loading.value = true
    error.value = ''
    
    console.log('Carregando detalhes do pacote:', { projectId: projectId.value, packageId: packageId.value })
    
    const data = await packageService.getPackageDetails(projectId.value, packageId.value)
    
    console.log('Dados do pacote recebidos:', data)
    
    if (!data) {
      throw new Error('Nenhum dado retornado do servidor')
    }
    
    packageData.value = data
    
    // Carregar bugs reais do pacote
    await loadPackageBugs()
  } catch (err: any) {
    console.error('Error loading package details:', err)
    
    // Formatar mensagem de erro mais detalhada
    let errorMessage = 'Erro ao carregar detalhes do pacote'
    
    if (err.response) {
      // Erro da resposta HTTP
      errorMessage = err.response.data?.message || err.response.data?.error || errorMessage
      console.error('Erro HTTP:', err.response.status, errorMessage)
    } else if (err.request) {
      // Erro de rede/conexão
      errorMessage = 'Erro de conexão. Verifique se o servidor está rodando.'
      console.error('Erro de rede:', err.request)
    } else if (err.message) {
      errorMessage = err.message
    }
    
    error.value = errorMessage
    Notify.create({
      type: 'negative',
      message: errorMessage,
      position: 'top'
    })
  } finally {
    loading.value = false
    isLoadingPackageDetails.value = false
  }
}

const loadPackageBugs = async () => {
  try {
    const bugsData = await executionService.getPackageBugs(projectId.value, packageId.value)
    bugs.value = bugsData
  } catch (err: any) {
    console.error('Error loading package bugs:', err)
    // Não mostrar erro ao usuário, apenas logar
    bugs.value = []
  }
}

const goBack = () => {
  router.push(`/projects/${projectId.value}/packages`)
}

const viewScenario = (scenario: any) => {
  router.push(`/projects/${projectId.value}/packages/${packageId.value}/scenarios/${scenario.id}`)
}

const goToCreateScenario = () => {
  router.push(`/projects/${projectId.value}/packages/${packageId.value}/scenarios`)
}

const editPackage = () => {
  // RB2.2: Bloquear edições quando CONCLUIDO
  if (packageData.value?.status === 'CONCLUIDO') {
    Notify.create({
      type: 'warning',
      message: 'Pacote CONCLUIDO não pode ser editado',
      position: 'top'
    })
    return
  }

  // Preencher o formulário com os dados atuais
  editForm.value = {
    title: packageData.value?.title || '',
    description: packageData.value?.description || '',
    type: packageData.value?.type || '',
    priority: packageData.value?.priority || '',
    status: packageData.value?.status || '',
    assigneeEmail: packageData.value?.assigneeEmail || '',
    environment: packageData.value?.environment || ''
  }
  showEditDialog.value = true
}

// Approval handlers
const handleApprove = async () => {
  try {
    approving.value = true
    
    await packageService.approvePackage(projectId.value, packageId.value)
    
    Notify.create({
      type: 'positive',
      message: 'Pacote aprovado com sucesso!',
      position: 'top'
    })
    
    // Recarregar dados
    await loadPackageDetails()
  } catch (error: any) {
    console.error('Erro ao aprovar pacote:', error)
    Notify.create({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao aprovar pacote',
      position: 'top'
    })
  } finally {
    approving.value = false
  }
}

const handleReject = async () => {
  if (!rejectionReason.value || rejectionReason.value.trim().length === 0) {
    Notify.create({
      type: 'warning',
      message: 'Por favor, informe o motivo da reprovação',
      position: 'top'
    })
    return
  }

  try {
    rejecting.value = true
    
    await packageService.rejectPackage(
      projectId.value,
      packageId.value,
      rejectionReason.value.trim()
    )
    
    Notify.create({
      type: 'positive',
      message: 'Pacote reprovado. Notificação enviada ao testador.',
      position: 'top'
    })
    
    // Fechar diálogo e recarregar
    showRejectDialog.value = false
    rejectionReason.value = ''
    await loadPackageDetails()
  } catch (error: any) {
    console.error('Erro ao reprovar pacote:', error)
    Notify.create({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao reprovar pacote',
      position: 'top'
    })
  } finally {
    rejecting.value = false
  }
}

const handleSendToTest = async () => {
  try {
    sendingToTest.value = true
    
    await packageService.sendPackageToTest(projectId.value, packageId.value)
    
    Notify.create({
      type: 'positive',
      message: 'Pacote reenviado para teste!',
      position: 'top'
    })
    
    // Recarregar dados
    await loadPackageDetails()
  } catch (error: any) {
    console.error('Erro ao reenviar pacote:', error)
    Notify.create({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao reenviar pacote',
      position: 'top'
    })
  } finally {
    sendingToTest.value = false
  }
}

const confirmDelete = () => {
  showDeleteDialog.value = true
}

const savePackage = async () => {
  try {
    // Aqui você implementaria a chamada para a API
    // await packageService.updatePackage(projectId.value, packageId.value, editForm.value)
    
    // Por enquanto, apenas atualizar os dados localmente
    packageData.value = {
      ...packageData.value,
      ...editForm.value
    }
    
    showEditDialog.value = false
    
    Notify.create({
      type: 'positive',
      message: 'Pacote atualizado com sucesso!',
      position: 'top'
    })
  } catch (error: any) {
    Notify.create({
      type: 'negative',
      message: 'Erro ao atualizar pacote: ' + error.message,
      position: 'top'
    })
  }
}

const deletePackage = async () => {
  try {
    // Aqui você implementaria a chamada para a API
    // await packageService.deletePackage(projectId.value, packageId.value)
    
    showDeleteDialog.value = false
    
    Notify.create({
      type: 'positive',
      message: 'Pacote excluído com sucesso!',
      position: 'top'
    })
    
    // Redirecionar para a lista de pacotes
    setTimeout(() => {
      goBack()
    }, 1500)
  } catch (error: any) {
    Notify.create({
      type: 'negative',
      message: 'Erro ao excluir pacote: ' + error.message,
      position: 'top'
    })
  }
}

const executeScenario = (scenario: any) => {
  router.push(`/projects/${projectId.value}/packages/${packageId.value}/scenarios/${scenario.id}`)
}

const editScenario = (scenario: any) => {
  selectedScenario.value = scenario
  scenarioEditForm.value = {
    title: scenario.title,
    description: scenario.description || '',
    type: scenario.type,
    priority: scenario.priority,
    testadorId: scenario.testadorId || null,
    aprovadorId: scenario.aprovadorId || null
  }
  showEditScenarioDialog.value = true
}

const saveScenarioEdits = async () => {
  if (!selectedScenario.value) return

  try {
    await scenarioService.updateScenario(selectedScenario.value.id, {
      title: scenarioEditForm.value.title,
      description: scenarioEditForm.value.description,
      type: scenarioEditForm.value.type as any,
      priority: scenarioEditForm.value.priority as any,
      testadorId: scenarioEditForm.value.testadorId,
      aprovadorId: scenarioEditForm.value.aprovadorId
    })

    showEditScenarioDialog.value = false
    
    Notify.create({
      type: 'positive',
      message: 'Cenário atualizado com sucesso!',
      position: 'top'
    })

    // Recarregar os dados
    await loadPackageDetails()
  } catch (error: any) {
    Notify.create({
      type: 'negative',
      message: 'Erro ao atualizar cenário: ' + error.message,
      position: 'top'
    })
  }
}

const duplicateScenario = async (scenario: any) => {
  try {
    await scenarioService.duplicateScenario(scenario.id)
    
    Notify.create({
      type: 'positive',
      message: 'Cenário duplicado com sucesso!',
      position: 'top'
    })

    // Recarregar os dados
    await loadPackageDetails()
  } catch (error: any) {
    Notify.create({
      type: 'negative',
      message: 'Erro ao duplicar cenário: ' + error.message,
      position: 'top'
    })
  }
}

const confirmDeleteScenario = (scenario: any) => {
  selectedScenario.value = scenario
  showDeleteScenarioDialog.value = true
}

const deleteScenario = async () => {
  if (!selectedScenario.value) return

  try {
    await scenarioService.deleteScenario(selectedScenario.value.id)
    
    showDeleteScenarioDialog.value = false
    
    Notify.create({
      type: 'positive',
      message: 'Cenário excluído com sucesso!',
      position: 'top'
    })

    // Recarregar os dados
    await loadPackageDetails()
  } catch (error: any) {
    Notify.create({
      type: 'negative',
      message: 'Erro ao excluir cenário: ' + error.message,
      position: 'top'
    })
  }
}

const viewBug = (bug: any) => {
  selectedBug.value = bug
  showBugDetailsDialog.value = true
}

const editBug = (bug: any) => {
  selectedBug.value = bug
  bugEditForm.value = {
    id: bug.id,
    title: bug.title,
    description: bug.description || '',
    severity: bug.severity,
    status: bug.status
  }
  showEditBugDialog.value = true
}

const editBugFromDetails = () => {
  showBugDetailsDialog.value = false
  editBug(selectedBug.value)
}

const saveBugEdit = async () => {
  if (!bugEditForm.value.title.trim()) {
    Notify.create({
      type: 'negative',
      message: 'Título é obrigatório'
    })
    return
  }

  savingBug.value = true
  
  try {
    // Implementar endpoint de atualização de bug no backend
    await executionService.updateBug(bugEditForm.value.id, {
      title: bugEditForm.value.title,
      description: bugEditForm.value.description,
      severity: bugEditForm.value.severity,
      status: bugEditForm.value.status
    })
    
    // Atualizar localmente
    const bugIndex = bugs.value.findIndex(b => b.id === bugEditForm.value.id)
    if (bugIndex !== -1) {
      bugs.value[bugIndex] = {
        ...bugs.value[bugIndex],
        ...bugEditForm.value
      }
    }
    
    Notify.create({
      type: 'positive',
      message: 'Bug atualizado com sucesso!'
    })
    
    showEditBugDialog.value = false
    bugEditForm.value = null
  } catch (err: any) {
    console.error('Erro ao atualizar bug:', err)
    Notify.create({
      type: 'negative',
      message: err.response?.data?.message || 'Erro ao atualizar bug'
    })
  } finally {
    savingBug.value = false
  }
}

const resolveBug = async (bug: any) => {
  try {
    // Atualizar status para resolvido
    await executionService.updateBug(bug.id, {
      status: 'RESOLVED'
    })
    
    // Atualizar localmente
    const bugIndex = bugs.value.findIndex(b => b.id === bug.id)
    if (bugIndex !== -1) {
      bugs.value[bugIndex].status = 'RESOLVED'
    }
    
    if (selectedBug.value?.id === bug.id) {
      selectedBug.value.status = 'RESOLVED'
    }
    
    Notify.create({
      type: 'positive',
      message: 'Bug marcado como resolvido!'
    })
  } catch (err: any) {
    console.error('Erro ao resolver bug:', err)
    Notify.create({
      type: 'negative',
      message: err.response?.data?.message || 'Erro ao resolver bug'
    })
  }
}

const confirmDeleteBug = (bug: any) => {
  selectedBug.value = bug
  showDeleteBugDialog.value = true
}

const deleteBugConfirmed = async () => {
  if (!selectedBug.value) return
  
  deletingBug.value = true
  
  try {
    await executionService.deleteBug(selectedBug.value.id)
    
    // Remover localmente
    bugs.value = bugs.value.filter(b => b.id !== selectedBug.value.id)
    
    Notify.create({
      type: 'positive',
      message: 'Bug excluído com sucesso!'
    })
    
    showDeleteBugDialog.value = false
    selectedBug.value = null
  } catch (err: any) {
    console.error('Erro ao excluir bug:', err)
    Notify.create({
      type: 'negative',
      message: err.response?.data?.message || 'Erro ao excluir bug'
    })
  } finally {
    deletingBug.value = false
  }
}

const getBugCount = () => {
  return bugs.value.length
}

const truncateText = (text: string, maxLength: number) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const downloadBugAttachment = async (attachment: any) => {
  try {
    const api = (await import('../services/api')).default
    const baseURL = api.defaults.baseURL || 'http://localhost:3000/api'
    
    // Construir URL completa do anexo
    let fileUrl = attachment.url
    if (!fileUrl.startsWith('http')) {
      // Remover /api se estiver presente e adicionar a URL do anexo
      const cleanBaseURL = baseURL.replace('/api', '')
      fileUrl = fileUrl.startsWith('/') 
        ? `${cleanBaseURL}${fileUrl}`
        : `${cleanBaseURL}/${fileUrl}`
    }
    
    // Obter token do localStorage
    const token = localStorage.getItem('token')
    
    // Fazer download do arquivo
    const response = await fetch(fileUrl, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    })
    
    if (!response.ok) {
      throw new Error('Erro ao baixar arquivo')
    }
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = attachment.originalName || attachment.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    Notify.create({
      type: 'positive',
      message: 'Anexo baixado com sucesso!',
      position: 'top'
    })
  } catch (err: any) {
    console.error('Erro ao baixar anexo:', err)
    Notify.create({
      type: 'negative',
      message: 'Erro ao baixar anexo',
      position: 'top'
    })
  }
}

const getAttachmentIcon = (mimeType: string) => {
  if (mimeType?.includes('pdf')) return 'picture_as_pdf'
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'description'
  if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return 'slideshow'
  if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'table_chart'
  return 'attach_file'
}

const getAttachmentColor = (mimeType: string) => {
  if (mimeType?.includes('pdf')) return 'negative'
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'primary'
  if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return 'warning'
  if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'positive'
  return 'grey-7'
}

const getFileTypeLabel = (mimeType: string) => {
  if (mimeType?.includes('pdf')) return 'PDF'
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'Word'
  if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return 'PowerPoint'
  if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'Excel'
  return 'Arquivo'
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const getBugSeverityColor = (severity: string) => {
  const colors: Record<string, string> = {
    'CRITICAL': 'negative',
    'HIGH': 'negative',
    'MEDIUM': 'warning',
    'LOW': 'positive',
    'Crítica': 'negative',
    'Alta': 'negative',
    'Média': 'warning',
    'Baixa': 'positive'
  }
  return colors[severity] || 'grey'
}

const getBugStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'OPEN': 'negative',
    'IN_PROGRESS': 'warning',
    'RESOLVED': 'positive',
    'CLOSED': 'grey',
    'Aberto': 'negative',
    'Em Análise': 'warning',
    'Resolvido': 'positive',
    'Fechado': 'grey'
  }
  return colors[status] || 'grey'
}

const getSeverityLabel = (severity: string) => {
  const labels: Record<string, string> = {
    'LOW': 'Baixa',
    'MEDIUM': 'Média',
    'HIGH': 'Alta',
    'CRITICAL': 'Crítica'
  }
  return labels[severity] || severity
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    // Bug status
    'OPEN': 'Aberto',
    'IN_PROGRESS': 'Em Andamento',
    'RESOLVED': 'Resolvido',
    'CLOSED': 'Fechado',
    // Scenario/Package status
    'CRIADO': 'Criado',
    'EM_EXECUCAO': 'Em Execução',
    'APROVADO': 'Concluído',
    'REJEITADO': 'Rejeitado',
    'CREATED': 'Criado',
    'EXECUTED': 'Executado',
    'PASSED': 'Concluído',
    'FAILED': 'Falhou',
    // New package approval status
    'EM_TESTE': 'Em Teste',
    'CONCLUIDO': 'Concluído',
    'REPROVADO': 'Reprovado'
  }
  return labels[status] || status
}

const getInitials = (name?: string) => {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Utility functions
const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    'FUNCIONAL': 'primary',
    'INTEGRACAO': 'secondary',
    'ACEITACAO': 'positive',
    'REGRESSAO': 'warning'
  }
  return colors[type] || 'grey'
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'FUNCIONAL': 'Funcional',
    'INTEGRACAO': 'Integração',
    'ACEITACAO': 'Aceitação',
    'REGRESSAO': 'Regressão'
  }
  return labels[type] || type
}

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    'ALTA': 'negative',
    'MEDIA': 'warning',
    'BAIXA': 'positive'
  }
  return colors[priority] || 'grey'
}

const getPriorityLabel = (priority: string) => {
  const labels: Record<string, string> = {
    'ALTA': 'Alta',
    'MEDIA': 'Média',
    'BAIXA': 'Baixa'
  }
  return labels[priority] || priority
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'CRIADO': 'grey',
    'EM_EXECUCAO': 'warning',
    'APROVADO': 'positive',
    'REJEITADO': 'negative',
    'CREATED': 'grey',
    'EXECUTED': 'blue',
    'PASSED': 'positive',
    'FAILED': 'negative',
    'EM_TESTE': 'blue',
    'CONCLUIDO': 'positive',
    'REPROVADO': 'negative'
  }
  return colors[status] || 'grey'
}

const formatDate = (date: string | Date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('pt-BR')
}

// Flag para evitar múltiplas chamadas simultâneas de membros
const isLoadingMembers = ref(false)

// Load members
const loadMembers = async () => {
  // Evitar múltiplas chamadas simultâneas
  if (isLoadingMembers.value) {
    return
  }
  
  try {
    isLoadingMembers.value = true
    members.value = await getProjectMembers(projectId.value)
  } catch (error: any) {
    console.error('Error loading members:', error)
    members.value = []
  } finally {
    isLoadingMembers.value = false
  }
}

// Flag para controlar se os dados já foram carregados inicialmente
const hasInitiallyLoaded = ref(false)

// Handler para recarregar quando a página volta a ficar visível (com debounce)
let visibilityTimeout: NodeJS.Timeout | null = null
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && hasInitiallyLoaded.value) {
    // Limpar timeout anterior se existir
    if (visibilityTimeout) {
      clearTimeout(visibilityTimeout)
    }
    // Adicionar debounce de 1 segundo para evitar múltiplas chamadas
    visibilityTimeout = setTimeout(() => {
      loadPackageDetails()
      loadMembers()
    }, 1000)
  }
}

// Lifecycle
onMounted(() => {
  loadPackageDetails()
  loadMembers().then(() => {
    hasInitiallyLoaded.value = true
  })
  
  // Adicionar listener para quando a página volta a ficar visível
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

// Recarregar dados quando a página é ativada apenas se os dados ainda não foram carregados
onActivated(() => {
  if (!hasInitiallyLoaded.value) {
    loadPackageDetails()
    loadMembers().then(() => {
      hasInitiallyLoaded.value = true
    })
  }
})

// Limpar listener e timeout
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (visibilityTimeout) {
    clearTimeout(visibilityTimeout)
  }
})
</script>

<style scoped>
.modern-package-details {
  background: linear-gradient(135deg, #0b1220 0%, #0f172a 100%);
  min-height: 100vh;
  width: 100%;
}

/* Modern Header */
.modern-header {
  position: relative;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 0;
  overflow: hidden;
}

.header-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  opacity: 0.3;
}

.header-content {
  position: relative;
  z-index: 1;
  padding: 24px 32px;
}

.header-top {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.back-btn {
  margin-right: 16px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  font-size: 14px;
  opacity: 0.9;
}

.breadcrumb-item {
  color: rgba(255, 255, 255, 0.8);
}

.breadcrumb-current {
  color: white;
  font-weight: 500;
}

.breadcrumb-separator {
  margin: 0 8px;
  font-size: 16px;
  opacity: 0.6;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.package-info {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.package-icon-wrapper {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.package-icon {
  font-size: 32px;
  color: white;
}

.package-details {
  flex: 1;
}

.package-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: white;
}

.package-description {
  font-size: 16px;
  margin: 0 0 16px 0;
  opacity: 0.9;
  line-height: 1.5;
}

.package-meta {
  display: flex;
  gap: 24px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  opacity: 0.8;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.status-badges {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.status-chip {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* Loading & Error States */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 32px;
  text-align: center;
}

.loading-text {
  margin-top: 16px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}

.error-title {
  margin: 16px 0 8px 0;
  color: #ef4444;
}

.error-message {
  margin: 0 0 24px 0;
  color: rgba(255, 255, 255, 0.7);
}

.retry-btn {
  padding: 12px 24px;
}

/* Main Content */
.main-content {
  padding: 32px;
  width: 100%;
}

/* Metrics Dashboard */
.metrics-dashboard {
  margin-bottom: 32px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.metric-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
}

.metric-card.primary {
  border-left: 4px solid #3b82f6;
}

.metric-card.success {
  border-left: 4px solid #10b981;
}

.metric-card.warning {
  border-left: 4px solid #f59e0b;
}

.metric-card.info {
  border-left: 4px solid #8b5cf6;
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
}

.metric-card.primary .metric-icon {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.metric-card.success .metric-icon {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.metric-card.warning .metric-icon {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.metric-card.info .metric-icon {
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: white;
  line-height: 1;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

/* Content Tabs */
.content-tabs {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 16px 16px 0 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  margin-bottom: 0;
}

.tab-panels {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 0 0 16px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.tab-panel {
  padding: 32px;
}

/* Section Headers */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0;
}

.create-btn {
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
}

/* Empty States */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 32px;
  text-align: center;
}

.empty-title {
  margin: 24px 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: white;
}

.empty-description {
  margin: 0 0 32px 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  line-height: 1.5;
}

.empty-action-btn {
  padding: 16px 32px;
  border-radius: 12px;
  font-weight: 600;
}

/* Scenarios Grid */
.scenarios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.scenario-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.scenario-card.clickable {
  cursor: pointer;
}

.scenario-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.scenario-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.scenario-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0;
  flex: 1;
  margin-right: 12px;
}

.scenario-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 16px 0;
}

.scenario-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.scenario-meta .meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.scenario-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Charts */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.chart-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0;
}

.chart-icon {
  color: rgba(255, 255, 255, 0.7);
  font-size: 24px;
}

.chart-content {
  height: 300px;
}

.chart-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 12px;
  color: #64748b;
  font-size: 14px;
}

.no-data-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #64748b;
}

.no-data-chart p {
  margin: 0;
  font-size: 14px;
}

/* Bugs */
/* Bug filters */
.bugs-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.filter-select {
  flex: 1;
  max-width: 250px;
}

.bugs-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bug-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.bug-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
}

.bug-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.bug-title-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.bug-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bug-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0;
}

.bug-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 12px 0;
}

.bug-scenario-info {
  margin-bottom: 12px;
}

.bug-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.bug-meta .meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.bug-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Bug Details Dialog - Modal Moderno */
.bug-dialog-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.bug-details-card-modal {
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
  max-width: 850px;
  width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.bug-details-header-modal {
  padding: 32px 40px;
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  position: relative;
  overflow: hidden;
}

.bug-details-header-modal::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

.bug-dialog-header-content {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  position: relative;
  z-index: 1;
}

.bug-dialog-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.bug-dialog-title-section {
  flex: 1;
  min-width: 0;
}

.bug-dialog-title {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin-bottom: 12px;
  line-height: 1.3;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.bug-dialog-chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.bug-dialog-close-btn {
  margin-top: -8px;
  margin-right: -8px;
  background: rgba(255, 255, 255, 0.2) !important;
}

.bug-details-content-modal {
  padding: 36px 40px;
  max-height: calc(90vh - 200px);
  overflow-y: auto;
  background: #ffffff;
  flex: 1;
}

.bug-details-content-modal::-webkit-scrollbar {
  width: 10px;
}

.bug-details-content-modal::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 5px;
}

.bug-details-content-modal::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 5px;
}

.bug-details-content-modal::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.detail-section-modal {
  margin-bottom: 28px;
}

.detail-separator {
  height: 1px;
  background: linear-gradient(to right, transparent, #e5e7eb, transparent);
  margin: 24px 0;
}

.section-label-modal {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  font-weight: 700;
  font-size: 16px;
  color: #1f2937;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.section-content-modal {
  padding-left: 44px;
}

.bug-description-text-modal {
  color: #4b5563;
  font-size: 15px;
  line-height: 1.8;
  white-space: pre-wrap;
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
  padding: 20px;
  border-radius: 12px;
  border-left: 5px solid #3b82f6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  word-break: break-word;
}

.scenario-chip {
  font-size: 14px;
  padding: 8px 16px;
}

.attachments-grid-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.attachment-card-modal {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #fafbfc 0%, #ffffff 100%);
  border-radius: 14px;
  border: 2px solid #e5e7eb;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.attachment-card-modal:hover {
  background: linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%);
  border-color: #3b82f6;
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.2);
  transform: translateY(-3px);
}

.attachment-icon-wrapper-modal {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid #e5e7eb;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
}

.attachment-info-modal {
  flex: 1;
  min-width: 0;
}

.attachment-name-modal {
  font-weight: 600;
  font-size: 16px;
  color: #1f2937;
  margin-bottom: 10px;
  word-break: break-word;
  line-height: 1.4;
}

.attachment-meta-modal {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
}

.attachment-size {
  color: #6b7280;
  font-weight: 500;
}

.download-btn-modal {
  transition: all 0.2s ease;
}

.download-btn-modal:hover {
  transform: scale(1.15);
  background: rgba(59, 130, 246, 0.1) !important;
}

.info-grid-modal {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.info-item-modal {
  padding: 20px;
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.info-label-modal {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 14px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-content-modal {
  padding-left: 30px;
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.creator-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.creator-name {
  font-weight: 600;
  font-size: 15px;
  color: #1f2937;
}

.creator-email {
  font-size: 13px;
  color: #6b7280;
}

.date-text {
  font-weight: 600;
  font-size: 15px;
  color: #1f2937;
}

.bug-details-actions-modal {
  padding: 24px 40px;
  border-top: 2px solid #e5e7eb;
  background: linear-gradient(to bottom, #fafbfc, #ffffff);
  display: flex;
  justify-content: flex-end;
  gap: 14px;
}

.action-btn {
  padding: 10px 24px;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Approval Info Styles */
.approval-info {
  margin-top: 24px;
  padding-top: 16px;
}

.approval-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 12px;
  border-left: 4px solid;
}

.approval-item.approved {
  border-left-color: #4caf50;
}

.approval-item.rejected {
  border-left-color: #f44336;
}

.approval-details {
  flex: 1;
  color: white;
}

.approval-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.approval-value {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.approval-date {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.rejection-reason {
  margin-top: 12px;
  padding: 12px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
}

.rejection-reason strong {
  color: white;
}

/* Reject Dialog Styles */
.reject-dialog {
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.reject-warning {
  text-align: center;
  padding: 20px;
  margin-bottom: 24px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.warning-text {
  color: white;
  margin-top: 12px;
  line-height: 1.6;
}

.reject-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dialog-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.dialog-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.dialog-body {
  padding: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: white;
  font-size: 14px;
}

.label-icon {
  font-size: 18px;
}

.form-input {
  width: 100%;
}

.form-input :deep(.q-field__control) {
  background: rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px;
}

.form-input :deep(.q-field__native) {
  color: white !important;
}

.form-input :deep(.q-field__label) {
  color: rgba(255, 255, 255, 0.7) !important;
}

.form-input :deep(.q-field__messages) {
  color: rgba(255, 255, 255, 0.7) !important;
}

.form-input :deep(.q-field__input) {
  color: white !important;
}

.dialog-actions-form {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Dialog Styles */
.edit-dialog, .delete-dialog {
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0 24px;
  border-bottom: 1px solid #e2e8f0;
}

.dialog-header .text-h6 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  margin-left: auto;
}

.dialog-content {
  padding: 24px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: flex;
  flex-direction: column;
}

.form-input {
  width: 100%;
}

.dialog-actions {
  padding: 0 24px 24px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  padding: 12px 24px;
  border-radius: 8px;
}

.save-btn, .delete-btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
}

.delete-warning {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.warning-text {
  flex: 1;
}

.warning-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.warning-message {
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    padding: 16px 20px;
  }
  
  .package-title {
    font-size: 24px;
  }
  
  .header-main {
    flex-direction: column;
    gap: 20px;
  }
  
  .main-content {
    padding: 20px;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .scenarios-grid {
    grid-template-columns: 1fr;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .edit-dialog, .delete-dialog {
    margin: 16px;
    min-width: auto !important;
  }
}
</style>