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
            <q-tooltip>Voltar aos projetos</q-tooltip>
          </q-btn>
          
          <div class="title-wrap">
            <q-avatar color="primary" text-color="white" size="40px" icon="edit" />
            <div>
              <div class="title">Editar Projeto</div>
              <div class="subtitle">Atualize as informações do projeto</div>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <q-btn 
            color="primary" 
            unelevated 
            size="md" 
            :loading="submitting" 
            label="Salvar Alterações" 
            @click="submitForm"
            class="save-btn"
          />
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="loading-state">
        <q-spinner-dots size="40px" color="primary" />
        <p>Carregando projeto...</p>
      </div>

      <!-- Edit form -->
      <div v-else class="edit-form">
        <q-card flat bordered class="form-panel">
          <q-card-section class="panel-head">
            <q-icon name="description" size="22px" class="q-mr-sm" />
            <div class="panel-title">Informações do Projeto</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <q-form ref="formRef" @submit.prevent="submitForm" class="q-gutter-md">
              <q-input 
                v-model="name" 
                label="Nome do projeto" 
                filled 
                :maxlength="100" 
                counter 
                :rules="nameRules" 
                lazy-rules
                :disable="submitting"
              >
                <template #prepend><q-icon name="folder" /></template>
              </q-input>

              <q-input 
                v-model="description" 
                label="Descrição (opcional)" 
                type="textarea" 
                autogrow 
                filled
                :maxlength="500" 
                counter
                :disable="submitting"
              >
                <template #prepend><q-icon name="notes" /></template>
              </q-input>

              <q-banner v-if="name.trim().length < 2" class="hint" rounded dense inline-actions>
                <template #avatar>
                  <q-icon name="info" />
                </template>
                Mínimo de 2 caracteres. Permitidos: letras, números, espaço, "-", "_" e ".".
              </q-banner>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Project info -->
        <q-card flat bordered class="info-panel">
          <q-card-section class="panel-head">
            <q-icon name="info" size="22px" class="q-mr-sm" />
            <div class="panel-title">Informações do Projeto</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="info-grid">
              <div class="info-item">
                <q-icon name="schedule" size="16px" class="q-mr-sm" />
                <span class="info-label">Criado em:</span>
                <span class="info-value">{{ formatDate(project?.createdAt) }}</span>
              </div>
              <div class="info-item">
                <q-icon name="person" size="16px" class="q-mr-sm" />
                <span class="info-label">Proprietário:</span>
                <span class="info-value">Você</span>
              </div>
              <div class="info-item">
                <q-icon name="update" size="16px" class="q-mr-sm" />
                <span class="info-label">Última atualização:</span>
                <span class="info-value">{{ formatDate(project?.updatedAt) }}</span>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Members section -->
        <q-card flat bordered class="members-panel">
          <q-card-section class="panel-head">
            <q-icon name="group" size="22px" class="q-mr-sm" />
            <div class="panel-title">Membros do Projeto</div>
            <q-spinner-dots v-if="loadingMembers" size="20px" color="primary" class="q-ml-auto" />
          </q-card-section>
          <q-separator />
          <q-card-section>
            <!-- Loading members -->
            <div v-if="loadingMembers" class="loading-members">
              <q-spinner-dots size="24px" color="primary" />
              <p>Carregando membros...</p>
            </div>

            <!-- Empty state -->
            <div v-else-if="members.length === 0" class="empty-members">
              <q-icon name="group_off" size="48px" color="grey-5" />
              <h4>Nenhum membro encontrado</h4>
              <p>Este projeto ainda não possui membros além do proprietário.</p>
            </div>

            <!-- Members list -->
            <div v-else class="members-list">
              <div 
                v-for="member in members" 
                :key="member.id" 
                class="member-item"
              >
                <div class="member-avatar">
                  <q-avatar 
                    :color="getMemberColor(member.role)" 
                    text-color="white" 
                    size="32px"
                  >
                    {{ getMemberInitials(member.name || member.email) }}
                  </q-avatar>
                </div>
                <div class="member-info">
                  <div class="member-name">{{ member.name || member.email }}</div>
                  <div class="member-email" v-if="member.name">{{ member.email }}</div>
                </div>
                <div class="member-role">
                  <q-chip 
                    :color="getRoleColor(member.role)" 
                    text-color="white" 
                    size="sm"
                    :label="getRoleLabel(member.role)"
                  />
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </section>

    <!-- Success dialog -->
    <q-dialog v-model="successDialog">
      <q-card>
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="check_circle" color="positive" size="32px" />
          <div class="text-h6">Projeto atualizado!</div>
        </q-card-section>
        <q-card-section class="q-pt-none">{{ successText }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="OK" color="primary" v-close-popup @click="goBack" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Error dialog -->
    <q-dialog v-model="errorDialog">
      <q-card>
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="error" color="negative" size="32px" />
          <div class="text-h6">Falha ao atualizar projeto</div>
        </q-card-section>
        <q-card-section class="q-pt-none">{{ errorText }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Fechar" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import api from 'src/services/api'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()

// State
const project = ref<any>(null)
const loading = ref(false)
const submitting = ref(false)
const name = ref('')
const description = ref('')
const formRef = ref<any>(null)

// Members state
const members = ref<any[]>([])
const loadingMembers = ref(false)

// Dialogs
const successDialog = ref(false)
const successText = ref('')
const errorDialog = ref(false)
const errorText = ref('')

// Validation rules
const nameRegex = /^[\p{L}\p{N}\s._-]+$/u
const nameRules: Array<(v: string) => true | string> = [
  (v: string) => !!v || 'Nome é obrigatório',
  (v: string) => v.length >= 2 || 'Mínimo de 2 caracteres',
  (v: string) => v.length <= 100 || 'Máximo de 100 caracteres',
  (v: string) => nameRegex.test(v) || 'Caracteres inválidos'
]

// Navigation
function goBack() {
  router.push('/projects')
}

// Load project data
async function loadProject() {
  loading.value = true
  try {
    const projectId = route.params.id
    const response = await api.get(`/projects/${projectId}`)
    project.value = response.data
    
    // Populate form
    name.value = project.value.name || ''
    description.value = project.value.description || ''
    
    // Load members
    await loadMembers()
  } catch (err: any) {
    console.error('Error loading project:', err)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar projeto',
      position: 'top'
    })
    goBack()
  } finally {
    loading.value = false
  }
}

