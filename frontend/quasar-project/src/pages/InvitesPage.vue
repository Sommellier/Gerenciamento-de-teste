<!-- Página de Convites Moderna -->
<template>
  <div class="invites-page">
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
            <button class="back-button" @click="goBack" aria-label="Voltar ao dashboard" data-cy="btn-back">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            
            <div class="title-section">
              <div class="icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M22 6L12 13L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="title-content">
                <h1 class="page-title">Convites</h1>
                <p class="page-subtitle">Gerencie convites para projetos</p>
              </div>
            </div>
          </div>

          <div class="header-actions">
            <button 
              class="refresh-button" 
              @click="loadInvites"
              :disabled="loading"
              aria-label="Atualizar convites"
              data-cy="btn-refresh-invites"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 4V10H17M1 20V14H7M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 18.36 18.36L23 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Atualizar</span>
            </button>
            
            <!-- Profile Icon -->
            <div class="profile-icon-container">
              <button 
                class="profile-icon-button"
                @click="goToProfile"
                aria-label="Ir para o perfil"
                data-cy="btn-go-to-profile"
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

      <!-- Seção de busca e filtros -->
      <section class="search-section">
        <div class="search-container">
          <div class="search-input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por usuário..."
              class="search-input"
              data-cy="input-search-invites"
              @input="onSearch"
            />
            <button 
              v-if="searchQuery" 
              class="clear-button"
              @click="clearSearch"
              aria-label="Limpar busca"
              data-cy="btn-clear-search-invites"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>

          <div class="filter-wrapper">
            <svg class="filter-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <select 
              v-model="statusFilter" 
              class="filter-select"
              data-cy="select-filter-invite-status"
              @change="onSearch"
            >
              <option value="">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="ACCEPTED">Aceito</option>
              <option value="DECLINED">Recusado</option>
              <option value="EXPIRED">Expirado</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Lista de convites -->
      <section class="invites-section">
        <!-- Estado de carregamento -->
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Carregando convites...</p>
        </div>

        <!-- Estado vazio -->
        <div v-else-if="invites.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M22 6L12 13L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3>Nenhum convite encontrado</h3>
          <p v-if="searchQuery || statusFilter">Tente ajustar sua busca ou filtros</p>
          <p v-else>Você ainda não possui convites</p>
        </div>

        <!-- Lista de convites -->
        <div v-else class="invites-grid" data-cy="grid-invites">
          <div 
            v-for="invite in invites" 
            :key="invite.id" 
            class="invite-card"
            :class="`status-${invite.status.toLowerCase()}`"
            :data-cy="`card-invite-${invite.id}`"
          >
            <div class="card-header">
              <div class="status-indicator">
                <div class="status-icon" :class="`status-${invite.status.toLowerCase()}`">
                  <svg v-if="invite.status === 'PENDING'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <svg v-else-if="invite.status === 'ACCEPTED'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 11.08V12A10 10 0 1 1 5.93 5.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <svg v-else-if="invite.status === 'DECLINED'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
              
              <div class="invite-info">
                <h3 class="inviter-name">{{ invite.invitedBy.name }}</h3>
                <p class="project-name">{{ invite.project.name }}</p>
              </div>

              <div class="card-actions">
                <button 
                  class="action-button"
                  @click="showInviteMenu(invite)"
                  aria-label="Mais opções"
                  :data-cy="`btn-menu-invite-${invite.id}`"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="1" fill="currentColor"/>
                    <circle cx="12" cy="5" r="1" fill="currentColor"/>
                    <circle cx="12" cy="19" r="1" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="card-content">
              <div class="invite-details">
                <div class="detail-item">
                  <svg class="detail-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span class="detail-label">Função:</span>
                  <span class="role-badge" :class="`role-${invite.role.toLowerCase()}`">
                    {{ getRoleLabel(invite.role) }}
                  </span>
                </div>
                
                <div class="detail-item">
                  <svg class="detail-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span class="detail-label">Criado em:</span>
                  <span>{{ formatDate(invite.createdAt) }}</span>
                </div>
                
                <div class="detail-item">
                  <svg class="detail-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span class="detail-label">Expira em:</span>
                  <span>{{ formatDate(invite.expiresAt) }}</span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <div class="status-badge" :class="`status-${invite.status.toLowerCase()}`">
                {{ getStatusLabel(invite.status) }}
              </div>
              
              <div v-if="invite.status === 'PENDING'" class="action-buttons">
                <button 
                  class="accept-button"
                  @click="acceptInvite(invite)"
                  :disabled="processingInvite === invite.id || processingInvite !== null"
                  :data-cy="`btn-accept-invite-${invite.id}`"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 11.08V12A10 10 0 1 1 5.93 5.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Aceitar
                </button>
                <button 
                  class="decline-button"
                  @click="declineInvite(invite)"
                  :disabled="processingInvite === invite.id || processingInvite !== null"
                  :data-cy="`btn-decline-invite-${invite.id}`"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Recusar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Paginação -->
      <footer v-if="totalPages > 1" class="pagination-section">
        <div class="pagination-container">
          <button 
            class="page-button"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
            data-cy="btn-pagination-prev"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          
          <div class="page-numbers">
            <button 
              v-for="page in getVisiblePages()" 
              :key="page"
              class="page-number"
              :class="{ active: page === currentPage }"
              @click="goToPage(page)"
              :data-cy="`btn-pagination-page-${page}`"
            >
              {{ page }}
            </button>
          </div>
          
          <button 
            class="page-button"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
            data-cy="btn-pagination-next"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </footer>
    </main>

    <!-- Menu de ações -->
    <div v-if="showMenu" class="menu-overlay" @click="closeMenu" data-cy="dialog-invite-menu">
      <div class="menu-container" @click.stop>
        <div class="menu-header">
          <h4>Ações do Convite</h4>
          <button class="close-menu" @click="closeMenu" data-cy="btn-close-invite-menu">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="menu-actions">
          <button 
            v-if="selectedInvite?.status === 'PENDING'" 
            class="menu-action"
            @click="resendInvite"
            data-cy="btn-resend-invite"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M23 4V10H17M1 20V14H7M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 18.36 18.36L23 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Reenviar Convite
          </button>
          <button 
            v-if="selectedInvite" 
            class="menu-action"
            @click="viewProject"
            data-cy="btn-view-project-invite"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 19A2 2 0 0 1 20 21H4A2 2 0 0 1 2 19V5A2 2 0 0 1 4 3H9L11 5H20A2 2 0 0 1 22 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Ver Projeto
          </button>
        </div>
      </div>
    </div>

    <!-- Diálogos de confirmação -->
    <div v-if="acceptDialog" class="dialog-overlay" @click="closeAcceptDialog" data-cy="dialog-accept-invite">
      <div class="dialog-container" @click.stop>
        <div class="dialog-header">
          <div class="dialog-icon success">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 11.08V12A10 10 0 1 1 5.93 5.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3>Aceitar Convite</h3>
        </div>
        <div class="dialog-content">
          <p>Tem certeza que deseja aceitar o convite para o projeto <strong>"{{ inviteToProcess?.project.name }}"</strong>?</p>
        </div>
        <div class="dialog-actions">
          <button class="cancel-button" @click="closeAcceptDialog" data-cy="btn-cancel-accept-invite">Cancelar</button>
          <button 
            class="confirm-button success" 
            @click="confirmAccept"
            :disabled="processingInvite !== null"
            data-cy="btn-confirm-accept-invite"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>

    <div v-if="declineDialog" class="dialog-overlay" @click="closeDeclineDialog" data-cy="dialog-decline-invite">
      <div class="dialog-container" @click.stop>
        <div class="dialog-header">
          <div class="dialog-icon error">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3>Recusar Convite</h3>
        </div>
        <div class="dialog-content">
          <p>Tem certeza que deseja recusar o convite para o projeto <strong>"{{ inviteToProcess?.project.name }}"</strong>?</p>
        </div>
        <div class="dialog-actions">
          <button class="cancel-button" @click="closeDeclineDialog" data-cy="btn-cancel-decline-invite">Cancelar</button>
          <button 
            class="confirm-button error" 
            @click="confirmDecline"
            :disabled="processingInvite !== null"
            data-cy="btn-confirm-decline-invite"
          >
            Recusar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { inviteService, type Invite, type ListInvitesParams } from '../services/invite.service'
