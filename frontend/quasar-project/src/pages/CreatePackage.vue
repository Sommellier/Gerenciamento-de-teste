<template>
  <div class="create-package-page">
    <div class="page-header">
      <q-card class="glass-card header-card">
        <q-card-section class="header-content">
          <div class="title-section">
            <q-btn
              flat
              round
              icon="arrow_back"
              @click="goBack"
              class="back-btn"
              color="primary"
              size="lg"
            />
            <q-icon name="add_box" class="section-icon" />
            <div class="title-wrapper">
              <h1 class="page-title">Criar Pacote de Teste</h1>
              <p class="subtitle">Preencha os dados para criar um novo pacote de teste</p>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <q-card class="form-card glass-card">
      <q-form @submit="onSubmit" class="package-form">
        <q-card-section class="form-section">
          <!-- Informações Básicas -->
          <div class="form-group">
            <h3 class="group-title">Informações Básicas</h3>
            
            <div class="form-row">
              <q-input
                v-model="form.title"
                label="Título do Pacote *"
                :rules="createRequiredRule('Título')"
                filled
                dark
                label-color="white"
                input-class="text-white"
                class="form-input"
                hint="Ex: Login e Autenticação"
              />
            </div>

            <div class="form-row">
              <q-input
                v-model="form.description"
                label="Descrição"
                type="textarea"
                filled
                dark
                label-color="white"
                input-class="text-white"
                class="form-input"
                hint="Descrição detalhada do pacote de teste"
                rows="3"
              />
            </div>

            <div class="form-row">
              <div class="form-col">
                <q-select
                  v-model="form.type"
                  :options="typeOptions"
                  label="Tipo *"
                  filled
                  dark
                  label-color="white"
                  :rules="createRequiredRule('Tipo')"
                  class="form-input"
                />
              </div>
              <div class="form-col">
                <q-select
                  v-model="form.priority"
                  :options="priorityOptions"
                  label="Prioridade *"
                  filled
                  dark
                  label-color="white"
                  :rules="createRequiredRule('Prioridade')"
                  class="form-input"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-col">
                <q-select
                  v-model="form.environment"
                  :options="environmentOptions"
                  label="Ambiente"
                  filled
                  dark
                  label-color="white"
                  class="form-input"
                />
              </div>
              <div class="form-col">
                <div class="release-field">
                  <q-select
                    v-model="form.release"
                    :options="releaseOptions"
                    label="Release *"
                    filled
                    dark
                    label-color="white"
                    :rules="createRequiredRule('Release')"
                    class="form-input"
                    :loading="loadingData"
                    hint="Selecione uma release existente"
                  />
                  <q-btn
                    @click="openCreateReleaseDialog"
                    icon="add"
                    label="Nova Release"
                    color="primary"
                    outline
                    size="sm"
                    class="create-release-btn"
                  />
                </div>
              </div>
            </div>

            <div class="form-row">
              <q-select
                v-model="form.assigneeEmail"
                :options="members"
                label="Email do Responsável"
                filled
                dark
                label-color="white"
                class="form-input"
                :loading="loadingData"
                hint="Selecione um membro do projeto"
                clearable
              />
            </div>

            <div class="form-row">
              <q-input
                v-model="tagsInput"
                label="Tags"
                filled
                dark
                label-color="white"
                input-class="text-white"
                class="form-input"
                hint="Separe as tags por vírgula"
                @input="updateTags"
              />
              <div class="tags-display" v-if="form.tags.length > 0">
                <q-chip
                  v-for="tag in form.tags"
                  :key="tag"
                  :label="tag"
                  removable
                  @remove="removeTag(tag)"
                  color="primary"
                  text-color="white"
                />
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="form-actions">
          <q-btn
            type="button"
            label="Cancelar"
            color="grey"
            @click="goBack"
            class="action-btn"
          />
          <q-btn
            type="submit"
            label="Criar Pacote"
            color="primary"
            :loading="loading"
            class="action-btn primary"
          />
        </q-card-actions>
      </q-form>
    </q-card>

    <!-- Modal para criar nova release -->
    <q-dialog v-model="showCreateReleaseDialog" persistent>
      <q-card style="min-width: 400px" class="glass-card">
        <q-card-section>
          <div class="text-h6" style="color: #fff">Criar Nova Release</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newRelease"
            label="Data da Release *"
            filled
            dark
            label-color="white"
            input-class="text-white"
            hint="Selecione a data da release"
            readonly
            @click="showDatePicker = true"
            :rules="createRequiredRule('Data da release')"
          >
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="newRelease"
                    mask="YYYY-MM-DD"
                    :options="dateOptions"
                    @update:model-value="onDateSelected"
                  >
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Fechar" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Cancelar"
            color="grey"
            @click="cancelCreateRelease"
            :disable="creatingRelease"
          />
          <q-btn
            label="Criar Release"
            color="primary"
            @click="createNewRelease"
            :loading="creatingRelease"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { createPackage } from '../services/package.service'
