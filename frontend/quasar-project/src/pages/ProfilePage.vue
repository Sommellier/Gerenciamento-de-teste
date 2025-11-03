<template>
  <q-page class="profile-page">
    <div class="profile-container">
      <!-- Loading -->
      <div v-if="loading" class="loading-container">
        <q-spinner-dots size="48px" color="white" />
        <p>Carregando perfil...</p>
      </div>

      <!-- Profile Content -->
      <div v-else class="profile-content">
        <!-- Header Card -->
        <q-card class="header-card">
          <q-card-section class="header-section">
            <q-btn
              flat
              round
              icon="arrow_back"
              @click="goBack"
              class="back-btn"
              color="white"
              size="md"
            />
            
            <div class="header-info">
              <div class="header-avatar">
                <q-avatar size="80px" class="main-avatar">
                  <img 
                    v-if="profile?.avatar" 
                    :src="getAvatarUrl(profile.avatar)" 
                    :alt="profile?.name || 'Avatar'"
                  />
                  <span v-else>{{ getInitials(profile?.name || profile?.email || '') }}</span>
                  <q-btn
                    round
                    dense
                    icon="edit"
                    class="edit-avatar-btn"
                    @click="triggerFileInput"
                  >
                    <q-tooltip>A Alterar foto</q-tooltip>
                  </q-btn>
                </q-avatar>
              </div>
              
              <div class="header-text">
                <h1 class="profile-name">{{ profile?.name || 'Usuário' }}</h1>
                <div class="email-badge">{{ profile?.email }}</div>
              </div>

              <div class="header-actions">
                <q-btn
                  v-if="!isEditing"
                  flat
                  icon="edit"
                  label="Editar"
                  color="white"
                  @click="startEditing"
                  class="edit-btn"
                />
                <q-btn
                  v-else
                  unelevated
                  icon="check"
                  label="Salvar"
                  color="primary"
                  :loading="submitting"
                  :disable="!hasChanges"
                  @click="submitForm"
                  class="save-btn-header"
                />
                <q-btn
                  flat
                  icon="delete"
                  label="Deletar Conta"
                  color="negative"
                  @click="showDeleteConfirmDialog = true"
                  :loading="deleting"
                  class="delete-account-btn-header"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Avatar Upload Section -->
        <q-card class="avatar-card" v-if="isEditing">
          <q-card-section class="avatar-section">
            <div class="avatar-upload-container">
              <div class="avatar-preview">
                <q-avatar size="120px" class="preview-avatar">
                  <img 
                    v-if="avatarPreview" 
                    :src="avatarPreview" 
                    alt="Preview"
                  />
                  <img 
                    v-else-if="profile?.avatar" 
                    :src="getAvatarUrl(profile.avatar)" 
                    :alt="profile?.name || 'Avatar'"
                  />
                  <span v-else>{{ getInitials(profile?.name || profile?.email || '') }}</span>
                </q-avatar>
                
                <!-- Upload Progress -->
                <q-linear-progress 
                  v-if="uploading"
                  :value="uploadProgress"
                  color="primary"
                  class="upload-progress"
                />
                
                <!-- Upload Status -->
                <div v-if="uploadError" class="upload-error">
                  <q-icon name="error" color="negative" />
                  <span>{{ uploadError }}</span>
                </div>
              </div>
              
              <div class="avatar-actions">
                <q-btn
                  flat
                  icon="add_a_photo"
                  label="Selecionar foto"
                  color="white"
                  @click="triggerFileInput"
                  :loading="uploading"
                />
              </div>
              
              <p class="upload-hint">
                <q-icon name="info" size="16px" />
                Formatos: JPG, PNG, GIF • Máximo: 5MB
              </p>
            </div>
          </q-card-section>
        </q-card>

        <!-- Form Card -->
        <q-card class="form-card">
          <q-card-section class="form-header">
            <q-icon name="person" size="24px" color="white" />
            <h2 class="form-title">Informações Pessoais</h2>
          </q-card-section>

          <q-card-section>
            <q-form ref="formRef" @submit="submitForm" class="profile-form">
              <div class="form-grid">
                <!-- Coluna Esquerda -->
                <div class="form-column">
                  <q-input
                    v-model="name"
                    label="Nome completo"
                    :rules="nameRules"
                    outlined
                    class="form-input"
                    :disable="!isEditing"
                    :loading="submitting"
                    autogrow
                  >
                    <template v-slot:prepend>
                      <q-icon name="person" />
                    </template>
                  </q-input>

                  <q-input
                    v-model="email"
                    label="E-mail"
                    type="email"
                    filled
                    class="form-input"
                    :readonly="true"
                    hint="O e-mail não pode ser alterado"
                  >
                    <template v-slot:prepend>
                      <q-icon name="email" />
                    </template>
                  </q-input>
                </div>

                <!-- Coluna Direita -->
                <div class="form-column">
                  <q-input
                    v-model="newPassword"
                    v-model:visible="showNewPassword"
                    label="Nova senha"
                    :type="showNewPassword ? 'text' : 'password'"
                    :rules="passwordRules"
                    outlined
                    class="form-input"
                    :disable="!isEditing"
                    :loading="submitting"
                    hint="Mínimo 8 caracteres"
                    counter
                    maxlength="100"
                  >
                    <template v-slot:prepend>
                      <q-icon name="lock" />
                    </template>
                    <template v-slot:append>
                      <q-icon
                        :name="showNewPassword ? 'visibility_off' : 'visibility'"
                        @click="showNewPassword = !showNewPassword"
                        class="cursor-pointer"
                      />
                    </template>
                  </q-input>

                  <q-input
                    v-model="confirmPassword"
                    v-model:visible="showConfirmPassword"
                    label="Confirmar nova senha"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    :rules="confirmPasswordRules"
                    outlined
                    class="form-input"
                    :disable="!isEditing"
                    :loading="submitting"
                    hint="Confirme sua nova senha"
                  >
                    <template v-slot:prepend>
                      <q-icon name="lock" />
                    </template>
                    <template v-slot:append>
                      <q-icon
                        :name="showConfirmPassword ? 'visibility_off' : 'visibility'"
                        @click="showConfirmPassword = !showConfirmPassword"
                        class="cursor-pointer"
                      />
                    </template>
                  </q-input>
                </div>
              </div>

              <!-- Form Actions -->
              <div v-if="isEditing" class="form-actions">
                <q-btn
                  flat
                  label="Cancelar"
                  @click="cancelEdit"
                  :disable="submitting"
                />
                <q-btn
                  type="submit"
                  label="Salvar Alterações"
                  color="primary"
                  icon="save"
                  :loading="submitting"
                  :disable="!hasChanges || submitting"
                  unelevated
                  class="save-btn"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Stats Cards -->
        <div class="stats-container">
          <q-card 
            class="stat-card"
            @click="goToProjects"
            v-if="profile?.stats"
          >
            <q-card-section class="stat-card-content">
              <q-icon name="folder" size="32px" color="primary" />
              <div class="stat-card-text">
                <div class="stat-value">{{ profile.stats.projectsOwned }}</div>
                <div class="stat-label">Projetos Criados</div>
              </div>
              <q-icon name="chevron_right" size="24px" color="grey-5" />
            </q-card-section>
          </q-card>

          <q-card 
            class="stat-card"
            @click="goToProjects"
            v-if="profile?.stats"
          >
            <q-card-section class="stat-card-content">
              <q-icon name="group" size="32px" color="positive" />
              <div class="stat-card-text">
                <div class="stat-value">{{ profile.stats.projectsParticipating }}</div>
                <div class="stat-label">Projetos Participando</div>
              </div>
              <q-icon name="chevron_right" size="24px" color="grey-5" />
            </q-card-section>
          </q-card>

          <q-card 
            class="stat-card"
            @click="goToExecutions"
            v-if="profile?.stats"
          >
            <q-card-section class="stat-card-content">
              <q-icon name="play_arrow" size="32px" color="orange" />
              <div class="stat-card-text">
                <div class="stat-value">{{ profile.stats.testExecutions || 0 }}</div>
                <div class="stat-label">Testes Executados</div>
              </div>
              <q-icon name="chevron_right" size="24px" color="grey-5" />
            </q-card-section>
          </q-card>
        </div>

        <!-- Empty Stats State -->
        <q-card v-if="!profile?.stats" class="empty-stats-card">
          <q-card-section class="text-center">
            <q-icon name="bar_chart" size="64px" color="grey-5" />
            <h3>Nenhuma estatística disponível</h3>
            <p>Comece a usar a plataforma para ver suas estatísticas aqui</p>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      @change="handleFileSelect"
      style="display: none"
    />

    <!-- Success dialog -->
    <q-dialog v-model="successDialog">
      <q-card class="dialog-card">
        <q-card-section class="dialog-header success">
          <q-icon name="check_circle" size="48px" color="positive" />
          <h3>Perfil atualizado!</h3>
        </q-card-section>
        <q-card-actions align="center">
          <q-btn
            color="primary"
            label="OK"
            @click="successDialog = false"
            unelevated
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Error dialog -->
    <q-dialog v-model="errorDialog">
      <q-card class="dialog-card">
        <q-card-section class="dialog-header error">
          <q-icon name="error" size="48px" color="negative" />
          <h3>Erro ao atualizar perfil</h3>
        </q-card-section>
        <q-card-section>
          <p>{{ errorText }}</p>
        </q-card-section>
        <q-card-actions align="center">
          <q-btn
            color="negative"
            label="Fechar"
            @click="errorDialog = false"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Account Confirmation Dialog -->
    <q-dialog v-model="showDeleteConfirmDialog" persistent>
      <q-card class="delete-dialog-card">
        <q-card-section class="delete-dialog-header">
          <div class="delete-header-content">
            <div class="delete-icon-wrapper">
              <q-icon name="warning" size="56px" color="negative" />
            </div>
            <div class="delete-title-section">
              <h3 class="delete-title">Excluir Conta Permanentemente</h3>
              <p class="delete-subtitle">Esta ação não pode ser desfeita</p>
            </div>
          </div>
        </q-card-section>
        
        <q-card-section class="delete-dialog-body">
          <div class="delete-warning-box">
            <q-icon name="info" size="24px" color="warning" class="warning-icon" />
            <div class="warning-content">
              <p class="warning-text">
                Você está prestes a <strong>permanentemente deletar</strong> sua conta. Todos os seus dados serão removidos e não poderão ser recuperados.
              </p>
            </div>
          </div>

          <div class="delete-data-list">
            <h4 class="data-list-title">Os seguintes dados serão removidos:</h4>
            <div class="data-list-items">
              <div class="data-item">
                <q-icon name="folder" size="20px" color="grey-6" />
                <span>Seus projetos e todas as informações associadas</span>
              </div>
              <div class="data-item">
                <q-icon name="description" size="20px" color="grey-6" />
                <span>Seus cenários de teste</span>
              </div>
              <div class="data-item">
                <q-icon name="play_circle" size="20px" color="grey-6" />
                <span>Suas execuções e históricos</span>
              </div>
              <div class="data-item">
                <q-icon name="person" size="20px" color="grey-6" />
                <span>Todos os dados do seu perfil</span>
              </div>
            </div>
          </div>

          <div class="delete-confirmation-checkbox">
            <q-checkbox 
              v-model="deleteConfirmed" 
              color="negative"
              label="Entendo que esta ação é irreversível e desejo deletar minha conta"
              class="confirm-checkbox"
            />
          </div>
        </q-card-section>
        
        <q-card-actions align="right" class="delete-dialog-actions">
          <q-btn
            flat
            label="Cancelar"
            color="grey-8"
            @click="cancelDelete"
            :disable="deleting"
            class="cancel-btn"
          />
          <q-btn
            color="negative"
            label="Sim, Deletar Minha Conta"
            icon="delete"
            @click="deleteAccount"
            :loading="deleting"
            :disable="!deleteConfirmed"
            unelevated
            class="delete-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import api from '../services/api'

