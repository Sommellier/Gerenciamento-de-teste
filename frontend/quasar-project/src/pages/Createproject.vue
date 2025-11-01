<!-- Página de Criação de Projeto Moderna -->
<template>
  <div class="create-project-page">
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
            <button class="back-button" @click="goBack" aria-label="Voltar ao dashboard">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            
            <div class="title-section">
              <div class="icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 19A2 2 0 0 1 20 21H4A2 2 0 0 1 2 19V5A2 2 0 0 1 4 3H8L12 7H20A2 2 0 0 1 22 9V19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="title-content">
                <h1 class="page-title">Criar Projeto</h1>
                <p class="page-subtitle">Defina o básico e convide sua equipe</p>
              </div>
            </div>
          </div>

          <div class="header-actions">
            <button 
              class="create-button"
              @click="submitForm"
              :disabled="submitting || !isFormValid"
              aria-label="Criar projeto"
            >
              <svg v-if="!submitting" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H16L21 8V19A2 2 0 0 1 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="7,3 7,8 15,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div v-else class="loading-spinner"></div>
              {{ submitting ? 'Criando...' : 'Criar Projeto' }}
            </button>
            
            <!-- Profile Icon -->
            <div class="profile-icon-container">
              <button 
                class="profile-icon-button"
                @click="goToProfile"
                aria-label="Ir para o perfil"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Conteúdo principal -->
      <section class="content-section">
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
                  <polyline points="10,9 9,9 8,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="card-title">Dados do Projeto</div>
            </div>
            
            <div class="card-content">
              <form @submit.prevent="onSubmit" class="project-form">
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
                      <polyline points="10,9 9,9 8,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Descrição (Opcional)
                  </label>
                  <textarea
                    v-model="description"
                    class="form-textarea"
                    placeholder="Descreva o objetivo do projeto..."
                    maxlength="500"
                    rows="4"
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

          <!-- Seção de colaboradores -->
          <div class="collaborators-card">
            <div class="card-header">
              <div class="card-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 21V19A4 4 0 0 0 13 15H5A4 4 0 0 0 1 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M23 21V19A4 4 0 0 0 19.5 15.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M16 3.13A4 4 0 0 1 16 10.87" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="card-title">Colaboradores</div>
            </div>

            <div class="card-content">
              <!-- Adicionar colaborador -->
              <div class="add-collaborator">
                <div class="input-group">
                  <div class="input-wrapper">
                    <svg class="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M22 6L12 13L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <input
                      v-model="emailInput"
                      type="email"
                      class="email-input"
                      placeholder="Adicionar por e-mail"
                      @keyup.enter="addEmail"
                    />
                  </div>
                  <button 
                    class="add-button"
                    @click="addEmail"
                    :disabled="!emailRegex.test(emailInput)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Adicionar
                  </button>
                </div>
              </div>

              <!-- Lista de colaboradores -->
              <div class="collaborators-list">
                <div v-if="collaborators.length === 0" class="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 21V19A4 4 0 0 0 13 15H5A4 4 0 0 0 1 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M23 21V19A4 4 0 0 0 19.5 15.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 3.13A4 4 0 0 1 16 10.87" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <h3>Nenhum colaborador adicionado</h3>
                  <p>Adicione colaboradores por e-mail para convidá-los ao projeto</p>
                </div>

                <div v-else class="collaborators-table">
                  <div 
                    v-for="collaborator in collaborators" 
                    :key="collaborator.email"
                    class="collaborator-row"
                  >
                    <div class="collaborator-info">
                      <div class="collaborator-avatar">
                        {{ initialsFrom(collaborator.email) }}
                      </div>
                      <div class="collaborator-details">
                        <div class="collaborator-email">{{ collaborator.email }}</div>
                        <div class="collaborator-status" :class="`status-${collaborator.status.toLowerCase()}`">
                          {{ collaborator.status }}
                        </div>
                      </div>
                    </div>

                    <div class="collaborator-role">
                      <select 
                        v-model="collaborator.role" 
                        class="role-select"
                      >
                        <option value="MANAGER">Manager</option>
                        <option value="TESTER">Tester</option>
                        <option value="APPROVER">Approver</option>
                      </select>
                    </div>

                    <div class="collaborator-actions">
                      <button 
                        class="action-button"
                        @click="showCollaboratorMenu(collaborator)"
                        aria-label="Ações do colaborador"
                      >
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          <circle cx="19" cy="12" r="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          <circle cx="5" cy="12" r="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Menu de ações do colaborador -->
    <div v-if="showMenu" class="menu-overlay" @click="closeMenu">
      <div class="menu-container" @click.stop>
        <div class="menu-header">
          <h3>Ações do Colaborador</h3>
          <button class="menu-close" @click="closeMenu">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="menu-content">
          <button class="menu-action" @click="resendInvite(selectedCollaborator)">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M22 6L12 13L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Reenviar Convite
          </button>
          <button class="menu-action danger" @click="removeCollaborator(selectedCollaborator.email)">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M19,6V20A2,2 0 0,1 17,22H7A2,2 0 0,1 5,20V6M8,6V4A2,2 0 0,1 10,2H14A2,2 0 0,1 16,4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Remover
          </button>
        </div>
      </div>
    </div>

    <!-- Success dialog -->
    <div v-if="successDialog" class="dialog-overlay" @click="closeSuccessDialog">
      <div class="dialog-container success" @click.stop>
        <div class="dialog-header">
          <div class="dialog-icon success">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 11.08V12A10 10 0 1 1 5.93 5.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3>Projeto Criado!</h3>
        </div>
        <div class="dialog-content">
          <p>{{ successText }}</p>
        </div>
        <div class="dialog-actions">
          <button class="confirm-button success" @click="onSuccessOk">
            OK
          </button>
        </div>
      </div>
    </div>

    <!-- Error dialog -->
    <div v-if="errorDialog" class="dialog-overlay" @click="closeErrorDialog">
      <div class="dialog-container error" @click.stop>
        <div class="dialog-header">
          <div class="dialog-icon error">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3>Falha ao Criar Projeto</h3>
        </div>
        <div class="dialog-content">
          <p>{{ errorText }}</p>
        </div>
        <div class="dialog-actions">
          <button class="confirm-button error" @click="closeErrorDialog">
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar, QTableProps } from 'quasar'
import api from 'src/services/api'

