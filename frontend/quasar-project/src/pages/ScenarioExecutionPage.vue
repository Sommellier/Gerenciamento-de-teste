<template>
  <q-page class="scenario-execution-page">
    <!-- Fixed Header -->
    <div class="execution-header">
      <div class="header-content">
        <q-btn
          flat
          round
          icon="arrow_back"
          @click="goBack"
          color="white"
          class="back-btn"
        />
        <div class="header-info">
          <h1 class="scenario-title">{{ scenario?.title || 'Carregando...' }}</h1>
          <div class="scenario-meta">
            <q-chip :color="getStatusColor(executionStatus)" text-color="white" size="sm">
              <q-icon name="circle" size="12px" class="q-mr-xs" />
              {{ getStatusLabel(executionStatus) }}
            </q-chip>
            <div class="responsible" v-if="scenario?.testador">
              <q-avatar size="24px" color="primary">
                {{ getInitials(scenario.testador.name) }}
              </q-avatar>
              <span>{{ scenario.testador.name }}</span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <q-btn
            v-if="executionStatus === 'NOT_STARTED'"
            color="positive"
            icon="play_arrow"
            label="Iniciar Execução"
            @click="startExecution"
            :loading="loading"
            unelevated
            class="action-button"
            :key="'start-' + executionStatus"
          />
          <q-btn
            v-else-if="executionStatus === 'IN_PROGRESS'"
            color="primary"
            icon="check_circle"
            label="Concluir Execução"
            @click="finishExecution"
            :loading="loading"
            unelevated
            class="action-button"
            :key="'finish-' + executionStatus"
          />
          <template v-else-if="executionStatus === 'COMPLETED' || executionStatus === 'FAILED'">
            <q-btn
              color="positive"
              icon="refresh"
              label="Reexecutar"
              @click="restartExecution"
              :loading="loading"
              unelevated
              class="action-button"
              :key="'restart-' + executionStatus"
            />
            <q-btn
              color="white"
              text-color="primary"
              icon="arrow_back"
              label="Voltar"
              @click="goBackToPackage"
              unelevated
              class="action-button"
              :key="'back-' + executionStatus"
            />
          </template>
          <q-btn
            flat
            icon="bug_report"
            label="Criar Bug"
            @click="showBugDialog = true"
            color="white"
            class="action-button-secondary"
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !scenario" class="loading-container">
      <q-spinner-dots size="60px" color="primary" />
      <p>Carregando cenário...</p>
    </div>

    <!-- Main Content -->
    <div v-else-if="scenario" class="execution-content">
      <!-- Steps Navigation Sidebar -->
      <div class="steps-sidebar">
        <div class="sidebar-header">
          <h3>Etapas do Cenário</h3>
        </div>
        
        <!-- Progress Indicator -->
        <div class="progress-section">
          <div class="progress-stats">
            <div class="progress-stat-item">
              <div class="stat-icon">
                <q-icon name="assignment_turned_in" size="20px" />
              </div>
              <div class="stat-content">
                <div class="stat-label">Progresso</div>
                <div class="stat-value">{{ completedSteps }}/{{ totalSteps }}</div>
              </div>
            </div>
            <div class="progress-percentage-badge">
              {{ Math.round((completedSteps / totalSteps) * 100) }}%
            </div>
          </div>
          <q-linear-progress
            :value="completedSteps / totalSteps"
            :color="completedSteps === totalSteps ? 'positive' : 'primary'"
            size="6px"
            class="progress-bar-inline"
            rounded
          />
        </div>
        
        <q-list class="steps-list">
          <q-item
            v-for="(step, index) in steps"
            :key="step.id"
            clickable
            :active="currentStepIndex === index"
            @click="currentStepIndex = index"
            class="step-item"
          >
            <q-item-section avatar>
              <q-avatar
                :color="getStepStatusColor(step.status)"
                text-color="white"
                size="32px"
              >
                <q-icon
                  v-if="step.status === 'PASSED'"
                  name="check"
                  size="18px"
                />
                <q-icon
                  v-else-if="step.status === 'FAILED'"
                  name="close"
                  size="18px"
                />
                <q-icon
                  v-else-if="step.status === 'BLOCKED'"
                  name="block"
                  size="18px"
                />
                <span v-else>{{ index + 1 }}</span>
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="step-title">Etapa {{ index + 1 }}</q-item-label>
              <q-item-label caption class="step-caption">
                {{ step.action.substring(0, 40) }}{{ step.action.length > 40 ? '...' : '' }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Step Details Panel -->
      <div class="step-details-panel">
        <div v-if="currentStep" class="step-content">
          <!-- Step Header -->
          <div class="step-header">
            <h2>Etapa {{ currentStepIndex + 1 }} de {{ totalSteps }}</h2>
            <div class="step-actions">
              <q-btn
                flat
                icon="chevron_left"
                label="Anterior"
                @click="previousStep"
                :disable="currentStepIndex === 0"
              />
              <q-btn
                flat
                icon="chevron_right"
                label="Próxima"
                icon-right
                @click="nextStep"
                :disable="currentStepIndex === totalSteps - 1"
              />
            </div>
          </div>

          <!-- Step Action -->
          <q-card class="step-section">
            <q-card-section>
              <div class="section-header">
                <q-icon name="play_circle" size="24px" color="primary" />
                <h3>Ação</h3>
              </div>
              <div class="section-content" v-html="currentStep.action"></div>
            </q-card-section>
          </q-card>

          <!-- Expected Result -->
          <q-card class="step-section">
            <q-card-section>
              <div class="section-header">
                <q-icon name="check_circle" size="24px" color="positive" />
                <h3>Resultado Esperado</h3>
              </div>
              <div class="section-content" v-html="currentStep.expected"></div>
            </q-card-section>
          </q-card>

          <!-- Actual Result (Rich Text Editor) -->
          <q-card class="step-section">
            <q-card-section>
              <div class="section-header">
                <q-icon name="description" size="24px" color="primary" />
                <h3>Resultado Obtido</h3>
              </div>
              <q-editor
                v-model="currentStep.actualResult"
                :dense="false"
                :readonly="executionStatus === 'COMPLETED' || executionStatus === 'FAILED'"
                :toolbar="[
                  ['bold', 'italic', 'underline'],
                  ['unordered', 'ordered'],
                  ['link', 'quote'],
                  ['fullscreen']
                ]"
                placeholder="Descreva o resultado obtido durante a execução..."
                class="result-editor"
              />
            </q-card-section>
          </q-card>

          <!-- Step Status Actions -->
          <q-card class="step-section">
            <q-card-section>
              <div class="section-header">
                <q-icon name="assignment_turned_in" size="24px" color="primary" />
                <h3>Status da Etapa</h3>
              </div>
              <div class="status-buttons">
                <q-btn
                  :outline="currentStep.status !== 'PASSED'"
                  :unelevated="currentStep.status === 'PASSED'"
                  color="positive"
                  icon="check_circle"
                  label="Concluído"
                  @click="setStepStatus('PASSED')"
                  :disable="executionStatus === 'COMPLETED' || executionStatus === 'FAILED'"
                  class="status-btn"
                />
                <q-btn
                  :outline="currentStep.status !== 'FAILED'"
                  :unelevated="currentStep.status === 'FAILED'"
                  color="negative"
                  icon="cancel"
                  label="Reprovado"
                  @click="setStepStatus('FAILED')"
                  :disable="executionStatus === 'COMPLETED' || executionStatus === 'FAILED'"
                  class="status-btn"
                />
                <q-btn
                  :outline="currentStep.status !== 'BLOCKED'"
                  :unelevated="currentStep.status === 'BLOCKED'"
                  color="warning"
                  icon="block"
                  label="Bloqueado"
                  @click="setStepStatus('BLOCKED')"
                  :disable="executionStatus === 'COMPLETED' || executionStatus === 'FAILED'"
                  class="status-btn"
                />
              </div>
            </q-card-section>
          </q-card>

          <!-- Evidences/Attachments -->
          <q-card class="step-section">
            <q-card-section>
              <div class="section-header">
                <q-icon name="attach_file" size="24px" color="primary" />
                <h3>Evidências e Anexos</h3>
              </div>
              <div class="attachments-container">
                <div v-if="currentStep.attachments && currentStep.attachments.length > 0" class="attachments-grid">
                  <div
                    v-for="attachment in currentStep.attachments"
                    :key="attachment.id"
                    class="attachment-item"
                  >
                    <q-img
                      v-if="isImage(attachment.mimeType)"
                      :src="attachment.url"
                      class="attachment-preview"
                      @click="viewAttachment(attachment)"
                    >
                      <div class="attachment-overlay">
                        <q-icon name="visibility" size="24px" />
                      </div>
                    </q-img>
                    <div v-else class="attachment-file">
                      <q-icon :name="getFileIcon(attachment.mimeType)" size="48px" />
                      <span class="file-name">{{ attachment.filename }}</span>
                    </div>
                    <div class="attachment-actions">
                      <q-btn flat dense icon="download" @click="downloadAttachment(attachment)" />
                      <q-btn flat dense icon="delete" color="negative" @click="deleteAttachment(attachment.id)" />
                    </div>
                  </div>
                </div>
                <div v-else class="no-attachments">
                  <q-icon name="image" size="48px" color="grey-5" />
                  <p>Nenhuma evidência anexada</p>
                </div>
                <q-btn
                  color="primary"
                  icon="add"
                  label="Adicionar Evidência"
                  @click="$refs.fileInput.click()"
                  :disable="executionStatus === 'COMPLETED' || executionStatus === 'FAILED'"
                  class="add-attachment-btn"
                />
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  multiple
                  style="display: none"
                  @change="handleFileUpload"
                />
              </div>
            </q-card-section>
          </q-card>

          <!-- Comments -->
          <q-card class="step-section">
            <q-card-section>
              <div class="section-header">
                <q-icon name="comment" size="24px" color="primary" />
                <h3>Comentários</h3>
              </div>
              <div class="comments-container">
                <div v-if="currentStep.comments && currentStep.comments.length > 0" class="comments-list">
                  <div v-for="comment in currentStep.comments" :key="comment.id" class="comment-item">
                    <q-avatar size="32px" color="primary">
                      {{ getInitials(comment.user.name) }}
                    </q-avatar>
                    <div class="comment-content">
                      <div class="comment-header">
                        <strong>{{ comment.user.name }}</strong>
                        <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                      </div>
                      <p>{{ comment.text }}</p>
                    </div>
                  </div>
                </div>
                <div v-else class="no-comments">
                  <p>Nenhum comentário ainda</p>
                </div>
                <div class="add-comment">
                  <q-input
                    v-model="newComment"
                    placeholder="Adicione um comentário... (use @ para mencionar usuários)"
                    type="textarea"
                    outlined
                    autogrow
                    :disable="executionStatus === 'COMPLETED' || executionStatus === 'FAILED'"
                    class="comment-input"
                    @keydown="handleCommentKeydown"
                  >
                    <template v-slot:hint>
                      Use @ para mencionar membros da equipe
                    </template>
                  </q-input>
                  
                  <!-- Mention Suggestions -->
                  <q-menu
                    v-model="showMentionMenu"
                    :target="mentionMenuTarget"
                    anchor="bottom left"
                    self="top left"
                  >
                    <q-list style="min-width: 200px">
                      <q-item
                        v-for="member in filteredMembers"
                        :key="member.id"
                        clickable
                        @click="selectMention(member)"
                      >
                        <q-item-section avatar>
                          <q-avatar size="32px" color="primary">
                            {{ getInitials(member.name) }}
                          </q-avatar>
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>{{ member.name }}</q-item-label>
                          <q-item-label caption>{{ member.email }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                  
                  <q-btn
                    color="primary"
                    label="Comentar"
                    @click="addComment"
                    :disable="!newComment.trim() || executionStatus === 'COMPLETED' || executionStatus === 'FAILED'"
                    class="comment-btn"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <!-- Create Bug Dialog -->
    <q-dialog v-model="showBugDialog" persistent>
      <q-card style="min-width: 600px">
        <q-card-section class="dialog-header">
          <div class="text-h6">Criar Bug</div>
          <q-btn flat round icon="close" @click="showBugDialog = false" />
        </q-card-section>

        <q-card-section class="dialog-content">
          <q-input
            v-model="bugForm.title"
            label="Título *"
            outlined
            class="q-mb-md"
          />

          <q-input
            v-model="bugForm.description"
            label="Descrição"
            type="textarea"
            outlined
            rows="4"
            class="q-mb-md"
          />

          <q-select
            v-model="bugForm.severity"
            :options="severityOptions"
            label="Gravidade *"
            outlined
            emit-value
            map-options
            class="q-mb-md"
          />

          <q-select
            v-model="bugForm.relatedStep"
            :options="stepOptions"
            label="Etapa Relacionada"
            outlined
            emit-value
            map-options
            clearable
            class="q-mb-md"
          />

          <div class="q-mb-md">
            <q-file
              v-model="bugForm.attachments"
              label="Anexos (PDF, Word, PowerPoint, Excel)"
              outlined
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
              max-file-size="10485760"
              :hint="`Arquivos permitidos: PDF, Word, PowerPoint, Excel (máx. 10MB cada)`"
              counter
            >
              <template v-slot:prepend>
                <q-icon name="attach_file" />
              </template>
            </q-file>
            <div v-if="bugForm.attachments && bugForm.attachments.length > 0" class="q-mt-sm">
              <q-chip
                v-for="(file, index) in bugForm.attachments"
                :key="index"
                removable
                color="primary"
                text-color="white"
                @remove="bugForm.attachments.splice(index, 1)"
                class="q-mr-xs q-mb-xs"
              >
                {{ file.name }}
              </q-chip>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="dialog-actions">
          <q-btn flat label="Cancelar" @click="showBugDialog = false" />
          <q-btn color="negative" label="Criar Bug" @click="createBug" :loading="creatingBug" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify, useQuasar } from 'quasar'