import { getProjectReleases, getProjectMembers, addRelease } from '../services/project.service'
import { TYPE_OPTIONS, PRIORITY_OPTIONS, ENVIRONMENT_OPTIONS } from '../utils/constants'
import { createRequiredRule, getOptionValue } from '../utils/helpers'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()

const loading = ref(false)
const loadingData = ref(false)

// Formulário
const form = ref({
  title: '',
  description: '',
  type: '',
  priority: '',
  environment: '',
  release: '',
  assigneeEmail: '',
  tags: [] as string[]
})

const tagsInput = ref('')

// Dados carregados
const releases = ref<string[]>([])
const members = ref<Array<{ label: string; value: string }>>([])

// Estado do modal de criação de release
const showCreateReleaseDialog = ref(false)
const newRelease = ref('')
const creatingRelease = ref(false)
const showDatePicker = ref(false)

// Opções dos selects (importadas de utils/constants)
const typeOptions = TYPE_OPTIONS
const priorityOptions = PRIORITY_OPTIONS
const environmentOptions = ENVIRONMENT_OPTIONS

// Computed para opções de release
const releaseOptions = computed(() => {
  return releases.value.map(release => ({
    label: release,
    value: release
  }))
})

// Função para validar datas (não permitir datas passadas)
const dateOptions = (date: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Resetar horas para comparar apenas a data
  const selectedDate = new Date(date)
  selectedDate.setHours(0, 0, 0, 0) // Resetar horas para comparar apenas a data
  return selectedDate >= today
}

// Função chamada quando uma data é selecionada
const onDateSelected = (date: string) => {
  newRelease.value = date
  showDatePicker.value = false
}

// Métodos
const loadProjectData = async () => {
  try {
    loadingData.value = true
    console.log('Route params:', route.params)
    console.log('ProjectId from params:', route.params.projectId)
    const projectId = Number(route.params.projectId)
    console.log('ProjectId after Number():', projectId)
    
    if (!projectId || isNaN(projectId)) {
      throw new Error('ID do projeto inválido')
    }
    
    // Carregar releases e membros em paralelo
    const [releasesData, membersData] = await Promise.all([
      getProjectReleases(projectId),
      getProjectMembers(projectId)
    ])
    
    releases.value = releasesData
    interface Member {
      user?: {
        name?: string
        email?: string
      }
      name?: string
      email?: string
    }
    const membersDataTyped = membersData as Member[]
    members.value = membersDataTyped
      .map(member => {
        const email = member.user?.email ?? member.email ?? ''
        if (!email) return null
        return {
          label: `${member.user?.name ?? member.name ?? email} (${email})`,
          value: email
        }
      })
      .filter((member): member is { label: string; value: string } => member !== null)
  } catch (error: unknown) {
    console.error('Erro ao carregar dados do projeto:', error)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar dados do projeto'
    })
  } finally {
    loadingData.value = false
  }
}

const updateTags = () => {
  const tags = tagsInput.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
  form.value.tags = tags
}

const removeTag = (tagToRemove: string) => {
  form.value.tags = form.value.tags.filter(tag => tag !== tagToRemove)
  tagsInput.value = form.value.tags.join(', ')
}

const goBack = () => {
  router.back()
}

const openCreateReleaseDialog = () => {
  newRelease.value = ''
  showCreateReleaseDialog.value = true
}

const createNewRelease = () => {
  if (!newRelease.value.trim()) {
    $q.notify({
      type: 'negative',
      message: 'Selecione uma data para a release'
    })
    return
  }

  try {
    creatingRelease.value = true
    
    // Adicionar a nova release à lista
    const updatedReleases = addRelease(releases.value, newRelease.value)
    releases.value = updatedReleases || [...releases.value, newRelease.value]
    
    // Selecionar a nova release
    form.value.release = newRelease.value
    
    // Fechar o modal
    showCreateReleaseDialog.value = false
    newRelease.value = ''
    
    
    $q.notify({
      type: 'positive',
      message: 'Release criada com sucesso!'
    })
  } catch (error: unknown) {
    console.error('Erro ao criar release:', error)
    $q.notify({
      type: 'negative',
      message: 'Erro ao criar release'
    })
  } finally {
    creatingRelease.value = false
  }
}

