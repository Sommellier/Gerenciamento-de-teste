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
            <q-tooltip>Voltar ao projeto</q-tooltip>
          </q-btn>
          
          <div class="title-wrap">
            <q-avatar color="primary" text-color="white" size="40px" icon="list_alt" />
            <div>
              <div class="title">Cenários de Teste</div>
              <div class="subtitle">{{ projectName }}</div>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <q-btn 
            color="primary" 
            unelevated 
            size="md" 
            icon="add" 
            label="Novo Cenário" 
            @click="createScenario"
            class="create-btn"
          />
        </div>
      </div>

      <!-- Search and filters -->
      <div class="search-section">
        <q-input
          v-model="searchQuery"
          placeholder="Buscar cenários..."
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

      <!-- Scenarios list -->
      <div class="scenarios-container" v-if="!loading">
        <div v-if="scenarios.length === 0" class="empty-state">
          <div class="empty-icon">
            <q-icon name="assignment" size="80px" color="grey-4" />
          </div>
          <h3>Nenhum cenário encontrado</h3>
          <p v-if="searchQuery">Tente ajustar sua busca</p>
          <p v-else>Crie seu primeiro cenário para começar</p>
          <q-btn 
            color="primary" 
            unelevated 
            label="Criar Cenário" 
            @click="createScenario"
            class="q-mt-md"
            size="lg"
            icon="add"
          />
        </div>

        <div v-else class="scenarios-list">
          <q-card 
            v-for="scenario in scenarios" 
            :key="scenario.id" 
            class="scenario-item"
            @click="viewScenario(scenario)"
          >
            <q-card-section class="scenario-content">
              <div class="scenario-main">
                <div class="scenario-icon">
                  <q-avatar :color="getScenarioTypeColor(scenario.type)" text-color="white" size="40px">
                    <q-icon name="assignment" />
                  </q-avatar>
                </div>
                
                <div class="scenario-info">
                  <div class="scenario-header">
                    <h3 class="scenario-title">{{ scenario.title }}</h3>
                    <div class="scenario-actions">
                      <q-btn 
                        flat 
                        round 
                        icon="more_vert" 
                        size="sm"
                        @click.stop="showScenarioMenu(scenario, $event)"
                        class="action-btn"
                      >
                        <q-tooltip>Ações</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                  
                  <p class="scenario-description" v-if="scenario.description">
                    {{ scenario.description }}
                  </p>
                  <p class="scenario-description" v-else>
                    <em>Sem descrição</em>
                  </p>
                  
                  <div class="scenario-meta">
                    <div class="meta-item">
                      <q-icon name="schedule" size="16px" class="q-mr-xs" />
                      <span>{{ formatDate(scenario.createdAt) }}</span>
                    </div>
                    <div class="meta-item">
                      <q-icon name="category" size="16px" class="q-mr-xs" />
                      <span>{{ getScenarioTypeLabel(scenario.type) }}</span>
                    </div>
                    <div class="meta-item">
                      <q-icon name="flag" size="16px" class="q-mr-xs" />
                      <span>{{ getScenarioPriorityLabel(scenario.priority) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="scenario-footer">
                <div class="scenario-tags">
                  <q-chip 
                    :color="getScenarioStatusColor(scenario.status)" 
                    text-color="white" 
                    size="sm"
                    :label="getScenarioStatus(scenario.status)"
                    class="status-chip"
                  />
                  <q-chip 
                    v-if="scenario.environment"
                    color="blue-grey-1"
                    text-color="blue-grey-8"
                    size="sm"
                    :label="scenario.environment"
                    class="env-chip"
                  />
                  <q-chip 
                    v-if="scenario.release"
                    color="purple-1"
                    text-color="purple-8"
                    size="sm"
                    :label="scenario.release"
                    class="release-chip"
                  />
                </div>
                
                <div class="scenario-stats" v-if="scenario.steps && scenario.steps.length > 0">
                  <q-icon name="list" size="14px" class="q-mr-xs" />
                  <span>{{ scenario.steps.length }} passos</span>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="loading-state">
        <q-spinner-dots size="40px" color="primary" />
        <p>Carregando cenários...</p>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <q-pagination
          v-model="currentPage"
          :max="totalPages"
          :max-pages="5"
          direction-links
          @update:model-value="loadScenarios"
        />
      </div>
    </section>

    <!-- Scenario menu -->
    <q-menu
      v-model="showMenu"
      :target="menuTarget || false"
      :position="menuPosition"
      class="scenario-menu"
    >
      <q-list style="min-width: 160px">
        <q-item clickable @click="selectedScenario && editScenario(selectedScenario)">
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>Editar</q-item-section>
        </q-item>
        <q-separator />
        <q-item clickable @click="selectedScenario && deleteScenario(selectedScenario)" class="text-negative">
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
          Tem certeza que deseja excluir o cenário "{{ scenarioToDelete?.title }}"? 
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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import api from 'src/services/api'
import { type TestScenario } from '../services/scenario.service'

// Interface estendida para incluir propriedades adicionais que podem vir da API
interface ExtendedScenario extends TestScenario {
  release?: string
}

const route = useRoute()
const router = useRouter()
const $q = useQuasar()

// State
const scenarios = ref<ExtendedScenario[]>([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalScenarios = ref(0)
const projectName = ref('')

// Menu state
const showMenu = ref(false)
const menuTarget = ref<HTMLElement | null>(null)
const menuPosition = ref('bottom right')
const selectedScenario = ref<ExtendedScenario | null>(null)

// Delete dialog state
const deleteDialog = ref(false)
const scenarioToDelete = ref<ExtendedScenario | null>(null)
const deleting = ref(false)

// Navigation
function goBack() {
  const projectId = String(route.params.projectId ?? '')
  void router.push(`/projects/${projectId}`)
}

function createScenario() {
  const projectId = String(route.params.projectId ?? '')
  void router.push(`/projects/${projectId}/create-scenario`)
}

function viewScenario(scenario: ExtendedScenario) {
  // TODO: Implementar visualização de cenário
  void scenario // Marcar como usado explicitamente
}

// Scenario actions
function showScenarioMenu(scenario: ExtendedScenario, event: Event) {
  selectedScenario.value = scenario
  menuTarget.value = event.target as HTMLElement | null
  showMenu.value = true
}

function editScenario(_scenario: ExtendedScenario) {
  void _scenario // Marcar como usado explicitamente
  showMenu.value = false
  // TODO: Implementar edição de cenário
}

function deleteScenario(scenario: ExtendedScenario) {
  showMenu.value = false
  scenarioToDelete.value = scenario
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!scenarioToDelete.value) return
  
  deleting.value = true
  try {
    const projectId = String(route.params.projectId ?? '')
    await api.delete(`/projects/${projectId}/scenarios/${scenarioToDelete.value.id}`)
    $q.notify({
      type: 'positive',
      message: 'Cenário excluído com sucesso!',
      position: 'top'
    })
    await loadScenarios()
  } catch (err: unknown) {
    console.error('Erro ao excluir cenário:', err)
    $q.notify({
      type: 'negative',
      message: 'Erro ao excluir cenário',
      position: 'top'
    })
  } finally {
    deleting.value = false
    deleteDialog.value = false
    scenarioToDelete.value = null
  }
}

// Data loading
async function loadScenarios() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    
    if (searchQuery.value && searchQuery.value.trim()) {
      params.append('q', searchQuery.value.trim())
    }

    const projectId = String(route.params.projectId ?? '')
    const response = await api.get(`/projects/${projectId}/scenarios?${params}`)
    
    // A API retorna os cenários diretamente, não em formato paginado
    scenarios.value = Array.isArray(response.data) ? response.data : []
    totalPages.value = 1
    totalScenarios.value = scenarios.value.length
  } catch (err: unknown) {
    console.error('Error loading scenarios:', err)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar cenários',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

// Search
let searchTimeout: NodeJS.Timeout | null = null

function onSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    currentPage.value = 1
    void loadScenarios()
    return
  }
  
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    void loadScenarios()
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

function getScenarioTypeColor(type: string) {
  const colors: { [key: string]: string } = {
    'FUNCTIONAL': 'blue',
    'REGRESSION': 'orange',
    'SMOKE': 'green',
    'E2E': 'purple'
  }
  return colors[type] || 'grey'
}

function getScenarioStatus(status: string) {
  const statusMap: { [key: string]: string } = {
    'CREATED': 'Criado',
    'EXECUTED': 'Executado',
    'PASSED': 'Concluído',
    'FAILED': 'Falhou',
    'APPROVED': 'Aprovado',
    'REPROVED': 'Reprovado',
    'BLOQUEADO': 'Bloqueado'
  }
  return statusMap[status] || status
}

function getScenarioStatusColor(status: string) {
  const colors: { [key: string]: string } = {
    'CREATED': 'grey',
    'EXECUTED': 'orange',
    'PASSED': 'green',
    'FAILED': 'red',
    'APPROVED': 'positive',
    'REPROVED': 'negative',
    'BLOQUEADO': 'warning'
  }
  return colors[status] || 'grey'
}

function getScenarioTypeLabel(type: string) {
  const types: { [key: string]: string } = {
    'FUNCTIONAL': 'Funcional',
    'REGRESSION': 'Regressão',
    'SMOKE': 'Smoke',
    'E2E': 'End-to-End'
  }
  return types[type] || type
}

function getScenarioPriorityLabel(priority: string) {
  const priorities: { [key: string]: string } = {
    'LOW': 'Baixa',
    'MEDIUM': 'Média',
    'HIGH': 'Alta',
    'CRITICAL': 'Crítica'
  }
  return priorities[priority] || priority
}

// Lifecycle
onMounted(async () => {
  // Carregar nome do projeto
  try {
    interface ProjectResponse {
      name: string
    }
    const projectId = String(route.params.projectId ?? '')
    const response = await api.get<ProjectResponse>(`/projects/${projectId}`)
    if (response.data && 'name' in response.data) {
      projectName.value = response.data.name
    }
  } catch (err: unknown) {
    console.error('Error loading project name:', err)
  }
  
  void loadScenarios()
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

.scenarios-container {
  padding: 0 14px 20px;
}

.scenarios-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-item {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.scenario-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  border-color: rgba(25, 118, 210, 0.3);
}

.scenario-content {
  padding: 24px;
}

.scenario-main {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.scenario-icon {
  flex-shrink: 0;
}

.scenario-info {
  flex: 1;
  min-width: 0;
}

.scenario-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.scenario-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.3;
  flex: 1;
}

.scenario-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
  margin-left: 12px;
}

.scenario-item:hover .scenario-actions {
  opacity: 1;
}

.action-btn {
  color: #666;
}

.scenario-description {
  font-size: 15px;
  color: #666;
  margin: 0 0 16px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.scenario-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  color: #666;
  font-size: 13px;
  font-weight: 500;
}

.meta-item .q-icon {
  color: #999;
}

.scenario-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.scenario-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.status-chip {
  font-weight: 600;
}

.env-chip,
.release-chip {
  font-weight: 500;
}

.scenario-stats {
  display: flex;
  align-items: center;
  color: #666;
  font-size: 13px;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #666;
}

.empty-icon {
  margin-bottom: 24px;
}

.empty-state h3 {
  margin: 16px 0 8px 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.empty-state p {
  margin: 0 0 24px 0;
  font-size: 16px;
  color: #666;
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

.scenario-menu {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Responsive design */
@media (max-width: 768px) {
  .scenario-main {
    flex-direction: column;
    gap: 12px;
  }
  
  .scenario-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .scenario-actions {
    opacity: 1;
    align-self: flex-end;
  }
  
  .scenario-meta {
    flex-direction: column;
    gap: 8px;
  }
  
  .scenario-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .scenario-tags {
    width: 100%;
  }
  
  .scenario-stats {
    align-self: flex-end;
  }
}
</style>