import { scenarioService } from '../services/scenario.service'
import { getProjectMembers } from '../services/project-details.service'
import { executionService } from '../services/execution.service'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()

// State
const loading = ref(false)
const scenario = ref<any>(null)
const currentStepIndex = ref(0)
const executionStatus = ref('NOT_STARTED') // NOT_STARTED, IN_PROGRESS, COMPLETED, FAILED
const steps = ref<any[]>([])
const newComment = ref('')
const showBugDialog = ref(false)
const creatingBug = ref(false)
const projectMembers = ref<any[]>([])
const showMentionMenu = ref(false)
const mentionMenuTarget = ref<any>(null)
const mentionQuery = ref('')
const mentionStartPos = ref(0)
const loadingComments = ref(false)
const uploadingFile = ref(false)
const bugs = ref<any[]>([])
const executionHistory = ref<any[]>([])

const bugForm = ref({
  title: '',
  description: '',
  severity: 'MEDIUM',
  relatedStep: null as number | null,
  attachments: [] as File[]
})

// Computed
const currentStep = computed(() => steps.value[currentStepIndex.value])
const totalSteps = computed(() => steps.value.length)
const completedSteps = computed(() => steps.value.filter(s => s.status && s.status !== 'PENDING').length)

const severityOptions = [
  { label: 'Baixa', value: 'LOW' },
  { label: 'Média', value: 'MEDIUM' },
  { label: 'Alta', value: 'HIGH' },
  { label: 'Crítica', value: 'CRITICAL' }
]