// Composables
const router = useRouter()
const $q = useQuasar()

// Interfaces
interface UserProfile {
  id: number
  name: string
  email: string
  avatar?: string
  stats?: {
    projectsOwned: number
    projectsParticipating: number
    testExecutions: number
  }
}

// State
const profile = ref<UserProfile | null>(null)
const loading = ref(false)
const submitting = ref(false)
const isEditing = ref(false)
const originalName = ref('')

// Form fields
const name = ref('')
const email = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// Password visibility
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// Form ref
const formRef = ref<{ validate?: () => Promise<boolean> } | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// Avatar upload
const avatarPreview = ref<string | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref<string | null>(null)

// Dialogs
const successDialog = ref(false)
const errorDialog = ref(false)
const errorText = ref('')
const showDeleteConfirmDialog = ref(false)
const deleteConfirmed = ref(false)
const deleting = ref(false)

// Computed
const hasChanges = computed(() => {
  if (!isEditing.value) return false
  return name.value !== originalName.value || 
         newPassword.value.length > 0 ||
         avatarPreview.value !== null
})

// Validation Rules
const nameRules = [
  (val: string) => !!val || 'Nome é obrigatório',
  (val: string) => val.length >= 2 || 'Nome deve ter pelo menos 2 caracteres',
  (val: string) => /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(val) || 'Nome contém caracteres inválidos'
]

