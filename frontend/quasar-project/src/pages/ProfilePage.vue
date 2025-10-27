<template>
  <q-page class="profile-page">
    <section class="page-container">
      <div class="page-content">
        <!-- Header -->
        <div class="page-header">
          <div class="header-left">
            <q-btn
              flat
              round
              icon="arrow_back"
              @click="goBack"
              class="back-btn"
            />
            <div class="header-title">
              <h1>Meu Perfil</h1>
              <p>Gerencie suas informações pessoais</p>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-container">
          <q-spinner-dots size="40px" color="primary" />
          <p>Carregando perfil...</p>
        </div>

        <!-- Profile Content -->
        <div v-else class="profile-content">
          <!-- Avatar Section -->
          <q-card flat bordered class="avatar-card">
            <q-card-section class="avatar-section">
              <div class="avatar-container">
                <q-avatar
                  :size="avatarSize"
                  :color="avatarColor"
                  text-color="white"
                  class="profile-avatar"
                >
                  <img v-if="profile?.avatar" :src="getAvatarUrl(profile.avatar)" />
                  <span v-else>{{ getInitials(profile?.name || profile?.email) }}</span>
                </q-avatar>
                <q-btn
                  round
                  color="primary"
                  icon="camera_alt"
                  class="avatar-edit-btn"
                  @click="triggerFileInput"
                >
                  <q-tooltip>Alterar foto</q-tooltip>
                </q-btn>
              </div>
              <div class="avatar-info">
                <h3>{{ profile?.name || 'Usuário' }}</h3>
                <p>{{ profile?.email }}</p>
                <q-btn
                  flat
                  color="primary"
                  icon="edit"
                  label="Alterar foto"
                  @click="triggerFileInput"
                  class="change-photo-btn"
                />
              </div>
            </q-card-section>
          </q-card>

          <!-- Profile Form -->
          <q-card flat bordered class="form-card">
            <q-card-section class="form-header">
              <q-icon name="person" size="22px" class="q-mr-sm" />
              <div class="form-title">Informações Pessoais</div>
            </q-card-section>
            <q-separator />
            <q-card-section>
              <q-form ref="formRef" @submit="submitForm" class="profile-form">
                <div class="form-row">
                  <q-input
                    v-model="name"
                    label="Nome completo"
                    :rules="nameRules"
                    outlined
                    class="form-input"
                    :loading="submitting"
                  >
                    <template v-slot:prepend>
                      <q-icon name="person" />
                    </template>
                  </q-input>
                </div>

                <div class="form-row">
                  <q-input
                    v-model="email"
                    label="E-mail"
                    type="email"
                    :rules="emailRules"
                    outlined
                    class="form-input"
                    :loading="submitting"
                  >
                    <template v-slot:prepend>
                      <q-icon name="email" />
                    </template>
                  </q-input>
                </div>

                <div class="form-row">
                  <q-input
                    v-model="currentPassword"
                    label="Senha atual"
                    type="password"
                    outlined
                    class="form-input"
                    :loading="submitting"
                    hint="Necessária para alterar a senha"
                  >
                    <template v-slot:prepend>
                      <q-icon name="lock" />
                    </template>
                  </q-input>
                </div>

                <div class="form-row">
                  <q-input
                    v-model="newPassword"
                    label="Nova senha"
                    type="password"
                    :rules="passwordRules"
                    outlined
                    class="form-input"
                    :loading="submitting"
                    hint="Deixe em branco para manter a senha atual"
                  >
                    <template v-slot:prepend>
                      <q-icon name="lock" />
                    </template>
                  </q-input>
                </div>

                <div class="form-row">
                  <q-input
                    v-model="confirmPassword"
                    label="Confirmar nova senha"
                    type="password"
                    :rules="confirmPasswordRules"
                    outlined
                    class="form-input"
                    :loading="submitting"
                  >
                    <template v-slot:prepend>
                      <q-icon name="lock" />
                    </template>
                  </q-input>
                </div>

                <div class="form-actions">
                  <q-btn
                    type="submit"
                    color="primary"
                    :loading="submitting"
                    :disable="!isFormValid"
                    class="save-btn"
                  >
                    <q-icon name="save" class="q-mr-sm" />
                    Salvar Alterações
                  </q-btn>
                </div>
              </q-form>
            </q-card-section>
          </q-card>

          <!-- Stats Section -->
          <q-card flat bordered class="stats-card" v-if="profile?.stats">
            <q-card-section class="stats-header">
              <q-icon name="analytics" size="22px" class="q-mr-sm" />
              <div class="stats-title">Estatísticas</div>
            </q-card-section>
            <q-separator />
            <q-card-section>
              <div class="stats-grid">
                <div class="stat-item">
                  <q-icon name="folder" size="24px" color="primary" />
                  <div class="stat-content">
                    <div class="stat-value">{{ profile.stats.projectsOwned }}</div>
                    <div class="stat-label">Projetos Criados</div>
                  </div>
                </div>
                <div class="stat-item">
                  <q-icon name="group" size="24px" color="green" />
                  <div class="stat-content">
                    <div class="stat-value">{{ profile.stats.projectsParticipating }}</div>
                    <div class="stat-label">Projetos Participando</div>
                  </div>
                </div>
                <div class="stat-item">
                  <q-icon name="play_arrow" size="24px" color="orange" />
                  <div class="stat-content">
                    <div class="stat-value">{{ profile.stats.testExecutions }}</div>
                    <div class="stat-label">Testes Executados</div>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>

        </div>
      </div>
    </section>

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
      <q-card class="success-dialog">
        <q-card-section class="success-content">
          <q-icon name="check_circle" size="48px" color="positive" />
          <h3>Perfil atualizado!</h3>
          <p>{{ successText }}</p>
        </q-card-section>
        <q-card-actions align="center">
          <q-btn
            color="primary"
            label="OK"
            @click="successDialog = false"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Error dialog -->
    <q-dialog v-model="errorDialog">
      <q-card class="error-dialog">
        <q-card-section class="error-content">
          <q-icon name="error" size="48px" color="negative" />
          <h3>Erro ao atualizar perfil</h3>
          <p>{{ errorText }}</p>
        </q-card-section>
        <q-card-actions align="center">
          <q-btn
            color="negative"
            label="OK"
            @click="errorDialog = false"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import api from '../services/api'

