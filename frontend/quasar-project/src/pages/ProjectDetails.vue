<template>
  <q-page class="project-details-page">
    <!-- Header Section -->
    <div class="header-section">
      <q-card class="glass-card header-card">
        <q-card-section class="header-content">
          <div class="header-top">
            <q-btn
              flat
              round
              icon="arrow_back"
              @click="goBack"
              class="back-btn"
              size="lg"
            />
            <div class="project-info">
              <div class="project-badge">
                <q-icon name="folder" class="project-icon" />
                <span class="project-type">Projeto de Testes</span>
              </div>
              <h1 class="project-title">{{ project?.name || 'Carregando...' }}</h1>
              <p class="project-description">{{ project?.description || 'Descrição do projeto' }}</p>
              <div class="project-stats">
                <div class="stat-item">
                  <q-icon name="people" class="stat-icon" />
                  <span>{{ members.length }} membros</span>
                </div>
                <div class="stat-item">
                  <q-icon name="schedule" class="stat-icon" />
                  <span v-if="selectedRelease">Release {{ selectedRelease }}</span>
                  <span v-else>Sem releases</span>
                </div>
              </div>
            </div>
            <div class="header-actions">
              <q-select
                v-if="availableReleases.length > 0"
                v-model="selectedRelease"
                :options="availableReleases"
                label="Release"
                outlined
                dense
                class="release-selector"
                @update:model-value="onReleaseChange"
              >
                <template v-slot:prepend>
                  <q-icon name="calendar_month" />
                </template>
              </q-select>
              <div v-else class="no-release-message">
                <q-icon name="info" class="q-mr-sm" />
                <span>Nenhum pacote de teste criado ainda</span>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- KPI Section -->
    <div class="kpi-section">
      <q-card class="glass-card kpi-card">
        <q-card-section class="kpi-header">
          <div class="section-header">
            <div class="section-title-container">
              <q-icon name="analytics" class="section-icon" />
              <h2 class="section-title">Métricas de Teste</h2>
            </div>
            <div class="section-subtitle">Visão geral dos pacotes de teste</div>
          </div>
        </q-card-section>
        <q-card-section class="kpi-content">
          <div v-if="availableReleases.length > 0" class="metrics-container">
            <!-- Gráfico à esquerda -->
            <div class="chart-section">
              <div class="chart-wrapper">
                <VueApexCharts
                  v-if="totalPackages > 0"
                  type="donut"
                  :options="chartOptions"
                  :series="chartSeries"
                  height="320"
                />
                <div v-else class="no-data-chart">
                  <q-icon name="bar_chart" size="48px" color="grey-5" />
                  <p class="text-grey-5">Nenhum dado para exibir</p>
                </div>
              </div>
            </div>
            
            <!-- Totais centralizados -->
            <div class="totals-section">
              <div class="totals-info">
                <div class="total-info">
                  <div class="total-value">{{ totalPackages }}</div>
                  <div class="total-label">Total de Pacotes</div>
                </div>
                <div class="total-info">
                  <div class="total-value">{{ totalScenarios }}</div>
                  <div class="total-label">Total de Cenários</div>
                </div>
              </div>
            </div>
            
            <!-- Distribuições à direita -->
            <div class="distributions-section">
              <div class="distributions-container">
                <div class="legend-container">
                  <div class="legend-header">
                    <h3>Distribuição</h3>
                    <div class="legend-subtitle">Pacotes por status</div>
                  </div>
                  <div class="legend-items">
                    <div class="legend-item">
                      <div class="legend-indicator">
                        <div class="legend-color created"></div>
                        <div class="legend-pulse"></div>
                      </div>
                      <div class="legend-content">
                        <span class="legend-label">Criados</span>
                        <span class="legend-value">{{ metrics.created }}</span>
                      </div>
                    </div>
                    <div class="legend-item">
                      <div class="legend-indicator">
                        <div class="legend-color executed"></div>
                        <div class="legend-pulse"></div>
                      </div>
                      <div class="legend-content">
                        <span class="legend-label">Executados</span>
                        <span class="legend-value">{{ metrics.executed }}</span>
                      </div>
                    </div>
                    <div class="legend-item">
                      <div class="legend-indicator">
                        <div class="legend-color passed"></div>
                        <div class="legend-pulse"></div>
                      </div>
                      <div class="legend-content">
                        <span class="legend-label">Concluídos</span>
                        <span class="legend-value">{{ metrics.passed }}</span>
                      </div>
                    </div>
                    <div class="legend-item">
                      <div class="legend-indicator">
                        <div class="legend-color failed"></div>
                        <div class="legend-pulse"></div>
                      </div>
                      <div class="legend-content">
                        <span class="legend-label">Falharam</span>
                        <span class="legend-value">{{ metrics.failed }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="legend-container">
                  <div class="legend-header">
                    <h3>Distribuição</h3>
                    <div class="legend-subtitle">Cenários por status</div>
                  </div>
                  <div class="legend-items">
                    <div class="legend-item">
                      <div class="legend-indicator">
                        <div class="legend-color created"></div>
                        <div class="legend-pulse"></div>
                      </div>
                      <div class="legend-content">
                        <span class="legend-label">Criados</span>
                        <span class="legend-value">{{ scenarioMetrics.created }}</span>
                      </div>
                    </div>
                    <div class="legend-item">
                      <div class="legend-indicator">
                        <div class="legend-color executed"></div>
                        <div class="legend-pulse"></div>
                      </div>
                      <div class="legend-content">
                        <span class="legend-label">Executados</span>
                        <span class="legend-value">{{ scenarioMetrics.executed }}</span>
                      </div>
                    </div>
                    <div class="legend-item">
                      <div class="legend-indicator">
                        <div class="legend-color passed"></div>
                        <div class="legend-pulse"></div>
                      </div>
                      <div class="legend-content">
                        <span class="legend-label">Concluídos</span>
                        <span class="legend-value">{{ scenarioMetrics.passed }}</span>
                      </div>
                    </div>
                    <div class="legend-item">
                      <div class="legend-indicator">
                        <div class="legend-color failed"></div>
                        <div class="legend-pulse"></div>
                      </div>
                      <div class="legend-content">
                        <span class="legend-label">Falharam</span>
                        <span class="legend-value">{{ scenarioMetrics.failed }}</span>
                      </div>
                    </div>
                    <div v-if="(scenarioMetrics.approved || 0) > 0" class="legend-item">
                      <div class="legend-indicator">
                        <div class="legend-color approved"></div>
                        <div class="legend-pulse"></div>
                      </div>
                      <div class="legend-content">
                        <span class="legend-label">Aprovados</span>
                        <span class="legend-value">{{ scenarioMetrics.approved || 0 }}</span>
                      </div>
                    </div>
                    <div v-if="(scenarioMetrics.reproved || 0) > 0" class="legend-item">
                      <div class="legend-indicator">
                        <div class="legend-color reproved"></div>
                        <div class="legend-pulse"></div>
                      </div>
                      <div class="legend-content">
                        <span class="legend-label">Reprovados</span>
                        <span class="legend-value">{{ scenarioMetrics.reproved || 0 }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="no-releases-container">
            <div class="no-releases-content">
              <q-icon name="inventory_2" size="64px" color="grey-5" />
              <h3 class="text-grey-6">Nenhum pacote de teste criado</h3>
              <p class="text-grey-5">Crie seu primeiro pacote de teste para ver as métricas aqui</p>
              <q-btn
                color="primary"
                icon="add"
                label="Criar Primeiro Pacote"
                @click="goToCreatePackage"
                class="q-mt-md"
                size="md"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Additional Analytics Section -->
    <div class="analytics-section">
      <div class="analytics-grid">
        <!-- Gráfico 1: Cenários por Prioridade -->
        <q-card class="glass-card analytics-card">
          <q-card-section class="analytics-header">
            <div class="section-header">
              <div class="section-title-container">
                <q-icon name="priority_high" class="section-icon" />
                   <h3 class="section-title">Pacotes por Prioridade</h3>
              </div>
            </div>
          </q-card-section>
          <q-card-section class="analytics-content">
            <div class="chart-container">
              <VueApexCharts
                v-if="priorityChartSeries.length > 0"
                type="bar"
                :options="priorityChartOptions"
                :series="priorityChartSeries"
                height="300"
              />
              <div v-else class="no-data-chart">
                <q-icon name="bar_chart" size="48px" color="grey-5" />
                <p class="text-grey-5">Nenhum dado para exibir</p>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Gráfico 2: Execuções por Mês -->
        <q-card class="glass-card analytics-card">
          <q-card-section class="analytics-header">
            <div class="section-header">
              <div class="section-title-container">
                <q-icon name="timeline" class="section-icon" />
                   <h3 class="section-title">Pacotes Criados por Mês</h3>
              </div>
            </div>
          </q-card-section>
          <q-card-section class="analytics-content">
            <div class="chart-container">
                  <VueApexCharts
                    v-if="monthlyChartSeries.length > 0"
                    type="bar"
                    :options="monthlyChartOptions"
                    :series="monthlyChartSeries"
                    height="300"
                  />
              <div v-else class="no-data-chart">
                <q-icon name="timeline" size="48px" color="grey-5" />
                <p class="text-grey-5">Nenhum dado para exibir</p>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Gráfico 3: Taxa de Sucesso -->
        <q-card class="glass-card analytics-card">
          <q-card-section class="analytics-header">
            <div class="section-header">
              <div class="section-title-container">
                <q-icon name="pie_chart" class="section-icon" />
                   <h3 class="section-title">Status dos Pacotes</h3>
              </div>
            </div>
          </q-card-section>
          <q-card-section class="analytics-content">
            <div class="chart-container">
                  <VueApexCharts
                    v-if="successRateChartSeries.length > 0"
                    type="pie"
                    :options="successRateChartOptions"
                    :series="successRateChartSeries"
                    height="300"
                  />
              <div v-else class="no-data-chart">
                <q-icon name="pie_chart" size="48px" color="grey-5" />
                <p class="text-grey-5">Nenhum dado para exibir</p>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Create Test Package Button -->
    <div class="create-package-section">
      <q-card class="glass-card package-card">
        <q-card-section class="package-header">
          <div class="section-header">
            <div class="section-title-container">
              <q-icon name="inventory" class="section-icon" />
              <h2 class="section-title">Pacotes de Teste</h2>
            </div>
            <div class="section-subtitle">Organize seus testes em pacotes de teste</div>
          </div>
          <div class="package-actions">
            <q-btn
              color="primary"
              icon="add"
              label="Criar Pacote"
              @click="goToCreatePackage"
              class="create-package-btn"
              size="md"
              :disable="!projectId"
            />
            <q-btn
              color="secondary"
              icon="inventory"
              label="Ver Pacotes"
              @click="goToPackages"
              class="view-packages-btn"
              size="md"
              outline
              :disable="!projectId"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Project Members Section -->
    <div class="members-section">
      <q-card class="glass-card members-card">
        <q-card-section class="members-header">
          <div class="section-header">
            <div class="section-title-container">
              <q-icon name="group" class="section-icon" />
              <h2 class="section-title">Membros do Projeto</h2>
            </div>
            <div class="section-subtitle">{{ filteredMembers.length }} de {{ members.length }} membros</div>
          </div>
          <div class="members-actions">
            <q-input
              v-model="memberSearch"
              label="Buscar membros"
              outlined
              dense
              class="search-input"
              clearable
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
              <template v-slot:append v-if="memberSearch">
                <q-icon name="clear" class="cursor-pointer" @click="memberSearch = ''" />
              </template>
            </q-input>
            <q-btn
              color="primary"
              icon="person_add"
              label="Adicionar Membro"
              @click="showAddMemberDialog = true"
              class="add-member-btn"
              size="md"
            />
          </div>
        </q-card-section>
        <q-card-section class="members-content">
          
          <q-table
            :rows="filteredMembers"
            :columns="memberColumns"
            flat
            :pagination="{ rowsPerPage: 0 }"
            class="members-table"
          >
            <template v-slot:body-cell-avatar="props">
              <q-td :props="props">
                <q-avatar size="32px" color="primary" text-color="white">
                  <img v-if="props.row.avatar" :src="getAvatarUrl(props.row.avatar)" />
                  <span v-else>{{ getInitials(props.row.name || props.row.email) }}</span>
                </q-avatar>
              </q-td>
            </template>
            
            <template v-slot:body-cell-role="props">
              <q-td :props="props">
                <q-chip
                  :color="getRoleColor(props.row.role)"
                  text-color="white"
                  size="sm"
                >
                  {{ props.row.role }}
                </q-chip>
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </div>

    <!-- Add Member Dialog -->
    <q-dialog v-model="showAddMemberDialog" persistent>
      <q-card class="add-member-dialog" style="min-width: 500px">
        <q-card-section class="dialog-header">
          <div class="text-h6">Adicionar Membro ao Projeto</div>
          <q-btn
            flat
            round
            icon="close"
            @click="showAddMemberDialog = false"
            class="close-btn"
          />
        </q-card-section>

        <q-card-section class="dialog-content">
          <q-form @submit="addMember" class="add-member-form">
            <div class="form-row">
              <q-input
                v-model="addMemberForm.email"
                label="Email do Usuário"
                outlined
                type="email"
                :rules="[val => !!val || 'Email é obrigatório', val => isValidEmail(val) || 'Email inválido']"
                class="form-input"
                hint="Digite o email do usuário que deseja adicionar ao projeto"
              />
            </div>

            <div class="form-row">
              <q-select
                v-model="addMemberForm.role"
                label="Função"
                outlined
                :options="roleOptions"
                emit-value
                map-options
                :rules="[val => !!val || 'Função é obrigatória']"
                class="form-input"
                hint="Selecione a função que o membro terá no projeto"
              />
            </div>

            <div class="role-description">
              <q-icon name="info" color="info" />
              <span>{{ getRoleDescription(addMemberForm.role) }}</span>
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions class="dialog-actions">
          <q-btn
            flat
            label="Cancelar"
            @click="showAddMemberDialog = false"
            class="cancel-btn"
          />
          <q-btn
            color="primary"
            label="Adicionar Membro"
            @click="addMember"
            class="save-btn"
            :loading="addingMember"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import VueApexCharts from 'vue3-apexcharts'
import { 
  getProjectDetails, 
  getAvailableReleases,
  type ProjectDetails,
  type ProjectMember,
  type TestScenario
} from '../services/project-details.service'

// Composables
const route = useRoute()
const router = useRouter()
const $q = useQuasar()

// State
const project = ref<ProjectDetails | null>(null)
const members = ref<ProjectMember[]>([])
const availableReleases = ref<string[]>([])
const selectedRelease = ref<string | undefined>(undefined)
const memberSearch = ref('')
const loading = ref(false)

// Add member dialog state
const showAddMemberDialog = ref(false)
const addingMember = ref(false)
const addMemberForm = ref({
  email: '',
  role: ''
})

// Role options
const roleOptions = [
  { label: 'Administrador', value: 'ADMIN' },
  { label: 'Gerente', value: 'MANAGER' },
  { label: 'Testador', value: 'TESTER' },
  { label: 'Aprovador', value: 'APPROVER' }
]

// Options
const scenarioTypes = ['Functional', 'Regression', 'Smoke', 'E2E']
const priorityOptions = ['Low', 'Medium', 'High', 'Critical']
const environmentOptions = ['Dev', 'QA', 'Staging', 'Prod']

// Computed
const projectId = computed(() => Number(route.params.projectId))

const metrics = computed(() => {
  const result = project.value?.metrics || {
    created: 0,
    executed: 0,
    passed: 0,
    failed: 0
  }
  console.log('Metrics computed:', result)
  return result
})

const memberOptions = computed(() => {
  return members.value.map(member => ({
    label: member.name,
    value: member.id,
    email: member.email,
    avatar: member.avatar
  }))
})

// Navigation
function goToCreateScenario() {
  router.push(`/projects/${projectId.value}/create-scenario`)
}

function goToScenarios() {
  router.push(`/projects/${projectId.value}/scenarios`)
}

function goToCreatePackage() {
  router.push(`/projects/${projectId.value}/create-package`)
}

function goToPackages() {
  router.push(`/projects/${projectId.value}/packages`)
}

const totalPackages = computed(() => {
  return metrics.value.created + metrics.value.executed + metrics.value.passed + metrics.value.failed
})

const scenarioMetrics = computed(() => project.value?.scenarioMetrics || {
  created: 0,
  executed: 0,
  passed: 0,
  failed: 0,
  approved: 0,
  reproved: 0
})

const totalScenarios = computed(() => {
  // Incluir todos os status: created, executed, passed, failed, approved, reproved
  // APPROVED e REPROVED são status separados, não estão incluídos em passed/failed
  const total = scenarioMetrics.value.created + 
                scenarioMetrics.value.executed + 
                scenarioMetrics.value.passed + 
                scenarioMetrics.value.failed +
                (scenarioMetrics.value.approved || 0) +
                (scenarioMetrics.value.reproved || 0)
  return total
})

const chartSeries = computed(() => {
  const series = [
    metrics.value.created,
    metrics.value.executed,
    metrics.value.passed,
    metrics.value.failed
  ]
  console.log('Chart series:', series)
  return series
})

const chartOptions = computed(() => {
  const options = {
    chart: {
      type: 'donut',
      height: 300,
      background: 'transparent',
      sparkline: {
        enabled: false
      }
    },
    labels: ['Pacotes Criados', 'Pacotes Executados', 'Pacotes Passaram', 'Pacotes Falharam'],
    colors: ['#9E9E9E', '#FFC107', '#4CAF50', '#F44336'],
    legend: {
      show: false
    },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: false
          }
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: string) => {
        const numVal = parseFloat(val)
        return numVal > 0 ? `${numVal}%` : ''
      },
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#fff']
      },
      dropShadow: {
        enabled: true,
        color: '#000',
        blur: 2,
        opacity: 0.3
      }
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['rgba(255, 255, 255, 0.1)']
    },
    tooltip: {
      enabled: true,
      fillSeriesColor: false,
      theme: 'dark',
      style: {
        fontSize: '14px'
      },
      y: {
        formatter: (val: number) => `${val} pacotes`
      }
    }
  }
  console.log('Chart options:', options)
  return options
})

