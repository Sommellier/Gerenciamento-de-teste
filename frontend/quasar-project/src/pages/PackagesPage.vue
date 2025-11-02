<template>
  <q-page class="packages-page">
    <!-- Header Section -->
    <div class="page-header">
      <q-card class="glass-card header-card">
        <q-card-section class="header-content">
          <div class="header-top">
            <q-btn
              flat
              round
              icon="arrow_back"
              @click="goBack"
              class="back-button"
              size="lg"
            />
            <div class="header-info">
              <div class="title-section">
                <q-icon name="inventory_2" class="section-icon" />
                <h1 class="page-title">Pacotes de Teste</h1>
              </div>
              <p class="subtitle">Gerencie os pacotes de teste do projeto</p>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Filtros e Ações -->
    <q-card class="filters-card glass-card">
      <q-card-section>
        <div class="filters-container">
          <div class="filter-group">
            <q-select
              v-model="selectedStatus"
              :options="statusOptions"
              label="Status"
              outlined
              clearable
              class="filter-input"
              dark
              filled
              @update:model-value="loadPackages"
            >
              <template v-slot:prepend>
                <q-icon name="flag" />
              </template>
            </q-select>
            <q-select
              v-model="selectedType"
              :options="typeOptions"
              label="Tipo"
              outlined
              clearable
              class="filter-input"
              dark
              filled
              @update:model-value="loadPackages"
            >
              <template v-slot:prepend>
                <q-icon name="category" />
              </template>
            </q-select>
          </div>
          <div class="actions-group">
            <q-btn
              @click="goToCreatePackage"
              icon="add"
              label="Criar Pacote"
              color="primary"
              class="action-btn"
              size="md"
              unelevated
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Lista de Pacotes -->
    <q-card class="packages-card glass-card">
      <q-card-section>
        <div v-if="loading" class="loading-container">
          <q-spinner size="48px" color="primary" />
          <p class="loading-text">Carregando pacotes...</p>
        </div>

        <div v-else-if="packages.length === 0" class="empty-state">
          <div class="empty-state-content">
            <div class="empty-icon-wrapper">
              <q-icon name="inventory_2" size="120px" class="empty-icon" />
            </div>
            <h3 class="empty-title">Nenhum pacote encontrado</h3>
            <p class="empty-description">Comece criando seu primeiro pacote de teste para organizar seus cenários</p>
            <q-btn
              @click="goToCreatePackage"
              icon="add"
              label="Criar Primeiro Pacote"
              color="primary"
              size="md"
              unelevated
              class="empty-action-btn"
            />
          </div>
        </div>

        <div v-else class="packages-container">
          <div class="packages-header">
            <span class="packages-count">{{ packages.length }} {{ packages.length === 1 ? 'pacote encontrado' : 'pacotes encontrados' }}</span>
          </div>
          <div class="packages-grid">
            <q-card
              v-for="packageItem in packages"
              :key="packageItem.id"
              class="package-card glass-card"
              @click="goToPackageDetails(packageItem.id)"
            >
              <q-card-section class="package-header">
                <div class="package-title-row">
                  <div class="package-title">
                    <h3>{{ packageItem.title }}</h3>
                  </div>
                  <q-chip
                    :label="getStatusLabel(packageItem.status)"
                    :color="getStatusColor(packageItem.status)"
                    text-color="white"
                    size="sm"
                    class="status-chip"
                  />
                </div>
                <q-btn-dropdown
                  icon="more_vert"
                  flat
                  round
                  @click.stop
                  class="package-menu-btn"
                  dark
                  menu-anchor="bottom right"
                  menu-self="top right"
                >
                  <q-list dark class="package-menu-list">
                    <q-item clickable @click="goToScenarios(packageItem.id)" class="menu-item">
                      <q-item-section avatar>
                        <q-icon name="playlist_play" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>Cenários</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item clickable @click="editPackage(packageItem.id)" class="menu-item">
                      <q-item-section avatar>
                        <q-icon name="edit" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>Editar</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-separator dark />
                    <q-item clickable @click="deletePackageAction(packageItem.id)" class="menu-item delete-item">
                      <q-item-section avatar>
                        <q-icon name="delete" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>Excluir</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-btn-dropdown>
              </q-card-section>

              <q-card-section class="package-content">
                <div class="package-info">
                  <div class="info-item">
                    <q-icon name="category" size="18px" class="info-icon" />
                    <span>{{ getTypeLabel(packageItem.type) }}</span>
                  </div>
                  <div class="info-item">
                    <q-icon name="flag" size="18px" class="info-icon" />
                    <span>{{ getPriorityLabel(packageItem.priority) }}</span>
                  </div>
                  <div class="info-item">
                    <q-icon name="schedule" size="18px" class="info-icon" />
                    <span>{{ packageItem.release }}</span>
                  </div>
                  <div class="info-item" v-if="packageItem.environment">
                    <q-icon name="computer" size="18px" class="info-icon" />
                    <span>{{ getEnvironmentLabel(packageItem.environment) }}</span>
                  </div>
                </div>

                <div v-if="packageItem.description" class="package-description">
                  {{ packageItem.description }}
                </div>

                <div class="package-stats">
                  <div class="stat">
                    <q-icon name="playlist_play" size="18px" class="stat-icon" />
                    <span>{{ packageItem.scenarios?.length || 0 }} cenário{{ (packageItem.scenarios?.length || 0) !== 1 ? 's' : '' }}</span>
                  </div>
                  <div class="stat" v-if="packageItem.assigneeEmail">
                    <q-icon name="person" size="18px" class="stat-icon" />
                    <span class="truncate">{{ packageItem.assigneeEmail }}</span>
                  </div>
                </div>

                <div v-if="packageItem.tags.length > 0" class="package-tags">
                  <q-chip
                    v-for="tag in packageItem.tags.slice(0, 3)"
                    :key="tag"
                    :label="tag"
                    size="sm"
                    class="tag-chip"
                  />
                  <q-chip
                    v-if="packageItem.tags.length > 3"
                    :label="`+${packageItem.tags.length - 3}`"
                    size="sm"
                    class="tag-chip-more"
                  />
                </div>
              </q-card-section>

              <q-card-section class="package-footer">
                <div class="package-dates">
                  <q-icon name="calendar_today" size="14px" class="date-icon" />
                  <span>Criado em {{ formatDate(packageItem.createdAt) }}</span>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { getProjectPackages, deletePackage } from '../services/package.service'