const passwordRules = [
  (val: string) => !val || val.length >= 8 || 'Senha deve ter pelo menos 8 caracteres'
]

const confirmPasswordRules = computed(() => [
  (val: string) => !newPassword.value || val === newPassword.value || 'Senhas não coincidem'
])

// Watch for password changes to validate in real time
watch([newPassword, confirmPassword], () => {
  if (confirmPassword.value && formRef.value?.validate) {
    void formRef.value.validate()
  }
})

// Methods
function goBack() {
  void router.push('/dashboard')
}

function goToProjects() {
  void router.push('/projects')
}

function goToExecutions() {
  // TODO: Navegar para página de execuções quando criada
  $q.notify({
    type: 'info',
    message: 'Funcionalidade em desenvolvimento',
    position: 'top'
  })
}

function startEditing() {
  isEditing.value = true
  originalName.value = name.value
}

function cancelEdit() {
  isEditing.value = false
  name.value = originalName.value
  newPassword.value = ''
  confirmPassword.value = ''
  avatarPreview.value = null
  uploadError.value = null
}

function getInitials(nameOrEmail: string) {
  if (!nameOrEmail) return '?'
  const parts = nameOrEmail.split(' ').filter(p => p.length > 0)
  if (parts.length >= 2) {
    const first = parts[0]
    const second = parts[1]
    if (first && second && first[0] && second[0]) {
      return (first[0] + second[0]).toUpperCase()
    }
  }
  if (parts.length > 0 && parts[0]) {
    const firstPart = parts[0]
    if (firstPart && firstPart.length > 0 && firstPart[0]) {
      return firstPart[0].toUpperCase()
    }
  }
  return '?'
}

