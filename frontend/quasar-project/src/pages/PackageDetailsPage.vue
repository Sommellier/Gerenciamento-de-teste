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
            data-cy="btn-back"
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
            <!-- Botão de aprovar pacote quando todos cenários estão aprovados (apenas para owner/manager) -->
            <q-btn
              v-if="canShowApprovePackageButton"
              color="positive"
              icon="check_circle"
              label="Aprovar Pacote"
              @click="handleApprovePackageWhenAllScenariosApproved"
              class="action-btn"
              data-cy="btn-approve-package"
              :loading="approving"
            />
            
            <!-- Ações normais (desabilitadas quando CONCLUIDO ou APROVADO) -->
            <q-btn
              color="white"
              text-color="primary"
              icon="edit"
              label="Editar"
              @click="editPackage"
              class="action-btn"
              data-cy="btn-edit-package"
              :disable="packageData?.status === 'CONCLUIDO' || packageData?.status === 'APROVADO'"
            />
            <q-btn
              color="white"
              text-color="negative"
              icon="delete"
              label="Excluir"
              @click="confirmDelete"
              class="action-btn"
              data-cy="btn-delete-package"
              :disable="packageData?.status === 'CONCLUIDO' || packageData?.status === 'APROVADO'"
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
        data-cy="btn-retry-load-package"
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
              <div class="metric-value">{{ Math.round(packageData.metrics.successRate ?? 0) }}%</div>
              <div class="metric-label">Status de Conclusão</div>
            </div>
          </div>
          
          <div class="metric-card warning">
            <div class="metric-icon">
              <q-icon name="trending_up" size="32px" />
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ Math.round(packageData.metrics.executionRate ?? 0) }}%</div>
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
                v-if="canCreateScenario"
                color="primary"
                icon="add"
                label="Criar Cenário"
                @click="goToCreateScenario"
                class="create-btn"
                data-cy="btn-create-scenario"
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
                  data-cy="btn-create-first-scenario"
                />
              </div>
              
              <div v-else class="scenarios-grid" data-cy="grid-scenarios">
                <div
                  v-for="scenario in packageData.scenarios"
                  :key="scenario.id"
                  class="scenario-card clickable"
                  :data-cy="`card-scenario-${scenario.id}`"
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
                      :data-cy="`btn-execute-scenario-${scenario.id}`"
                      @click.stop="executeScenario(scenario)"
                    >
                      <q-tooltip>Executar cenário</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      icon="edit"
                      color="primary"
                      size="sm"
                      :data-cy="`btn-edit-scenario-${scenario.id}`"
                      @click.stop="editScenario(scenario)"
                    >
                      <q-tooltip>Editar cenário</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      icon="content_copy"
                      color="info"
                      size="sm"
                      :data-cy="`btn-duplicate-scenario-${scenario.id}`"
                      @click.stop="duplicateScenario(scenario)"
                    >
                      <q-tooltip>Duplicar cenário</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      icon="delete"
                      color="negative"
                      size="sm"
                      :data-cy="`btn-delete-scenario-${scenario.id}`"
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
                  <h4 class="chart-title">Status de Conclusão</h4>
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
              
              <div v-else class="bugs-grid">
                <div
                  v-for="bug in filteredBugs"
                  :key="bug.id"
                  class="bug-card clickable"
                  @click="viewBug(bug)"
                >
                  <div class="bug-header">
                    <h4 class="bug-title">{{ bug.title }}</h4>
                    <q-chip
                      :color="getBugStatusColor(bug.status)"
                      text-color="white"
                      :label="getStatusLabel(bug.status)"
                      size="sm"
                    />
                  </div>
                  
                  <p class="bug-description">{{ formatBugDescription(bug.description ?? '') || 'Sem descrição' }}</p>
                  
                  <div class="bug-meta">
                    <div class="meta-item">
                      <q-icon name="bug_report" size="16px" />
                      <span>{{ bug.scenario?.title || 'Sem cenário' }}</span>
                    </div>
                    <div class="meta-item">
                      <q-icon name="flag" size="16px" />
                      <span>{{ getSeverityLabel(bug.severity) }}</span>
                    </div>
                    <div class="meta-item">
                      <q-icon name="person" size="16px" />
                      <span>{{ bug.creator?.name || bug.creator?.email || 'Desconhecido' }}</span>
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
                      @click.stop="confirmDeleteBug(bug)"
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
                label="Título do Pacote *"
                outlined
                :rules="[val => !!val || 'Título é obrigatório']"
                class="form-input"
                hint="Nome ou identificação do pacote de teste"
                dense
              />
            </div>

            <div class="form-row">
              <q-input
                v-model="editForm.description"
                label="Descrição do Pacote"
                outlined
                type="textarea"
                rows="3"
                class="form-input"
                hint="Descreva o propósito e o escopo deste pacote de teste"
                dense
              />
            </div>

            <div class="form-row">
              <q-select
                v-model="editForm.type"
                label="Tipo de Teste *"
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
                hint="Selecione o tipo de teste que será executado neste pacote"
                dense
              />
            </div>

            <div class="form-row">
              <q-select
                v-model="editForm.priority"
                label="Prioridade do Pacote *"
                outlined
                :options="[
                  { label: 'Alta', value: 'ALTA' },
                  { label: 'Média', value: 'MEDIA' },
                  { label: 'Baixa', value: 'BAIXA' }
                ]"
                emit-value
                map-options
                class="form-input"
                hint="Nível de prioridade para execução dos testes"
                dense
              />
            </div>

            <div class="form-row">
              <q-input
                v-model="editForm.assigneeEmail"
                label="Email do Responsável pelo Pacote"
                outlined
                type="email"
                class="form-input"
                hint="Email da pessoa responsável pela execução dos testes"
                dense
              />
            </div>

            <div class="form-row">
              <q-select
                v-model="editForm.environment"
                label="Ambiente de Teste"
                outlined
                :options="[
                  { label: 'Desenvolvimento', value: 'DEV' },
                  { label: 'QA / Teste', value: 'QA' },
                  { label: 'Homologação', value: 'STAGING' },
                  { label: 'Produção', value: 'PROD' }
                ]"
                emit-value
                map-options
                class="form-input"
                hint="Ambiente onde os testes serão executados"
                dense
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
              label="Testador Responsável *"
              outlined
              emit-value
              map-options
              :rules="[val => !!val || 'Testador é obrigatório']"
              hint="Pessoa responsável por executar o teste"
              class="q-mb-md"
              dense
            >
              <template v-slot:selected>
                <template v-if="scenarioEditForm.testadorId">
                  <q-item v-if="testerOptions.find(opt => opt.value === scenarioEditForm.testadorId)" dense>
                    <q-item-section avatar>
                      <q-avatar :color="getMemberColor(scenarioEditForm.testadorId)" text-color="white" size="24px">
                        {{ getInitials(testerOptions.find(opt => opt.value === scenarioEditForm.testadorId)?.label || '') }}
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ testerOptions.find(opt => opt.value === scenarioEditForm.testadorId)?.label }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </template>
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar>
                    <q-avatar :color="getMemberColor(scope.opt.value)" text-color="white" size="32px">
                      {{ getInitials(scope.opt.label) }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                    <q-item-label caption>{{ scope.opt.email }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-select
              v-model="scenarioEditForm.aprovadorId"
              :options="approverOptions"
              label="Aprovador Responsável *"
              outlined
              emit-value
              map-options
              :rules="[val => !!val || 'Aprovador é obrigatório']"
              hint="Pessoa responsável por aprovar o teste"
              dense
            >
              <template v-slot:selected>
                <template v-if="scenarioEditForm.aprovadorId">
                  <q-item v-if="approverOptions.find(opt => opt.value === scenarioEditForm.aprovadorId)" dense>
                    <q-item-section avatar>
                      <q-avatar :color="getMemberColor(scenarioEditForm.aprovadorId)" text-color="white" size="24px">
                        {{ getInitials(approverOptions.find(opt => opt.value === scenarioEditForm.aprovadorId)?.label || '') }}
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ approverOptions.find(opt => opt.value === scenarioEditForm.aprovadorId)?.label }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </template>
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar>
                    <q-avatar :color="getMemberColor(scope.opt.value)" text-color="white" size="32px">
                      {{ getInitials(scope.opt.label) }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                    <q-item-label caption>{{ scope.opt.email }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
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
                {{ formatBugDescription(selectedBug.description) || 'Sem descrição' }}
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
      <q-card class="delete-bug-dialog-card" style="min-width: 480px; max-width: 600px">
        <q-card-section class="delete-bug-dialog-header bg-negative text-white">
          <div class="delete-bug-header-content">
            <div class="delete-bug-icon-wrapper">
              <q-icon name="warning" size="40px" color="white" />
            </div>
            <div class="delete-bug-title-section">
              <div class="text-h5 q-mb-xs">Confirmar Exclusão</div>
              <div class="text-subtitle2" style="opacity: 0.9">Esta ação é permanente</div>
            </div>
          </div>
        </q-card-section>

        <q-card-section class="delete-bug-dialog-body">
          <div class="delete-bug-warning-box">
            <q-icon name="info" size="24px" color="negative" class="q-mr-sm" />
            <div class="delete-bug-warning-text">
              <strong>Esta ação não pode ser desfeita.</strong> Todos os dados relacionados ao bug serão permanentemente removidos.
            </div>
          </div>

          <div class="delete-bug-info-section">
            <div class="delete-bug-info-item">
              <q-icon name="bug_report" size="20px" color="grey-7" />
              <div class="delete-bug-info-content">
                <div class="delete-bug-info-label">Bug</div>
                <div class="delete-bug-info-value">{{ selectedBug?.title }}</div>
              </div>
            </div>
            
            <div v-if="selectedBug?.scenario" class="delete-bug-info-item">
              <q-icon name="assignment" size="20px" color="grey-7" />
              <div class="delete-bug-info-content">
                <div class="delete-bug-info-label">Cenário Relacionado</div>
                <div class="delete-bug-info-value">{{ selectedBug.scenario.title }}</div>
              </div>
            </div>

            <div class="delete-bug-info-item">
              <q-icon name="schedule" size="20px" color="grey-7" />
              <div class="delete-bug-info-content">
                <div class="delete-bug-info-label">Criado em</div>
                <div class="delete-bug-info-value">{{ formatDate(selectedBug?.createdAt) }}</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="delete-bug-dialog-actions">
          <q-btn 
            flat 
            label="Cancelar" 
            color="grey-7"
            @click="showDeleteBugDialog = false"
            class="delete-bug-cancel-btn"
            :disable="deletingBug"
          />
          <q-btn 
            unelevated
            label="Excluir Bug" 
            color="negative"
            icon="delete"
            @click="deleteBugConfirmed" 
            :loading="deletingBug"
            class="delete-bug-confirm-btn"
          />
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
import { packageService, type TestPackage, type TestScenario } from '../services/package.service'
import { scenarioService, type CreateScenarioData } from '../services/scenario.service'
import { getProjectMembers, type ProjectMember } from '../services/project-details.service'
import { executionService, type Bug, type StepAttachment } from '../services/execution.service'
import api from '../services/api'
import logger from '../utils/logger'
import { validateRouteId } from '../utils/helpers'

// Interfaces
interface CurrentUser {
  id: number
  name: string
  email: string
  avatar?: string
}

interface ExtendedPackage extends TestPackage {
  project: {
    id: number
    name: string
    description?: string
    ownerId: number
  }
  metrics: {
    totalScenarios: number
    totalSteps: number
    packageSteps: number
    scenariosByType: Record<string, number>
    scenariosByPriority: Record<string, number>
    successRate?: number
    executionRate?: number
    executionsByMonth?: Record<string, number>
  }
}

interface ExtendedBug extends Bug {
  scenario?: {
    id: number
    title: string
  }
}

interface ExtendedScenario extends TestScenario {
  testadorId?: number
  aprovadorId?: number
  testador?: {
    id: number
    name: string
    email: string
  }
  aprovador?: {
    id: number
    name: string
    email: string
  }
  ownerUserId?: number
}

interface BugEditForm {
  id: number
  title: string
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
}

interface FilterOption {
  label: string
  value: string
}

const route = useRoute()
const router = useRouter()

// Reactive data
const loading = ref(true)
const error = ref('')
const packageData = ref<ExtendedPackage | null>(null)
const activeTab = ref('scenarios')
const bugs = ref<ExtendedBug[]>([])
const members = ref<ProjectMember[]>([])
const currentUser = ref<CurrentUser | null>(null)

// Bug management state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selectedBug = ref<any>(null)
const showBugDetailsDialog = ref(false)
const showEditBugDialog = ref(false)
const showDeleteBugDialog = ref(false)
const bugEditForm = ref<BugEditForm | null>(null)
const savingBug = ref(false)
const deletingBug = ref(false)

// Bug filters
const bugStatusFilter = ref<FilterOption | null>(null)
const bugScenarioFilter = ref<FilterOption | null>(null)

// Edit/Delete dialogs
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const editForm = ref({
  title: '',
  description: '',
  type: '',
  priority: '',
  assigneeEmail: '',
  environment: ''
})

// Scenario dialogs
const showEditScenarioDialog = ref(false)
const showDeleteScenarioDialog = ref(false)
const selectedScenario = ref<ExtendedScenario | null>(null)
const scenarioEditForm = ref({
  title: '',
  description: '',
  type: '',
  priority: '',
  testadorId: null as number | null,
  aprovadorId: null as number | null
})

// Approval state
const approving = ref(false)

// Computed
const projectId = computed(() => validateRouteId(route.params.projectId))
const packageId = computed(() => validateRouteId(route.params.packageId))

// Verificar se usuário é owner ou manager
const canApprovePackage = computed(() => {
  if (!packageData.value?.project || !currentUser.value) return false
  
  // Verificar se é owner do projeto
  const isOwner = packageData.value.project.ownerId === currentUser.value.id
  if (isOwner) return true
  
  // Se não é owner, verificar se é manager
  if (members.value && Array.isArray(members.value) && members.value.length > 0) {
    const userMember = members.value.find(m => m.id === currentUser.value?.id)
    const isManager = userMember?.role === 'MANAGER'
    return isManager
  }
  
  // Se não temos membros carregados ainda, retornar false (aguardar carregamento)
  return false
})

// Verificar se todos os cenários estão aprovados
const allScenariosApproved = computed(() => {
  if (!packageData.value?.scenarios || packageData.value.scenarios.length === 0) return false
  return packageData.value.scenarios.every((scenario: TestScenario) => (scenario.status as string) === 'APPROVED')
})

// Verificar se pode aprovar pacote (todos cenários aprovados e usuário é owner/manager)
const canShowApprovePackageButton = computed(() => {
  return canApprovePackage.value && 
         allScenariosApproved.value && 
         packageData.value?.status !== 'APROVADO' &&
         packageData.value?.status !== 'CONCLUIDO'
})

// Verificar se pode criar cenário (pacote não pode estar aprovado ou concluído)
const canCreateScenario = computed(() => {
  if (!packageData.value) return false
  return packageData.value.status !== 'APROVADO' && packageData.value.status !== 'CONCLUIDO'
})

// Tester options - OWNER, MANAGER, TESTER
const testerOptions = computed(() => {
  if (!Array.isArray(members.value)) {
    return []
  }
  return members.value
    .filter(member => {
      const role = member.role
      return role === 'OWNER' || role === 'MANAGER' || role === 'TESTER'
    })
    .map(member => ({
      label: member.name || member.email,
      value: member.id,
      email: member.email
    }))
})

// Approver options - OWNER, MANAGER, APPROVER
const approverOptions = computed(() => {
  if (!Array.isArray(members.value)) {
    return []
  }
  return members.value
    .filter(member => {
      const role = member.role
      return role === 'OWNER' || role === 'MANAGER' || role === 'APPROVER'
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
    filtered = filtered.filter(bug => bug.status === bugStatusFilter.value?.value)
  }
  
  if (bugScenarioFilter.value) {
    filtered = filtered.filter(bug => bug.scenario?.title === bugScenarioFilter.value?.value)
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
  
  scenarios.forEach((scenario: TestScenario) => {
    if (scenario.priority && Object.prototype.hasOwnProperty.call(priorityCounts, scenario.priority)) {
      const priority = scenario.priority
      if (priority === 'LOW' || priority === 'MEDIUM' || priority === 'HIGH' || priority === 'CRITICAL') {
        priorityCounts[priority]++
      }
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
  if (!packageData.value?.metrics?.executionsByMonth) return []
  
  // Usar dados reais de execuções por mês do backend
  const executionsByMonth = packageData.value.metrics.executionsByMonth
  
  // Ordenar meses (chaves no formato YYYY-MM)
  const sortedMonths = Object.keys(executionsByMonth).sort()
  const monthlyData = sortedMonths.map(month => executionsByMonth[month])
  
  return [{
    name: 'Execuções',
    data: monthlyData
  }]
})

const monthlyChartOptions = computed(() => {
  if (!packageData.value?.metrics?.executionsByMonth) return {}
  
  // Usar dados reais de execuções por mês do backend
  const executionsByMonth = packageData.value.metrics.executionsByMonth
  
  // Ordenar meses e gerar labels
  const sortedMonths = Object.keys(executionsByMonth).sort()
  const monthLabels = sortedMonths.map(monthKey => {
    const [year, month] = monthKey.split('-')
    if (!year || !month) return monthKey
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const monthIndex = parseInt(month) - 1
    const monthName = (monthIndex >= 0 && monthIndex < monthNames.length) ? monthNames[monthIndex] : month
    const currentYear = new Date().getFullYear()
    // Mostrar ano apenas se não for o ano atual
    return parseInt(year) !== currentYear ? `${monthName} ${year}` : monthName
  })
  
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
  
  // Calcular estatísticas dos cenários - mostrar os principais status
  // CREATED, EXECUTED, PASSED, FAILED, APPROVED, REPROVED, BLOQUEADO
  const createdScenarios = scenarios.filter((s: TestScenario) => (s.status as string) === 'CREATED' || !s.status).length
  const executedScenarios = scenarios.filter((s: TestScenario) => (s.status as string) === 'EXECUTED').length
  const passedScenarios = scenarios.filter((s: TestScenario) => (s.status as string) === 'PASSED').length
  const failedScenarios = scenarios.filter((s: TestScenario) => (s.status as string) === 'FAILED').length
  const approvedScenarios = scenarios.filter((s: TestScenario) => (s.status as string) === 'APPROVED').length
  const reprovedScenarios = scenarios.filter((s: TestScenario) => (s.status as string) === 'REPROVED').length
  const blockedScenarios = scenarios.filter((s: TestScenario) => (s.status as string) === 'BLOQUEADO').length
  
  // Retornar todos os status separadamente (incluindo Aprovado, Reprovado e Bloqueado separados)
  return [createdScenarios, executedScenarios, passedScenarios, failedScenarios, approvedScenarios, reprovedScenarios, blockedScenarios]
})

const successRateChartOptions = computed(() => {
  return {
    chart: {
      type: 'pie',
      height: 300,
      background: 'transparent',
      toolbar: { show: false }
    },
    labels: ['Criado', 'Executado', 'Passou', 'Falhou', 'Aprovado', 'Reprovado', 'Bloqueado'],
    colors: ['#9E9E9E', '#2196F3', '#4CAF50', '#F44336', '#10B981', '#EF4444', '#FFC107'],
    dataLabels: {
      enabled: true,
      formatter: function (val: number, opts: { w: { config: { series: number[] } }; seriesIndex: number }) {
        return opts.w.config.series[opts.seriesIndex] + ' (' + val.toFixed(1) + '%)'
      },
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#fff', '#fff', '#fff', '#fff', '#fff', '#fff', '#000']
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
        formatter: function (val: number, opts: { seriesIndex: number }) {
          const labels = ['Criado', 'Executado', 'Passou', 'Falhou', 'Aprovado', 'Reprovado', 'Bloqueado']
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
    
    const data = await packageService.getPackageDetails(projectId.value, packageId.value)
    
    if (!data) {
      throw new Error('Nenhum dado retornado do servidor')
    }
    
    packageData.value = data as ExtendedPackage
    
    // Carregar bugs reais do pacote
    await loadPackageBugs()
  } catch (err: unknown) {
    logger.error('Error loading package details:', err)
    
    // Formatar mensagem de erro mais detalhada
    let errorMessage = 'Erro ao carregar detalhes do pacote'
    
    if (err && typeof err === 'object') {
      // Verificar se é um erro de resposta HTTP
      if ('response' in err && err.response && typeof err.response === 'object') {
        const response = err.response as { status?: number; data?: { message?: string; error?: string } }
        logger.error('Erro HTTP:', response.status, errorMessage)
        
        if ('data' in err.response && err.response.data && typeof err.response.data === 'object') {
          const responseData = err.response.data as { message?: string; error?: string }
          if ('message' in responseData && typeof responseData.message === 'string') {
            errorMessage = responseData.message
          } else if ('error' in responseData && typeof responseData.error === 'string') {
            errorMessage = responseData.error
          }
        }
      } else if ('request' in err) {
        // Erro de rede/conexão
        errorMessage = 'Erro de conexão. Verifique se o servidor está rodando.'
        logger.error('Erro de rede:', err.request)
      } else if ('message' in err && typeof err.message === 'string') {
        errorMessage = err.message
      }
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
  } catch (err: unknown) {
    logger.error('Error loading package bugs:', err)
    // Não mostrar erro ao usuário, apenas logar
    bugs.value = []
  }
}

const goBack = () => {
  void router.push(`/projects/${projectId.value}/packages`)
}

const viewScenario = (scenario: ExtendedScenario | TestScenario) => {
  void router.push(`/projects/${projectId.value}/packages/${packageId.value}/scenarios/${scenario.id}`)
}

const goToCreateScenario = () => {
  void router.push(`/projects/${projectId.value}/packages/${packageId.value}/scenarios`)
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
    assigneeEmail: packageData.value?.assigneeEmail || '',
    environment: packageData.value?.environment || ''
  }
  showEditDialog.value = true
}


// Carregar usuário atual
const loadCurrentUser = async () => {
  try {
    const response = await api.get<CurrentUser>('/profile')
    currentUser.value = response.data
  } catch (err: unknown) {
    logger.error('Erro ao carregar usuário atual:', err)
  }
}

// Aprovar pacote quando todos os cenários estão aprovados
const handleApprovePackageWhenAllScenariosApproved = async () => {
  if (!allScenariosApproved.value) {
    Notify.create({
      type: 'warning',
      message: 'Todos os cenários devem estar aprovados para aprovar o pacote',
      position: 'top'
    })
    return
  }

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
  } catch (error: unknown) {
    logger.error('Erro ao aprovar pacote:', error)
    let errorMessage = 'Erro ao aprovar pacote'
    if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response) {
      const responseData = error.response.data
      if (responseData && typeof responseData === 'object' && 'message' in responseData && typeof responseData.message === 'string') {
        errorMessage = responseData.message
      }
    }
    Notify.create({
      type: 'negative',
      message: errorMessage,
      position: 'top'
    })
  } finally {
    approving.value = false
  }
}

const confirmDelete = () => {
  showDeleteDialog.value = true
}

const savePackage = () => {
  if (!packageData.value) return
  
  try {
    // Aqui você implementaria a chamada para a API
    // await packageService.updatePackage(projectId.value, packageId.value, editForm.value)
    
    // Por enquanto, apenas atualizar os dados localmente
    packageData.value = {
      ...packageData.value,
      ...editForm.value,
      id: packageData.value.id,
      tags: packageData.value.tags,
      release: packageData.value.release,
      steps: packageData.value.steps,
      scenarios: packageData.value.scenarios,
      metrics: packageData.value.metrics
    } as ExtendedPackage
    
    showEditDialog.value = false
    
    Notify.create({
      type: 'positive',
      message: 'Pacote atualizado com sucesso!',
      position: 'top'
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    Notify.create({
      type: 'negative',
      message: 'Erro ao atualizar pacote: ' + errorMessage,
      position: 'top'
    })
  }
}

const deletePackage = () => {
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    Notify.create({
      type: 'negative',
      message: 'Erro ao excluir pacote: ' + errorMessage,
      position: 'top'
    })
  }
}

const executeScenario = (scenario: ExtendedScenario | TestScenario) => {
  void router.push(`/projects/${projectId.value}/packages/${packageId.value}/scenarios/${scenario.id}`)
}

const editScenario = async (scenario: ExtendedScenario) => {
  selectedScenario.value = scenario
  
  // Garantir que os membros estejam carregados antes de abrir o diálogo
  if (members.value.length === 0) {
    await loadMembers()
  }
  
  // Preencher o formulário com os dados do cenário
  // Priorizar testadorId/aprovadorId diretos, depois os objetos relacionados
  let testadorId = scenario.testadorId || scenario.testador?.id || scenario.ownerUserId || null
  let aprovadorId = scenario.aprovadorId || scenario.aprovador?.id || null
  
  // Verificar se os IDs existem nas opções disponíveis
  if (testadorId !== null) {
    const testerExists = testerOptions.value.some(opt => opt.value === testadorId)
    if (!testerExists) {
      testadorId = scenario.ownerUserId || null
    }
  }
  
  if (aprovadorId !== null) {
    const approverExists = approverOptions.value.some(opt => opt.value === aprovadorId)
    if (!approverExists) {
      aprovadorId = null
    }
  }
  
  scenarioEditForm.value = {
    title: scenario.title,
    description: scenario.description || '',
    type: scenario.type,
    priority: scenario.priority,
    testadorId: testadorId,
    aprovadorId: aprovadorId
  }
  
  showEditScenarioDialog.value = true
}

const saveScenarioEdits = async () => {
  if (!selectedScenario.value) return

  try {
    // Preparar dados para atualização incluindo testadorId e aprovadorId
    const updateData: Partial<CreateScenarioData> & { testadorId?: number; aprovadorId?: number } = {
      title: scenarioEditForm.value.title,
      description: scenarioEditForm.value.description,
      type: scenarioEditForm.value.type as 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E',
      priority: scenarioEditForm.value.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    }
    
    // Adicionar testadorId e aprovadorId se fornecidos
    if (scenarioEditForm.value.testadorId !== null && scenarioEditForm.value.testadorId !== undefined) {
      updateData.testadorId = scenarioEditForm.value.testadorId
    }
    if (scenarioEditForm.value.aprovadorId !== null && scenarioEditForm.value.aprovadorId !== undefined) {
      updateData.aprovadorId = scenarioEditForm.value.aprovadorId
    }

    await scenarioService.updateScenario(selectedScenario.value.id, updateData)

    showEditScenarioDialog.value = false
    
    Notify.create({
      type: 'positive',
      message: 'Cenário atualizado com sucesso!',
      position: 'top'
    })

    // Recarregar os dados
    await loadPackageDetails()
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    Notify.create({
      type: 'negative',
      message: 'Erro ao atualizar cenário: ' + errorMessage,
      position: 'top'
    })
  }
}

const duplicateScenario = async (scenario: ExtendedScenario | TestScenario) => {
  try {
    await scenarioService.duplicateScenario(scenario.id)
    
    Notify.create({
      type: 'positive',
      message: 'Cenário duplicado com sucesso!',
      position: 'top'
    })
    
    // Recarregar os dados
    await loadPackageDetails()
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    Notify.create({
      type: 'negative',
      message: 'Erro ao duplicar cenário: ' + errorMessage,
      position: 'top'
    })
  }
}


const confirmDeleteScenario = (scenario: ExtendedScenario) => {
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    Notify.create({
      type: 'negative',
      message: 'Erro ao excluir cenário: ' + errorMessage,
      position: 'top'
    })
  }
}

const viewBug = (bug: ExtendedBug | Bug) => {
  selectedBug.value = bug
  showBugDetailsDialog.value = true
}

const editBug = (bug: ExtendedBug | Bug) => {
  selectedBug.value = bug
  bugEditForm.value = {
    id: bug.id,
    title: bug.title,
    description: formatBugDescription(bug.description || ''),
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
  if (!bugEditForm.value) return
  
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
    const bugIndex = bugs.value.findIndex(b => b.id === bugEditForm.value?.id)
    if (bugIndex !== -1 && bugEditForm.value && bugs.value[bugIndex]) {
      bugs.value[bugIndex] = {
        ...bugs.value[bugIndex],
        ...bugEditForm.value
      } as ExtendedBug
    }
    
    Notify.create({
      type: 'positive',
      message: 'Bug atualizado com sucesso!'
    })
    
    showEditBugDialog.value = false
    bugEditForm.value = null
  } catch (err: unknown) {
    logger.error('Erro ao atualizar bug:', err)
    let errorMessage = 'Erro ao atualizar bug'
    if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response) {
      const responseData = err.response.data
      if (responseData && typeof responseData === 'object' && 'message' in responseData && typeof responseData.message === 'string') {
        errorMessage = responseData.message
      }
    }
    Notify.create({
      type: 'negative',
      message: errorMessage
    })
  } finally {
    savingBug.value = false
  }
}

const resolveBug = async (bug: ExtendedBug | Bug) => {
  try {
    // Atualizar status para resolvido
    await executionService.updateBug(bug.id, {
      status: 'RESOLVED'
    })
    
    // Atualizar localmente
    const bugIndex = bugs.value.findIndex(b => b.id === bug.id)
    if (bugIndex !== -1 && bugs.value[bugIndex]) {
      bugs.value[bugIndex].status = 'RESOLVED'
    }
    
    if (selectedBug.value?.id === bug.id) {
      selectedBug.value.status = 'RESOLVED'
    }
    
    Notify.create({
      type: 'positive',
      message: 'Bug marcado como resolvido!'
    })
  } catch (err: unknown) {
    logger.error('Erro ao resolver bug:', err)
    let errorMessage = 'Erro ao resolver bug'
    if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response) {
      const responseData = err.response.data
      if (responseData && typeof responseData === 'object' && 'message' in responseData && typeof responseData.message === 'string') {
        errorMessage = responseData.message
      }
    }
    Notify.create({
      type: 'negative',
      message: errorMessage
    })
  }
}

const confirmDeleteBug = (bug: ExtendedBug | Bug) => {
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
  } catch (err: unknown) {
    logger.error('Erro ao excluir bug:', err)
    let errorMessage = 'Erro ao excluir bug'
    if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response) {
      const responseData = err.response.data
      if (responseData && typeof responseData === 'object' && 'message' in responseData && typeof responseData.message === 'string') {
        errorMessage = responseData.message
      }
    }
    Notify.create({
      type: 'negative',
      message: errorMessage
    })
  } finally {
    deletingBug.value = false
  }
}

const getBugCount = () => {
  return bugs.value.length
}

const formatBugDescription = (description: string) => {
  if (!description) return ''
  
  // Garantir que cada campo fique em uma linha separada e remover markdown **
  let formatted = description
  
  // Remover ** dos campos e adicionar quebra de linha dupla antes de cada campo (exceto no início)
  formatted = formatted.replace(/(\S)\s*\*\*([^*:]+):\*\*/g, '$1\n\n$2:')
  
  // Adicionar quebra de linha após o valor de cada campo, antes do próximo campo
  // Padrão: Campo: valor texto Campo: -> Campo:\nvalor texto\n\nCampo:
  formatted = formatted.replace(/([^*:]+):\s*([^*\n]+?)(\s+\*\*([^*:]+):\*\*)/g, '$1:\n$2\n\n$4:')
  
  // Remover todos os ** restantes que possam estar no texto
  formatted = formatted.replace(/\*\*/g, '')
  
  // Limpar múltiplas linhas em branco consecutivas (máximo 2)
  formatted = formatted.replace(/\n{3,}/g, '\n\n')
  
  // Limpar espaços no início e fim
  formatted = formatted.trim()
  
  return formatted
}


const downloadBugAttachment = async (attachment: StepAttachment) => {
  try {
    const { getApiUrl } = await import('../services/api')
    const apiBaseUrl = getApiUrl()
    
    // Construir URL completa do anexo
    // O backend serve arquivos estáticos em /uploads
    let fileUrl = attachment.url
    
    if (!fileUrl) {
      throw new Error('URL do anexo não encontrada')
    }
    
    logger.log('Download anexo - URL original:', fileUrl)
    logger.log('Download anexo - API Base URL:', apiBaseUrl)
    
    // Se a URL já começa com http, usar diretamente
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      // URL absoluta - usar diretamente
      logger.log('Download anexo - Usando URL absoluta:', fileUrl)
    } else {
      // URL relativa - construir URL completa
      // Remover /api da baseURL se existir, pois /uploads não está sob /api
      const baseUrl = apiBaseUrl.replace(/\/api$/, '')
      fileUrl = fileUrl.startsWith('/') 
        ? `${baseUrl}${fileUrl}`
        : `${baseUrl}/${fileUrl}`
      logger.log('Download anexo - URL construída:', fileUrl)
    }
    
    // Obter token de autenticação (opcional, pois arquivos estáticos podem ser públicos)
    const token = sessionStorage.getItem('token')
    
    // Fazer download usando fetch para ter mais controle
    logger.log('Download anexo - Iniciando fetch...')
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    })
    
    logger.log('Download anexo - Response status:', response.status, response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      logger.error('Download anexo - Erro na resposta:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      throw new Error(`Erro ao baixar arquivo: ${response.status} ${response.statusText}`)
    }
    
    // Converter resposta para blob
    const blob = await response.blob()
    
    logger.log('Download anexo - Blob recebido:', {
      size: blob.size,
      type: blob.type
    })
    
    if (!blob || blob.size === 0) {
      throw new Error('Arquivo vazio ou inválido')
    }
    
    // Criar link de download
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = attachment.originalName || attachment.filename || 'anexo'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    logger.log('Download anexo - Download concluído com sucesso')
    
    Notify.create({
      type: 'positive',
      message: 'Anexo baixado com sucesso!',
      position: 'top'
    })
  } catch (err: unknown) {
    logger.error('Erro ao baixar anexo:', err)
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
    Notify.create({
      type: 'negative',
      message: `Erro ao baixar anexo: ${errorMessage}`,
      position: 'top',
      timeout: 5000
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

const getStatusLabel = (status: string | undefined) => {
  if (!status) return 'Desconhecido'
  const labels: Record<string, string> = {
    // Bug status
    'OPEN': 'Aberto',
    'IN_PROGRESS': 'Em Andamento',
    'RESOLVED': 'Resolvido',
    'CLOSED': 'Fechado',
    // Scenario/Package status
    'CRIADO': 'Criado',
    'EM_EXECUCAO': 'Em Execução',
    'REJEITADO': 'Rejeitado',
    'CREATED': 'Criado',
    'EXECUTED': 'Executado',
    'PASSED': 'Concluído',
    'FAILED': 'Falhou',
    'APPROVED': 'Aprovado',
    'REPROVED': 'Reprovado',
    'BLOQUEADO': 'Bloqueado',
    // New package approval status
    'EM_TESTE': 'Em Teste',
    'CONCLUIDO': 'Concluído',
    'APROVADO': 'Aprovado'
  }
  return labels[status] || status
}

const getInitials = (name?: string) => {
  if (!name) return '?'
  const parts = name.split(' ').filter(p => p.length > 0)
  if (parts.length === 0) return '?'
  const first = parts[0]
  if (!first || first.length === 0) return '?'
  const firstChar = first[0]
  if (!firstChar) return '?'
  if (parts.length === 1) return firstChar.toUpperCase()
  const last = parts[parts.length - 1]
  if (!last || last.length === 0) return firstChar.toUpperCase()
  const lastChar = last[0]
  if (!lastChar) return firstChar.toUpperCase()
  return (firstChar + lastChar).toUpperCase()
}

const getMemberColor = (memberId: number) => {
  const colors = ['primary', 'secondary', 'accent', 'positive', 'info', 'warning']
  return colors[memberId % colors.length]
}

// Utility functions
const getTypeColor = (type: string | undefined) => {
  if (!type) return 'grey'
  const colors: Record<string, string> = {
    'FUNCIONAL': 'primary',
    'INTEGRACAO': 'secondary',
    'ACEITACAO': 'positive',
    'REGRESSAO': 'warning'
  }
  return colors[type] || 'grey'
}

const getTypeLabel = (type: string | undefined) => {
  if (!type) return 'Desconhecido'
  const labels: Record<string, string> = {
    'FUNCIONAL': 'Funcional',
    'INTEGRACAO': 'Integração',
    'ACEITACAO': 'Aceitação',
    'REGRESSAO': 'Regressão'
  }
  return labels[type] || type
}

const getPriorityColor = (priority: string | undefined) => {
  if (!priority) return 'grey'
  const colors: Record<string, string> = {
    'ALTA': 'negative',
    'MEDIA': 'warning',
    'BAIXA': 'positive'
  }
  return colors[priority] || 'grey'
}

const getPriorityLabel = (priority: string | undefined) => {
  if (!priority) return 'Desconhecido'
  const labels: Record<string, string> = {
    'ALTA': 'Alta',
    'MEDIA': 'Média',
    'BAIXA': 'Baixa'
  }
  return labels[priority] || priority
}

const getStatusColor = (status: string | undefined) => {
  if (!status) return 'grey'
  const colors: Record<string, string> = {
    'CRIADO': 'grey',
    'EM_EXECUCAO': 'warning',
    'APROVADO': 'positive',
    'REJEITADO': 'negative',
    'CREATED': 'grey',
    'EXECUTED': 'blue',
    'PASSED': 'positive',
    'FAILED': 'negative',
    'APPROVED': 'positive',
    'REPROVED': 'negative',
    'EM_TESTE': 'blue',
    'CONCLUIDO': 'positive',
    'REPROVADO': 'negative',
    'BLOQUEADO': 'warning',
  }
  return colors[status] || 'grey'
}

const formatDate = (date: string | Date | undefined) => {
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
  } catch (error: unknown) {
    logger.error('Error loading members:', error)
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
      void loadPackageDetails()
      void loadMembers()
    }, 1000)
  }
}

// Lifecycle
onMounted(() => {
  void loadPackageDetails()
  void loadMembers().then(() => {
    hasInitiallyLoaded.value = true
  })
  void loadCurrentUser()
  
  // Adicionar listener para quando a página volta a ficar visível
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

// Recarregar dados quando a página é ativada (sempre recarregar para pegar atualizações)
onActivated(() => {
  // Sempre recarregar quando a página é ativada para pegar atualizações de status
  void loadPackageDetails()
  if (!hasInitiallyLoaded.value) {
    void loadMembers().then(() => {
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

.bugs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.bug-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}

.bug-card.clickable {
  cursor: pointer;
}

.bug-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.bug-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.bug-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0;
  flex: 1;
  margin-right: 12px;
  line-height: 1.3;
}

.bug-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  line-height: 1.8;
  margin: 0 0 16px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Processar markdown nos cards de bug para quebrar linhas */
.bug-description {
  white-space: pre-wrap;
  word-break: break-word;
}

.bug-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
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
  margin-top: auto;
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
  background: #ffffff !important;
  border-radius: 8px;
  border: 1px solid #e5e7eb !important;
}

.form-input :deep(.q-field--outlined .q-field__control) {
  border: 1px solid #d1d5db !important;
}

.form-input :deep(.q-field--outlined .q-field__control:hover) {
  border-color: #9ca3af !important;
}

.form-input :deep(.q-field--focused .q-field__control) {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
}

.form-input :deep(.q-field__native) {
  color: #1f2937 !important;
}

.form-input :deep(.q-field__label) {
  color: #000000 !important;
  font-weight: 600 !important;
}

.form-input :deep(.q-field__messages) {
  color: #374151 !important;
  font-size: 13px !important;
}

.form-input :deep(.q-field__hint) {
  color: #6b7280 !important;
  font-size: 12px !important;
}

.form-input :deep(.q-field__input) {
  color: #1f2937 !important;
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
  color: #000000;
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
  
  .delete-bug-dialog-card {
    min-width: auto !important;
    max-width: 100% !important;
  }
}

/* Delete Bug Dialog Styles */
.delete-bug-dialog-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.delete-bug-dialog-header {
  padding: 24px 32px;
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  position: relative;
  overflow: hidden;
}

.delete-bug-dialog-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

.delete-bug-header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 1;
}

.delete-bug-icon-wrapper {
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
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
  }
}

.delete-bug-title-section {
  flex: 1;
}

.delete-bug-dialog-body {
  padding: 32px;
}

.delete-bug-warning-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #fef2f2;
  border-radius: 12px;
  border-left: 4px solid #f44336;
  margin-bottom: 24px;
}

.delete-bug-warning-text {
  flex: 1;
  color: #7f1d1d;
  font-size: 14px;
  line-height: 1.6;
}

.delete-bug-info-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.delete-bug-info-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.delete-bug-info-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.delete-bug-info-content {
  flex: 1;
  min-width: 0;
}

.delete-bug-info-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.delete-bug-info-value {
  font-size: 15px;
  color: #1f2937;
  font-weight: 600;
  word-break: break-word;
  line-height: 1.5;
}

.delete-bug-dialog-actions {
  padding: 20px 32px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.delete-bug-cancel-btn {
  padding: 10px 24px;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.delete-bug-cancel-btn:hover {
  background: #f3f4f6 !important;
  transform: translateY(-1px);
}

.delete-bug-confirm-btn {
  padding: 10px 24px;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

.delete-bug-confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(244, 67, 54, 0.4);
}

.delete-bug-confirm-btn:active {
  transform: translateY(0);
}
</style>