import logger from '../utils/logger'

const router = useRouter()
const $q = useQuasar()

// State
const loading = ref(false)
const invites = ref<Invite[]>([])
const searchQuery = ref('')
const statusFilter = ref<string | null>(null)
const currentPage = ref(1)
const totalPages = ref(1)
const processingInvite = ref<number | null>(null)

// Menu state
const showMenu = ref(false)
const selectedInvite = ref<Invite | null>(null)

// Dialog state
const acceptDialog = ref(false)
const declineDialog = ref(false)
const inviteToProcess = ref<Invite | null>(null)

// Options removed - not used

// Methods
const goBack = () => {
  void router.push('/dashboard')
}

const goToProfile = () => {
  void router.push('/profile')
}

const loadInvites = async () => {
  loading.value = true
  try {
    const params: ListInvitesParams = {
      page: currentPage.value,
      pageSize: 20,
      orderBy: 'createdAt',
      sort: 'desc'
    }

    if (statusFilter.value) {
      params.status = [statusFilter.value]
    }

    if (searchQuery.value) {
      params.q = searchQuery.value
    }

    const response = await inviteService.listUserInvites(params)
    
    invites.value = response.items
    totalPages.value = response.totalPages
  } catch (error) {
    logger.error('Erro ao carregar convites:', error)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar convites',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  currentPage.value = 1
  void loadInvites()
}

const clearSearch = () => {
  searchQuery.value = ''
  onSearch()
}

const goToPage = (page: number) => {
  currentPage.value = page
  void loadInvites()
}

const getVisiblePages = () => {
  const pages = []
  const maxVisible = 5
  const start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  const end = Math.min(totalPages.value, start + maxVisible - 1)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
}

const closeMenu = () => {
  showMenu.value = false
  selectedInvite.value = null
}

const closeAcceptDialog = () => {
  acceptDialog.value = false
  inviteToProcess.value = null
}

const closeDeclineDialog = () => {
  declineDialog.value = false
  inviteToProcess.value = null
}

type InviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
type InviteRole = 'OWNER' | 'MANAGER' | 'TESTER' | 'APPROVER'

// Helper functions removed - not used

const getStatusLabel = (status: string): string => {
  const labels: Record<InviteStatus, string> = {
    PENDING: 'Pendente',
    ACCEPTED: 'Aceito',
    DECLINED: 'Recusado',
    EXPIRED: 'Expirado'
  }
  return status in labels ? labels[status as InviteStatus] : 'Desconhecido'
}

const getRoleLabel = (role: string): string => {
  const labels: Record<InviteRole, string> = {
    OWNER: 'Proprietário',
    MANAGER: 'Gerente',
    TESTER: 'Testador',
    APPROVER: 'Aprovador'
  }
  return role in labels ? labels[role as InviteRole] : 'Desconhecido'
}

const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('pt-BR')
}

