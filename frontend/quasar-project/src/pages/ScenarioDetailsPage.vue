<template>
  <q-page class="scenario-details-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <q-btn
          flat
          round
          icon="arrow_back"
          @click="goBack"
          class="back-btn"
          color="white"
        />
        <div class="header-info">
          <h1 class="page-title">{{ scenario?.title || 'Carregando...' }}</h1>
          <p class="page-subtitle">Detalhes do Cenário de Teste</p>
        </div>
      </div>
      <div class="header-actions">
        <q-btn
          color="primary"
          icon="play_arrow"
          label="Executar"
          @click="executeScenario"
          class="action-btn"
        />
        <q-btn
          color="white"
          text-color="primary"
          icon="edit"
          label="Editar"
          @click="editScenario"
          class="action-btn"
        />
        <q-btn
          color="positive"
          icon="picture_as_pdf"
          label="Gerar ECT (PDF)"
          @click="generateECT"
          :loading="generatingECT"
          :disable="scenario?.status !== 'PASSED'"
          class="action-btn"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <q-spinner-dots size="60px" color="primary" />
      <p>Carregando cenário...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <q-icon name="error_outline" size="80px" color="negative" />
      <h3>Erro ao carregar cenário</h3>
      <p>{{ error }}</p>
      <q-btn color="primary" @click="loadScenario" label="Tentar novamente" />
    </div>

    <!-- Main Content -->
    <div v-else-if="scenario" class="content-container">
      <!-- Scenario Info Card -->
      <q-card class="info-card">
        <q-card-section>
          <div class="info-header">
            <h2>Informações do Cenário</h2>
            <div class="badges">
              <q-chip :color="getTypeColor(scenario.type)" text-color="white">
                {{ getTypeLabel(scenario.type) }}
              </q-chip>
              <q-chip :color="getPriorityColor(scenario.priority)" text-color="white">
                {{ getPriorityLabel(scenario.priority) }}
              </q-chip>
              <q-chip :color="getStatusColor(scenario.status)" text-color="white">
                {{ getStatusLabel(scenario.status) }}
              </q-chip>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">
                <q-icon name="description" size="20px" />
                Descrição
              </div>
              <div class="info-value">{{ scenario.description || 'Sem descrição' }}</div>
            </div>

            <div class="info-item" v-if="scenario.testador">
              <div class="info-label">
                <q-icon name="person" size="20px" />
                Testador Responsável
              </div>
              <div class="info-value">
                <q-avatar size="32px" :color="getMemberColor(scenario.testador.id)" text-color="white">
                  {{ getInitials(scenario.testador.name) }}
                </q-avatar>
                <div class="member-info">
                  <div class="member-name">{{ scenario.testador.name }}</div>
                  <div class="member-email">{{ scenario.testador.email }}</div>
                </div>
              </div>
            </div>

            <div class="info-item" v-if="scenario.aprovador">
              <div class="info-label">
                <q-icon name="verified_user" size="20px" />
                Aprovador Responsável
              </div>
              <div class="info-value">
                <q-avatar size="32px" :color="getMemberColor(scenario.aprovador.id)" text-color="white">
                  {{ getInitials(scenario.aprovador.name) }}
                </q-avatar>
                <div class="member-info">
                  <div class="member-name">{{ scenario.aprovador.name }}</div>
                  <div class="member-email">{{ scenario.aprovador.email }}</div>
                </div>
              </div>
            </div>

            <div class="info-item">
              <div class="info-label">
                <q-icon name="calendar_today" size="20px" />
                Data de Criação
              </div>
              <div class="info-value">{{ formatDate(scenario.createdAt) }}</div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Steps Card -->
      <q-card class="steps-card">
        <q-card-section>
          <div class="steps-header">
            <h2>Etapas do Cenário</h2>
            <q-btn
              color="primary"
              icon="add"
              label="Adicionar Etapa"
              @click="showAddStepDialog = true"
              unelevated
            />
          </div>

          <!-- Steps List -->
          <div v-if="scenario.steps && scenario.steps.length > 0" class="steps-list">
            <div
              v-for="(step, index) in scenario.steps"
              :key="step.id"
              class="step-item"
            >
              <div class="step-number">{{ index + 1 }}</div>
              <div class="step-content">
                <div class="step-action">
                  <strong>Ação:</strong> {{ step.action }}
                </div>
                <div class="step-expected">
                  <strong>Resultado Esperado:</strong> {{ step.expected }}
                </div>
              </div>
              <div class="step-actions">
                <q-btn
                  flat
                  round
                  icon="edit"
                  size="sm"
                  @click="editStep(step)"
                  color="primary"
                >
                  <q-tooltip>Editar etapa</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  icon="delete"
                  size="sm"
                  @click="deleteStep(step.id)"
                  color="negative"
                >
                  <q-tooltip>Excluir etapa</q-tooltip>
                </q-btn>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-steps">
            <q-icon name="list_alt" size="80px" color="grey-4" />
            <h3>Nenhuma etapa adicionada</h3>
            <p>Adicione etapas para detalhar como executar este cenário de teste</p>
            <q-btn
              color="primary"
              icon="add"
              label="Adicionar Primeira Etapa"
              @click="showAddStepDialog = true"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Add/Edit Step Dialog -->
    <q-dialog v-model="showAddStepDialog" persistent>
      <q-card class="step-dialog">
        <q-card-section class="dialog-header">
          <h3>{{ editingStep ? 'Editar Etapa' : 'Nova Etapa' }}</h3>
          <q-btn flat round icon="close" @click="closeStepDialog" />
        </q-card-section>

        <q-card-section>
          <q-form @submit="saveStep">
            <div class="form-group">
              <label class="form-label">Ação</label>
              <q-input
                v-model="stepForm.action"
                placeholder="Descreva a ação a ser executada"
                outlined
                type="textarea"
                rows="3"
                :rules="[val => !!val || 'Ação é obrigatória']"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Resultado Esperado</label>
              <q-input
                v-model="stepForm.expected"
                placeholder="Descreva o resultado esperado"
                outlined
                type="textarea"
                rows="3"
                :rules="[val => !!val || 'Resultado esperado é obrigatório']"
              />
            </div>

            <div class="dialog-actions">
              <q-btn
                label="Cancelar"
                color="grey"
                flat
                @click="closeStepDialog"
              />
              <q-btn
                label="Salvar"
                color="primary"
                type="submit"
                :loading="savingStep"
                unelevated
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { scenarioService } from '../services/scenario.service'
import { ectService } from '../services/ect.service'