// Composables
const router = useRouter()
const $q = useQuasar()

// State
const profile = ref<any>(null)
const loading = ref(false)
const submitting = ref(false)
const name = ref('')
const email = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const formRef = ref<any>(null)
const fileInput = ref<any>(null)


// Dialogs
const successDialog = ref(false)
const successText = ref('')
const errorDialog = ref(false)
const errorText = ref('')

// Computed
const avatarSize = computed(() => '120px')
const avatarColor = computed(() => 'primary')

const nameRules = [
  (val: string) => !!val || 'Nome é obrigatório',
  (val: string) => val.length >= 2 || 'Nome deve ter pelo menos 2 caracteres',
  (val: string) => /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(val) || 'Nome contém caracteres inválidos'
]

const emailRules = [
  (val: string) => !!val || 'E-mail é obrigatório',
  (val: string) => /.+@.+\..+/.test(val) || 'E-mail inválido'
]

const passwordRules = [
  (val: string) => !val || val.length >= 8 || 'Senha deve ter pelo menos 8 caracteres'
]

const confirmPasswordRules = [
  (val: string) => !newPassword.value || val === newPassword.value || 'Senhas não coincidem'
]


// Methods
function goBack() {
  router.push('/dashboard')
}

function getInitials(nameOrEmail: string) {
  if (!nameOrEmail) return '?'
  const parts = nameOrEmail.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return nameOrEmail[0].toUpperCase()
}

function getAvatarUrl(avatar: string) {
  console.log('getAvatarUrl called with:', avatar)
  if (avatar.startsWith('http')) {
    console.log('Returning full URL:', avatar)
    return avatar
  }
  const fullUrl = `http://localhost:3000${avatar}`
  console.log('Returning constructed URL:', fullUrl)
  return fullUrl
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
    $q.notify({
      type: 'negative',
      message: 'Por favor, selecione uma imagem válida',
      position: 'top'
    })
    return
  }

  // Validar tamanho (5MB)
  if (file.size > 5 * 1024 * 1024) {
    $q.notify({
      type: 'negative',
      message: 'Arquivo muito grande. Tamanho máximo: 5MB',
      position: 'top'
    })
    return
  }

  await uploadAvatar(file)
}

