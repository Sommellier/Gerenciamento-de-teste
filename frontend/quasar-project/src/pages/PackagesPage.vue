<template>
  <q-page class="packages-page">
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <q-icon name="inventory_2" class="section-icon" />
          <h1 class="page-title">Pacotes de Teste</h1>
        </div>
        <div class="subtitle">Gerencie os pacotes de teste do projeto</div>
      </div>
    </div>

    <!-- Filtros e Ações -->
    <q-card class="filters-card">
      <q-card-section>
        <div class="filters-container">
          <div class="filter-group">
            <q-select
              v-model="selectedRelease"
              :options="releaseOptions"
              label="Release"
              outlined
              clearable
              class="filter-input"
              @update:model-value="loadPackages"
            />
            <q-select
              v-model="selectedStatus"
              :options="statusOptions"
              label="Status"
              outlined
              clearable
              class="filter-input"
              @update:model-value="loadPackages"
            />
            <q-select
              v-model="selectedType"
              :options="typeOptions"
              label="Tipo"
              outlined
              clearable
              class="filter-input"
              @update:model-value="loadPackages"
            />
          </div>
          <div class="actions-group">
            <q-btn
              @click="goToCreatePackage"
              icon="add"
              label="Criar Pacote"
              color="primary"
              class="action-btn"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Lista de Pacotes -->
    <q-card class="packages-card">
      <q-card-section>
        <div v-if="loading" class="loading-container">
          <q-spinner size="40px" color="primary" />
          <p>Carregando pacotes...</p>
        </div>

        <div v-else-if="packages.length === 0" class="empty-state">
          <q-icon name="inventory_2" size="64px" color="grey-5" />
          <h3>Nenhum pacote encontrado</h3>
          <p>Comece criando seu primeiro pacote de teste</p>
          <q-btn
            @click="goToCreatePackage"
            icon="add"
            label="Criar Primeiro Pacote"
            color="primary"
          />
        </div>

        <div v-else class="packages-grid">
          <q-card
            v-for="packageItem in packages"
            :key="packageItem.id"
            class="package-card"
            @click="goToPackageDetails(packageItem.id)"
          >
            <q-card-section class="package-header">
              <div class="package-title">
                <h3>{{ packageItem.title }}</h3>
                <q-chip
                  :label="getStatusLabel(packageItem.status)"
                  :color="getStatusColor(packageItem.status)"
                  text-color="white"
                  size="sm"
                />
              </div>
              <q-btn
                icon="more_vert"
                flat
                round
                @click.stop="showPackageMenu(packageItem)"
              />
            </q-card-section>

            <q-card-section class="package-content">
              <div class="package-info">
                <div class="info-item">
                  <q-icon name="category" size="16px" />
                  <span>{{ getTypeLabel(packageItem.type) }}</span>
                </div>
                <div class="info-item">
                  <q-icon name="flag" size="16px" />
                  <span>{{ getPriorityLabel(packageItem.priority) }}</span>
                </div>
                <div class="info-item">
                  <q-icon name="schedule" size="16px" />
                  <span>{{ packageItem.release }}</span>
                </div>
                <div class="info-item" v-if="packageItem.environment">
                  <q-icon name="computer" size="16px" />
                  <span>{{ getEnvironmentLabel(packageItem.environment) }}</span>
                </div>
              </div>

              <div v-if="packageItem.description" class="package-description">
                {{ packageItem.description }}
              </div>

              <div class="package-stats">
                <div class="stat">
                  <q-icon name="list" size="16px" />
                  <span>{{ packageItem.steps.length }} passos</span>
                </div>
                <div class="stat" v-if="packageItem.assigneeEmail">
                  <q-icon name="person" size="16px" />
                  <span>{{ packageItem.assigneeEmail }}</span>
                </div>
              </div>

              <div v-if="packageItem.tags.length > 0" class="package-tags">
                <q-chip
                  v-for="tag in packageItem.tags.slice(0, 3)"
                  :key="tag"
                  :label="tag"
                  size="sm"
                  color="grey-3"
                  text-color="grey-8"
                />
                <q-chip
                  v-if="packageItem.tags.length > 3"
                  :label="`+${packageItem.tags.length - 3}`"
                  size="sm"
                  color="grey-4"
                  text-color="grey-8"
                />
              </div>
            </q-card-section>

            <q-card-section class="package-footer">
              <div class="package-dates">
                <span>Criado em {{ formatDate(packageItem.createdAt) }}</span>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-card-section>
    </q-card>

    <!-- Menu de Ações do Pacote -->
    <q-menu v-model="showMenu" :target="menuTarget">
      <q-list style="min-width: 150px">
        <q-item clickable @click="editPackage(selectedPackage?.id)">
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>Editar</q-item-section>
        </q-item>
        <q-item clickable @click="executePackage(selectedPackage?.id)">
          <q-item-section avatar>
            <q-icon name="play_arrow" />
          </q-item-section>
          <q-item-section>Executar</q-item-section>
        </q-item>
        <q-item clickable @click="deletePackage(selectedPackage?.id)">
          <q-item-section avatar>
            <q-icon name="delete" color="negative" />
          </q-item-section>
          <q-item-section>Excluir</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { getProjectPackages, deletePackage, executePackage } from '../services/package.service'