const route = useRoute()
const router = useRouter()

// State
const loading = ref(true)
const error = ref('')
const scenario = ref<any>(null)
const showAddStepDialog = ref(false)
const editingStep = ref<any>(null)
const savingStep = ref(false)
const generatingECT = ref(false)

const stepForm = ref({
  action: '',
  expected: ''
})

// Methods
function goBack() {
  const projectId = route.params.projectId
  const packageId = route.params.packageId
  router.push(`/projects/${projectId}/packages/${packageId}`)
}

async function loadScenario() {
  try {
    loading.value = true
    error.value = ''
    
    const scenarioId = Number(route.params.scenarioId)
    const response = await scenarioService.getScenarioById(scenarioId)
    scenario.value = response.scenario
  } catch (err: any) {
    console.error('Erro ao carregar cenário:', err)
    error.value = err.response?.data?.message || err.message || 'Erro ao carregar cenário'
  } finally {
    loading.value = false
  }
}

function editScenario() {
  Notify.create({
    type: 'info',
    message: 'Função de edição em desenvolvimento'
  })
}

function executeScenario() {
  const projectId = route.params.projectId
  const packageId = route.params.packageId
  const scenarioId = route.params.scenarioId
  const url = router.resolve(`/projects/${projectId}/packages/${packageId}/scenarios/${scenarioId}/execute`).href
  window.open(url, '_blank')
}