import type { TestPackage } from '../services/package.service'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const projectId = computed(() => Number(route.params.projectId))
const loading = ref(false)
const packages = ref<TestPackage[]>([])

// Filtros
const selectedStatus = ref('')
const selectedType = ref('')

// Opções dos filtros
const releaseOptions = ref<string[]>([])
const statusOptions = [
  { label: 'Criado', value: 'CREATED' },
  { label: 'Executado', value: 'EXECUTED' },
  { label: 'Passou', value: 'PASSED' },
  { label: 'Falhou', value: 'FAILED' }
]

const typeOptions = [
  { label: 'Funcional', value: 'FUNCTIONAL' },
  { label: 'Regressão', value: 'REGRESSION' },
  { label: 'Smoke', value: 'SMOKE' },
  { label: 'End-to-End', value: 'E2E' }
]

// Métodos
const loadPackages = async () => {
  try {
    loading.value = true
    const data = await getProjectPackages(projectId.value)
    
    // Verificar se data é um array
    if (!Array.isArray(data)) {
      console.error('❌ Data is not an array:', data)
      packages.value = []
      return
    }
    
    // Aplicar filtros
    let filteredData = data
    
    if (selectedStatus.value) {
      filteredData = filteredData.filter(pkg => pkg.status === selectedStatus.value)
    }
    
    if (selectedType.value) {
      filteredData = filteredData.filter(pkg => pkg.type === selectedType.value)
    }
    
    packages.value = filteredData

    // Extrair releases únicas
    const releases = [...new Set(data.map(pkg => pkg.release))].sort().reverse()
    releaseOptions.value = releases
  } catch (error: any) {
    console.error('Erro ao carregar pacotes:', error)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar pacotes'
    })
  } finally {
    loading.value = false
  }
}

