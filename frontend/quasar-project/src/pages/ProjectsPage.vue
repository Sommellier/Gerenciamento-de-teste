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
            <q-avatar color="primary" text-color="white" size="40px" icon="folder" />
            <div>
              <div class="title">Meus Projetos</div>
              <div class="subtitle">Gerencie seus projetos de teste</div>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <q-btn 
            color="primary" 
            unelevated 
            size="md" 
            icon="add" 
            label="Novo Projeto" 
            @click="createProject"
            class="create-btn"
          />
        </div>
      </div>

      <!-- Search and filters -->
      <div class="search-section">
        <q-input
          v-model="searchQuery"
          placeholder="Buscar projetos..."
          filled
          clearable
          @update:model-value="onSearch"
          @clear="onSearch"
          class="search-input"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
          <template #append v-if="loading">
            <q-spinner-dots size="20px" color="primary" />
          </template>
        </q-input>
      </div>

      <!-- Projects grid -->
      <div class="projects-grid" v-if="!loading">
        <div v-if="projects.length === 0" class="empty-state">
          <q-icon name="folder_open" size="64px" color="grey-5" />
          <h3>Nenhum projeto encontrado</h3>
          <p v-if="searchQuery">Tente ajustar sua busca</p>
          <p v-else>Crie seu primeiro projeto para começar</p>
          <q-btn 
            color="primary" 
            unelevated 
            label="Criar Projeto" 
            @click="createProject"
            class="q-mt-md"
          />
        </div>

        <q-card 
          v-for="project in projects" 
          :key="project.id" 
          class="project-card"
          @click="viewProject(project)"
        >
          <q-card-section class="project-header">
            <div class="project-icon">
              <q-avatar color="primary" text-color="white" size="32px" icon="folder" />
            </div>
            <div class="project-actions">
              <q-btn 
                flat 
                round 
                icon="more_vert" 
                size="sm"
                @click.stop="showProjectMenu(project, $event)"
              >
                <q-tooltip>Ações</q-tooltip>
              </q-btn>
            </div>
          </q-card-section>

          <q-card-section class="project-content">
            <h3 class="project-title">{{ project.name }}</h3>
            <p class="project-description" v-if="project.description">
              {{ project.description }}
            </p>
            <p class="project-description" v-else>
              <em>Sem descrição</em>
            </p>
          </q-card-section>


          <q-card-section class="project-footer">
            <div class="project-meta">
              <q-icon name="schedule" size="14px" class="q-mr-xs" />
              <span class="text-caption">
                Criado em {{ formatDate(project.createdAt) }}
              </span>
            </div>
            <div class="project-status">
              <q-chip 
                :color="getProjectStatusColor(project)" 
                text-color="white" 
                size="sm"
                :label="getProjectStatus(project)"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="loading-state">
        <q-spinner-dots size="40px" color="primary" />
        <p>Carregando projetos...</p>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <q-pagination
          v-model="currentPage"
          :max="totalPages"
          :max-pages="5"
          direction-links
          @update:model-value="loadProjects"
        />
      </div>
    </section>

    <!-- Project menu -->
    <q-menu
      v-model="showMenu"
      :target="menuTarget"
      :position="menuPosition"
      class="project-menu"
    >
      <q-list style="min-width: 160px">
        <q-item clickable @click="editProject(selectedProject)">
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>Editar</q-item-section>
        </q-item>
        <q-separator />
        <q-item clickable @click="deleteProject(selectedProject)" class="text-negative">
          <q-item-section avatar>
            <q-icon name="delete" />
          </q-item-section>
          <q-item-section>Excluir</q-item-section>
        </q-item>
      </q-list>
    </q-menu>

    <!-- Delete confirmation dialog -->
    <q-dialog v-model="deleteDialog">
      <q-card>
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="warning" color="negative" size="32px" />
          <div class="text-h6">Confirmar exclusão</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          Tem certeza que deseja excluir o projeto "{{ projectToDelete?.name }}"? 
          Esta ação não pode ser desfeita.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
          <q-btn 
            flat 
            label="Excluir" 
            color="negative" 
            @click="confirmDelete"
            :loading="deleting"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import api from 'src/services/api'

