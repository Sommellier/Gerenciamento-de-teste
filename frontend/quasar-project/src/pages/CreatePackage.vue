<template>
  <div class="create-package-page">
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <q-btn
            flat
            round
            icon="arrow_back"
            @click="goBack"
            class="back-btn"
            color="primary"
          />
          <q-icon name="add_box" class="section-icon" />
          <h1 class="page-title">Criar Pacote de Teste</h1>
        </div>
        <div class="subtitle">Preencha os dados para criar um novo pacote de teste</div>
      </div>
    </div>

    <q-card class="form-card">
      <q-form @submit="onSubmit" class="package-form">
        <q-card-section class="form-section">
          <!-- Informações Básicas -->
          <div class="form-group">
            <h3 class="group-title">Informações Básicas</h3>
            
            <div class="form-row">
              <q-input
                v-model="form.title"
                label="Título do Pacote *"
                :rules="[val => !!val || 'Título é obrigatório']"
                outlined
                class="form-input"
                hint="Ex: Login e Autenticação"
              />
            </div>

            <div class="form-row">
              <q-input
                v-model="form.description"
                label="Descrição"
                type="textarea"
                outlined
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
                  outlined
                  :rules="[val => !!val || 'Tipo é obrigatório']"
                  class="form-input"
                />
              </div>
              <div class="form-col">
                <q-select
                  v-model="form.priority"
                  :options="priorityOptions"
                  label="Prioridade *"
                  outlined
                  :rules="[val => !!val || 'Prioridade é obrigatória']"
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
                  outlined
                  class="form-input"
                />
              </div>
              <div class="form-col">
                <div class="release-field">
                  <q-select
                    v-model="form.release"
                    :options="releaseOptions"
                    label="Release *"
                    outlined
                    :rules="[val => !!val || 'Release é obrigatória']"
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
                outlined
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
                outlined
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
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Criar Nova Release</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newRelease"
            label="Data da Release *"
            outlined
            hint="Selecione a data da release"
            readonly
            @click="showDatePicker = true"
            :rules="[
              val => !!val || 'Data da release é obrigatória'
            ]"
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

// Opções dos selects
const typeOptions = [
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
  const selectedDate = new Date(date)
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
    members.value = membersData.map(member => ({
      label: `${member.user.name} (${member.user.email})`,
      value: member.user.email
    }))
  } catch (error: any) {
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

const createNewRelease = async () => {
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
    releases.value = addRelease(releases.value, newRelease.value)
    
    // Selecionar a nova release
    form.value.release = newRelease.value
    
    // Fechar o modal
    showCreateReleaseDialog.value = false
    newRelease.value = ''
    
    $q.notify({
      type: 'positive',
      message: 'Release criada com sucesso!'
    })
  } catch (error: any) {
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
    
    // Converter objetos para valores antes de enviar
    const packageData = {
      title: form.value.title,
      description: form.value.description,
      type: typeof form.value.type === 'object' ? form.value.type.value : form.value.type,
      priority: typeof form.value.priority === 'object' ? form.value.priority.value : form.value.priority,
      environment: typeof form.value.environment === 'object' ? form.value.environment.value : form.value.environment,
      release: typeof form.value.release === 'object' ? form.value.release.value : form.value.release,
      assigneeEmail: typeof form.value.assigneeEmail === 'object' ? form.value.assigneeEmail.value : form.value.assigneeEmail,
      tags: form.value.tags
    }
    console.log('onSubmit - packageData:', packageData)

    await createPackage(Number(projectId), packageData)

    $q.notify({
      type: 'positive',
      message: 'Pacote criado com sucesso!'
    })

    router.push(`/projects/${projectId}`)
  } catch (error: any) {
    console.error('Erro ao criar pacote:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao criar pacote'
    })
  } finally {
    loading.value = false
  }
}

// Carregar dados ao montar o componente
onMounted(() => {
  loadProjectData()
})
</script>

<style scoped>
.create-package-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.header-content {
  text-align: center;
}

.title-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
  position: relative;
}

.back-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}

.section-icon {
  font-size: 32px;
  color: #1976d2;
}

.page-title {
  font-size: 32px;
  font-weight: 600;
  color: #1976d2;
  margin: 0;
}

.subtitle {
  font-size: 16px;
  color: #666;
}

.form-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
  color: #333;
  margin-bottom: 24px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e0e0e0;
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
  padding: 24px 32px;
  background: #f5f5f5;
  border-radius: 0 0 12px 12px;
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
    padding: 16px;
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