function getAvatarUrl(avatar: string) {
  if (!avatar) return ''
  if (avatar.startsWith('http')) {
    return avatar
  }
  // Usar getApiUrl para obter a URL base da API
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  const baseUrl = apiUrl.replace(/\/$/, '')
  return `${baseUrl}${avatar}`
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return

  // Validar tipo de arquivo
  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Por favor, selecione uma imagem válida (JPG, PNG, GIF)'
    return
  }

  // Validar tamanho (5MB)
  if (file.size > 5 * 1024 * 1024) {
    uploadError.value = 'Arquivo muito grande. Tamanho máximo: 5MB'
    return
  }

  uploadError.value = null

  // Criar preview
  const reader = new FileReader()
  reader.onload = (e) => {
    avatarPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // Upload automático imediato
  await uploadAvatar(file)
}

async function uploadAvatar(file: File) {
  uploading.value = true
  uploadProgress.value = 0
  uploadError.value = null
  
  try {
    const formData = new FormData()
    formData.append('avatar', file)

    interface AvatarUploadResponse {
      user: UserProfile
    }
    interface ProgressEvent {
      loaded: number
      total?: number
      progress?: number
    }
    const response = await api.post<AvatarUploadResponse>('/upload/avatar', formData, {
      // @ts-expect-error - onUploadProgress is a valid axios option but not in the types
      onUploadProgress: (progressEvent: ProgressEvent) => {
        if (progressEvent.total && progressEvent.total > 0) {
          uploadProgress.value = progressEvent.loaded / progressEvent.total
        } else if (progressEvent.progress !== undefined) {
          uploadProgress.value = progressEvent.progress
        }
      }
    })

    // Atualizar perfil local
    if (response.data && response.data.user) {
      profile.value = response.data.user
    }
    avatarPreview.value = null
    
    $q.notify({
      type: 'positive',
      message: 'Foto atualizada com sucesso!',
      position: 'top'
    })
  } catch (err: unknown) {
    uploadError.value = getCustomErrorMessage(err)
    $q.notify({
      type: 'negative',
      message: uploadError.value,
      position: 'top'
    })
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

async function loadProfile() {
  loading.value = true
  try {
    interface ProfileResponse {
      id: number
      name: string
      email: string
      avatar?: string
      stats?: {
        projectsOwned: number
        projectsParticipating: number
        testExecutions: number
      }
    }
    const response = await api.get<ProfileResponse>('/profile')
    if (response.data) {
      profile.value = response.data
      
      // Populate form
      name.value = profile.value?.name || ''
      email.value = profile.value?.email || ''
      originalName.value = name.value
    }
  } catch (err: unknown) {
    console.error('Error loading profile:', err)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar perfil',
      position: 'top'
    })
    goBack()
  } finally {
    loading.value = false
  }
}