const showInviteMenu = (invite: Invite) => {
  selectedInvite.value = invite
  showMenu.value = true
}

const acceptInvite = (invite: Invite) => {
  inviteToProcess.value = invite
  acceptDialog.value = true
}

const declineInvite = (invite: Invite) => {
  inviteToProcess.value = invite
  declineDialog.value = true
}

const confirmAccept = async () => {
  if (!inviteToProcess.value) return
  
  // Validar se o token existe
  if (!inviteToProcess.value.token) {
    $q.notify({
      type: 'negative',
      message: 'Token do convite não encontrado. Por favor, recarregue a página.',
      position: 'top'
    })
    return
  }
  
  processingInvite.value = inviteToProcess.value.id
  try {
    // Usar a API real para aceitar o convite
    await inviteService.acceptInvite(inviteToProcess.value.token)
    
    // Atualizar status local
    const invite = invites.value.find(i => i.id === inviteToProcess.value!.id)
    if (invite) {
      invite.status = 'ACCEPTED'
      invite.acceptedAt = new Date().toISOString()
    }
    
    $q.notify({
      type: 'positive',
      message: 'Convite aceito com sucesso!',
      position: 'top'
    })
    
    acceptDialog.value = false
    
    // Recarregar a lista para garantir sincronização
    await loadInvites()
  } catch (error: unknown) {
    interface AxiosError {
      response?: {
        data?: {
          message?: string
        }
      }
    }
    const axiosError = error && typeof error === 'object' && 'response' in error
      ? error as AxiosError
      : undefined
    const message = axiosError?.response?.data?.message || 'Erro ao aceitar convite'
    $q.notify({
      type: 'negative',
      message,
      position: 'top'
    })
  } finally {
    processingInvite.value = null
  }
}