const stepOptions = computed(() => {
  return steps.value.map((step, index) => ({
    label: `Etapa ${index + 1}: ${step.action.substring(0, 40)}...`,
    value: step.id
  }))
})

const filteredMembers = computed(() => {
  if (!mentionQuery.value) return projectMembers.value
  const query = mentionQuery.value.toLowerCase()
  return projectMembers.value.filter(m => 
    m.name.toLowerCase().includes(query) || 
    m.email.toLowerCase().includes(query)
  )
})

// Methods
function goBack() {
  const projectId = route.params.projectId
  const packageId = route.params.packageId
  const scenarioId = route.params.scenarioId
  router.push(`/projects/${projectId}/packages/${packageId}/scenarios/${scenarioId}`)
}

function goBackToPackage() {
  const projectId = route.params.projectId
  const packageId = route.params.packageId
  // Voltar para a página do pacote após concluir a execução
  router.push(`/projects/${projectId}/packages/${packageId}`)
}

async function loadScenario() {
  try {
    loading.value = true
    const scenarioId = Number(route.params.scenarioId)
    const projectId = Number(route.params.projectId)
    
    // Carregar cenário, membros, bugs e histórico em paralelo
    const [scenarioResponse, membersData, bugsData, historyData] = await Promise.all([
      scenarioService.getScenarioById(scenarioId),
      getProjectMembers(projectId),
      executionService.getBugs(scenarioId).catch(() => []),
      executionService.getHistory(scenarioId).catch(() => [])
    ])
    
    scenario.value = scenarioResponse.scenario
    projectMembers.value = membersData
    bugs.value = bugsData
    executionHistory.value = historyData
    
    // Inicializar steps com status e actualResult
    steps.value = (scenario.value.steps || []).map((step: any) => ({
      ...step,
      status: step.status || 'PENDING',
      actualResult: step.actualResult || '',
      attachments: [],
      comments: []
    }))
    
    // Carregar comentários e anexos da primeira etapa
    if (steps.value.length > 0) {
      await loadStepData(steps.value[0].id, 0)
    }
    
    // Determinar status da execução baseado PRIMARIAMENTE no status do cenário
    // O status do cenário no backend é a fonte de verdade
    
    // Primeiro: verificar status concluído
    if (scenario.value.status === 'PASSED' || scenario.value.status === 'FAILED' || 
        scenario.value.status === 'APPROVED' || scenario.value.status === 'REPROVED') {
      executionStatus.value = scenario.value.status === 'FAILED' || scenario.value.status === 'REPROVED' 
        ? 'FAILED' 
        : 'COMPLETED'
    } 
    // Segundo: verificar se está em execução (prioridade ao status EXECUTED do cenário)
    else if (scenario.value.status === 'EXECUTED') {
      // Se o cenário tem status EXECUTED, está em progresso, independente das etapas
      executionStatus.value = 'IN_PROGRESS'
    }
    // Terceiro: verificar pelas etapas (caso o status do cenário não esteja atualizado)
    else {
      const hasCompletedSteps = steps.value.some(s => s.status === 'PASSED' || s.status === 'FAILED' || s.status === 'BLOCKED')
      const allStepsCompleted = steps.value.length > 0 && steps.value.every(s => s.status && s.status !== 'PENDING')
      const hasExecutedSteps = steps.value.some(s => s.status && s.status !== 'PENDING')
      
      if (allStepsCompleted) {
        executionStatus.value = 'COMPLETED'
      } else if (hasCompletedSteps || hasExecutedSteps) {
        // Se há etapas executadas mas o cenário não está marcado como EXECUTED, ainda está em progresso
        executionStatus.value = 'IN_PROGRESS'
      } else {
        // Cenário criado e nenhuma etapa foi executada ainda
        executionStatus.value = 'NOT_STARTED'
      }
    }
  } catch (err: any) {
    console.error('Erro ao carregar cenário:', err)
    Notify.create({
      type: 'negative',
      message: err.response?.data?.message || 'Erro ao carregar cenário'
    })
  } finally {
    loading.value = false
  }
}