const goToCreatePackage = () => {
  router.push(`/projects/${projectId.value}/create-package`)
}

const goBack = () => {
  router.push(`/projects/${projectId.value}`)
}

const goToPackageDetails = (packageId: number) => {
  router.push(`/projects/${projectId.value}/packages/${packageId}`)
}

const editPackage = (packageId?: number) => {
  if (packageId) {
    router.push(`/projects/${projectId.value}/packages/${packageId}/edit`)
  }
}

const goToScenarios = (packageId: number) => {
  router.push(`/projects/${projectId.value}/packages/${packageId}/scenarios`)
}

const deletePackageAction = async (packageId?: number) => {
  if (!packageId) return

  $q.dialog({
    title: 'Confirmar Exclusão',
    message: 'Tem certeza que deseja excluir este pacote? Esta ação não pode ser desfeita.',
    cancel: true,
    persistent: true,
    ok: {
      label: 'Excluir',
      color: 'negative'
    },
    cancel: {
      label: 'Cancelar',
      color: 'grey'
    }
  }).onOk(async () => {
    try {
      await deletePackage(projectId.value, packageId)
      $q.notify({
        type: 'positive',
        message: 'Pacote excluído com sucesso!'
      })
      loadPackages()
    } catch (error: any) {
      $q.notify({
        type: 'negative',
        message: 'Erro ao excluir pacote'
      })
    }
  })
}

// Funções auxiliares
const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    CREATED: 'Criado',
    EXECUTED: 'Executado',
    PASSED: 'Concluído',
    FAILED: 'Falhou',
    EM_TESTE: 'Em Teste',
    CONCLUIDO: 'Concluído',
    REPROVADO: 'Reprovado',
    APROVADO: 'Aprovado'
  }
  return statusMap[status] || status
}

const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    CREATED: 'grey',
    EXECUTED: 'orange',
    PASSED: 'green',
    FAILED: 'red',
    EM_TESTE: 'blue',
    CONCLUIDO: 'purple',
    REPROVADO: 'negative',
    APROVADO: 'positive'
  }
  return colorMap[status] || 'grey'
}

const getTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    FUNCTIONAL: 'Funcional',
    REGRESSION: 'Regressão',
    SMOKE: 'Smoke',
    E2E: 'End-to-End'
  }
  return typeMap[type] || type
}

const getPriorityLabel = (priority: string) => {
  const priorityMap: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    CRITICAL: 'Crítica'
  }
  return priorityMap[priority] || priority
}