const confirmDecline = async () => {
  if (!inviteToProcess.value) return
  
  // Validar se o token existe
  if (!inviteToProcess.value.token) {
    $q.notify({
      type: 'negative',
      message: 'Token do convite não encontrado. Por favor, recarregue a página.',
      position: 'top'
    })
    return
  }
  
  processingInvite.value = inviteToProcess.value.id
  try {
    // Usar a API real para recusar o convite
    await inviteService.declineInvite(inviteToProcess.value.token)
    
    // Atualizar status local
    const invite = invites.value.find(i => i.id === inviteToProcess.value!.id)
    if (invite) {
      invite.status = 'DECLINED'
      invite.declinedAt = new Date().toISOString()
    }
    
    $q.notify({
      type: 'info',
      message: 'Convite recusado',
      position: 'top'
    })
    
    declineDialog.value = false
    
    // Recarregar a lista para garantir sincronização
    await loadInvites()
  } catch (error: unknown) {
    interface AxiosError {
      response?: {
        data?: {
          message?: string
        }
      }
    }
    const axiosError = error && typeof error === 'object' && 'response' in error
      ? error as AxiosError
      : undefined
    const message = axiosError?.response?.data?.message || 'Erro ao recusar convite'
    $q.notify({
      type: 'negative',
      message,
      position: 'top'
    })
  } finally {
    processingInvite.value = null
  }
}

const resendInvite = () => {
  closeMenu()
  $q.notify({
    type: 'info',
    message: 'Funcionalidade de reenvio será implementada',
    position: 'top'
  })
}

const viewProject = () => {
  if (!selectedInvite.value) return
  const projectId = selectedInvite.value.projectId
  closeMenu()
  void router.push(`/projects/${projectId}`)
}

onMounted(() => {
  void loadInvites()
})
</script>

<style scoped>
/* ===== Reset e Base ===== */
* {
  box-sizing: border-box;
}

.invites-page {
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

.refresh-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 500;
}

.refresh-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-button svg {
  width: 16px;
  height: 16px;
}

/* ===== Profile Icon ===== */
.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

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

/* ===== Seção de Busca ===== */
.search-section {
  margin-bottom: 2rem;
}

.search-container {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.6);
  z-index: 1;
}

.search-input {
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

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.search-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.2);
}

.clear-button {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.clear-button:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.clear-button svg {
  width: 14px;
  height: 14px;
}

.filter-wrapper {
  position: relative;
  min-width: 200px;
}

.filter-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.6);
  z-index: 1;
}

.filter-select {
  width: 100%;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  color: white;
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-select:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.2);
}

.filter-select option {
  background: #2d3748;
  color: white;
}

/* ===== Seção de Convites ===== */
.invites-section {
  margin-bottom: 2rem;
}

.loading-state {
  text-align: center;
  padding: 3rem 1rem;
  color: rgba(255, 255, 255, 0.8);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: rgba(255, 255, 255, 0.8);
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  color: rgba(255, 255, 255, 0.4);
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
  margin: 0 0 0.5rem;
}

.empty-state p {
  margin: 0;
  font-size: 0.9rem;
}

/* ===== Grid de Convites ===== */
.invites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

/* ===== Cards de Convite ===== */
.invite-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
}

.invite-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 1.5rem 1rem;
}

.status-indicator {
  flex-shrink: 0;
}

.status-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.status-icon.status-pending {
  background: linear-gradient(135deg, #feca57 0%, #ff9ff3 100%);
}

.status-icon.status-accepted {
  background: linear-gradient(135deg, #48dbfb 0%, #0abde3 100%);
}

.status-icon.status-declined {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
}

.status-icon.status-expired {
  background: linear-gradient(135deg, #a4b0be 0%, #747d8c 100%);
}

.status-icon svg {
  width: 20px;
  height: 20px;
}

.invite-info {
  flex: 1;
}

.inviter-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  margin: 0 0 0.25rem;
}

.project-name {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.action-button {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.7);
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.3);
  color: white;
  transform: scale(1.1);
}

.action-button svg {
  width: 16px;
  height: 16px;
}

/* ===== Conteúdo dos Cards ===== */
.card-content {
  padding: 0 1.5rem 1rem;
}

.invite-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
}