async function loadStepData(stepId: number, stepIndex: number) {
  try {
    loadingComments.value = true
    
    // Carregar comentários e anexos da etapa
    const [comments, attachments] = await Promise.all([
      executionService.getStepComments(stepId).catch(() => []),
      executionService.getStepAttachments(stepId).catch(() => [])
    ])
    
    // Atualizar a etapa no array
    if (steps.value[stepIndex]) {
      steps.value[stepIndex].comments = comments
      steps.value[stepIndex].attachments = attachments
      
      // Garantir que o status da etapa seja preservado
      // O status já deve vir do cenário carregado, mas vamos garantir
      if (!steps.value[stepIndex].status) {
        steps.value[stepIndex].status = 'PENDING'
      }
    }
  } catch (err: any) {
    console.error('Erro ao carregar dados da etapa:', err)
  } finally {
    loadingComments.value = false
  }
}

async function startExecution() {
  try {
    loading.value = true
    const scenarioId = Number(route.params.scenarioId)
    
    // Atualizar status local PRIMEIRO para feedback imediato ao usuário
    executionStatus.value = 'IN_PROGRESS'
    
    // Forçar atualização do DOM imediatamente
    await nextTick()
    
    // Atualizar status do cenário no backend para "Em Execução"
    await scenarioService.updateScenario(scenarioId, {
      status: 'EXECUTED' as any
    })
    
    // Atualizar status no objeto do cenário localmente
    if (scenario.value) {
      scenario.value.status = 'EXECUTED'
    }
    
    // Garantir que o status da execução está correto após todas as atualizações
    executionStatus.value = 'IN_PROGRESS'
    await nextTick()
    
    // Registrar no histórico
    await executionService.registerHistory(
      scenarioId,
      'STARTED',
      'Execução do cenário iniciada'
    )
    
    // Recarregar histórico
    executionHistory.value = await executionService.getHistory(scenarioId)
    
    Notify.create({
      type: 'positive',
      message: 'Execução iniciada!'
    })
  } catch (err: any) {
    console.error('Erro ao iniciar execução:', err)
    // Reverter status em caso de erro
    executionStatus.value = 'NOT_STARTED'
    if (scenario.value) {
      scenario.value.status = 'CREATED'
    }
    Notify.create({
      type: 'negative',
      message: 'Erro ao iniciar execução'
    })
  } finally {
    loading.value = false
  }
}