const props = withDefaults(defineProps<{ redirectOnSuccess?: boolean }>(), { redirectOnSuccess: true })
const $q = useQuasar()
const router = useRouter()

/** ---------- navegação ---------- */
function goBack() {
  router.push('/dashboard')
}

function goToProfile() {
  router.push('/profile')
}

/** ---------- projeto ---------- */
const projectId = ref<number | null>(null)
const name = ref<string>('')
const description = ref<string>('')
const submitting = ref(false)
const successDialog = ref(false)
const successText = ref('Projeto criado com sucesso!')
const errorDialog = ref(false)
const errorText = ref('')

const nameRegex = /^[\p{L}\p{N}\s._-]+$/u
const nameRules: Array<(v: string) => true | string> = [
  (v: string) => ((v ?? '').trim().length >= 2) || 'Mínimo 2 caracteres',
  (v: string) => ((v ?? '').trim().length <= 100) || 'Máximo 100 caracteres',
  (v: string) => nameRegex.test((v ?? '').trim()) || 'Permitidos: letras, números, espaço, -, _, .',
]

/** ---------- colaboradores / convites ---------- */
type Role = 'MANAGER' | 'TESTER' | 'APPROVER'
type InviteStatusDisplay = 'Pending' | 'Invited' | 'Accepted' | 'Declined' | 'Revoked'
type Row = { email: string; role: Role; status: InviteStatusDisplay }

type Invite = {
  id: number
  email: string
  role: Role
  status: InviteStatusDisplay
  expiresAt?: string
  createdAt?: string
}