// Novos gráficos de análises
const priorityChartSeries = computed(() => {
  if (!project.value?.testPackages) return []
  
  const packages = project.value.testPackages
  
  // Agrupar pacotes por prioridade
  const priorityCounts = {
    'LOW': 0,
    'MEDIUM': 0,
    'HIGH': 0,
    'CRITICAL': 0
  }
  
  packages.forEach(pkg => {
    const priority = pkg.priority?.toUpperCase() as keyof typeof priorityCounts
    if (priority && priorityCounts.hasOwnProperty(priority)) {
      priorityCounts[priority]++
    }
  })
  
  return [{
    name: 'Pacotes',
    data: [priorityCounts.LOW, priorityCounts.MEDIUM, priorityCounts.HIGH, priorityCounts.CRITICAL]
  }]
})

const priorityChartOptions = computed(() => ({
  chart: {
    type: 'bar',
    height: 300,
    background: 'transparent',
    toolbar: { show: false }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      borderRadius: 4
    }
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    show: true,
    width: 2,
    colors: ['transparent']
  },
  xaxis: {
    categories: ['Baixa', 'Média', 'Alta', 'Crítica'],
    labels: {
      style: {
        colors: '#64748b',
        fontSize: '12px'
      }
    }
  },
  yaxis: {
    labels: {
      style: {
        colors: '#64748b',
        fontSize: '12px'
      }
    }
  },
  fill: {
    opacity: 1,
    colors: ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
  },
  colors: ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
  tooltip: {
    y: {
      formatter: (val: number) => `${val} cenários`
    }
  }
}))

