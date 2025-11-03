<!-- Página de Projetos Moderna -->
<template>
  <div class="projects-page">
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
                <h1 class="page-title">Meus Projetos</h1>
                <p class="page-subtitle">Gerencie seus projetos de teste</p>
              </div>
            </div>
          </div>

          <div class="header-actions">
            <button 
              class="create-button"
              @click="createProject"
              aria-label="Criar novo projeto"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Novo Projeto
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

      <!-- Seção de busca -->
      <section class="search-section">
        <div class="search-container">
          <div class="search-input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="Buscar projetos..."
              @input="onSearch"
            />
            <button 
              v-if="searchQuery" 
              class="clear-search"
              @click="clearSearch"
              aria-label="Limpar busca"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div v-if="loading || isSearching" class="search-loading">
              <div class="loading-spinner"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Grid de projetos -->
      <section class="projects-section">
        <!-- Estado vazio -->
        <div v-if="!loading && !isSearching && projects.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 19A2 2 0 0 1 20 21H4A2 2 0 0 1 2 19V5A2 2 0 0 1 4 3H8L12 7H20A2 2 0 0 1 22 9V19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h3>Nenhum projeto encontrado</h3>
          <p v-if="searchQuery">Nenhum projeto corresponde à busca por "{{ searchQuery }}"</p>
          <p v-else>Crie seu primeiro projeto para começar</p>
        </div>

        <!-- Grid de projetos -->
        <div v-else-if="!loading && !isSearching" class="projects-grid">
          <div 
            v-for="project in projects" 
            :key="project.id"
            class="project-card"
            @click="viewProject(project)"
          >
            <div class="project-header">
              <div class="project-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 19A2 2 0 0 1 20 21H4A2 2 0 0 1 2 19V5A2 2 0 0 1 4 3H8L12 7H20A2 2 0 0 1 22 9V19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <button 
                class="project-menu-button"
                @click.stop="showProjectMenu(project)"
                aria-label="Ações do projeto"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="19" cy="12" r="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="5" cy="12" r="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>

            <div class="project-content">
              <h3 class="project-title">{{ project.name }}</h3>
              <p class="project-description">
                {{ project.description || 'Sem descrição' }}
              </p>
            </div>

            <div class="project-footer">
              <div class="project-meta">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Criado em {{ formatDate(project.createdAt) }}</span>
              </div>
              <div class="project-status" :class="`status-${getProjectStatus(project).toLowerCase()}`">
                {{ getProjectStatus(project) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Estado de carregamento -->
        <div v-if="loading || isSearching" class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ isSearching ? 'Buscando projetos...' : 'Carregando projetos...' }}</p>
        </div>
      </section>

      <!-- Paginação -->
      <section v-if="totalPages > 1 && !searchQuery" class="pagination-section">
        <div class="pagination-container">
          <button 
            class="page-button"
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage === 1"
            aria-label="Página anterior"
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
            >
              {{ page }}
            </button>
          </div>

          <button 
            class="page-button"
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            aria-label="Próxima página"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </section>
    </main>

    <!-- Menu de ações do projeto -->
    <div v-if="showMenu" class="menu-overlay" @click="closeMenu">
      <div class="menu-container" @click.stop>
        <div class="menu-header">
          <h3>Ações do Projeto</h3>
          <button class="menu-close" @click="closeMenu">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="menu-content">
          <button class="menu-action" @click="selectedProject && editProject(selectedProject)">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 4H4A2 2 0 0 0 2 6V20A2 2 0 0 0 4 22H18A2 2 0 0 0 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.5 2.5A2.121 2.121 0 0 1 21 5L12 14L8 15L9 11L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Editar
          </button>
          <button class="menu-action danger" @click="selectedProject && deleteProject(selectedProject)">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M19,6V20A2,2 0 0,1 17,22H7A2,2 0 0,1 5,20V6M8,6V4A2,2 0 0,1 10,2H14A2,2 0 0,1 16,4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Excluir
          </button>
        </div>
      </div>
    </div>

    <!-- Diálogo de confirmação de exclusão -->
    <div v-if="deleteDialog" class="dialog-overlay" @click="closeDeleteDialog">
      <div class="dialog-container error" @click.stop>
        <div class="dialog-header">
          <div class="dialog-icon error">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.29 3.86L1.82 18A2 2 0 0 0 3.64 21H20.36A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3>Confirmar Exclusão</h3>
        </div>
        <div class="dialog-content">
          <p>Tem certeza que deseja excluir o projeto <strong>"{{ projectToDelete?.name }}"</strong>?</p>
          <p class="text-grey-6">Esta ação não pode ser desfeita.</p>
        </div>
        <div class="dialog-actions">
          <button class="cancel-button" @click="closeDeleteDialog">
            Cancelar
          </button>
          <button 
            class="confirm-button error"
            @click="confirmDelete"
            :disabled="deleting"
          >
            <div v-if="deleting" class="loading-spinner"></div>
            {{ deleting ? 'Excluindo...' : 'Excluir' }}
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
import api from 'src/services/api'