const emailInput = ref<string>('')
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const collaborators = ref<Row[]>([])

// Menu de colaboradores
const showMenu = ref(false)
const selectedCollaborator = ref<Row | null>(null)

// Computed para validação do formulário
const isFormValid = computed(() => {
  return name.value.trim().length >= 2 && nameRegex.test(name.value.trim())
})

const roleOptions = [
  { label: 'Manager', value: 'MANAGER' },
  { label: 'Tester', value: 'TESTER' },
  { label: 'Approver', value: 'APPROVER' },
]

function addEmail() {
  const email = emailInput.value.trim().toLowerCase()
  if (!emailRegex.test(email)) return
  if (collaborators.value.some(r => r.email === email)) {
    $q.notify({ type: 'warning', message: 'E-mail já adicionado' })
    return
  }
  collaborators.value.push({ email, role: 'TESTER', status: 'Pending' })
  emailInput.value = ''
}

function removeRow(email: string) {
  collaborators.value = collaborators.value.filter(r => r.email !== email)
}

function showCollaboratorMenu(collaborator: Row) {
  selectedCollaborator.value = collaborator
  showMenu.value = true
}

function closeMenu() {
  showMenu.value = false
  selectedCollaborator.value = null
}

function removeCollaborator(email: string) {
  removeRow(email)
  closeMenu()
}

function closeSuccessDialog() {
  successDialog.value = false
  successText.value = ''
}

function closeErrorDialog() {
  errorDialog.value = false
  errorText.value = ''
}

async function resendInvite(row: Row) {
  if (!projectId.value) {
    $q.notify({ type: 'warning', message: 'Crie o projeto antes de reenviar convites.' })
    return
  }
  try {
    await api.post(`/projects/${projectId.value}/invites`, { email: row.email, role: row.role })
    row.status = 'Invited'
    $q.notify({ type: 'positive', message: `Convite reenviado para ${row.email}` })
  } catch (err: any) {
    const status = err?.response?.status
    const rawMsg = err?.response?.data?.message || err?.response?.data?.error
    const msg = getCustomInviteErrorMessage(status, rawMsg, 'reenviar')
    
    $q.notify({ 
      type: 'negative', 
      message: msg,
      position: 'top',
      timeout: 4000
    })
  }
}