const cancelCreateRelease = () => {
  showCreateReleaseDialog.value = false
  newRelease.value = ''
}

const onSubmit = async () => {
  try {
    loading.value = true

    const projectId = route.params.projectId as string
    console.log('onSubmit - projectId:', projectId)
    
    // Converter objetos para valores antes de enviar (getOptionValue importado de utils/helpers)
    type PackageType = 'FUNCTIONAL' | 'REGRESSION' | 'SMOKE' | 'E2E'
    type PackagePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    type PackageEnvironment = 'DEV' | 'QA' | 'STAGING' | 'PROD'

    const assigneeEmailValue = getOptionValue(form.value.assigneeEmail)
    const environmentValue = getOptionValue(form.value.environment)
    
    const packageData: {
      title: string
      description?: string
      type: PackageType
      priority: PackagePriority
      environment?: PackageEnvironment
      release: string
      assigneeEmail?: string
      tags: string[]
    } = {
      title: form.value.title,
      description: form.value.description,
      type: getOptionValue(form.value.type) as PackageType,
      priority: getOptionValue(form.value.priority) as PackagePriority,
      release: getOptionValue(form.value.release),
      tags: form.value.tags
    }
    
    if (environmentValue) {
      packageData.environment = environmentValue as PackageEnvironment
    }
    
    if (assigneeEmailValue) {
      packageData.assigneeEmail = assigneeEmailValue
    }
    console.log('onSubmit - packageData:', packageData)

    await createPackage(Number(projectId), packageData)

    $q.notify({
      type: 'positive',
      message: 'Pacote criado com sucesso!'
    })

    void router.push(`/projects/${projectId}`)
  } catch (error: unknown) {
    console.error('Erro ao criar pacote:', error)
    const errorMessage = error && typeof error === 'object' && 'response' in error
      ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erro ao criar pacote'
      : 'Erro ao criar pacote'
    $q.notify({
      type: 'negative',
      message: errorMessage
    })
  } finally {
    loading.value = false
  }
}

// Carregar dados ao montar o componente
onMounted(() => {
  void loadProjectData()
})
</script>

<style scoped>
.create-package-page {
  padding: 24px 32px;
  background: linear-gradient(135deg, #0b1220 0%, #0f172a 100%);
  min-height: 100vh;
  width: 100%;
}

/* Glass card effect */
.glass-card {
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.page-header {
  margin-bottom: 32px;
}

.header-content {
  padding: 20px 24px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  color: #667eea;
}

.section-icon {
  font-size: 36px;
  color: #667eea;
}

.title-wrapper {
  display: flex;
  flex-direction: column;
}

.page-title {
  font-size: 32px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 4px 0 0 0;
}

.form-card {
  border-radius: 12px;
}

.form-section {
  padding: 32px;
}

.form-group {
  margin-bottom: 40px;
}

.group-title {
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 24px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.form-row {
  margin-bottom: 24px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-col {
  display: flex;
  gap: 16px;
}

.form-col .form-input {
  flex: 1;
}

.form-input {
  margin-bottom: 16px;
}

/* Forçar texto/labels/mensagens em branco nos campos Quasar */
:deep(.q-field__label) {
  color: rgba(255, 255, 255, 0.9) !important;
}

:deep(.q-field__native),
:deep(.q-field__input) {
  color: #ffffff !important;
}

:deep(.q-field__messages),
:deep(.q-field__bottom .q-field__counter) {
  color: rgba(255, 255, 255, 0.6) !important;
}

:deep(.q-select__dropdown-icon),
:deep(.q-icon) {
  color: rgba(255, 255, 255, 0.8);
}

.tags-display {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.release-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.create-release-btn {
  align-self: flex-start;
  margin-top: 4px;
}


.form-actions {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

.action-btn {
  min-width: 120px;
}

.action-btn.primary {
  background: #1976d2;
  color: white;
}

/* Responsive */
@media (max-width: 768px) {
  .create-package-page {
    padding: 16px 20px;
  }
  
  .form-section {
    padding: 20px;
  }
  
  .form-col {
    flex-direction: column;
  }
  
  
  .form-actions {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
}
</style>