async function finishExecution() {
  try {
    loading.value = true
    
    // Determinar status final baseado nas etapas
    const hasFailedSteps = steps.value.some(s => s.status === 'FAILED')
    const allApproved = steps.value.every(s => s.status === 'PASSED')
    const hasPendingSteps = steps.value.some(s => !s.status || s.status === 'PENDING')
    
    if (hasPendingSteps) {
      Notify.create({
        type: 'warning',
        message: 'Algumas etapas ainda estão pendentes'
      })
      return
    }
    
    const scenarioId = Number(route.params.scenarioId)
    const finalStatus = hasFailedSteps ? 'FAILED' : 'PASSED'
    
    // Atualizar status do cenário no backend
    await scenarioService.updateScenario(scenarioId, {
      status: finalStatus
    })
    
    // Atualizar status local
    executionStatus.value = hasFailedSteps ? 'FAILED' : 'COMPLETED'
    if (scenario.value) {
      scenario.value.status = finalStatus
    }
    
    // Registrar no histórico
    await executionService.registerHistory(
      scenarioId,
      hasFailedSteps ? 'FAILED' : 'COMPLETED',
      hasFailedSteps ? 'Execução concluída com falhas' : 'Execução concluída com sucesso',
      {
        totalSteps: steps.value.length,
        passedSteps: steps.value.filter(s => s.status === 'PASSED').length,
        failedSteps: steps.value.filter(s => s.status === 'FAILED').length,
        blockedSteps: steps.value.filter(s => s.status === 'BLOCKED').length
      }
    )
    
    // Recarregar histórico
    executionHistory.value = await executionService.getHistory(scenarioId)
    
    Notify.create({
      type: hasFailedSteps ? 'negative' : 'positive',
      message: hasFailedSteps ? 'Execução concluída com falhas' : 'Execução concluída com sucesso!',
      actions: [
        {
          label: 'Voltar',
          color: 'white',
          handler: () => {
            goBackToPackage()
          }
        }
      ],
      timeout: 5000
    })
  } catch (err: any) {
    console.error('Erro ao concluir execução:', err)
    Notify.create({
      type: 'negative',
      message: 'Erro ao concluir execução'
    })
  } finally {
    loading.value = false
  }
}

function nextStep() {
  if (currentStepIndex.value < totalSteps.value - 1) {
    currentStepIndex.value++
  }
}

function previousStep() {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--
  }
}

async function restartExecution() {
  try {
    loading.value = true
    const scenarioId = Number(route.params.scenarioId)
    
    // Confirmar com o usuário se deseja reexecutar
    const confirmed = await new Promise<boolean>((resolve) => {
      $q.dialog({
        title: 'Reexecutar Cenário',
        message: 'Tem certeza que deseja reexecutar este cenário? Isso resetará o status de todas as etapas.',
        cancel: true,
        persistent: true,
        ok: {
          label: 'Reexecutar',
          color: 'positive'
        },
        cancel: {
          label: 'Cancelar',
          flat: true
        }
      }).onOk(() => resolve(true)).onCancel(() => resolve(false))
    })
    
    if (!confirmed) {
      loading.value = false
      return
    }
    
    // Resetar status de todas as etapas para PENDING
    for (const step of steps.value) {
      try {
        await executionService.updateStepStatus(step.id, 'PENDING', '')
      } catch (err) {
        console.error('Erro ao resetar etapa:', err)
      }
    }
    
    // Resetar status local das etapas
    steps.value = steps.value.map(step => ({
      ...step,
      status: 'PENDING',
      actualResult: ''
    }))
    
    // Voltar para a primeira etapa
    currentStepIndex.value = 0
    
    // Atualizar status do cenário no backend para EXECUTED (em execução)
    await scenarioService.updateScenario(scenarioId, {
      status: 'EXECUTED' as any
    })
    
    // Atualizar status local
    executionStatus.value = 'IN_PROGRESS'
    if (scenario.value) {
      scenario.value.status = 'EXECUTED'
    }
    
    // Registrar no histórico
    await executionService.registerHistory(
      scenarioId,
      'RESTARTED',
      'Execução do cenário reiniciada'
    )
    
    // Recarregar histórico
    executionHistory.value = await executionService.getHistory(scenarioId)
    
    Notify.create({
      type: 'positive',
      message: 'Cenário reiniciado! Você pode executar novamente.'
    })
  } catch (err: any) {
    console.error('Erro ao reiniciar execução:', err)
    Notify.create({
      type: 'negative',
      message: 'Erro ao reiniciar execução'
    })
  } finally {
    loading.value = false
  }
}