const columns: QTableProps['columns'] = [
  { name: 'email', label: 'E-mail', field: 'email', align: 'left' },
  { name: 'role', label: 'Função', field: 'role', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Ações', field: 'actions', align: 'right' },
]

function initialsFrom(email: string) {
  const [namePart = ''] = email.split('@')
  const safe = namePart || 'user'
  const parts = safe.split(/[._-]+/)
  const a = (parts[0]?.[0] ?? 'U') + (parts[1]?.[0] ?? '')
  return a.toUpperCase().slice(0, 2)
}

function avatarColor(seed: string) {
  const list = ['primary', 'teal', 'cyan', 'indigo', 'deep-purple', 'purple', 'orange', 'deep-orange', 'blue']
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return list[h % list.length]
}
function statusColor(s: InviteStatusDisplay) {
  if (s === 'Accepted') return 'positive'
  if (s === 'Invited') return 'info'
  if (s === 'Declined' || s === 'Revoked') return 'negative'
  return 'warning' // Pending
}

type ProjectDTO = {
  id: number
  ownerId: number
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

/** ======= API helpers (ajuste os caminhos se necessário) ======= */
async function apiCreateProject(payload: { name: string; description: string | null }) {
  // POST /projects (ownerId vem do token JWT automaticamente)
  return api.post<ProjectDTO>('/projects', payload)
}

async function apiCreateOrResendInvite(pid: number, payload: { email: string; role: Role }) {
  // POST /projects/:projectId/invites (cria ou reenvia convite)
  return api.post(`/projects/${pid}/invites`, payload)
}

async function apiListInvites(pid: number) : Promise<Invite[]> {
  // GET /projects/:projectId/invites
  const { data } = await api.get<any>(`/projects/${pid}/invites`)
  const items: any[] = Array.isArray(data) ? data : (data?.items ?? [])
  // normaliza status do backend -> display
  return items.map((it: any) => ({
    id: it.id,
    email: it.email,
    role: it.role as Role,
    status: backendToDisplayStatus(it.status),
    createdAt: it.createdAt,
    expiresAt: it.expiresAt,
  }))
}

/** Envia todos os convites da tabela (após criar projeto) */
async function sendAllInvitesOrUpdateStatuses(pid: number) {
  if (!collaborators.value.length) return
  let sent = 0
  // dispara convites em série para feedback mais claro
  for (const row of collaborators.value) {
    try {
      await apiCreateOrResendInvite(pid, { email: row.email, role: row.role })
      row.status = 'Invited'
      sent++
    } catch (err: any) {
      const status = err?.response?.status
      const rawMsg = err?.response?.data?.message || err?.response?.data?.error
      const msg = getCustomInviteErrorMessage(status, rawMsg, 'enviar')
      
      $q.notify({ 
        type: 'warning', 
        message: `Convite para ${row.email}: ${msg}`,
        position: 'top',
        timeout: 4000
      })
      // mantém status como estava (ex.: Pending)
    }
  }
  // sincroniza status reais do backend
  await refreshInviteStatuses(pid)
  if (sent > 0) {
    $q.notify({ type: 'positive', message: `${sent} convite(s) enviado(s)` })
  }
}

/** Sincroniza a coluna "Status" com os convites reais do backend */
async function refreshInviteStatuses(pid: number) {
  try {
    const invites = await apiListInvites(pid)
    const byEmail = new Map(invites.map(i => [i.email.toLowerCase(), i.status as InviteStatusDisplay]))
    collaborators.value = collaborators.value.map(r => {
      const s = byEmail.get(r.email.toLowerCase())
      return s ? { ...r, status: s } : r
    })
  } catch (err) {
    // silencioso: página continua funcional mesmo sem listagem
  }
}

// mapeia status do backend (PENDING, ACCEPTED, DECLINED, EXPIRED) para exibição
function backendToDisplayStatus(apiStatus: string | undefined): InviteStatusDisplay {
  switch ((apiStatus || '').toUpperCase()) {
    case 'ACCEPTED': return 'Accepted'
    case 'DECLINED': return 'Declined'
    case 'EXPIRED': return 'Revoked'
    case 'PENDING': default: return 'Pending'
  }
}

/** ---------- error handling ---------- */
function getCustomErrorMessage(status: number | undefined, rawMsg: string | undefined): string {
  // Se não há status, é erro de rede ou conexão
  if (!status) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  }

  // Mapeamento de erros por status HTTP
  switch (status) {
    case 400:
      // Analisa a mensagem para dar feedback mais específico
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
      if (rawMsg?.includes('ownerId is required') || rawMsg?.includes('Invalid ownerId')) {
        return 'Erro de autenticação. Faça login novamente.'
      }
      if (rawMsg?.includes('foreign key not found')) {
        return 'Erro de autenticação. Faça login novamente.'
      }
      return 'Dados inválidos. Verifique as informações e tente novamente.'
    
    case 401:
      return 'Sessão expirada. Faça login novamente para continuar.'
    
    case 409:
      if (rawMsg?.includes('already exists') || rawMsg?.includes('já existe') || rawMsg?.includes('duplicate')) {
        return 'Você já possui um projeto com este nome. Escolha um nome diferente.'
      }
      return 'Conflito: Este nome já está sendo usado. Escolha outro nome.'
    
    case 500:
      return 'Erro interno do servidor. Tente novamente em alguns minutos.'
    
    default:
      // Para outros códigos de erro, usa a mensagem do servidor se disponível
      if (rawMsg) {
        return rawMsg
      }
      return 'Erro inesperado. Tente novamente.'
  }
}

function getCustomInviteErrorMessage(status: number | undefined, rawMsg: string | undefined, action: 'enviar' | 'reenviar'): string {
  const actionText = action === 'enviar' ? 'enviar' : 'reenviar'
  
  if (!status) {
    return `Erro de conexão ao ${actionText} convite. Verifique sua internet.`
  }

  switch (status) {
    case 400:
      if (rawMsg?.includes('Invalid email')) {
        return 'E-mail inválido'
      }
      if (rawMsg?.includes('Invalid role')) {
        return 'Função inválida'
      }
      if (rawMsg?.includes('Project not found')) {
        return 'Projeto não encontrado'
      }
      return `Dados inválidos para ${actionText} convite`
    
    case 401:
      return 'Sessão expirada. Faça login novamente'
    
    case 403:
      return 'Você não tem permissão para enviar convites'
    
    case 404:
      return 'Projeto não encontrado'
    
    case 409:
      if (rawMsg?.includes('already invited')) {
        return 'Usuário já foi convidado'
      }
      if (rawMsg?.includes('already member')) {
        return 'Usuário já é membro do projeto'
      }
      return 'Convite já existe ou usuário já é membro'
    
    case 500:
      return 'Erro interno do servidor'
    
    default:
      return rawMsg || `Falha ao ${actionText} convite`
  }
}

/** ---------- submit ---------- */
async function onSubmit() {
  // Validação inline - não precisa de formRef
  if (!isFormValid.value) {
    $q.notify({ type: 'warning', message: 'Preencha o nome do projeto corretamente (mínimo 2 caracteres)' })
    return
  }

  submitting.value = true
  try {
    const { data: project } = await apiCreateProject({
      name: name.value.trim(),
      description: (description.value || '').trim() || null
    })
    projectId.value = project.id

    // Envia convites, se houver
    await sendAllInvitesOrUpdateStatuses(project.id)

    $q.notify({ 
      type: 'positive', 
      message: 'Projeto criado com sucesso!',
      position: 'top',
      timeout: 4000,
      actions: [{ icon: 'check', color: 'white' }]
    })
    successText.value = 'Projeto criado com sucesso!'
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

function resetPage() {
  projectId.value = null
  name.value = ''
  description.value = ''
  emailInput.value = ''
  collaborators.value = []
}

function submitForm() { onSubmit() }

function onSuccessOk() {
  successDialog.value = false
  // limpar página e redirecionar se configurado
  resetPage()
  if (props.redirectOnSuccess) {
    router.push({ name: 'projects' }).catch(() => {})
  }
}
</script>


<style scoped>
/* ===== Reset e Base ===== */
* {
  box-sizing: border-box;
}

.create-project-page {
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

.create-button {
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

.create-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(79, 172, 254, 0.4);
}

.create-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.create-button svg {
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

/* ===== Profile Icon ===== */
.profile-icon-container {
  display: flex;
  align-items: center;
}

.profile-icon-button {
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

.profile-icon-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.profile-icon-button svg {
  width: 20px;
  height: 20px;
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
.collaborators-card {
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

/* ===== Form Styles ===== */
.project-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
}

.form-label svg {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.8);
}

.form-input,
.form-textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: white;
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.2);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.input-counter {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: right;
}

.form-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(14, 165, 233, 0.2);
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
}

.form-hint svg {
  width: 16px;
  height: 16px;
  color: #0ea5e9;
}

/* ===== Collaborators Section ===== */
.add-collaborator {
  margin-bottom: 1.5rem;
}

.input-group {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
}

.input-wrapper {
  position: relative;
  flex: 1;
}

.input-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.6);
  z-index: 1;
}

.email-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  color: white;
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.email-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.email-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.2);
}