// Load project members
async function loadMembers() {
  if (!project.value) return
  
  loadingMembers.value = true
  try {
    const projectId = route.params.id
    const response = await api.get(`/projects/${projectId}/members`)
    members.value = response.data.items || []
  } catch (err: any) {
    console.error('Error loading members:', err)
    // Não mostra erro para membros, apenas log
  } finally {
    loadingMembers.value = false
  }
}

// Submit form
async function submitForm() {
  if (!project.value) return
  
  const ok = await formRef.value?.validate?.()
  if (!ok) return

  submitting.value = true
  try {
    const projectId = route.params.id
    const response = await api.put(`/projects/${projectId}`, {
      name: name.value.trim(),
      description: description.value.trim() || null
    })

    $q.notify({
      type: 'positive',
      message: 'Projeto atualizado com sucesso!',
      position: 'top',
      timeout: 4000,
      actions: [{ icon: 'check', color: 'white' }]
    })
    
    successText.value = 'Projeto atualizado com sucesso!'
    successDialog.value = true
  } catch (err: any) {
    const status = err?.response?.status
    const rawMsg = err?.response?.data?.message || err?.response?.data?.error
    const msg = getCustomErrorMessage(status, rawMsg)
    
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
      timeout: 5000,
      actions: [{ icon: 'close', color: 'white' }]
    })
    errorText.value = msg
    errorDialog.value = true
  } finally {
    submitting.value = false
  }
}