async function setStepStatus(status: string) {
  // Bloquear alteração de status se a execução estiver concluída
  if (executionStatus.value === 'COMPLETED' || executionStatus.value === 'FAILED') {
    Notify.create({
      type: 'warning',
      message: 'Não é possível alterar o status em uma execução concluída. Use "Reexecutar" para iniciar uma nova execução.',
      timeout: 3000
    })
    return
  }
  if (currentStep.value) {
    const previousStatus = currentStep.value.status
    currentStep.value.status = status
    
    try {
      const scenarioId = Number(route.params.scenarioId)
      
      // Salvar status da etapa no backend
      await executionService.updateStepStatus(
        currentStep.value.id,
        status,
        currentStep.value.actualResult
      )
      
      // Atualizar também no array de steps
      const stepIndex = steps.value.findIndex(s => s.id === currentStep.value.id)
      if (stepIndex !== -1) {
        steps.value[stepIndex].status = status
      }
      
      // Se a primeira etapa foi marcada como concluída/reprovada/bloqueada, a execução já iniciou
      const hasCompletedSteps = steps.value.some(s => s.status === 'PASSED' || s.status === 'FAILED' || s.status === 'BLOCKED')
      if (hasCompletedSteps && executionStatus.value === 'NOT_STARTED') {
        executionStatus.value = 'IN_PROGRESS'
        // Atualizar status do cenário para EXECUTED se ainda não foi
        if (scenario.value && scenario.value.status === 'CREATED') {
          try {
            await scenarioService.updateScenario(scenarioId, {
              status: 'EXECUTED' as any
            })
            scenario.value.status = 'EXECUTED'
          } catch (err) {
            console.error('Erro ao atualizar status do cenário:', err)
          }
        }
      }
      
      // Registrar no histórico
      await executionService.registerHistory(
        scenarioId,
        'STEP_COMPLETED',
        `Etapa ${currentStepIndex.value + 1} marcada como ${status}`,
        {
          stepId: currentStep.value.id,
          stepOrder: currentStepIndex.value + 1,
          status,
          action: currentStep.value.action
        }
      )
      
      // Recarregar histórico
      executionHistory.value = await executionService.getHistory(scenarioId)
      
      Notify.create({
        type: 'positive',
        message: `Status salvo: ${getStatusTranslation(status)}`,
        position: 'top',
        timeout: 1500
      })
    } catch (err: any) {
      console.error('Erro ao salvar status da etapa:', err)
      // Reverter mudança em caso de erro
      currentStep.value.status = previousStatus
      Notify.create({
        type: 'negative',
        message: 'Erro ao salvar status da etapa'
      })
    }
    
    if (status === 'FAILED') {
      // Pré-preencher formulário de bug
      bugForm.value.title = `Falha na Etapa ${currentStepIndex.value + 1}: ${currentStep.value.action.substring(0, 50)}`
      bugForm.value.description = `Ação: ${currentStep.value.action}\n\nResultado Esperado: ${currentStep.value.expected}\n\nProblema encontrado: `
      bugForm.value.relatedStep = currentStep.value.id
      bugForm.value.attachments = []
      showBugDialog.value = true
    }
    
    Notify.create({
      type: 'positive',
      message: `Etapa marcada como ${status === 'PASSED' ? 'concluída' : status === 'FAILED' ? 'reprovada' : 'bloqueada'}`
    })
  }
}

async function handleFileUpload(event: any) {
  // Bloquear upload se a execução estiver concluída
  if (executionStatus.value === 'COMPLETED' || executionStatus.value === 'FAILED') {
    Notify.create({
      type: 'warning',
      message: 'Não é possível adicionar evidências em uma execução concluída. Use "Reexecutar" para iniciar uma nova execução.',
      timeout: 3000
    })
    return
  }
  const files = Array.from(event.target.files || []) as File[]
  
  for (const file of files) {
    // Validar tipo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      Notify.create({
        type: 'negative',
        message: `Arquivo ${file.name}: tipo não permitido`
      })
      continue
    }
    
    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      Notify.create({
        type: 'negative',
        message: `Arquivo ${file.name}: tamanho máximo 5MB`
      })
      continue
    }
    
    // Upload para o servidor
    uploadingFile.value = true
    
    try {
      const attachment = await executionService.uploadStepAttachment(currentStep.value.id, file)
      
      if (!currentStep.value.attachments) {
        currentStep.value.attachments = []
      }
      
      // Adicionar o URL completo do backend
      const fullUrl = `http://localhost:3000${attachment.url}`
      currentStep.value.attachments.push({
        ...attachment,
        url: fullUrl
      })
      
      Notify.create({
        type: 'positive',
        message: `Arquivo ${file.name} anexado!`
      })
    } catch (err: any) {
      console.error('Erro ao fazer upload:', err)
      Notify.create({
        type: 'negative',
        message: `Erro ao anexar ${file.name}: ${err.response?.data?.message || err.message}`
      })
    } finally {
      uploadingFile.value = false
    }
  }
  
  // Limpar input
  event.target.value = ''
}

function handleCommentKeydown(event: KeyboardEvent) {
  const textarea = event.target as HTMLTextAreaElement
  const cursorPos = textarea.selectionStart
  const textBeforeCursor = newComment.value.substring(0, cursorPos)
  
  // Detectar @ para menções
  if (event.key === '@') {
    mentionStartPos.value = cursorPos
    mentionQuery.value = ''
    showMentionMenu.value = true
    mentionMenuTarget.value = event.target
  } else if (showMentionMenu.value) {
    // Se o menu está aberto, atualizar a query
    if (event.key === 'Escape') {
      showMentionMenu.value = false
    } else if (event.key === 'Backspace') {
      const lastAtPos = textBeforeCursor.lastIndexOf('@')
      if (lastAtPos >= 0) {
        mentionQuery.value = textBeforeCursor.substring(lastAtPos + 1)
      } else {
        showMentionMenu.value = false
      }
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      const lastAtPos = textBeforeCursor.lastIndexOf('@')
      if (lastAtPos >= 0) {
        mentionQuery.value = textBeforeCursor.substring(lastAtPos + 1) + event.key
      }
    }
  }
}

