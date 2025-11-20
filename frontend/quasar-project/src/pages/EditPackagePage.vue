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
            <q-tooltip>Voltar aos pacotes</q-tooltip>
          </q-btn>
          <div class="header-content">
            <h1 class="page-title">Editar Pacote</h1>
          </div>
        </div>
      </div>
      <div class="subtitle">Edite as informações do pacote de teste</div>
    </section>

    <!-- Formulário -->
    <q-card class="form-card">
      <q-card-section>
        <q-form ref="formRef" @submit.prevent="onSubmit" class="q-gutter-md">
          <!-- Informações Básicas -->
          <div class="form-section">
            <h3 class="section-title">Informações Básicas</h3>
            <div class="form-row">
              <q-input
                v-model="packageForm.name"
                label="Nome do Pacote *"
                outlined
                class="form-input"
                :rules="nameRules"
              />
              <q-input
                v-model="packageForm.description"
                label="Descrição"
                outlined
                type="textarea"
                rows="3"
                class="form-input"
              />
            </div>
          </div>

          <!-- Configurações -->
          <div class="form-section">
            <h3 class="section-title">Configurações</h3>
            <div class="form-row">
              <q-select
                v-model="packageForm.type"
                :options="packageTypes"
                label="Tipo *"
                outlined
                class="form-input"
                :rules="typeRules"
                emit-value
                map-options
              />
              <q-select
                v-model="packageForm.priority"
                :options="priorityOptions"
                label="Prioridade *"
                outlined
                class="form-input"
                :rules="priorityRules"
                emit-value
                map-options
              />
            </div>
            <div class="form-row">
              <q-select
                v-model="packageForm.environment"
                :options="environmentOptions"
                label="Ambiente"
                outlined
                class="form-input"
                emit-value
                map-options
              />
              <q-input
                v-model="packageForm.release"
                label="Release *"
                outlined
                class="form-input"
                :rules="releaseRules"
              />
            </div>
          </div>

          <!-- Tags -->
          <div class="form-section">
            <h3 class="section-title">Tags</h3>
            <q-input
              v-model="tagsInput"
              label="Tags (separadas por vírgula)"
              outlined
              class="form-input"
              @blur="updateTags"
              @keyup.enter="addTag"
            />
            <div v-if="packageForm.tags.length > 0" class="tags-container">
              <q-chip
                v-for="(tag, index) in packageForm.tags"
                :key="index"
                removable
                @remove="removeTag(index)"
                :color="getTagColor(tag)"
                text-color="white"
                class="tag-chip"
              >
                {{ tag }}
              </q-chip>
            </div>
          </div>

          <!-- Responsável -->
          <div class="form-section">
            <h3 class="section-title">Responsável</h3>
            <q-select
              v-model="packageForm.assigneeId"
              :options="memberOptions"
              label="Responsável pelo Pacote"
              outlined
              clearable
              class="form-input"
              option-value="id"
              option-label="label"
            />
          </div>

          <!-- Botões -->
          <div class="form-actions">
            <q-btn
              type="button"
              color="grey"
              label="Cancelar"
              @click="goBack"
              class="action-btn"
            />
            <q-btn
              type="submit"
              color="primary"
              label="Salvar Alterações"
              :loading="updatingPackage"
              class="action-btn"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { 
  getProjectDetails,
  getAvailableReleases,
  type ProjectMember
} from '../services/project-details.service'
import { getPackageDetails, updatePackage } from '../services/package.service'
import logger from '../utils/logger'

// Composables
const route = useRoute()
const router = useRouter()
const $q = useQuasar()

// Dados
const members = ref<ProjectMember[]>([])
const availableReleases = ref<string[]>([])
const updatingPackage = ref(false)
const loading = ref(false)

// Formulário
const packageForm = ref({
  name: '',
  description: '',
  type: 'FUNCTIONAL' as 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E',
  priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  tags: [] as string[],
  assigneeId: null as number | null,
  assigneeEmail: '',
  environment: 'QA' as 'DEV' | 'QA' | 'STAGING' | 'PROD' | null,
  release: '2024-09'
})

const tagsInput = ref('')
const formRef = ref<{ validate?: () => Promise<boolean> } | null>(null)

// Opções
const packageTypes = [
  { label: 'Funcional', value: 'FUNCTIONAL' },
  { label: 'Regressão', value: 'REGRESSION' },
  { label: 'Smoke', value: 'SMOKE' },
  { label: 'End-to-End', value: 'E2E' }
]
const priorityOptions = [
  { label: 'Baixa', value: 'LOW' },
  { label: 'Média', value: 'MEDIUM' },
  { label: 'Alta', value: 'HIGH' },
  { label: 'Crítica', value: 'CRITICAL' }
]
const environmentOptions = [
  { label: 'Desenvolvimento', value: 'DEV' },
  { label: 'QA', value: 'QA' },
  { label: 'Staging', value: 'STAGING' },
  { label: 'Produção', value: 'PROD' }
]

// Computed
const projectId = computed(() => Number(route.params.projectId))
const packageId = computed(() => Number(route.params.packageId))