const monthlyChartSeries = computed(() => {
  if (!project.value?.testPackages) return []
  
  const packages = project.value.testPackages
  
  // Agrupar pacotes por mês de criação
  const monthlyData: { [key: string]: number } = {}
  
  packages.forEach(pkg => {
    const createdAt = new Date(pkg.createdAt)
    const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0
    }
    monthlyData[monthKey]++
  })
  
  // Converter para array ordenado
  const sortedMonths = Object.keys(monthlyData).sort()
  const data = sortedMonths.map(month => monthlyData[month])
  
  return [{
    name: 'Pacotes Criados',
    data: data
  }]
})

const monthlyChartOptions = computed(() => {
  if (!project.value?.testPackages) return {}
  
  const packages = project.value.testPackages
  
  // Agrupar pacotes por mês de criação
  const monthlyData: { [key: string]: number } = {}
  
  packages.forEach(pkg => {
    const createdAt = new Date(pkg.createdAt)
    const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0
    }
    monthlyData[monthKey]++
  })
  
  // Converter para array ordenado
  const sortedMonths = Object.keys(monthlyData).sort()
  const monthLabels = sortedMonths.map(monthKey => {
    const [year, month] = monthKey.split('-')
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${monthNames[parseInt(month) - 1]} ${year}`
  })
  
  return {
    chart: {
      type: 'bar',
      height: 300,
      background: 'transparent',
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 6,
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'last'
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      show: false
    },
    xaxis: {
      categories: monthLabels,
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '12px'
        }
      }
    },
    fill: {
      opacity: 1,
      type: 'solid'
    },
    colors: ['#3B82F6'],
    tooltip: {
      y: {
        formatter: (val: number) => `${val} pacotes`
      }
    },
    grid: {
      show: true,
      borderColor: 'rgba(100, 116, 139, 0.1)',
      strokeDashArray: 2
    }
  }
})

const successRateChartSeries = computed(() => {
  // Usar as métricas do backend que já estão calculadas corretamente
  if (!metrics.value) return []
  
  // Aprovados = PASSED + APROVADO + CONCLUIDO (já somados no backend)
  const approvedPackages = metrics.value.passed
  
  // Reprovados = FAILED + REPROVADO (já somados no backend)
  const reprovedPackages = metrics.value.failed
  
  // Não Executados = CREATED + EXECUTED + EM_TESTE (que ainda não foram aprovados/reprovados)
  const notExecutedPackages = metrics.value.created + metrics.value.executed
  
  // Retornar array simples para gráfico de pizza
  // [Aprovados, Reprovados, Não Executados]
  return [approvedPackages, reprovedPackages, notExecutedPackages]
})

const successRateChartOptions = computed(() => {
  return {
    chart: {
      type: 'pie',
      height: 300,
      background: 'transparent',
      toolbar: { show: false }
    },
    labels: ['Aprovados', 'Reprovados', 'Não Executados'],
    colors: ['#10B981', '#EF4444', '#6B7280'],
    dataLabels: {
      enabled: true,
      formatter: function (val: number, opts: any) {
        const labels = ['Aprovados', 'Reprovados', 'Não Executados']
        return labels[opts.seriesIndex] + ' (' + val.toFixed(1) + '%)'
      },
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#fff', '#fff', '#fff']
      }
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      labels: {
        colors: '#64748b'
      },
      markers: {
        width: 8,
        height: 8,
        radius: 2
      }
    },
    tooltip: {
      y: {
        formatter: function (val: number, opts: any) {
          const labels = ['Aprovados', 'Reprovados', 'Não Executados']
          return labels[opts.seriesIndex] + ': ' + val + ' pacotes'
        }
      }
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: '60%'
        }
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  }
})

const filteredMembers = computed(() => {
  if (!memberSearch.value) return members.value
  const search = memberSearch.value.toLowerCase()
  return members.value.filter(member => 
    member.name.toLowerCase().includes(search) ||
    member.email.toLowerCase().includes(search)
  )
})

const memberColumns = [
  { name: 'avatar', label: '', field: 'avatar', align: 'left' },
  { name: 'name', label: 'Nome', field: 'name', align: 'left' },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'role', label: 'Função', field: 'role', align: 'left' }
]

// Validation rules
const titleRules = [
  (val: string) => !!val || 'Título é obrigatório',
  (val: string) => val.length >= 3 || 'Título deve ter pelo menos 3 caracteres',
  (val: string) => val.length <= 120 || 'Título deve ter no máximo 120 caracteres'
]

const typeRules = [
  (val: string) => !!val || 'Tipo é obrigatório'
]

const priorityRules = [
  (val: string) => !!val || 'Prioridade é obrigatória'
]

// Methods
function goBack() {
  router.push('/projects')
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
  if (avatar.startsWith('http')) {
    return avatar
  }
  return `http://localhost:3000${avatar}`
}

function getRoleColor(role: string) {
  const colors: Record<string, string> = {
    'OWNER': 'purple',
    'ADMIN': 'blue',
    'MANAGER': 'green',
    'TESTER': 'orange',
    'APPROVER': 'teal'
  }
  return colors[role] || 'grey'
}

// Member management functions
async function addMember() {
  try {
    addingMember.value = true
    
    // Validação básica
    if (!addMemberForm.value.email || !addMemberForm.value.role) {
      $q.notify({
        type: 'negative',
        message: 'Por favor, preencha todos os campos obrigatórios',
        position: 'top'
      })
      return
    }

    // Verificar se o usuário já é membro
    const existingMember = members.value.find(member => 
      member.email.toLowerCase() === addMemberForm.value.email.toLowerCase()
    )
    
    if (existingMember) {
      $q.notify({
        type: 'warning',
        message: 'Este usuário já é membro do projeto',
        position: 'top'
      })
      return
    }

    // Aqui você implementaria a chamada para a API
    // await memberService.addMember(projectId.value, addMemberForm.value)
    
    // Mock: adicionar membro localmente
    const newMember: ProjectMember = {
      id: Date.now(),
      name: addMemberForm.value.email.split('@')[0], // Mock name
      email: addMemberForm.value.email,
      role: addMemberForm.value.role,
      avatar: null,
      joinedAt: new Date().toISOString()
    }
    
    members.value.push(newMember)
    
    // Limpar formulário e fechar diálogo
    addMemberForm.value = { email: '', role: '' }
    showAddMemberDialog.value = false
    
    $q.notify({
      type: 'positive',
      message: 'Membro adicionado com sucesso!',
      position: 'top'
    })
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: 'Erro ao adicionar membro: ' + error.message,
      position: 'top'
    })
  } finally {
    addingMember.value = false
  }
}