async function submitForm() {
  if (!profile.value || !isEditing.value) return

  // Validar formulário
  if (formRef.value?.validate) {
    const isValid = await formRef.value.validate()
    if (!isValid) {
      $q.notify({
        type: 'negative',
        message: 'Por favor, corrija os erros no formulário',
        position: 'top'
      })
      return
    }
  }

  submitting.value = true
  try {
    interface UpdateUserData {
      name: string
      password?: string
    }
    const updateData: UpdateUserData = {
      name: name.value
    }

    // Só incluir senha se fornecida
    if (newPassword.value) {
      updateData.password = newPassword.value
    }

    interface UpdateUserResponse {
      id: number
      name: string
      email: string
      avatar?: string
      stats?: {
        projectsOwned: number
        projectsParticipating: number
        testExecutions: number
      }
    }
    const response = await api.put<UpdateUserResponse>(`/users/${profile.value.id}`, updateData)
    
    // Atualizar perfil local
    if (response.data) {
      profile.value = response.data
    }
    originalName.value = name.value
    
    // Feedback de sucesso
    $q.notify({
      type: 'positive',
      message: 'Perfil atualizado com sucesso!',
      position: 'top'
    })
    
    // Desabilitar modo de edição
    isEditing.value = false
    
    // Limpar campos de senha
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err: unknown) {
    console.error('Error updating profile:', err)
    errorText.value = getCustomErrorMessage(err)
    errorDialog.value = true
  } finally {
    submitting.value = false
  }
}

function cancelDelete() {
  showDeleteConfirmDialog.value = false
  deleteConfirmed.value = false
}