const memberOptions = computed(() => {
  return members.value.map(member => ({
    ...member,
    label: `${member.name} (${member.email})`
  }))
})

// Validações
const nameRules = [
  (val: string) => !!val || 'Nome é obrigatório',
  (val: string) => val.length >= 3 || 'Nome deve ter pelo menos 3 caracteres'
]

const typeRules = [
  (val: string) => !!val || 'Tipo é obrigatório'
]

const priorityRules = [
  (val: string) => !!val || 'Prioridade é obrigatória'
]

const releaseRules = [
  (val: string) => !!val || 'Release é obrigatória'
]

// Funções
const goBack = () => {
  void router.push(`/projects/${projectId.value}/packages`)
}

const getTagColor = (tag: string) => {
  const colors = ['primary', 'secondary', 'accent', 'positive', 'info', 'warning', 'negative']
  const index = tag.length % colors.length
  return colors[index]
}

const updateTags = () => {
  if (tagsInput.value.trim()) {
    const newTags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag)
    packageForm.value.tags = [...new Set([...packageForm.value.tags, ...newTags])]
    tagsInput.value = ''
  }
}

const addTag = () => {
  const newTag = tagsInput.value.trim()
  if (newTag && !packageForm.value.tags.includes(newTag)) {
    packageForm.value.tags.push(newTag)
    tagsInput.value = ''
  }
}

const removeTag = (index: number) => {
  packageForm.value.tags.splice(index, 1)
}

async function onSubmit() {
  const ok = await formRef.value?.validate?.()
  if (!ok) return

  updatingPackage.value = true
  try {
    // Preparar dados para a API
    const packageData: {
      title: string
      description: string
      type: 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E'
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      release: string
      tags: string[]
      environment?: 'DEV' | 'QA' | 'STAGING' | 'PROD'
      assigneeEmail?: string
    } = {
      title: packageForm.value.name,
      description: packageForm.value.description,
      type: packageForm.value.type,
      priority: packageForm.value.priority,
      release: packageForm.value.release,
      tags: packageForm.value.tags
    }

    if (packageForm.value.environment) {
      packageData.environment = packageForm.value.environment
    }

    if (packageForm.value.assigneeEmail) {
      packageData.assigneeEmail = packageForm.value.assigneeEmail
    }
    
    await updatePackage(projectId.value, packageId.value, packageData)
    
    $q.notify({
      type: 'positive',
      message: 'Pacote atualizado com sucesso!',
      position: 'top'
    })
    
    goBack()
  } catch (error: unknown) {
    logger.error('Error updating package:', error)
    $q.notify({
      type: 'negative',
      message: 'Erro ao atualizar pacote',
      position: 'top'
    })
  } finally {
    updatingPackage.value = false
  }
}

// Data loading
async function loadData() {
  loading.value = true
  try {
    const [projectData, releasesData, packageData] = await Promise.all([
      getProjectDetails(projectId.value),
      getAvailableReleases(projectId.value),
      getPackageDetails(projectId.value, packageId.value)
    ])

    members.value = projectData.members
    availableReleases.value = releasesData

    // Preencher formulário com dados do pacote
    packageForm.value = {
      name: packageData.title,
      description: packageData.description || '',
      type: packageData.type,
      priority: packageData.priority,
      tags: packageData.tags || [],
      assigneeId: null, // Busca por assignee - implementação futura
      assigneeEmail: packageData.assigneeEmail || '',
      environment: packageData.environment || 'QA',
      release: packageData.release
    }

    // Preencher tags input
    tagsInput.value = packageForm.value.tags.join(', ')
  } catch (error: unknown) {
    logger.error('Error loading data:', error)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar dados'
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped>
.hero {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #ffffff;
  z-index: -1;
}

.glass-shell {
  background: #ffffff;
  border-radius: 20px;
  margin: 20px;
  padding: 30px;
  border: 1px solid #e5e7eb;
}

.header-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.back-btn {
  background: #f3f4f6;
  color: #374151;
}

.back-btn:hover {
  background: #e5e7eb;
}

.header-content {
  flex: 1;
}

.page-title {
  color: #1f2937;
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
}

.subtitle {
  color: #6b7280;
  font-size: 1.1rem;
  margin-bottom: 30px;
}

.form-card {
  margin: 20px;
  border-radius: 15px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  background: #ffffff;
}

.form-section {
  margin-bottom: 30px;
}

.section-title {
  color: #1a202c;
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e2e8f0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.form-input {
  width: 100%;
}

.form-input :deep(.q-field__label) {
  color: #374151 !important;
  font-weight: 500 !important;
}

.form-input :deep(.q-field__native) {
  color: #1f2937 !important;
}

.form-input :deep(.q-field__input) {
  color: #1f2937 !important;
}

.form-input :deep(.q-field__control) {
  background: #ffffff !important;
  border-color: #d1d5db !important;
}

.form-input :deep(.q-field--outlined .q-field__control) {
  border: 1px solid #d1d5db !important;
}

.form-input :deep(.q-field--focused .q-field__control) {
  border-color: #667eea !important;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1) !important;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.tag-chip {
  margin: 2px;
}

.form-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.action-btn {
  min-width: 150px;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
}
</style>