async function uploadAvatar(file: File) {
  submitting.value = true
  
  try {
    const formData = new FormData()
    formData.append('avatar', file)

    const response = await api.post('/upload/avatar', formData)

    console.log('Upload response:', response.data)
    console.log('Avatar URL:', response.data.user.avatar)

    // Atualizar perfil local
    profile.value = response.data.user
    
    console.log('Updated profile:', profile.value)
    console.log('Avatar URL after update:', profile.value.avatar)
    
    $q.notify({
      type: 'positive',
      message: 'Foto atualizada com sucesso!',
      position: 'top'
    })
  } catch (err: any) {
    console.error('Error uploading avatar:', err)
    $q.notify({
      type: 'negative',
      message: getCustomErrorMessage(err),
      position: 'top'
    })
  } finally {
    submitting.value = false
  }
}

async function loadProfile() {
  loading.value = true
  try {
    const response = await api.get('/profile')
    profile.value = response.data
    
    // Populate form
    name.value = profile.value.name || ''
    email.value = profile.value.email || ''
  } catch (err: any) {
    console.error('Error loading profile:', err)
    console.error('Error response:', err.response)
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
  if (!profile.value) return

  submitting.value = true
  try {
    const updateData: any = {
      name: name.value,
      email: email.value
    }

    // Só incluir senha se fornecida
    if (newPassword.value) {
      if (!currentPassword.value) {
        $q.notify({
          type: 'negative',
          message: 'Senha atual é obrigatória para alterar a senha',
          position: 'top'
        })
        return
      }
      updateData.password = newPassword.value
    }

    const response = await api.put(`/users/${profile.value.id}`, updateData)
    
    // Atualizar perfil local
    profile.value = response.data
    
    successText.value = 'Suas informações foram atualizadas com sucesso!'
    successDialog.value = true
    
    // Limpar campos de senha
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err: any) {
    console.error('Error updating profile:', err)
    errorText.value = getCustomErrorMessage(err)
    errorDialog.value = true
  } finally {
    submitting.value = false
  }
}

function getCustomErrorMessage(err: any): string {
  if (err.response?.data?.message) {
    const message = err.response.data.message
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
    return message
  }
  
  if (err.response?.status === 401) {
    return 'Sessão expirada. Faça login novamente'
  }
  if (err.response?.status === 403) {
    return 'Você não tem permissão para realizar esta ação'
  }
  if (err.response?.status === 404) {
    return 'Usuário não encontrado'
  }
  if (err.response?.status === 409) {
    return 'E-mail já está sendo usado'
  }
  if (err.response?.status === 500) {
    return 'Erro interno do servidor. Tente novamente'
  }
  
  return 'Erro inesperado. Tente novamente'
}

// Lifecycle
onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.page-container {
  max-width: 800px;
  margin: 0 auto;
}

.page-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  color: #1976d2;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: rgba(25, 118, 210, 0.1);
  transform: translateX(-2px);
}

.header-title h1 {
  margin: 0;
  color: #1a1a1a;
  font-size: 28px;
  font-weight: 600;
}

.header-title p {
  margin: 4px 0 0 0;
  color: #666;
  font-size: 16px;
}

.loading-container {
  text-align: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.loading-container p {
  margin-top: 16px;
  color: #666;
  font-size: 16px;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.avatar-card,
.form-card,
.stats-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 32px;
}

.avatar-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar {
  border: 4px solid #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.avatar-edit-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  transform: translate(25%, 25%);
}

.avatar-info h3 {
  margin: 0 0 8px 0;
  color: #1a1a1a;
  font-size: 24px;
  font-weight: 600;
}

.avatar-info p {
  margin: 0 0 16px 0;
  color: #666;
  font-size: 16px;
}

.change-photo-btn {
  padding: 8px 16px;
}

.form-header,
.stats-header {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  background: rgba(25, 118, 210, 0.05);
}

.form-title,
.stats-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.profile-form {
  padding: 24px;
}

.form-row {
  margin-bottom: 20px;
}

.form-input {
  width: 100%;
}

.form-actions {
  margin-top: 32px;
  display: flex;
  justify-content: flex-end;
}

.save-btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  padding: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.stat-item:hover {
  background: rgba(0, 0, 0, 0.04);
  transform: translateY(-2px);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.success-dialog,
.error-dialog {
  min-width: 300px;
  border-radius: 16px;
}

.success-content,
.error-content {
  text-align: center;
  padding: 32px 24px 24px;
}

.success-content h3,
.error-content h3 {
  margin: 16px 0 8px 0;
  color: #1a1a1a;
}

.success-content p,
.error-content p {
  margin: 0;
  color: #666;
}

@media (max-width: 768px) {
  .profile-page {
    padding: 16px;
  }
  
  .avatar-section {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    justify-content: center;
  }
}
</style>