async function deleteAccount() {
  if (!profile.value || !deleteConfirmed.value) {
    return
  }

  deleting.value = true
  try {
    await api.delete(`/users/${profile.value.id}`)
    
    // Limpar dados locais
    localStorage.clear()
    
    // Mostrar notificação de sucesso
    $q.notify({
      type: 'info',
      message: 'Conta deletada com sucesso',
      position: 'top',
      timeout: 3000
    })
    
    // Redirecionar para login
    setTimeout(() => {
      void router.push('/login')
    }, 2000)
  } catch (err: unknown) {
    console.error('Error deleting account:', err)
    errorText.value = getCustomErrorMessage(err)
    errorDialog.value = true
    showDeleteConfirmDialog.value = false
    deleteConfirmed.value = false
  } finally {
    deleting.value = false
  }
}

interface AxiosError {
  response?: {
    status?: number
    data?: {
      message?: string
    }
  }
}

function getCustomErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosError = err as AxiosError
    const message = axiosError.response?.data?.message
    if (message) {
      if (message.includes('Email already exists')) {
        return 'Este e-mail já está sendo usado por outro usuário'
      }
      if (message.includes('Invalid name')) {
        return 'Nome contém caracteres inválidos'
      }
      if (message.includes('Invalid email format')) {
        return 'Formato de e-mail inválido'
      }
      if (message.includes('Password must be at least 8 characters')) {
        return 'Senha deve ter pelo menos 8 caracteres'
      }
      if (message.includes('Current password is incorrect')) {
        return 'Senha atual incorreta'
      }
      return message
    }
    
    const status = axiosError.response?.status
    if (status === 401) {
      return 'Sessão expirada. Faça login novamente'
    }
    if (status === 403) {
      return 'Você não tem permissão para realizar esta ação'
    }
    if (status === 404) {
      return 'Usuário não encontrado'
    }
    if (status === 409) {
      return 'E-mail já está sendo usado'
    }
    if (status === 500) {
      return 'Erro interno do servidor. Tente novamente'
    }
  }
  
  return 'Erro inesperado. Tente novamente'
}

// Lifecycle
onMounted(() => {
  void loadProfile()
})
</script>

<style scoped>
/* Global white text for all hints and help text */
.profile-page :deep(span),
.profile-page :deep(div.q-field__hint),
.profile-page :deep(.q-field__bottom),
.profile-page :deep(.q-field__messages),
.profile-page :deep(.q-field__counter) {
  color: #ffffff !important;
}

.profile-page {
  min-height: 100vh;
  background: #0b1220;
  padding: 24px 48px;
}

.profile-container {
  max-width: 1400px;
  margin: 0 auto;
}

/* Loading */
.loading-container {
  text-align: center;
  padding: 80px 20px;
  color: #ffffff;
}

.loading-container p {
  margin-top: 20px;
  font-size: 16px;
}

/* Profile Content */
.profile-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Header Card */
.header-card {
  background: #0f172a;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
}

.header-section {
  padding: 16px 24px;
}

.back-btn {
  position: absolute;
  color: #ffffff;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-avatar {
  flex-shrink: 0;
}

.main-avatar {
  position: relative;
  border: 3px solid rgba(255, 255, 255, 0.06);
}

.main-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.edit-avatar-btn {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: #7c9aff !important;
  border: 2px solid #0f172a;
}

.header-text {
  flex: 1;
}

.profile-name {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #ffffff;
  opacity: 1;
}

.email-badge {
  display: inline-block;
  padding: 4px 12px;
  background: #7c9aff1f;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: #7c9aff;
}

.header-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.edit-btn {
  color: #ffffff;
  font-weight: 500;
  min-width: 100px;
  background: #111827;
}

.edit-btn:hover {
  background: #1f2937;
}

.save-btn-header {
  font-weight: 600;
  min-width: 120px;
  background: #7c9aff;
}

.save-btn-header:hover {
  background: #6b8cff;
}

.delete-account-btn-header {
  color: #ef4444 !important;
  font-weight: 500;
  min-width: 120px;
}

.delete-account-btn-header:hover {
  background: rgba(239, 68, 68, 0.1) !important;
}