// Error handling
function getCustomErrorMessage(status: number | undefined, rawMsg: string | undefined): string {
  if (!status) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  }

  switch (status) {
    case 400:
      if (rawMsg?.includes('Nome do projeto é obrigatório')) {
        return 'O nome do projeto é obrigatório. Por favor, preencha este campo.'
      }
      if (rawMsg?.includes('Project name is required')) {
        return 'O nome do projeto é obrigatório. Por favor, preencha este campo.'
      }
      if (rawMsg?.includes('must be at least 2 characters')) {
        return 'O nome do projeto deve ter pelo menos 2 caracteres.'
      }
      if (rawMsg?.includes('must be at most 100 characters')) {
        return 'O nome do projeto deve ter no máximo 100 caracteres.'
      }
      if (rawMsg?.includes('invalid characters')) {
        return 'O nome contém caracteres inválidos. Use apenas letras, números, espaços, "-", "_" e ".".'
      }
      return 'Dados inválidos. Verifique as informações e tente novamente.'
    
    case 401:
      return 'Sessão expirada. Faça login novamente para continuar.'
    
    case 403:
      return 'Você não tem permissão para editar este projeto.'
    
    case 404:
      return 'Projeto não encontrado.'
    
    case 409:
      if (rawMsg?.includes('already exists') || rawMsg?.includes('já existe') || rawMsg?.includes('duplicate')) {
        return 'Você já possui um projeto com este nome. Escolha um nome diferente.'
      }
      return 'Conflito: Este nome já está sendo usado. Escolha outro nome.'
    
    case 500:
      return 'Erro interno do servidor. Tente novamente em alguns minutos.'
    
    default:
      if (rawMsg) {
        return rawMsg
      }
      return 'Erro inesperado. Tente novamente.'
  }
}

// Utility functions
function formatDate(dateString: string) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Member utility functions
function getMemberInitials(nameOrEmail: string) {
  if (!nameOrEmail) return '?'
  const parts = nameOrEmail.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return nameOrEmail[0].toUpperCase()
}

function getMemberColor(role: string) {
  switch (role) {
    case 'OWNER': return 'purple'
    case 'MANAGER': return 'blue'
    case 'TESTER': return 'green'
    case 'APPROVER': return 'orange'
    default: return 'grey'
  }
}

function getRoleColor(role: string) {
  switch (role) {
    case 'OWNER': return 'purple'
    case 'MANAGER': return 'blue'
    case 'TESTER': return 'green'
    case 'APPROVER': return 'orange'
    default: return 'grey'
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'OWNER': return 'Proprietário'
    case 'MANAGER': return 'Gerente'
    case 'TESTER': return 'Testador'
    case 'APPROVER': return 'Aprovador'
    default: return role
  }
}

// Lifecycle
onMounted(() => {
  loadProject()
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
  width: min(800px, 94vw);
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

.save-btn {
  font-weight: 500;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.edit-form {
  display: grid;
  gap: 20px;
  padding: 0 14px 20px;
}

.form-panel, .info-panel {
  border-radius: 12px;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.02);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.info-grid {
  display: grid;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.info-label {
  font-weight: 500;
  color: #666;
  margin-right: 8px;
  min-width: 120px;
}

.info-value {
  color: #1a1a1a;
}

.hint {
  background: rgba(25, 118, 210, 0.08);
  border-left: 4px solid #1976d2;
}

.members-panel {
  border-radius: 12px;
  overflow: hidden;
}

.loading-members {
  text-align: center;
  padding: 20px;
  color: #666;
}

.empty-members {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.empty-members h4 {
  margin: 16px 0 8px 0;
  color: #333;
}

.empty-members p {
  margin: 0;
  font-size: 14px;
}

.members-list {
  display: grid;
  gap: 12px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.02);
  transition: background-color 0.2s ease;
}

.member-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.member-avatar {
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.member-email {
  font-size: 12px;
  color: #666;
}

.member-role {
  flex-shrink: 0;
}
</style>