const getEnvironmentLabel = (environment: string) => {
  const envMap: Record<string, string> = {
    DEV: 'Desenvolvimento',
    QA: 'QA',
    STAGING: 'Staging',
    PROD: 'Produção'
  }
  return envMap[environment] || environment
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

// Lifecycle
onMounted(() => {
  loadPackages()
})
</script>

<style scoped>
.packages-page {
  padding: 24px 32px;
  background: linear-gradient(135deg, #0b1220 0%, #0f172a 100%);
  min-height: 100vh;
  width: 100%;
}

/* Glass card effect */
.glass-card {
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

/* Header Section */
.page-header {
  margin-bottom: 24px;
}

.header-card {
  margin-bottom: 0;
}

.header-content {
  padding: 20px 24px;
}

.header-top {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.back-button {
  color: #667eea;
  margin-top: 4px;
}

.header-info {
  flex: 1;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.section-icon {
  font-size: 36px;
  color: #667eea;
}

.page-title {
  font-size: 32px;
  font-weight: 600;
  color: white;
  margin: 0;
}

.subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  padding-left: 48px;
}

/* Filters Card */
.filters-card {
  margin-bottom: 24px;
}

.filters-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 16px;
  flex: 1;
  min-width: 300px;
}

.filter-input {
  min-width: 180px;
  flex: 1;
}

.actions-group {
  display: flex;
  gap: 12px;
}

.action-btn {
  min-width: 160px;
}

/* Packages Card */
.packages-card {
  margin-bottom: 24px;
}

.packages-container {
  padding: 8px;
}

.packages-header {
  margin-bottom: 20px;
  padding: 0 8px;
}

.packages-count {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

/* Package Card */
.package-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.package-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.3) !important;
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
}

.package-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.package-title {
  flex: 1;
  min-width: 0;
}

.package-title h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-chip {
  flex-shrink: 0;
}

.package-menu-btn {
  opacity: 0.6;
  transition: opacity 0.2s;
  color: rgba(255, 255, 255, 0.7);
}

.package-menu-btn:hover {
  opacity: 1;
}

.package-menu-list {
  background: rgba(30, 41, 59, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 8px;
  min-width: 180px;
}

.menu-item {
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 8px;
  transition: all 0.2s ease;
  color: white !important;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

.menu-item :deep(.q-item__label) {
  color: white !important;
  font-weight: 500;
}

.menu-item :deep(.q-icon) {
  color: rgba(255, 255, 255, 0.8) !important;
}

.delete-item {
  color: #ef4444 !important;
}

.delete-item:hover {
  background: rgba(239, 68, 68, 0.2) !important;
}

.delete-item :deep(.q-item__label) {
  color: #ef4444 !important;
}

.delete-item :deep(.q-icon) {
  color: #ef4444 !important;
}

/* Package Content */
.package-content {
  padding: 0;
}

.package-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.info-icon {
  color: #667eea;
  opacity: 0.8;
}

.package-description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.package-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.stat-icon {
  color: #667eea;
  opacity: 0.8;
}

.truncate {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.package-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.tag-chip {
  background: rgba(102, 126, 234, 0.2) !important;
  color: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.tag-chip-more {
  background: rgba(255, 255, 255, 0.1) !important;
  color: rgba(255, 255, 255, 0.7) !important;
}

.package-footer {
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 16px;
}

.package-dates {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.date-icon {
  opacity: 0.6;
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 16px;
}

.loading-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  margin: 0;
}

/* Empty State */
.empty-state {
  padding: 80px 20px;
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
}

.empty-icon-wrapper {
  margin-bottom: 24px;
  opacity: 0.6;
}

.empty-icon {
  color: rgba(255, 255, 255, 0.3);
}

.empty-title {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 600;
  color: white;
}

.empty-description {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 32px;
  font-size: 16px;
  line-height: 1.5;
}

.empty-action-btn {
  min-width: 220px;
}

/* Responsive */
@media (max-width: 1200px) {
  .packages-grid {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  }
}

@media (max-width: 768px) {
  .packages-page {
    padding: 16px 20px;
  }

  .header-top {
    flex-wrap: wrap;
  }

  .subtitle {
    padding-left: 0;
    margin-top: 8px;
  }

  .title-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .section-icon {
    font-size: 28px;
  }

  .page-title {
    font-size: 24px;
  }

  .filters-container {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    flex-direction: column;
    min-width: auto;
  }

  .filter-input {
    min-width: auto;
    width: 100%;
  }

  .actions-group {
    width: 100%;
  }

  .action-btn {
    width: 100%;
    min-width: auto;
  }

  .packages-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .package-info {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .package-stats {
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .packages-page {
    padding: 12px 16px;
  }

  .page-title {
    font-size: 20px;
  }

  .packages-grid {
    gap: 12px;
  }
}
</style>