/* Avatar Card */
.avatar-card {
  background: #0f172a;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
}

.avatar-section {
  padding: 24px;
}

.avatar-upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.avatar-preview {
  position: relative;
  margin-bottom: 8px;
}

.preview-avatar {
  border: 3px solid rgba(255, 255, 255, 0.06);
}

.preview-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-progress {
  width: 120px;
  margin-top: 8px;
}

.upload-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: #ef4444;
  font-size: 13px;
}

.avatar-actions {
  display: flex;
  gap: 12px;
}

.upload-hint {
  margin: 0;
  font-size: 12px;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Form Card */
.form-card {
  background: #0f172a;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
}

.form-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: #111827;
  border-bottom: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 16px 16px 0 0;
}

.form-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  opacity: 1;
}

.profile-form {
  padding: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.form-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-input {
  width: 100%;
}

.form-actions {
  margin-top: 32px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.save-btn {
  font-weight: 600;
  min-width: 180px;
  background: #7c9aff;
}

.save-btn:hover {
  background: #6b8cff;
}

/* Stats Container */
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.stat-card {
  background: #0f172a;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: #7c9aff4d;
  box-shadow: 0 8px 32px rgba(124, 154, 255, 0.15);
}

.stat-card-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.stat-card-text {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
  opacity: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #cbd5e1;
  font-weight: 500;
}

/* Empty Stats */
.empty-stats-card {
  background: #0f172a;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
}

.empty-stats-card h3 {
  margin: 16px 0 8px 0;
  font-size: 18px;
  color: #ffffff;
  opacity: 1;
}

.empty-stats-card p {
  margin: 0;
  color: #cbd5e1;
}

/* Delete Dialog Styles */
.delete-dialog-card {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  min-width: 520px;
  max-width: 600px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.delete-dialog-header {
  padding: 32px 32px 24px;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-radius: 16px 16px 0 0;
}

.delete-header-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.delete-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 50%;
  flex-shrink: 0;
}

.delete-title-section {
  flex: 1;
}

.delete-title {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 700;
  color: #991b1b;
}

.delete-subtitle {
  margin: 0;
  font-size: 14px;
  color: #dc2626;
  font-weight: 500;
}

.delete-dialog-body {
  padding: 32px;
}

.delete-warning-box {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: #fef3c7;
  border: 2px solid #fbbf24;
  border-radius: 12px;
  margin-bottom: 24px;
}

.warning-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.warning-content {
  flex: 1;
}

.warning-text {
  margin: 0;
  color: #78350f;
  font-size: 14px;
  line-height: 1.6;
}

.warning-text strong {
  color: #92400e;
  font-weight: 700;
}

.delete-data-list {
  margin-bottom: 24px;
}

.data-list-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.data-list-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.data-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 3px solid #e5e7eb;
  transition: all 0.2s ease;
}

.data-item:hover {
  background: #f3f4f6;
  border-left-color: #d1d5db;
}

.data-item span {
  color: #4b5563;
  font-size: 14px;
  font-weight: 500;
}

.delete-confirmation-checkbox {
  padding: 20px;
  background: #fee2e2;
  border-radius: 12px;
  border: 2px solid #fecaca;
}

.confirm-checkbox {
  width: 100%;
}

.confirm-checkbox :deep(.q-checkbox__label) {
  color: #991b1b;
  font-weight: 500;
  font-size: 14px;
  line-height: 1.5;
}

.delete-dialog-actions {
  padding: 20px 32px;
  background: #fafafa;
  border-top: 1px solid #e5e7eb;
  border-radius: 0 0 16px 16px;
  gap: 12px;
}

.cancel-btn {
  padding: 10px 24px;
  font-weight: 600;
}

.delete-btn {
  padding: 10px 24px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.delete-btn:hover {
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.delete-btn:disabled {
  opacity: 0.5;
  box-shadow: none;
}

/* Dialog */
.dialog-card {
  background: rgba(255, 255, 255, 0.95);
  min-width: 320px;
  border-radius: 16px;
}

.dialog-header {
  text-align: center;
  padding: 32px 24px 24px;
}

.dialog-header.success h3,
.dialog-header.error h3 {
  margin: 16px 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

.dialog-header.success h3 {
  color: #22c55e;
}

.dialog-header.error h3 {
  color: #ef4444;
}

/* Responsive */
@media (max-width: 768px) {
  .profile-page {
    padding: 16px;
  }

  .header-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-actions {
    align-self: stretch;
  }

  .edit-btn,
  .save-btn-header {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .stats-container {
    grid-template-columns: 1fr;
  }

  .stat-card-content {
    padding: 20px;
  }
}

@media (min-width: 769px) {
  .form-actions {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
}

/* Accessibility */
.back-btn:focus-visible,
.edit-btn:focus-visible,
.save-btn:focus-visible,
.save-btn-header:focus-visible {
  outline: 2px solid #7c9aff66;
  outline-offset: 2px;
}

.edit-avatar-btn {
  min-width: 44px;
  min-height: 44px;
}

/* Quasar Input Colors - Slate Theme */
:deep(.q-field__label) {
  color: #cbd5e1 !important;
}

:deep(.q-field__hint) {
  color: #ffffff !important;
}

:deep(.q-field__counter) {
  color: #cbd5e1 !important;
}

:deep(.q-field--readonly .q-field__control) {
  color: #ffffff !important;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

:deep(.q-field__native) {
  color: #ffffff !important;
}

:deep(.q-field--outlined .q-field__control) {
  color: #ffffff;
}

:deep(.q-field--outlined .q-field__native) {
  color: #ffffff;
}

:deep(.q-field--outlined .q-field__prepend) {
  color: #cbd5e1;
}

:deep(.q-field--outlined .q-field__append) {
  color: #cbd5e1;
}

:deep(.q-field--outlined .q-field__inner) {
  border-color: rgba(255, 255, 255, 0.06);
}

:deep(.q-field--outlined .q-field__control:hover) {
  border-color: rgba(255, 255, 255, 0.10);
}

:deep(.q-field--outlined.q-field--focused .q-field__control) {
  border-color: #7c9aff;
}

/* Filled Fields */
:deep(.q-field--filled .q-field__control) {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

:deep(.q-field--filled .q-field__control:hover) {
  border-color: rgba(255, 255, 255, 0.10);
}

:deep(.q-field--filled.q-field--focused .q-field__control) {
  background: #111827;
  border-color: #7c9aff;
}

:deep(.q-field--filled .q-field__native) {
  color: #ffffff;
}

:deep(.q-field--filled .q-field__hint) {
  color: #ffffff !important;
}

:deep(.q-field--outlined .q-field__hint) {
  color: #ffffff !important;
}

:deep(.q-field .q-field__hint) {
  color: #ffffff !important;
}

/* Force all hints to be white - Maximum specificity */
:deep(.q-field--filled .q-field__bottom) {
  color: #ffffff !important;
}

:deep(.q-field--outlined .q-field__bottom) {
  color: #ffffff !important;
}

:deep(.q-field__bottom .q-field__hint) {
  color: #ffffff !important;
}

:deep(.q-field__bottom) {
  color: #ffffff !important;
}

:deep(.q-field__messages) {
  color: #ffffff !important;
}

:deep(.q-field__bottom--animated .q-field__hint) {
  color: #ffffff !important;
}

/* Counter */
:deep(.q-field__counter) {
  color: #cbd5e1 !important;
}

/* Force ALL text in hints and counters to be white */
:deep(.q-field__bottom *),
:deep(.q-field__messages *),
:deep(.q-field__hint *),
:deep(.q-field__counter *) {
  color: inherit !important;
}

:deep(.q-field__bottom),
:deep(.q-field__bottom *) {
  color: #ffffff !important;
}

/* Stat Icons */
.stat-card :deep(.q-icon[color="grey-7"]) {
  color: #cbd5e1 !important;
}
</style>