const router = useRouter()
const $q = useQuasar()

// State
interface Project {
  id: number
  name: string
  description?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

const projects = ref<Project[]>([])
const allProjects = ref<Project[]>([]) // Para busca local
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalProjects = ref(0)
const isSearching = ref(false)

// Menu state
const showMenu = ref(false)
const selectedProject = ref<Project | null>(null)

// Delete dialog state
const deleteDialog = ref(false)
const projectToDelete = ref<Project | null>(null)
const deleting = ref(false)

// Navigation
function goBack() {
  void router.push('/dashboard')
}

function goToProfile() {
  void router.push('/profile')
}

function createProject() {
  void router.push('/create-project')
}

function viewProject(project: Project) {
  void router.push(`/projects/${project.id}`)
}

// Pagination
function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    void loadProjects()
  }
}

function getVisiblePages() {
  const pages = []
  const maxVisible = 5
  const start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  const end = Math.min(totalPages.value, start + maxVisible - 1)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
}

// Search
function clearSearch() {
  searchQuery.value = ''
  isSearching.value = false
  onSearch()
}

// Project actions
function showProjectMenu(project: Project) {
  selectedProject.value = project
  showMenu.value = true
}

function closeMenu() {
  showMenu.value = false
  selectedProject.value = null
}

function closeDeleteDialog() {
  deleteDialog.value = false
  projectToDelete.value = null
}

function editProject(project: Project) {
  closeMenu()
  void router.push(`/projects/${project.id}/edit`)
}

function deleteProject(project: Project) {
  closeMenu()
  projectToDelete.value = project
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!projectToDelete.value) return
  
  deleting.value = true
  try {
    await api.delete(`/projects/${projectToDelete.value.id}`)
    $q.notify({
      type: 'positive',
      message: 'Projeto excluído com sucesso!',
      position: 'top'
    })
    await loadProjects()
  } catch (err: unknown) {
    console.error('Erro ao excluir projeto:', err)
    $q.notify({
      type: 'negative',
      message: 'Erro ao excluir projeto',
      position: 'top'
    })
  } finally {
    deleting.value = false
    closeDeleteDialog()
  }
}