function selectMention(member: any) {
  const textarea = document.activeElement as HTMLTextAreaElement
  const cursorPos = textarea.selectionStart
  const textBeforeCursor = newComment.value.substring(0, cursorPos)
  const textAfterCursor = newComment.value.substring(cursorPos)
  const lastAtPos = textBeforeCursor.lastIndexOf('@')
  
  if (lastAtPos >= 0) {
    const beforeMention = newComment.value.substring(0, lastAtPos)
    newComment.value = beforeMention + `@${member.name} ` + textAfterCursor
  }
  
  showMentionMenu.value = false
}

async function addComment() {
  // Bloquear adição de comentário se a execução estiver concluída
  if (executionStatus.value === 'COMPLETED' || executionStatus.value === 'FAILED') {
    Notify.create({
      type: 'warning',
      message: 'Não é possível adicionar comentários em uma execução concluída. Use "Reexecutar" para iniciar uma nova execução.',
      timeout: 3000
    })
    return
  }
  
  if (!newComment.value.trim()) return
  
  try {
    // Extrair menções
    const mentionRegex = /@(\w+\s*\w*)/g
    const mentions = []
    let match
    while ((match = mentionRegex.exec(newComment.value)) !== null) {
      const mentionedName = match[1]
      const member = projectMembers.value.find(m => m.name.includes(mentionedName))
      if (member) {
        mentions.push(member.id)
      }
    }
    
    // Salvar no backend
    const comment = await executionService.addStepComment(
      currentStep.value.id,
      newComment.value,
      mentions
    )
    
    if (!currentStep.value.comments) {
      currentStep.value.comments = []
    }
    currentStep.value.comments.push(comment)
    
    newComment.value = ''
    
    // Mostrar notificação apenas se houver menções
    if (mentions.length > 0) {
      const mentionedNames = mentions
        .map(id => projectMembers.value.find(m => m.id === id)?.name)
        .filter(name => name)
        .join(', ')
      
      Notify.create({
        type: 'info',
        message: `${mentionedNames} ${mentions.length > 1 ? 'serão notificados' : 'será notificado'} sobre este comentário`,
        timeout: 2000
      })
    }
    
    Notify.create({
      type: 'positive',
      message: 'Comentário adicionado!'
    })
  } catch (err: any) {
    console.error('Erro ao adicionar comentário:', err)
    Notify.create({
      type: 'negative',
      message: `Erro ao adicionar comentário: ${err.response?.data?.message || err.message}`
    })
  }
}

async function createBug() {
  if (!bugForm.value.title.trim()) {
    Notify.create({
      type: 'negative',
      message: 'Título é obrigatório'
    })
    return
  }
  
  creatingBug.value = true
  
  try {
    const scenarioId = Number(route.params.scenarioId)
    
    // Criar bug primeiro
    const bug = await executionService.createBug(scenarioId, {
      title: bugForm.value.title,
      description: bugForm.value.description,
      severity: bugForm.value.severity as any,
      relatedStepId: bugForm.value.relatedStep || currentStep.value?.id
    })
    
    // Fazer upload dos anexos se houver
    if (bugForm.value.attachments && bugForm.value.attachments.length > 0) {
      const uploadPromises = bugForm.value.attachments.map((file: File) =>
        executionService.uploadBugAttachment(bug.id, file)
      )
      
      await Promise.all(uploadPromises)
    }
    
    // Adicionar bug à lista local
    bugs.value.push(bug)
    
    // Recarregar histórico
    executionHistory.value = await executionService.getHistory(scenarioId)
    
    Notify.create({
      type: 'positive',
      message: 'Bug criado com sucesso!'
    })
    
    executionStatus.value = 'FAILED'
    showBugDialog.value = false
    bugForm.value = {
      title: '',
      description: '',
      severity: 'MEDIUM',
      relatedStep: null,
      attachments: []
    }
  } catch (err: any) {
    console.error('Erro ao criar bug:', err)
    Notify.create({
      type: 'negative',
      message: `Erro ao criar bug: ${err.response?.data?.message || err.message}`
    })
  } finally {
    creatingBug.value = false
  }
}

function viewAttachment(attachment: any) {
  // TODO: Implementar lightbox
  window.open(attachment.url, '_blank')
}

function downloadAttachment(attachment: any) {
  const link = document.createElement('a')
  link.href = attachment.url
  link.download = attachment.filename
  link.click()
}

async function deleteAttachment(attachmentId: number) {
  if (!currentStep.value) return
  
  try {
    await executionService.deleteStepAttachment(currentStep.value.id, attachmentId)
    
    // Recarregar os anexos da etapa
    const attachments = await executionService.getStepAttachments(currentStep.value.id)
    if (currentStep.value) {
      currentStep.value.attachments = attachments
    }
    
    // Atualizar também no array de steps
    const stepIndex = steps.value.findIndex(s => s.id === currentStep.value?.id)
    if (stepIndex !== -1) {
      steps.value[stepIndex].attachments = attachments
    }
    
    Notify.create({
      type: 'positive',
      message: 'Evidência removida'
    })
  } catch (err: any) {
    console.error('Erro ao excluir evidência:', err)
    Notify.create({
      type: 'negative',
      message: err.response?.data?.message || 'Erro ao excluir evidência'
    })
  }
}

