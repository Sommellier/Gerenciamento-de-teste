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
            <q-tooltip>Voltar ao menu principal</q-tooltip>
          </q-btn>
          
          <div class="title-wrap">
            <q-avatar color="primary" text-color="white" size="40px" icon="folder_open" />
            <div>
              <div class="title">Criar Projeto</div>
              <div class="subtitle">Defina o básico e convide sua equipe</div>
            </div>
          </div>
        </div>

        <q-btn color="primary" unelevated size="md" :loading="submitting" label="Criar projeto" @click="submitForm"
          class="primary-cta" />
      </div>

      <div class="content-grid">
        <!-- LEFT: Form -->
        <q-card flat bordered class="panel">
          <q-card-section class="panel-head">
            <q-icon name="description" size="22px" class="q-mr-sm" />
            <div class="panel-title">Dados do projeto</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <q-form ref="formRef" @submit.prevent="onSubmit" class="q-gutter-md">
              <q-input v-model="name" label="Nome" filled :maxlength="100" counter :rules="nameRules" lazy-rules>
                <template #prepend><q-icon name="folder" /></template>
              </q-input>

              <q-input v-model="description" label="Descrição (opcional)" type="textarea" autogrow filled
                :maxlength="500" counter>
                <template #prepend><q-icon name="notes" /></template>
              </q-input>

              <q-banner v-if="name.trim().length < 2" class="hint" rounded dense inline-actions>
                <template #avatar>
                  <q-icon name="info" />
                </template>
                Mínimo de 2 caracteres. Permitidos: letras, números, espaço, “-”, “_” e “.”.
              </q-banner>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- RIGHT: Collaborators -->
        <q-card flat bordered class="panel">
          <q-card-section class="panel-head">
            <q-icon name="group_add" size="22px" class="q-mr-sm" />
            <div class="panel-title">Colaboradores</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="row q-col-gutter-sm items-stretch q-mb-md">
              <div class="col">
                <q-input v-model="emailInput" label="Adicionar por e-mail" type="email" filled clearable
                  :error="emailInput.length > 0 && !emailRegex.test(emailInput)" error-message="Informe um e-mail válido"
                  @keyup.enter="addEmail">
                  <template #prepend><q-icon name="mail" /></template>
                </q-input>
              </div>
              <div class="col-auto">
                <q-btn color="primary" class="full-h" label="Adicionar" :disable="!emailRegex.test(emailInput)"
                  @click="addEmail" />
              </div>
            </div>

            <q-table flat bordered :rows="collaborators" :columns="columns" row-key="email"
              :no-data-label="'Nenhum colaborador adicionado'" :rows-per-page-options="[5, 10, 0]" class="collab-table">
              <!-- email -->
              <template #body-cell-email="props">
                <q-td :props="props">
                  <div class="row items-center no-wrap q-gutter-sm">
                    <q-avatar size="28px" :color="avatarColor(props.row.email)" text-color="white">
                      {{ initialsFrom(props.row.email) }}
                    </q-avatar>
                    <div class="ellipsis" style="max-width: 220px">{{ props.row.email }}</div>
                  </div>
                </q-td>
              </template>

              <!-- role -->
              <template #body-cell-role="props">
                <q-td :props="props">
                  <q-select v-model="props.row.role" :options="roleOptions" dense outlined emit-value map-options
                    style="min-width: 140px" />
                </q-td>
              </template>

              <!-- status -->
              <template #body-cell-status="props">
                <q-td :props="props">
                  <q-chip dense :color="statusColor(props.row.status)" text-color="white">
                    {{ props.row.status }}
                  </q-chip>
                </q-td>
              </template>

              <!-- actions -->
              <template #body-cell-actions="props">
                <q-td :props="props" class="text-right">
                  <q-btn dense flat round icon="more_vert">
                    <q-menu auto-close anchor="bottom right" self="top right">
                      <q-list style="min-width: 180px">
                        <q-item clickable @click="resendInvite(props.row)">
                          <q-item-section avatar><q-icon name="forward_to_inbox" /></q-item-section>
                          <q-item-section>Reenviar convite</q-item-section>
                        </q-item>
                        <q-item clickable @click="removeRow(props.row.email)">
                          <q-item-section avatar><q-icon name="delete_outline" /></q-item-section>
                          <q-item-section>Remover</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>

      <q-linear-progress v-show="submitting" indeterminate color="primary" class="q-mt-md q-rounded-borders"
        style="height: 4px" />
    </section>

    <!-- Success dialog -->
    <q-dialog v-model="successDialog">
      <q-card>
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="check_circle" color="positive" size="32px" />
          <div class="text-h6">Projeto criado</div>
        </q-card-section>
        <q-card-section class="q-pt-none">{{ successText }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="OK" color="primary" @click="onSuccessOk" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Error dialog -->
    <q-dialog v-model="errorDialog">
      <q-card>
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="error" color="negative" size="32px" />
          <div class="text-h6">Falha ao criar projeto</div>
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

/** ---------- usuário logado (ownerId) ---------- */
const ownerId = ref<number | null>(null)
function loadOwnerId() {
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (!raw) { ownerId.value = null; return }
    const u = JSON.parse(raw)
    ownerId.value = typeof u?.id === 'number' ? u.id : Number(u?.id) || null
  } catch { ownerId.value = null }
}
onMounted(loadOwnerId)

/** ---------- projeto ---------- */
const projectId = ref<number | null>(null)
const name = ref<string>('')
const description = ref<string>('')
const submitting = ref(false)
const formRef = ref<any>(null)
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
async function apiCreateProject(payload: { ownerId: number; name: string; description: string | null }) {
  // POST /projects
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
  if (!ownerId.value) {
    $q.notify({ type: 'negative', message: 'Usuário não identificado.' })
    return
  }
  const ok = await formRef.value?.validate?.()
  if (!ok) return

  submitting.value = true
  try {
    const { data: project } = await apiCreateProject({
      ownerId: ownerId.value,
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
  const f = formRef.value
  if (f?.resetValidation) f.resetValidation()
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
  width: min(1160px, 94vw);
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

.back-btn:active {
  transform: translateX(-1px);
}

.title-wrap {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
}

.title {
  font-size: 22px;
  font-weight: 700;
  color: #0b1220;
  line-height: 1.1;
}

.subtitle {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.primary-cta {
  min-width: 160px;
}

.content-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: 1fr 1fr;
  padding: 6px;
}

@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

.panel {
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, .85);
}

.body--dark .panel {
  background: rgba(22, 22, 22, .65);
  border-color: rgba(255, 255, 255, .08);
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

.hint {
  background: rgba(14, 165, 233, 0.08);
  color: #0369a1;
}

.full-h {
  height: 40px;
}

.collab-table {
  border-radius: 12px;
}
</style>