// Data loading
async function loadProjects() {
  console.log('loadProjects called, setting loading to true')
  loading.value = true
  try {
    // Se não há busca ativa, carrega todos os projetos
    if (!searchQuery.value || searchQuery.value.trim() === '') {
      const params = new URLSearchParams({
        page: currentPage.value.toString(),
        pageSize: '12'
      })
      
      console.log('Loading projects with params:', params.toString())
      const response = await api.get<{
        items: Project[]
        total: number
        page: number
        pageSize: number
        totalPages: number
      }>(`/projects?${params}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      console.log('Projects response:', response.data)
      console.log('Projects items:', response.data?.items)
      console.log('Projects length:', response.data?.items?.length)
      
      projects.value = response.data?.items || []
      allProjects.value = response.data?.items || [] // Armazena todos os projetos
      totalPages.value = response.data?.totalPages || 1
      totalProjects.value = response.data?.total || 0
      
      console.log('projects.value after assignment:', projects.value)
      console.log('projects.value.length:', projects.value.length)
    } else {
      // Busca local nos projetos já carregados
      performLocalSearch()
    }
  } catch (err: unknown) {
    console.error('Error loading projects:', err)
    
    // Mensagem de erro mais detalhada
    let errorMessage = 'Erro ao carregar projetos'
    
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosError = err as { response?: { status?: number; data?: { message?: string; error?: string } } }
      // Erro da resposta HTTP
      errorMessage = axiosError.response?.data?.message || axiosError.response?.data?.error || errorMessage
      console.error('Erro HTTP:', axiosError.response?.status, errorMessage)
      console.error('Response data:', axiosError.response?.data)
    } else if (err && typeof err === 'object' && 'request' in err) {
      // Erro de rede/conexão
      errorMessage = 'Erro de conexão. Verifique se o servidor está rodando.'
      console.error('Erro de rede:', err.request)
    } else if (err instanceof Error) {
      errorMessage = err.message
    }
    
    $q.notify({
      type: 'negative',
      message: errorMessage,
      position: 'top',
      timeout: 5000
    })
  } finally {
    console.log('loadProjects finished, setting loading to false')
    loading.value = false
  }
}

// Busca local
function performLocalSearch() {
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    projects.value = allProjects.value
    return
  }
  
  const query = searchQuery.value.toLowerCase().trim()
  const filteredProjects = allProjects.value.filter(project => 
    project.name.toLowerCase().includes(query) ||
    (project.description && project.description.toLowerCase().includes(query))
  )
  
  projects.value = filteredProjects
  totalPages.value = 1 // Para busca local, sempre mostra todos os resultados
  totalProjects.value = filteredProjects.length
}

// Search and filters
let searchTimeout: NodeJS.Timeout | null = null

function onSearch() {
  // Limpa o timeout anterior se existir
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  // Se a busca estiver vazia, recarrega todos os projetos
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    currentPage.value = 1
    void loadProjects()
    return
  }
  
  // Define um novo timeout para fazer a busca local após 300ms
  searchTimeout = setTimeout(() => {
    isSearching.value = true
    performLocalSearch()
    isSearching.value = false
  }, 300)
}

// Utility functions
function formatDate(dateString: string | undefined) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function getProjectStatus(_project: Project) {
  // TODO: Implementar lógica de status baseada no projeto
  void _project // Marcar como usado explicitamente
  return 'Ativo'
}

// Carrega todos os projetos para busca local
async function loadAllProjects() {
  try {
    const response = await api.get('/projects?pageSize=1000', {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    allProjects.value = (response.data as { items?: Project[] })?.items || []
  } catch (err: unknown) {
    console.error('Error loading all projects:', err)
  }
}

// Lifecycle
onMounted(async () => {
  await loadAllProjects()
  await loadProjects()
})
</script>

<style scoped>
/* ===== Reset e Base ===== */
* {
  box-sizing: border-box;
}

.projects-page {
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

.create-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(79, 172, 254, 0.4);
}

.create-button svg {
  width: 16px;
  height: 16px;
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

/* ===== Search Section ===== */
.search-section {
  margin-bottom: 2rem;
}

.search-container {
  display: flex;
  justify-content: center;
}

.search-input-wrapper {
  position: relative;
  max-width: 400px;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
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

.clear-search {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.3s ease;
}

.clear-search:hover {
  color: white;
}

.clear-search svg {
  width: 16px;
  height: 16px;
}

.search-loading {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
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

/* ===== Projects Section ===== */
.projects-section {
  margin-bottom: 2rem;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.project-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.project-card:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.project-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.project-icon svg {
  width: 20px;
  height: 20px;
}

.project-menu-button {
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
  opacity: 0;
}

.project-card:hover .project-menu-button {
  opacity: 1;
}

.project-menu-button:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.project-menu-button svg {
  width: 16px;
  height: 16px;
}

.project-content {
  margin-bottom: 1rem;
}

.project-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.project-description {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
}

.project-meta svg {
  width: 14px;
  height: 14px;
}

.project-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-ativo {
  background: rgba(25, 135, 84, 0.2);
  color: #198754;
}

.status-inativo {
  background: rgba(108, 117, 125, 0.2);
  color: #6c757d;
}

.status-pausado {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.7);
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 1.5rem;
  color: rgba(255, 255, 255, 0.5);
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  font-size: 0.9rem;
}

.create-first-button {
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

.create-first-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(79, 172, 254, 0.4);
}

.create-first-button svg {
  width: 16px;
  height: 16px;
}

/* ===== Loading State ===== */
.loading-state {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.7);
}

.loading-state .loading-spinner {
  width: 32px;
  height: 32px;
  margin: 0 auto 1rem;
}

.loading-state p {
  margin: 0;
  font-size: 0.9rem;
}

/* ===== Pagination ===== */
.pagination-section {
  margin-top: 2rem;
}

.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.page-button {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
}

.page-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.page-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.page-button svg {
  width: 16px;
  height: 16px;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-number {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  font-weight: 500;
}

.page-number:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.page-number.active {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border-color: transparent;
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
  margin: 0 0 0.5rem 0;
  color: #4a5568;
  line-height: 1.6;
}

.dialog-content .text-grey-6 {
  color: #6b7280;
  font-size: 0.9rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.cancel-button {
  padding: 0.75rem 1.5rem;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 12px;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 500;
}

.cancel-button:hover {
  background: rgba(0, 0, 0, 0.2);
}

.confirm-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
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

.confirm-button .loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
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
  
  .projects-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .project-card {
    padding: 1rem;
  }
  
  .pagination-container {
    flex-wrap: wrap;
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
  
  .project-icon {
    width: 32px;
    height: 32px;
  }
  
  .project-icon svg {
    width: 16px;
    height: 16px;
  }
}

/* ===== Estados de Foco para Acessibilidade ===== */
.back-button:focus-visible,
.create-button:focus-visible,
.profile-icon-button:focus-visible,
.search-input:focus-visible,
.clear-search:focus-visible,
.project-card:focus-visible,
.project-menu-button:focus-visible,
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