function getRoleDescription(role: string) {
  const descriptions: Record<string, string> = {
    'ADMIN': 'Acesso total ao projeto, pode gerenciar membros e configurações',
    'MANAGER': 'Pode gerenciar cenários, pacotes e membros (exceto proprietário)',
    'TESTER': 'Pode executar testes e criar cenários',
    'APPROVER': 'Pode aprovar resultados de testes e cenários'
  }
  return descriptions[role] || 'Função não definida'
}

function isValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Flag para evitar múltiplas chamadas simultâneas
const isLoadingProjectDetails = ref(false)

async function loadProjectDetails() {
  // Evitar múltiplas chamadas simultâneas
  if (isLoadingProjectDetails.value || loading.value) {
    return
  }
  
  isLoadingProjectDetails.value = true
  loading.value = true
  try {
    console.log('Iniciando carregamento de dados...')
    
    // Primeiro, obter as releases disponíveis
    const releasesData = await getAvailableReleases(projectId.value)
    console.log('Releases disponíveis:', releasesData)
    availableReleases.value = releasesData
    
    // Se não há releases disponíveis, carregar dados básicos do projeto sem métricas
    if (releasesData.length === 0) {
      console.log('Nenhuma release disponível - carregando dados básicos do projeto')
      const projectData = await getProjectDetails(projectId.value, undefined)
      project.value = projectData
      members.value = projectData.members || []
      selectedRelease.value = undefined
      return
    }
    
    // Definir a release selecionada como a primeira disponível se não estiver definida
    console.log('selectedRelease.value antes:', selectedRelease.value)
    console.log('releasesData.length:', releasesData.length)
    if (!selectedRelease.value && releasesData.length > 0) {
      selectedRelease.value = releasesData[0]
      console.log('Release selecionada:', selectedRelease.value)
    }
    console.log('selectedRelease.value depois:', selectedRelease.value)
    
    // Agora carregar os dados do projeto com a release correta
    console.log('Carregando dados do projeto...')
    const projectData = await getProjectDetails(projectId.value, selectedRelease.value)
    
    console.log('Dados recebidos da API:', projectData)
    
    // Atualizar os dados de forma atômica
    project.value = projectData
    members.value = projectData.members || []
    
    console.log('Dados atualizados no componente:', {
      projectId: projectId.value,
      release: selectedRelease.value,
      metrics: projectData.metrics,
      scenarioMetrics: projectData.scenarioMetrics
    })
  } catch (error) {
    console.error('Error loading project details:', error)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar detalhes do projeto',
      position: 'top'
    })
  } finally {
    loading.value = false
    isLoadingProjectDetails.value = false
  }
}

