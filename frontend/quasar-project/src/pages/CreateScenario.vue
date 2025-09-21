<template>
  <q-page class="q-pa-none">
    <!-- BG blur -->
    <div class="hero" />

    <!-- Glass container -->
    <section class="glass-shell">
      <div class="header-row">
        <div class="header-left">
          <q-btn 
            flat 
            round 
            color="primary" 
            icon="arrow_back" 
            size="md"
            @click="goBack"
            class="back-btn"
          >
            <q-tooltip>Voltar ao projeto</q-tooltip>
          </q-btn>
          
          <div class="title-wrap">
            <q-avatar color="primary" text-color="white" size="40px" icon="add_task" />
            <div>
              <div class="title">Criar Cenário de Teste</div>
              <div class="subtitle">Adicione novos cenários de teste ao projeto</div>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <q-btn 
            color="primary" 
            unelevated 
            size="md" 
            label="Criar Cenário" 
            @click="submitForm"
            :loading="creatingScenario"
            class="create-btn"
          />
        </div>
      </div>

      <!-- Form Section -->
      <q-card flat bordered class="form-panel">
        <q-card-section class="panel-head">
          <q-icon name="description" size="22px" class="q-mr-sm" />
          <div class="panel-title">Dados do Cenário</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-form ref="formRef" @submit.prevent="onSubmit" class="q-gutter-md">
            <div class="form-grid">
              <div class="form-row">
                <q-input
                  v-model="scenarioForm.title"
                  label="Título *"
                  outlined
                  :rules="titleRules"
                  class="form-field"
                />
                <q-select
                  v-model="scenarioForm.type"
                  :options="scenarioTypes"
                  label="Tipo *"
                  outlined
                  :rules="typeRules"
                  class="form-field"
                />
              </div>
              
              <div class="form-row">
                <q-select
                  v-model="scenarioForm.priority"
                  :options="priorityOptions"
                  label="Prioridade *"
                  outlined
                  :rules="priorityRules"
                  class="form-field"
                />
                <q-select
                  v-model="scenarioForm.environment"
                  :options="environmentOptions"
                  label="Ambiente"
                  outlined
                  class="form-field"
                />
              </div>

              <div class="form-row">
                <q-select
                  v-model="scenarioForm.assigneeId"
                  :options="memberOptions"
                  label="Responsável"
                  outlined
                  clearable
                  class="form-field"
                  @update:model-value="onAssigneeChange"
                >
                  <template v-slot:prepend>
                    <q-icon name="person" />
                  </template>
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section avatar>
                        <q-avatar :color="getMemberAvatarColor(scope.opt)" text-color="white" size="32px">
                          {{ getMemberInitials(scope.opt) }}
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ scope.opt.label }}</q-item-label>
                        <q-item-label caption>{{ scope.opt.email }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
                <q-input
                  v-model="scenarioForm.release"
                  label="Release"
                  outlined
                  readonly
                  class="form-field"
                />
              </div>

              <q-input
                v-model="scenarioForm.description"
                label="Descrição"
                type="textarea"
                outlined
                rows="3"
                class="form-field"
              />

              <q-input
                v-model="tagsInput"
                label="Tags (separadas por vírgula)"
                outlined
                @update:model-value="updateTags"
                class="form-field"
              >
                <template v-slot:after>
                  <q-btn
                    flat
                    dense
                    icon="add"
                    @click="addTag"
                  />
                </template>
              </q-input>

              <div class="tags-display">
                <q-chip
                  v-for="tag in scenarioForm.tags"
                  :key="tag"
                  removable
                  @remove="removeTag(tag)"
                  color="primary"
                  text-color="white"
                >
                  {{ tag }}
                </q-chip>
              </div>
            </div>

            <!-- Steps Section -->
            <div class="steps-section">
              <h3 class="steps-title">Passos do Cenário</h3>
              <div
                v-for="(step, index) in scenarioForm.steps"
                :key="step.id"
                class="step-item"
              >
                <div class="step-number">{{ index + 1 }}</div>
                <div class="step-fields">
                  <q-input
                    v-model="step.action"
                    label="Ação"
                    outlined
                    dense
                    class="step-field"
                  />
                  <q-input
                    v-model="step.expected"
                    label="Resultado Esperado"
                    outlined
                    dense
                    class="step-field"
                  />
                </div>
                <q-btn
                  flat
                  round
                  icon="remove"
                  color="negative"
                  @click="removeStep(step.id)"
                  class="remove-step-btn"
                />
              </div>
              <q-btn
                outline
                icon="add"
                label="Adicionar Passo"
                @click="addStep"
                class="add-step-btn"
              />
            </div>

            <div class="form-actions">
              <q-btn
                type="submit"
                color="primary"
                label="Criar Cenário"
                :loading="creatingScenario"
                class="create-btn"
              />
              <q-btn
                outline
                label="Limpar"
                @click="resetForm"
                class="clear-btn"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { 
  createTestPackage, 
  getProjectDetails,
  getAvailableReleases,
  type ProjectMember
} from '../services/project-details.service'

// Composables
const route = useRoute()
const router = useRouter()
const $q = useQuasar()

// State
const members = ref<ProjectMember[]>([])
const availableReleases = ref<string[]>([])
const creatingScenario = ref(false)
const loading = ref(false)

// Scenario form
const scenarioForm = ref({
  title: '',
  description: '',
  type: 'Functional' as 'Functional' | 'Regression' | 'Smoke' | 'E2E',
  priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
  tags: [] as string[],
  steps: [
    { id: 1, action: '', expected: '' }
  ],
  assigneeId: null as number | null,
  assigneeEmail: '',
  environment: 'QA' as 'Dev' | 'QA' | 'Staging' | 'Prod' | undefined,
  release: '2024-09'
})

const tagsInput = ref('')
const formRef = ref<any>(null)

// Options
const scenarioTypes = ['Functional', 'Regression', 'Smoke', 'E2E']
const priorityOptions = ['Low', 'Medium', 'High', 'Critical']
const environmentOptions = ['Dev', 'QA', 'Staging', 'Prod']

// Computed
const projectId = computed(() => Number(route.params.projectId))

const memberOptions = computed(() => {
  return members.value.map(member => ({
    label: member.name,
    value: member.id,
    email: member.email,
    avatar: member.avatar
  }))
})

// Validation rules
const titleRules = [
  (v: string) => !!v || 'Título é obrigatório',
  (v: string) => v.length >= 3 || 'Mínimo 3 caracteres'
]

const typeRules = [
  (v: string) => !!v || 'Tipo é obrigatório'
]

const priorityRules = [
  (v: string) => !!v || 'Prioridade é obrigatória'
]

// Navigation
function goBack() {
  router.push(`/projects/${projectId.value}`)
}

// Form functions
function onAssigneeChange(assigneeId: number | null) {
  if (assigneeId) {
    const member = members.value.find(m => m.id === assigneeId)
    if (member) {
      scenarioForm.value.assigneeEmail = member.email
    }
  } else {
    scenarioForm.value.assigneeEmail = ''
  }
}

function getMemberInitials(member: any) {
  const name = member.label || member.name || 'U'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

function getMemberAvatarColor(member: any) {
  const colors = ['primary', 'secondary', 'accent', 'positive', 'info', 'warning', 'negative']
  const name = member.label || member.name || 'user'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function updateTags() {
  if (tagsInput.value.includes(',')) {
    const newTags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag)
    scenarioForm.value.tags = [...new Set([...scenarioForm.value.tags, ...newTags])]
    tagsInput.value = ''
  }
}

function addTag() {
  if (tagsInput.value.trim()) {
    const newTag = tagsInput.value.trim()
    if (!scenarioForm.value.tags.includes(newTag)) {
      scenarioForm.value.tags.push(newTag)
    }
    tagsInput.value = ''
  }
}

function removeTag(tag: string) {
  scenarioForm.value.tags = scenarioForm.value.tags.filter(t => t !== tag)
}

function addStep() {
  const newId = Math.max(...scenarioForm.value.steps.map(s => s.id), 0) + 1
  scenarioForm.value.steps.push({ id: newId, action: '', expected: '' })
}

function removeStep(stepId: number) {
  if (scenarioForm.value.steps.length > 1) {
    scenarioForm.value.steps = scenarioForm.value.steps.filter(s => s.id !== stepId)
  }
}

function resetForm() {
  scenarioForm.value = {
    title: '',
    description: '',
    type: 'Functional',
    priority: 'Medium',
    tags: [],
    steps: [{ id: 1, action: '', expected: '' }],
    assigneeId: null,
    assigneeEmail: '',
    environment: 'QA',
    release: '2024-09'
  }
  tagsInput.value = ''
  if (formRef.value?.resetValidation) {
    formRef.value.resetValidation()
  }
}

async function onSubmit() {
  const ok = await formRef.value?.validate?.()
  if (!ok) return

  creatingScenario.value = true
  try {
    // Converter tipos para o formato esperado pelo backend
    const scenarioData = {
      ...scenarioForm.value,
      type: scenarioForm.value.type.toUpperCase(),
      priority: scenarioForm.value.priority.toUpperCase(),
      environment: scenarioForm.value.environment?.toUpperCase(),
      steps: scenarioForm.value.steps.map(step => ({
        action: step.action,
        expected: step.expected
      }))
    }
    
    await createTestPackage(projectId.value, scenarioData)
    
    $q.notify({
      type: 'positive',
      message: 'Cenário criado com sucesso!',
      position: 'top'
    })
    
    resetForm()
    goBack()
  } catch (error) {
    console.error('Error creating scenario:', error)
    $q.notify({
      type: 'negative',
      message: 'Erro ao criar cenário',
      position: 'top'
    })
  } finally {
    creatingScenario.value = false
  }
}

function submitForm() {
  onSubmit()
}

// Data loading
async function loadData() {
  loading.value = true
  try {
    const [projectData, releasesData] = await Promise.all([
      getProjectDetails(projectId.value),
      getAvailableReleases(projectId.value)
    ])
    
    members.value = projectData.members || []
    availableReleases.value = releasesData
    
    if (releasesData.length > 0 && releasesData[0]) {
      scenarioForm.value.release = releasesData[0]
    }
  } catch (error) {
    console.error('Error loading data:', error)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar dados',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.hero {
  position: fixed;
  inset: 0;
  background-image: url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1920&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  filter: blur(6px) saturate(110%);
  transform: scale(1.05);
  z-index: 0;
}

.glass-shell {
  position: relative;
  z-index: 1;
  width: min(1200px, 94vw);
  margin: 56px auto;
  padding: 18px 18px 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, .58);
  border: 1px solid rgba(255, 255, 255, .7);
  box-shadow:
    0 20px 50px rgba(0, 0, 0, .18),
    inset 0 1px 0 rgba(255, 255, 255, .7);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px 6px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  transition: all 0.2s ease;
}

.back-btn:hover {
  transform: translateX(-2px);
  background-color: rgba(25, 118, 210, 0.08);
}

.title-wrap {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.create-btn {
  font-weight: 500;
}

.form-panel {
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, .85);
  margin-top: 20px;
}

.panel-head {
  display: flex;
  align-items: center;
  padding: 12px 16px;
}

.panel-title {
  font-weight: 600;
  font-size: 15px;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-field {
  width: 100%;
}

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.steps-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
}

.steps-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #1a1a1a;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1976d2;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.step-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1;
}

.step-field {
  width: 100%;
}

.remove-step-btn {
  margin-left: auto;
}

.add-step-btn {
  margin-top: 12px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .step-fields {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>