async function generateECT() {
  // Evitar múltiplos cliques
  if (generatingECT.value) {
    console.log('ECT já está sendo gerado, ignorando clique')
    return
  }

  // Validar se o cenário está concluído com sucesso
  if (scenario.value?.status !== 'PASSED') {
    Notify.create({
      type: 'warning',
      message: 'ECT só pode ser gerado para cenários concluídos com sucesso',
      timeout: 3000
    })
    return
  }

  try {
    generatingECT.value = true
    
    const scenarioId = Number(route.params.scenarioId)
    console.log('Iniciando geração de ECT para cenário:', scenarioId)
    
    // Mostrar notificação de início
    Notify.create({
      type: 'info',
      message: 'Gerando ECT (PDF)...',
      timeout: 5000,
      spinner: true
    })
    
    // Gerar ECT
    const result = await ectService.generateECT(scenarioId)
    
    console.log('ECT gerado com sucesso:', result)
    
    // Baixar o arquivo
    await ectService.downloadReport(result.reportId)
    
    // Notificação de sucesso
    Notify.create({
      type: 'positive',
      message: 'ECT gerado e baixado com sucesso!',
      timeout: 3000
    })
    
  } catch (error: any) {
    console.error('Erro ao gerar ECT:', error)
    
    Notify.create({
      type: 'negative',
      message: error.message || 'Erro ao gerar ECT',
      timeout: 5000
    })
  } finally {
    generatingECT.value = false
  }
}

function editStep(step: any) {
  editingStep.value = step
  stepForm.value = {
    action: step.action,
    expected: step.expected
  }
  showAddStepDialog.value = true
}

function closeStepDialog() {
  showAddStepDialog.value = false
  editingStep.value = null
  stepForm.value = {
    action: '',
    expected: ''
  }
}

async function saveStep() {
  try {
    savingStep.value = true
    
    let updatedSteps = [...(scenario.value.steps || [])]
    
    if (editingStep.value) {
      // Editar etapa existente
      const index = updatedSteps.findIndex((s: any) => s.id === editingStep.value.id)
      if (index !== -1) {
        updatedSteps[index] = {
          ...updatedSteps[index],
          action: stepForm.value.action,
          expected: stepForm.value.expected
        }
      }
    } else {
      // Adicionar nova etapa
      const newStep = {
        action: stepForm.value.action,
        expected: stepForm.value.expected,
        order: updatedSteps.length + 1
      }
      updatedSteps.push(newStep)
    }
    
    // Atualizar o cenário na API
    const scenarioId = Number(route.params.scenarioId)
    await scenarioService.updateScenario(scenarioId, {
      steps: updatedSteps
    })
    
    // Recarregar o cenário
    await loadScenario()
    
    Notify.create({
      type: 'positive',
      message: editingStep.value ? 'Etapa atualizada com sucesso!' : 'Etapa adicionada com sucesso!'
    })
    
    closeStepDialog()
  } catch (err: any) {
    console.error('Erro ao salvar etapa:', err)
    Notify.create({
      type: 'negative',
      message: err.response?.data?.message || 'Erro ao salvar etapa'
    })
  } finally {
    savingStep.value = false
  }
}

async function deleteStep(stepId: number) {
  if (!confirm('Tem certeza que deseja excluir esta etapa?')) {
    return
  }
  
  try {
    const updatedSteps = scenario.value.steps.filter((s: any) => s.id !== stepId)
    
    // Atualizar o cenário na API
    const scenarioId = Number(route.params.scenarioId)
    await scenarioService.updateScenario(scenarioId, {
      steps: updatedSteps
    })
    
    // Recarregar o cenário
    await loadScenario()
    
    Notify.create({
      type: 'positive',
      message: 'Etapa excluída com sucesso!'
    })
  } catch (err: any) {
    console.error('Erro ao excluir etapa:', err)
    Notify.create({
      type: 'negative',
      message: err.response?.data?.message || 'Erro ao excluir etapa'
    })
  }
}