const router = useRouter()
const $q = useQuasar()

// State
const projects = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalProjects = ref(0)

// Menu state
const showMenu = ref(false)
const menuTarget = ref(null)
const menuPosition = ref('bottom right')
const selectedProject = ref<any>(null)

// Delete dialog state
const deleteDialog = ref(false)
const projectToDelete = ref<any>(null)
const deleting = ref(false)

// Computed
const hasProjects = computed(() => projects.value.length > 0)


// Navigation
function goBack() {
  router.push('/dashboard')
}

function createProject() {
  router.push('/create-project')
}

function viewProject(project: any) {
  router.push(`/projects/${project.id}`)
}

// Project actions
function showProjectMenu(project: any, event: Event) {
  selectedProject.value = project
  menuTarget.value = event.target
  showMenu.value = true
}

function editProject(project: any) {
  showMenu.value = false
  router.push(`/projects/${project.id}/edit`)
}

function deleteProject(project: any) {
  showMenu.value = false
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
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: 'Erro ao excluir projeto',
      position: 'top'
    })
  } finally {
    deleting.value = false
    deleteDialog.value = false
    projectToDelete.value = null
  }
}

// Data loading
async function loadProjects() {
  console.log('loadProjects called, setting loading to true')
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      pageSize: '12'
    })
    
    if (searchQuery.value && searchQuery.value.trim()) {
      params.append('q', searchQuery.value.trim())
    }
    

    console.log('Loading projects with params:', params.toString())
    const response = await api.get(`/projects?${params}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    console.log('Projects response:', response.data)
    console.log('Projects items:', response.data.items)
    console.log('Projects length:', response.data.items?.length)
    
    projects.value = response.data.items || []
    totalPages.value = response.data.totalPages || 1
    totalProjects.value = response.data.total || 0
    
    console.log('projects.value after assignment:', projects.value)
    console.log('projects.value.length:', projects.value.length)
  } catch (err: any) {
    console.error('Error loading projects:', err)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar projetos',
      position: 'top'
    })
  } finally {
    console.log('loadProjects finished, setting loading to false')
    loading.value = false
  }
}

// Search and filters
let searchTimeout: NodeJS.Timeout | null = null

function onSearch() {
  // Limpa o timeout anterior se existir
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  // Se a busca estiver vazia, busca imediatamente
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    currentPage.value = 1
    loadProjects()
    return
  }
  
  // Define um novo timeout para fazer a busca após 500ms
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadProjects()
  }, 500)
}


// Utility functions
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function getProjectStatus(project: any) {
  // TODO: Implementar lógica de status baseada no projeto
  return 'Ativo'
}

function getProjectStatusColor(project: any) {
  // TODO: Implementar cores baseadas no status
  return 'positive'
}

// Lifecycle
onMounted(() => {
  loadProjects()
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
  width: min(1200px, 94vw);
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

.create-btn {
  font-weight: 500;
}

.search-section {
  padding: 0 14px 20px;
}

.search-input {
  max-width: 400px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 0 14px 20px;
}

.project-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 12px;
  overflow: hidden;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 0;
}

.project-icon {
  display: flex;
  align-items: center;
}

.project-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.project-card:hover .project-actions {
  opacity: 1;
}

.project-content {
  padding: 12px 16px;
}

.project-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.project-description {
  font-size: 14px;
  color: #666;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}


.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px 16px;
}

.project-meta {
  display: flex;
  align-items: center;
  color: #888;
  font-size: 12px;
}

.project-status {
  display: flex;
  align-items: center;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-state h3 {
  margin: 16px 0 8px 0;
  color: #333;
}

.empty-state p {
  margin: 0 0 16px 0;
}

.loading-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 20px 14px 0;
}

.project-menu {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

</style>