import type { TestPackage } from '../services/package.service'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const projectId = computed(() => Number(route.params.projectId))
const loading = ref(false)
const packages = ref<TestPackage[]>([])

// Filtros
const selectedRelease = ref('')
const selectedStatus = ref('')
const selectedType = ref('')

// Menu
const showMenu = ref(false)
const menuTarget = ref(null)
const selectedPackage = ref<TestPackage | null>(null)

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
    const data = await getProjectPackages(projectId.value, selectedRelease.value || undefined)
    packages.value = data

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

const goToPackageDetails = (packageId: number) => {
  // Por enquanto, vamos para a edição
  router.push(`/packages/${packageId}/edit`)
}

const showPackageMenu = (packageItem: TestPackage) => {
  selectedPackage.value = packageItem
  showMenu.value = true
}

const editPackage = (packageId?: number) => {
  if (packageId) {
    router.push(`/packages/${packageId}/edit`)
  }
  showMenu.value = false
}

const executePackageAction = async (packageId?: number) => {
  if (!packageId) return

  try {
    await executePackage(packageId)
    $q.notify({
      type: 'positive',
      message: 'Pacote executado com sucesso!'
    })
    loadPackages()
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: 'Erro ao executar pacote'
    })
  }
  showMenu.value = false
}

const deletePackageAction = async (packageId?: number) => {
  if (!packageId) return

  $q.dialog({
    title: 'Confirmar Exclusão',
    message: 'Tem certeza que deseja excluir este pacote?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await deletePackage(packageId)
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
  showMenu.value = false
}

// Funções auxiliares
const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    CREATED: 'Criado',
    EXECUTED: 'Executado',
    PASSED: 'Passou',
    FAILED: 'Falhou'
  }
  return statusMap[status] || status
}

const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    CREATED: 'grey',
    EXECUTED: 'orange',
    PASSED: 'green',
    FAILED: 'red'
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
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.header-content {
  text-align: center;
}

.title-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.section-icon {
  font-size: 32px;
  color: #1976d2;
}

.page-title {
  font-size: 32px;
  font-weight: 600;
  color: #1976d2;
  margin: 0;
}

.subtitle {
  font-size: 16px;
  color: #666;
}

.filters-card {
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filters-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.filter-group {
  display: flex;
  gap: 16px;
  flex: 1;
}

.filter-input {
  min-width: 150px;
}

.actions-group {
  display: flex;
  gap: 12px;
}

.action-btn {
  min-width: 140px;
}

.packages-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-container {
  text-align: center;
  padding: 40px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-state h3 {
  margin: 16px 0 8px;
  color: #666;
}

.empty-state p {
  color: #999;
  margin-bottom: 24px;
}

.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.package-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e0e0e0;
}

.package-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.package-title h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.package-content {
  padding: 16px 0;
}

.package-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
}

.package-description {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
  line-height: 1.4;
}

.package-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
}

.package-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.package-footer {
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.package-dates {
  font-size: 12px;
  color: #999;
}

/* Responsive */
@media (max-width: 768px) {
  .packages-page {
    padding: 16px;
  }
  
  .filters-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    flex-direction: column;
  }
  
  .packages-grid {
    grid-template-columns: 1fr;
  }
}
</style>