// Helper functions
function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    FUNCTIONAL: 'blue',
    REGRESSION: 'purple',
    SMOKE: 'orange',
    E2E: 'green'
  }
  return colors[type] || 'grey'
}

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    FUNCTIONAL: 'Funcional',
    REGRESSION: 'Regressão',
    SMOKE: 'Smoke',
    E2E: 'End-to-End'
  }
  return labels[type] || type
}

function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    LOW: 'green',
    MEDIUM: 'orange',
    HIGH: 'red',
    CRITICAL: 'deep-purple'
  }
  return colors[priority] || 'grey'
}

function getPriorityLabel(priority: string) {
  const labels: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    CRITICAL: 'Crítica'
  }
  return labels[priority] || priority
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    CREATED: 'grey',
    EXECUTED: 'blue',
    PASSED: 'green',
    FAILED: 'red'
  }
  return colors[status] || 'grey'
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    CREATED: 'Criado',
    EXECUTED: 'Executado',
    PASSED: 'Concluído',
    FAILED: 'Falhou'
  }
  return labels[status] || status
}

function getMemberColor(memberId: number) {
  const colors = ['primary', 'secondary', 'accent', 'positive', 'info', 'warning']
  return colors[memberId % colors.length]
}

function getInitials(name: string) {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

function formatDate(date: string) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  loadScenario()
})
</script>

<style scoped>
.scenario-details-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32px;
}

.page-header {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px 40px;
  margin-bottom: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.25);
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: translateX(-4px);
}

.header-info {
  color: white;
}

.page-title {
  font-size: 32px;
  font-weight: 800;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  letter-spacing: -0.5px;
}

.page-subtitle {
  font-size: 16px;
  opacity: 0.95;
  margin: 8px 0 0;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.loading-container,
.error-container {
  background: white;
  border-radius: 16px;
  padding: 60px 24px;
  text-align: center;
}

.content-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card,
.steps-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
}

.info-card:hover,
.steps-card:hover {
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.18);
  transform: translateY(-2px);
}

.info-header,
.steps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 20px;
}

.info-header h2,
.steps-header h2 {
  font-size: 24px;
  font-weight: 800;
  margin: 0;
  color: #1e293b;
  letter-spacing: -0.5px;
}

.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #666;
  font-size: 14px;
}

.info-value {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  color: #333;
}

.member-info {
  display: flex;
  flex-direction: column;
}

.member-name {
  font-weight: 600;
}

.member-email {
  font-size: 12px;
  color: #666;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.step-item {
  display: flex;
  gap: 20px;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 16px;
  border-left: 5px solid #667eea;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.step-item:hover {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  transform: translateX(8px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.15);
  border-left-color: #764ba2;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  font-weight: 800;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-action,
.step-expected {
  font-size: 15px;
  line-height: 1.7;
  color: #475569;
}

.step-action strong,
.step-expected strong {
  color: #1e293b;
  font-weight: 700;
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.step-actions {
  display: flex;
  gap: 4px;
  align-items: flex-start;
}

.empty-steps {
  padding: 60px 24px;
  text-align: center;
  color: #666;
}

.empty-steps h3 {
  margin: 16px 0 8px;
  font-size: 20px;
  color: #333;
}

.empty-steps p {
  margin: 0 0 24px;
}

.step-dialog {
  min-width: 500px;
  max-width: 600px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.dialog-header h3 {
  margin: 0;
  font-size: 20px;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .action-btn {
    flex: 1;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .step-dialog {
    min-width: unset;
    max-width: unset;
    width: 100%;
  }
}
</style>