async function onReleaseChange() {
  await loadProjectDetails()
}

function getMemberInitials(member: any) {
  const name = member.label || member.name || 'U'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

function getMemberAvatarColor(member: any) {
  const colors = ['primary', 'secondary', 'accent', 'positive', 'info', 'warning', 'negative']
  const name = member.label || member.name || 'user'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Função para recarregar dados
const reloadData = () => {
  loadProjectDetails()
}

// Watch para monitorar mudanças no project
watch(project, (newProject) => {
  console.log('Project changed:', newProject)
  if (newProject) {
    console.log('New project metrics:', newProject.metrics)
    console.log('New project scenarioMetrics:', newProject.scenarioMetrics)
  }
}, { deep: true })

// Lifecycle
onMounted(() => {
  loadProjectDetails()
})
</script>

<style scoped>
.project-details-page {
  padding: 24px;
  background: linear-gradient(135deg, #0b1220 0%, #0f172a 100%);
  min-height: 100vh;
  position: relative;
}

.project-details-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%);
  pointer-events: none;
}

.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.glass-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
}

.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Header Section */
.header-section {
  margin-bottom: 32px;
}

.header-content {
  padding: 32px;
}

.header-top {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.back-btn {
  color: white;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.project-info {
  flex: 1;
}

.project-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  border-radius: 20px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.project-icon {
  color: #FFD700;
  font-size: 16px;
}

.project-type {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
}

.project-title {
  color: white;
  margin: 0 0 12px 0;
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.project-description {
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 20px 0;
  font-size: 1.2rem;
  line-height: 1.6;
}

.project-stats {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
}

.stat-icon {
  color: #FFD700;
  font-size: 18px;
}

.header-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-end;
}

.release-selector {
  min-width: 180px;
}

/* Section Headers */
.section-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-icon {
  color: #FFD700;
  font-size: 24px;
}

.section-title {
  color: white;
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
}

.section-subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  margin-left: 36px;
}

/* KPI Section */
.kpi-section {
  margin-bottom: 32px;
}

.kpi-header {
  padding: 24px 32px 16px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.kpi-content {
  padding: 32px;
}

.metrics-container {
  display: flex;
  gap: 32px;
  align-items: center;
  justify-content: space-between;
  min-height: 400px;
}

.chart-section {
  flex: 0 0 300px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.totals-section {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-height: 400px;
  padding-right: 32px;
}

.distributions-section {
  flex: 0 0 500px;
  display: flex;
  justify-content: flex-end;
}

.totals-info {
  display: flex;
  flex-direction: row;
  gap: 32px;
  align-items: center;
  justify-content: center;
}

.distributions-container {
  display: flex;
  gap: 24px;
  flex: 1;
  justify-content: flex-end;
}

.chart-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.no-data-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px;
  text-align: center;
}

.no-releases-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 40px;
}

.no-releases-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
}

