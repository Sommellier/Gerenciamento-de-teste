<!-- Página de Edição de Projeto Moderna -->
<template>
  <div class="edit-project-page">
    <!-- Background com gradiente animado -->
    <div class="animated-bg">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <!-- Container principal -->
    <main class="main-container">
      <!-- Header moderno -->
      <header class="page-header">
        <div class="header-content">
          <div class="header-left">
            <button class="back-button" @click="goBack" aria-label="Voltar aos projetos">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            
            <div class="title-section">
              <div class="icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 4H4A2 2 0 0 0 2 6V20A2 2 0 0 0 4 22H18A2 2 0 0 0 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="title-content">
                <h1 class="page-title">Editar Projeto</h1>
                <p class="page-subtitle">Atualize as informações do projeto</p>
              </div>
            </div>
          </div>

          <div class="header-actions">
            <button 
              class="save-button"
              @click="submitForm"
              :disabled="submitting"
              aria-label="Salvar alterações"
            >
              <svg v-if="!submitting" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H16L21 8V19A2 2 0 0 1 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="7,3 7,8 15,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div v-else class="loading-spinner"></div>
              {{ submitting ? 'Salvando...' : 'Salvar Alterações' }}
            </button>
          </div>
        </div>
      </header>

      <!-- Loading state -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Carregando projeto...</p>
      </div>

      <!-- Conteúdo principal -->
      <section v-else class="content-section">
        <div class="content-grid">
          <!-- Formulário de dados do projeto -->
          <div class="form-card">
            <div class="card-header">
              <div class="card-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="card-title">Informações do Projeto</div>
            </div>
            
            <div class="card-content">
              <form @submit.prevent="submitForm" class="project-form">
                <div class="form-group">
                  <label class="form-label">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 19A2 2 0 0 1 20 21H4A2 2 0 0 1 2 19V5A2 2 0 0 1 4 3H8L12 7H20A2 2 0 0 1 22 9V19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Nome do Projeto
                  </label>
                  <input
                    v-model="name"
                    type="text"
                    class="form-input"
                    placeholder="Digite o nome do projeto"
                    maxlength="100"
                    required
                    :disabled="submitting"
                  />
                  <div class="input-counter">{{ name.length }}/100</div>
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Descrição (Opcional)
                  </label>
                  <textarea
                    v-model="description"
                    class="form-textarea"
                    placeholder="Descreva o objetivo do projeto..."
                    maxlength="500"
                    rows="4"
                    :disabled="submitting"
                  ></textarea>
                  <div class="input-counter">{{ description.length }}/500</div>
                </div>

                <!-- Hint para validação -->
                <div v-if="name.trim().length < 2" class="form-hint">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Mínimo de 2 caracteres. Permitidos: letras, números, espaço, "-", "_" e ".".
                </div>
              </form>
            </div>
          </div>

          <!-- Informações do Projeto (Read-only) -->
          <div class="info-card">
            <div class="card-header">
              <div class="card-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="card-title">Informações do Projeto</div>
            </div>

            <div class="card-content">
              <div class="info-grid">
                <div class="info-item">
                  <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span class="info-label">Criado em:</span>
                  <span class="info-value">{{ formatDate(project?.createdAt) }}</span>
                </div>
                <div class="info-item">
                  <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19A4 4 0 0 0 16 15H8A4 4 0 0 0 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span class="info-label">Proprietário:</span>
                  <span class="info-value">Você</span>
                </div>
                <div class="info-item">
                  <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="17,6 23,6 23,12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span class="info-label">Última atualização:</span>
                  <span class="info-value">{{ formatDate(project?.updatedAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Success dialog -->
    <q-dialog v-model="successDialog">
      <q-card class="dialog-card">
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
      <q-card class="dialog-card">
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import api from 'src/services/api'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()

// Interfaces
interface Project {
  id: number
  name: string
  description?: string | null
  createdAt?: string
  updatedAt?: string
}

// State
const project = ref<Project | null>(null)
const loading = ref(false)
const submitting = ref(false)
const name = ref('')
const description = ref('')
const formRef = ref<{ validate?: () => Promise<boolean> } | null>(null)

// Dialogs
const successDialog = ref(false)
const successText = ref('')
const errorDialog = ref(false)
const errorText = ref('')

// Navigation
function goBack() {
  void router.push('/projects')
}

// Load project data
async function loadProject() {
  loading.value = true
  try {
    const projectId = String(route.params.id ?? '')
    if (!projectId) {
      throw new Error('ID do projeto não fornecido')
    }
    const response = await api.get<Project>(`/projects/${projectId}`)
    if (response.data) {
      project.value = response.data
      
      // Populate form
      name.value = project.value.name || ''
      description.value = project.value.description || ''
    }
  } catch (err: unknown) {
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

// Submit form
async function submitForm() {
  if (!project.value) return
  
  if (formRef.value?.validate) {
    const ok = await formRef.value.validate()
    if (!ok) return
  }

  submitting.value = true
  try {
    const projectId = String(route.params.id ?? '')
    if (!projectId) {
      throw new Error('ID do projeto não fornecido')
    }
    interface UpdateProjectData {
      name: string
      description: string | null
    }
    const updateData: UpdateProjectData = {
      name: name.value.trim(),
      description: description.value.trim() || null
    }
    await api.put<Project>(`/projects/${projectId}`, updateData)

    $q.notify({
      type: 'positive',
      message: 'Projeto atualizado com sucesso!',
      position: 'top',
      timeout: 4000,
      actions: [{ icon: 'check', color: 'white' }]
    })
    
    successText.value = 'Projeto atualizado com sucesso!'
    successDialog.value = true
  } catch (err: unknown) {
    interface AxiosError {
      response?: {
        status?: number
        data?: {
          message?: string
          error?: string
        }
      }
    }
    const axiosError = err && typeof err === 'object' && 'response' in err
      ? err as AxiosError
      : undefined
    const status = axiosError?.response?.status
    const rawMsg = axiosError?.response?.data?.message || axiosError?.response?.data?.error
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
function formatDate(dateString: string | undefined) {
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

// Lifecycle
onMounted(() => {
  void loadProject()
})
</script>

<style scoped>
/* ===== Reset e Base ===== */
* {
  box-sizing: border-box;
}

.edit-project-page {
  min-height: 100vh;
  position: relative;
  background: linear-gradient(135deg, #0b1220 0%, #0f172a 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow-x: hidden;
}

/* ===== Background Animado ===== */
.animated-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.7;
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(45deg, #ff6b6b, #feca57);
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.orb-2 {
  width: 200px;
  height: 200px;
  background: linear-gradient(45deg, #48dbfb, #0abde3);
  top: 60%;
  right: 20%;
  animation-delay: -7s;
}

.orb-3 {
  width: 250px;
  height: 250px;
  background: linear-gradient(45deg, #ff9ff3, #f368e0);
  bottom: 20%;
  left: 50%;
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  33% {
    transform: translateY(-30px) rotate(120deg);
  }
  66% {
    transform: translateY(30px) rotate(240deg);
  }
}

/* ===== Container Principal ===== */
.main-container {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* ===== Header ===== */
.page-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 1.5rem 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-button {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.back-button svg {
  width: 20px;
  height: 20px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-wrapper {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.icon-wrapper svg {
  width: 24px;
  height: 24px;
}

.title-content h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.title-content p {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

/* ===== Header Actions ===== */
.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.save-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 600;
}

.save-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(79, 172, 254, 0.4);
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.save-button svg {
  width: 16px;
  height: 16px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ===== Loading State ===== */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: white;
}

.loading-state .spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

.loading-state p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
}

/* ===== Content Section ===== */
.content-section {
  margin-bottom: 2rem;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

/* ===== Cards ===== */
.form-card,
.info-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.card-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.card-icon svg {
  width: 20px;
  height: 20px;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
}

.card-content {
  padding: 1.5rem;
}

/* ===== Form ===== */
.project-form {
  display: grid;
  gap: 1.5rem;
}

.form-group {
  position: relative;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.form-label svg {
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.7);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: rgba(79, 172, 254, 0.5);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.1);
}

.form-input:disabled,
.form-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.input-counter {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
}

.form-hint {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(79, 172, 254, 0.15);
  border: 1px solid rgba(79, 172, 254, 0.3);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
}

.form-hint svg {
  width: 20px;
  height: 20px;
  color: #4facfe;
  flex-shrink: 0;
}

/* ===== Info Grid ===== */
.info-grid {
  display: grid;
  gap: 1rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.info-icon {
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

.info-label {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  min-width: 140px;
  font-size: 0.9rem;
}

.info-value {
  color: white;
  font-size: 0.9rem;
}

/* ===== Dialog ===== */
.dialog-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
}

/* ===== Responsividade ===== */
@media (max-width: 768px) {
  .main-container {
    padding: 1rem 0.5rem;
  }
  
  .header-content {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-left {
    width: 100%;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .content-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .card-content {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .title-content h1 {
    font-size: 1.5rem;
  }
  
  .save-button {
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
  }
}
</style>