// Helper functions
function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    NOT_STARTED: 'grey',
    IN_PROGRESS: 'blue',
    COMPLETED: 'positive',
    FAILED: 'negative'
  }
  return colors[status] || 'grey'
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    NOT_STARTED: 'Não Iniciado',
    IN_PROGRESS: 'Em Execução',
    COMPLETED: 'Concluído',
    FAILED: 'Falha'
  }
  return labels[status] || status
}

function getStepStatusColor(status: string) {
  const colors: Record<string, string> = {
    PENDING: 'grey-6',
    PASSED: 'positive',
    FAILED: 'negative',
    BLOCKED: 'warning'
  }
  return colors[status] || 'grey-6'
}

function isImage(mimeType: string) {
  return mimeType.startsWith('image/')
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return 'picture_as_pdf'
  return 'insert_drive_file'
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

function getStatusTranslation(status: string) {
  const translations: Record<string, string> = {
    'PASSED': 'Concluído',
    'FAILED': 'Reprovado',
    'BLOCKED': 'Bloqueado',
    'PENDING': 'Pendente'
  }
  return translations[status] || status
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('pt-BR')
}

onMounted(() => {
  loadScenario()
})

// Carregar dados da etapa quando mudar de etapa
watch(currentStepIndex, (newIndex) => {
  if (steps.value[newIndex] && steps.value[newIndex].id) {
    loadStepData(steps.value[newIndex].id, newIndex)
  }
})
</script>

<style scoped>
.scenario-execution-page {
  background: #f8fafc;
  min-height: 100vh;
}

/* Fixed Header */
.execution-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(10px);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px 40px;
  max-width: 1600px;
  margin: 0 auto;
}

.back-btn {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.back-btn:hover {
  transform: translateX(-4px);
}

.header-info {
  flex: 1;
  min-width: 0;
}

.scenario-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  letter-spacing: -0.5px;
  line-height: 1.3;
}

.scenario-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.responsible {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 14px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.action-button {
  font-weight: 600;
  padding: 10px 24px;
  border-radius: 10px;
  text-transform: none;
  letter-spacing: 0.3px;
  transition: all 0.3s ease;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.action-button-secondary {
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 10px;
  text-transform: none;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.15);
}

.action-button-secondary:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Main Content */
.execution-content {
  display: flex;
  padding-top: 100px;
  height: 100vh;
  max-width: 1600px;
  margin: 0 auto;
  gap: 24px;
  padding-left: 24px;
  padding-right: 24px;
}

/* Steps Sidebar */
.steps-sidebar {
  width: 340px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  flex-shrink: 0;
  height: fit-content;
  position: sticky;
  top: 120px;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.sidebar-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-bottom: none;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.3px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Progress Section in Sidebar */
.progress-section {
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.2;
}

.progress-percentage-badge {
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}

.progress-bar-inline {
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.steps-list {
  padding: 12px;
  max-height: calc(100vh - 450px);
  overflow-y: auto;
}

.step-item {
  border-radius: 14px;
  margin-bottom: 6px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.step-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.step-item:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  transform: translateX(4px);
  border-color: rgba(102, 126, 234, 0.2);
}

.step-item:hover::before {
  width: 4px;
}

.step-item.q-item--active {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-color: #667eea;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
  transform: translateX(6px);
}

.step-item.q-item--active::before {
  width: 4px;
}

.step-title {
  font-weight: 700;
  font-size: 15px;
  color: #1e293b;
  letter-spacing: -0.2px;
}

.step-caption {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  margin-top: 2px;
}

/* Step Details Panel */
.step-details-panel {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  padding-bottom: 40px;
  background: linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%);
}

.step-content {
  max-width: 100%;
  padding: 0 28px;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.step-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
}

.step-actions {
  display: flex;
  gap: 8px;
}

.step-section {
  margin-bottom: 20px;
  border-radius: 20px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(102, 126, 234, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.step-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.step-section:hover {
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
  border-color: rgba(102, 126, 234, 0.2);
}

.step-section:hover::before {
  opacity: 1;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.3px;
}

.section-content {
  font-size: 15px;
  line-height: 1.7;
  color: #475569;
  font-weight: 500;
}

/* Status Buttons */
.status-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.status-btn {
  min-width: 140px;
  font-weight: 600;
  border-radius: 12px;
  text-transform: none;
  letter-spacing: 0.3px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.status-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

/* Attachments */
.attachments-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.attachments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.attachment-item {
  position: relative;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.attachment-preview {
  height: 150px;
  cursor: pointer;
}

.attachment-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  color: white;
}

.attachment-preview:hover .attachment-overlay {
  opacity: 1;
}

.attachment-file {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 150px;
  padding: 16px;
  text-align: center;
}

.file-name {
  font-size: 12px;
  margin-top: 8px;
  word-break: break-all;
}

.attachment-actions {
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.no-attachments {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
}

.add-attachment-btn {
  width: 100%;
}

/* Comments */
.comments-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-date {
  font-size: 12px;
  color: #94a3b8;
}

.comment-content p {
  margin: 0;
  font-size: 14px;
  color: #475569;
}

.no-comments {
  text-align: center;
  padding: 32px;
  color: #94a3b8;
}

.add-comment {
  display: flex;
  gap: 12px;
}

.comment-input {
  flex: 1;
}

.comment-btn {
  align-self: flex-end;
}

/* Rich Text Editor */
.result-editor {
  min-height: 150px;
}

.result-editor :deep(.q-editor__content) {
  min-height: 120px;
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
  color: #64748b;
}

/* Dialog */
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
}

.dialog-content {
  padding: 24px;
}

.dialog-actions {
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  justify-content: flex-end;
}
</style>