.add-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 500;
}

.add-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(79, 172, 254, 0.4);
}

.add-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.add-button svg {
  width: 16px;
  height: 16px;
}

/* ===== Collaborators List ===== */
.collaborators-list {
  max-height: 400px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.7);
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.5);
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.empty-state p {
  margin: 0;
  font-size: 0.9rem;
}

.collaborators-table {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.collaborator-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.collaborator-row:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.collaborator-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.collaborator-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
}

.collaborator-details {
  flex: 1;
}

.collaborator-email {
  font-size: 0.9rem;
  font-weight: 500;
  color: white;
  margin-bottom: 0.25rem;
}

.collaborator-status {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-weight: 500;
}

.status-pending {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.status-invited {
  background: rgba(13, 202, 240, 0.2);
  color: #0dcaf0;
}

.status-accepted {
  background: rgba(25, 135, 84, 0.2);
  color: #198754;
}

.status-declined,
.status-revoked {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.collaborator-role {
  min-width: 120px;
}

.role-select {
  width: 100%;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.5rem;
  color: white;
  font-size: 0.85rem;
}

.role-select option {
  background: #2d3748;
  color: white;
}

.collaborator-actions {
  display: flex;
  align-items: center;
}

.action-button {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.7);
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.action-button svg {
  width: 16px;
  height: 16px;
}

/* ===== Menu Overlay ===== */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.menu-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  min-width: 300px;
  max-width: 400px;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.menu-header h3 {
  margin: 0;
  color: #2d3748;
  font-weight: 600;
  font-size: 1.1rem;
}

.menu-close {
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #666;
}

.menu-close:hover {
  background: rgba(0, 0, 0, 0.2);
}

.menu-close svg {
  width: 16px;
  height: 16px;
}

.menu-content {
  padding: 1rem;
}

.menu-action {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #4a5568;
  font-size: 0.9rem;
  text-align: left;
}

.menu-action:hover {
  background: rgba(0, 0, 0, 0.05);
}

.menu-action.danger {
  color: #e53e3e;
}

.menu-action.danger:hover {
  background: rgba(229, 62, 62, 0.1);
}

.menu-action svg {
  width: 16px;
  height: 16px;
}

/* ===== Diálogos ===== */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.dialog-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  min-width: 400px;
  max-width: 500px;
  animation: slideUp 0.3s ease;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.dialog-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.dialog-icon.success {
  background: linear-gradient(135deg, #48dbfb 0%, #0abde3 100%);
}

.dialog-icon.error {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
}

.dialog-icon svg {
  width: 24px;
  height: 24px;
}

.dialog-header h3 {
  margin: 0;
  color: #2d3748;
  font-weight: 600;
  font-size: 1.25rem;
}

.dialog-content {
  padding: 1.5rem;
}

.dialog-content p {
  margin: 0;
  color: #4a5568;
  line-height: 1.6;
}

.dialog-actions {
  display: flex;
  justify-content: center;
  padding: 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.confirm-button {
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
}

.confirm-button.success {
  background: linear-gradient(135deg, #48dbfb 0%, #0abde3 100%);
}

.confirm-button.error {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
}

.confirm-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
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
  
  .input-group {
    flex-direction: column;
  }
  
  .collaborator-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .collaborator-info {
    justify-content: center;
  }
  
  .collaborator-role {
    min-width: auto;
  }
  
  .dialog-container {
    min-width: 320px;
    margin: 1rem;
  }
}

@media (max-width: 480px) {
  .title-content h1 {
    font-size: 1.5rem;
  }
  
  .create-button {
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
  }
  
  .collaborator-avatar {
    width: 32px;
    height: 32px;
    font-size: 0.75rem;
  }
}

/* ===== Estados de Foco para Acessibilidade ===== */
.back-button:focus-visible,
.create-button:focus-visible,
.profile-icon-button:focus-visible,
.form-input:focus-visible,
.form-textarea:focus-visible,
.email-input:focus-visible,
.add-button:focus-visible,
.action-button:focus-visible,
.menu-action:focus-visible,
.confirm-button:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.8);
  outline-offset: 2px;
}

/* ===== Scrollbar Personalizada ===== */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