.no-release-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.total-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  min-width: 120px;
}

.total-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  line-height: 1;
  margin-bottom: 8px;
}

.total-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  text-align: center;
}


.legend-container {
  min-width: 240px;
  max-width: 300px;
}

.legend-header {
  margin-bottom: 24px;
}

.legend-header h3 {
  color: white;
  margin: 0 0 4px 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.legend-subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.legend-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.legend-indicator {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  position: relative;
  z-index: 2;
}

.legend-pulse {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: inherit;
  opacity: 0.3;
  animation: pulse 2s infinite;
}

.legend-color.created { 
  background: linear-gradient(135deg, #9E9E9E, #BDBDBD);
  box-shadow: 0 0 20px rgba(158, 158, 158, 0.3);
}
.legend-color.executed { 
  background: linear-gradient(135deg, #FFC107, #FFD54F);
  box-shadow: 0 0 20px rgba(255, 193, 7, 0.3);
}
.legend-color.passed { 
  background: linear-gradient(135deg, #4CAF50, #66BB6A);
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
}
.legend-color.failed { 
  background: linear-gradient(135deg, #F44336, #EF5350);
  box-shadow: 0 0 20px rgba(244, 67, 54, 0.3);
}
.legend-color.approved { 
  background: linear-gradient(135deg, #4CAF50, #66BB6A);
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
}
.legend-color.reproved { 
  background: linear-gradient(135deg, #F44336, #EF5350);
  box-shadow: 0 0 20px rgba(244, 67, 54, 0.3);
}

.legend-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.legend-label {
  color: white;
  font-weight: 500;
  font-size: 14px;
}

.legend-value {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 700;
  font-size: 18px;
}

/* Analytics Section */
.analytics-section {
  margin-bottom: 32px;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.analytics-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.analytics-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.analytics-header {
  padding: 20px 24px 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.analytics-content {
  padding: 24px;
}

.chart-container {
  width: 100%;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-data-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
}

.no-data-chart p {
  margin: 0;
  font-size: 14px;
}

/* Create Package Section */
.create-package-section {
  margin-bottom: 32px;
}

.package-header {
  padding: 24px 32px 16px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.package-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.create-package-btn,
.view-packages-btn {
  font-weight: 500;
}

.scenario-content {
  padding: 32px;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-field {
  width: 100%;
}

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.steps-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.steps-title {
  color: white;
  margin: 0 0 20px 0;
  font-size: 1.3rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.steps-title::before {
  content: '📝';
  font-size: 1.2rem;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.step-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.step-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  flex: 1;
}

.step-field {
  width: 100%;
}

.remove-step-btn {
  flex-shrink: 0;
  color: #ff6b6b;
}

.add-step-btn {
  margin-top: 16px;
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.add-step-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.form-actions {
  display: flex;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.create-btn {
  min-width: 180px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.clear-btn {
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

/* Members Section */
.members-section {
  margin-bottom: 32px;
}

.members-header {
  padding: 24px 32px 16px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
}

.members-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.add-member-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.add-member-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.members-content {
  padding: 32px;
}

.search-input {
  min-width: 300px;
}

.members-table {
  background: transparent;
}

.members-table :deep(.q-table__top) {
  display: none;
}

.members-table :deep(.q-table__bottom) {
  display: none;
}

.members-table :deep(.q-table tbody td) {
  border: none;
  color: white;
  padding: 16px 8px;
}

.members-table :deep(.q-table thead th) {
  border: none;
  color: white;
  font-weight: 600;
  padding: 16px 8px;
  background: rgba(255, 255, 255, 0.05);
}

.members-table :deep(.q-table tbody tr:hover) {
  background: rgba(255, 255, 255, 0.05);
}

/* Add Member Dialog Styles */
.add-member-dialog {
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0 24px;
  border-bottom: 1px solid #e2e8f0;
}

.dialog-header .text-h6 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  margin-left: auto;
}

.dialog-content {
  padding: 24px;
}

.add-member-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: flex;
  flex-direction: column;
}

.form-input {
  width: 100%;
}

.role-description {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 8px;
  font-size: 14px;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.dialog-actions {
  padding: 0 24px 24px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  padding: 12px 24px;
  border-radius: 8px;
}

.save-btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
}

/* Animations */
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.1;
  }
  100% {
    transform: scale(1);
    opacity: 0.3;
  }
}

/* Responsive Design */
@media (max-width: 1024px) {
  .metrics-container {
    flex-direction: column;
    gap: 32px;
    min-height: auto;
  }
  
  .chart-section {
    flex: none;
    order: 1;
  }
  
  .totals-section {
    flex: none;
    order: 2;
  }
  
  .distributions-section {
    flex: none;
    order: 3;
  }

  .totals-info {
    flex-direction: row;
    gap: 32px;
  }

  .distributions-container {
    flex-direction: column;
    gap: 24px;
    justify-content: center;
  }
  
  .total-info {
    min-width: auto;
    width: 100%;
  }
  
  .legend-container {
    min-width: 100%;
  }
}

@media (max-width: 768px) {
  .project-details-page {
    padding: 16px;
  }
  
  .header-content,
  .kpi-content,
  .scenario-content,
  .members-content {
    padding: 20px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .step-fields {
    grid-template-columns: 1fr;
  }
  
  .header-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-actions {
    align-items: stretch;
    width: 100%;
  }
  
  .members-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .search-input {
    min-width: 100%;
  }
  
  .project-title {
    font-size: 2rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .create-btn,
  .clear-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .project-title {
    font-size: 1.8rem;
  }
  
  .section-title {
    font-size: 1.5rem;
  }
  
  .legend-item {
    padding: 8px 12px;
  }
  
  .step-item {
    padding: 12px;
  }
}

/* Input Search - White Text */
:deep(.search-input .q-field__label) {
  color: #ffffff !important;
}

:deep(.search-input .q-field__native) {
  color: #ffffff !important;
}

:deep(.search-input .q-field__prepend) {
  color: #ffffff !important;
}

:deep(.search-input .q-field__append) {
  color: #ffffff !important;
}

:deep(.search-input .q-field__control) {
  color: #ffffff !important;
}

:deep(.search-input .q-field--outlined .q-field__inner) {
  border-color: rgba(255, 255, 255, 0.2);
}

:deep(.search-input .q-field--outlined .q-field__control:hover) {
  border-color: rgba(255, 255, 255, 0.3);
}

:deep(.search-input .q-field--outlined.q-field--focused .q-field__control) {
  border-color: #7c9aff;
}
</style>