.detail-icon {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

.detail-label {
  font-weight: 500;
  min-width: 70px;
  color: rgba(255, 255, 255, 0.9);
}

.role-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-badge.role-owner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.role-badge.role-manager {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.role-badge.role-tester {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.role-badge.role-approver {
  background: linear-gradient(135deg, #feca57 0%, #ff9ff3 100%);
  color: white;
}

/* ===== Footer dos Cards ===== */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.status-pending {
  background: linear-gradient(135deg, #feca57 0%, #ff9ff3 100%);
  color: white;
}

.status-badge.status-accepted {
  background: linear-gradient(135deg, #48dbfb 0%, #0abde3 100%);
  color: white;
}

.status-badge.status-declined {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  color: white;
}

.status-badge.status-expired {
  background: linear-gradient(135deg, #a4b0be 0%, #747d8c 100%);
  color: white;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.accept-button, .decline-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  border: none;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.accept-button {
  background: linear-gradient(135deg, #48dbfb 0%, #0abde3 100%);
  color: white;
}

.accept-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(72, 219, 251, 0.4);
}

.decline-button {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  color: white;
}

.decline-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
}

.accept-button:disabled, .decline-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.accept-button svg, .decline-button svg {
  width: 14px;
  height: 14px;
}

/* ===== Paginação ===== */
.pagination-section {
  margin-top: 2rem;
}

.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 15px;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.page-button {
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

.page-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.page-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-button svg {
  width: 18px;
  height: 18px;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-number {
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
  font-weight: 500;
}

.page-number:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.page-number.active {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.1);
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
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.menu-header h4 {
  margin: 0;
  color: #2d3748;
  font-weight: 600;
}

.close-menu {
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
  color: #4a5568;
}

.close-menu:hover {
  background: rgba(0, 0, 0, 0.2);
  transform: scale(1.1);
}

.close-menu svg {
  width: 16px;
  height: 16px;
}

.menu-actions {
  padding: 1rem;
}

.menu-action {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #4a5568;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: left;
}

.menu-action:hover {
  background: rgba(0, 0, 0, 0.05);
  transform: translateX(4px);
}

.menu-action svg {
  width: 18px;
  height: 18px;
  color: #667eea;
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
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.cancel-button, .confirm-button {
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-button {
  background: rgba(0, 0, 0, 0.1);
  color: #4a5568;
}

.cancel-button:hover {
  background: rgba(0, 0, 0, 0.2);
}

.confirm-button {
  color: white;
}

.confirm-button.success {
  background: linear-gradient(135deg, #48dbfb 0%, #0abde3 100%);
}

.confirm-button.error {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
}

.confirm-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.confirm-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* ===== Responsividade ===== */
@media (max-width: 768px) {
  .main-container {
    padding: 1rem 0.5rem;
  }
  
  .header-content {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .search-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input-wrapper {
    max-width: none;
  }
  
  .invites-grid {
    grid-template-columns: 1fr;
  }
  
  .card-footer {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .action-buttons {
    justify-content: stretch;
  }
  
  .accept-button, .decline-button {
    flex: 1;
    justify-content: center;
  }
  
  .dialog-container {
    min-width: 320px;
    margin: 1rem;
  }
  
  .menu-container {
    min-width: 280px;
    margin: 1rem;
  }
}

@media (max-width: 480px) {
  .title-content h1 {
    font-size: 1.5rem;
  }
  
  .invite-card {
    margin: 0 0.5rem;
  }
  
  .pagination-container {
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  
  .page-button, .page-number {
    width: 36px;
    height: 36px;
  }
}

/* ===== Animações de Entrada ===== */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.invite-card {
  animation: slideInUp 0.6s ease-out forwards;
}

.invite-card:nth-child(1) { animation-delay: 0.1s; }
.invite-card:nth-child(2) { animation-delay: 0.2s; }
.invite-card:nth-child(3) { animation-delay: 0.3s; }
.invite-card:nth-child(4) { animation-delay: 0.4s; }
.invite-card:nth-child(5) { animation-delay: 0.5s; }
.invite-card:nth-child(6) { animation-delay: 0.6s; }

/* ===== Estados de Foco para Acessibilidade ===== */
.back-button:focus-visible,
.refresh-button:focus-visible,
.search-input:focus-visible,
.filter-select:focus-visible,
.action-button:focus-visible,
.accept-button:focus-visible,
.decline-button:focus-visible,
.page-button:focus-visible,
.page-number:focus-visible,
.menu-action:focus-visible,
.cancel-button:focus-visible,
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
