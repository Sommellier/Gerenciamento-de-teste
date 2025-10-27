<template>
  <q-page class="modern-create-scenario">
    <!-- Animated Background -->
    <div class="animated-bg">
      <div class="bg-orb orb-1"></div>
      <div class="bg-orb orb-2"></div>
      <div class="bg-orb orb-3"></div>
    </div>

    <!-- Main Container -->
    <div class="main-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <q-btn
            flat
            round
            icon="arrow_back"
            @click="goBack"
            class="back-btn"
            color="white"
          />
          <div class="header-info">
            <h1 class="page-title">Criar Cenário de Teste</h1>
            <p class="page-subtitle">Adicione um novo cenário de teste ao projeto</p>
          </div>
        </div>
        
        <div class="header-actions">
          <q-btn
            flat
            round
            icon="account_circle"
            @click="goToProfile"
            class="profile-btn"
            color="white"
          >
            <q-tooltip>Meu Perfil</q-tooltip>
          </q-btn>
        </div>
      </div>

      <!-- Content Section -->
      <div class="content-section">
        <!-- Form Card -->
        <div class="form-card">
          <div class="card-header">
            <div class="header-icon">
              <q-icon name="add_task" size="32px" />
            </div>
            <div class="header-content">
              <h2 class="card-title">Informações do Cenário</h2>
              <p class="card-description">Preencha os dados essenciais para criar o cenário</p>
            </div>
          </div>

          <div class="card-body">
            <q-form @submit="createScenario" class="scenario-form">
              <!-- Scenario Name -->
              <div class="form-group">
                <label class="form-label">
                  <q-icon name="title" class="label-icon" />
                  Nome do Cenário de Teste
                </label>
                <q-input
                  v-model="scenarioForm.name"
                  placeholder="Digite o nome do cenário de teste"
                  outlined
                  :rules="nameRules"
                  class="form-input"
                  hint="Ex: Login com credenciais válidas"
                />
              </div>

              <!-- Testador Responsável -->
              <div class="form-group">
                <label class="form-label">
                  <q-icon name="person" class="label-icon" />
                  Testador Responsável
                </label>
                <q-select
                  v-model="scenarioForm.tester"
                  :options="memberOptions"
                  placeholder="Selecione o testador responsável"
                  outlined
                  :rules="testerRules"
                  class="form-input"
                  emit-value
                  map-options
                >
                  <template v-slot:prepend>
                    <q-icon name="person" />
                  </template>
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section avatar>
                        <q-avatar :color="getMemberColor(scope.opt.value)" text-color="white" size="32px">
                          {{ getInitials(scope.opt.label) }}
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ scope.opt.label }}</q-item-label>
                        <q-item-label caption>{{ scope.opt.email }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <!-- Tipo do Cenário -->
              <div class="form-group">
                <label class="form-label">
                  <q-icon name="category" class="label-icon" />
                  Tipo do Cenário
                </label>
                <q-select
                  v-model="scenarioForm.type"
                  :options="typeOptions"
                  placeholder="Selecione o tipo do cenário"
                  outlined
                  :rules="typeRules"
                  class="form-input"
                  emit-value
                  map-options
                >
                  <template v-slot:prepend>
                    <q-icon name="category" />
                  </template>
                </q-select>
              </div>

              <!-- Prioridade do Cenário -->
              <div class="form-group">
                <label class="form-label">
                  <q-icon name="flag" class="label-icon" />
                  Prioridade do Cenário
                </label>
                <q-select
                  v-model="scenarioForm.priority"
                  :options="priorityOptions"
                  placeholder="Selecione a prioridade do cenário"
                  outlined
                  :rules="priorityRules"
                  class="form-input"
                  emit-value
                  map-options
                >
                  <template v-slot:prepend>
                    <q-icon name="flag" />
                  </template>
                </q-select>
              </div>

              <!-- Aprovador Responsável -->
              <div class="form-group">
                <label class="form-label">
                  <q-icon name="verified_user" class="label-icon" />
                  Aprovador Responsável
                </label>
                <q-select
                  v-model="scenarioForm.approver"
                  :options="memberOptions"
                  placeholder="Selecione o aprovador responsável"
                  outlined
                  :rules="approverRules"
                  class="form-input"
                  emit-value
                  map-options
                >
                  <template v-slot:prepend>
                    <q-icon name="verified_user" />
                  </template>
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section avatar>
                        <q-avatar :color="getMemberColor(scope.opt.value)" text-color="white" size="32px">
                          {{ getInitials(scope.opt.label) }}
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ scope.opt.label }}</q-item-label>
                        <q-item-label caption>{{ scope.opt.email }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <!-- Form Actions -->
              <div class="form-actions">
                <q-btn
                  flat
                  label="Cancelar"
                  @click="goBack"
                  class="cancel-btn"
                />
                <q-btn
                  type="submit"
                  color="primary"
                  label="Criar Cenário"
                  :loading="creatingScenario"
                  class="create-btn"
                />
              </div>
            </q-form>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Dialog -->
    <q-dialog v-model="showSuccessDialog" persistent>
      <q-card class="success-dialog">
        <q-card-section class="dialog-content">
          <div class="success-icon">
            <q-icon name="check_circle" size="64px" color="positive" />
          </div>
          <h3 class="success-title">Cenário Criado!</h3>
          <p class="success-message">
            O cenário de teste foi criado com sucesso e está pronto para uso.
          </p>
        </q-card-section>
        <q-card-actions class="dialog-actions">
          <q-btn
            color="primary"
            label="Continuar"
            @click="goBack"
            class="continue-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Error Dialog -->
    <q-dialog v-model="showErrorDialog" persistent>
      <q-card class="error-dialog">
        <q-card-section class="dialog-content">
          <div class="error-icon">
            <q-icon name="error" size="64px" color="negative" />
          </div>
          <h3 class="error-title">Erro ao Criar Cenário</h3>
          <p class="error-message">
            {{ errorMessage }}
          </p>
        </q-card-section>
        <q-card-actions class="dialog-actions">
          <q-btn
            color="negative"
            label="Tentar Novamente"
            @click="showErrorDialog = false"
            class="retry-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { 
  getProjectMembers,
  type ProjectMember
} from '../services/project.service'
import { createScenario } from '../services/scenario.service'

// Composables
const route = useRoute()
const router = useRouter()
const $q = useQuasar()

// State
const members = ref<ProjectMember[]>([])
const creatingScenario = ref(false)
const showSuccessDialog = ref(false)
const showErrorDialog = ref(false)
const errorMessage = ref('')

// Scenario form - Updated with type and priority fields
const scenarioForm = ref({
  name: '',
  tester: null as number | null,
  approver: null as number | null,
  type: null as string | null,
  priority: null as string | null
})

// Computed
const projectId = computed(() => Number(route.params.projectId))

const memberOptions = computed(() => {
  return members.value.map(member => ({
    label: member.name || member.email,
    value: member.id,
    email: member.email
  }))
})

const typeOptions = [
  { label: 'Funcional', value: 'FUNCTIONAL' },
  { label: 'Regressão', value: 'REGRESSION' },
  { label: 'Smoke', value: 'SMOKE' },
  { label: 'End-to-End', value: 'E2E' }
]

const priorityOptions = [
  { label: 'Baixa', value: 'LOW' },
  { label: 'Média', value: 'MEDIUM' },
  { label: 'Alta', value: 'HIGH' },
  { label: 'Crítica', value: 'CRITICAL' }
]

// Validation rules
const nameRules = [
  (val: string) => !!val || 'Nome do cenário é obrigatório',
  (val: string) => val.length >= 3 || 'Nome deve ter pelo menos 3 caracteres',
  (val: string) => val.length <= 100 || 'Nome deve ter no máximo 100 caracteres'
]

const testerRules = [
  (val: number) => !!val || 'Testador responsável é obrigatório'
]

const approverRules = [
  (val: number) => !!val || 'Aprovador responsável é obrigatório'
]

const typeRules = [
  (val: string) => !!val || 'Tipo do cenário é obrigatório'
]

const priorityRules = [
  (val: string) => !!val || 'Prioridade do cenário é obrigatória'
]

// Methods
function goBack() {
  router.push(`/projects/${projectId.value}`)
}

function goToProfile() {
  router.push('/profile')
}

function getInitials(name: string) {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

function getMemberColor(memberId: number) {
  const colors = ['primary', 'secondary', 'accent', 'positive', 'info', 'warning', 'negative']
  return colors[memberId % colors.length]
}

async function createScenario() {
  try {
    creatingScenario.value = true
    
    // Validação básica
    if (!scenarioForm.value.name || !scenarioForm.value.tester || !scenarioForm.value.approver || !scenarioForm.value.type || !scenarioForm.value.priority) {
      errorMessage.value = 'Por favor, preencha todos os campos obrigatórios'
      showErrorDialog.value = true
      return
    }

    // Verificar se testador e aprovador são diferentes
    if (scenarioForm.value.tester === scenarioForm.value.approver) {
      errorMessage.value = 'O testador e o aprovador devem ser pessoas diferentes'
      showErrorDialog.value = true
      return
    }

    // Preparar dados para a API
    const scenarioData = {
      title: scenarioForm.value.name,
      description: `Cenário de teste: ${scenarioForm.value.name}`,
      type: scenarioForm.value.type,
      priority: scenarioForm.value.priority,
      testadorId: scenarioForm.value.tester,
      aprovadorId: scenarioForm.value.approver,
      steps: [
        {
          action: 'Executar o cenário de teste',
          expected: 'Cenário executado com sucesso'
        }
      ]
    }

    // Aqui você implementaria a chamada para a API
    // await createScenario(projectId.value, scenarioData)
    
    // Mock: simular criação bem-sucedida
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    showSuccessDialog.value = true
    
  } catch (error: any) {
    console.error('Error creating scenario:', error)
    errorMessage.value = error.message || 'Erro inesperado ao criar cenário'
    showErrorDialog.value = true
  } finally {
    creatingScenario.value = false
  }
}

// Data loading
async function loadData() {
  try {
    // Buscar membros reais do projeto
    members.value = await getProjectMembers(projectId.value)
  } catch (error) {
    console.error('Error loading data:', error)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar dados do projeto',
      position: 'top'
    })
  }
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.modern-create-scenario {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

/* Animated Background */
.animated-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 0;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 6s ease-in-out infinite;
}

.orb-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.orb-2 {
  width: 150px;
  height: 150px;
  top: 60%;
  right: 15%;
  animation-delay: 2s;
}

.orb-3 {
  width: 100px;
  height: 100px;
  bottom: 20%;
  left: 60%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

/* Main Container */
.main-container {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  padding: 24px 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-2px);
}

.header-info {
  color: white;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: white;
}

.page-subtitle {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-btn {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.profile-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

/* Content Section */
.content-section {
  display: flex;
  justify-content: center;
}

.form-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  width: 100%;
  max-width: 600px;
  overflow: hidden;
  animation: slideUp 0.6s ease-out;
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

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32px;
  color: white;
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-icon {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.header-content {
  flex: 1;
}

.card-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.card-description {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
}

.card-body {
  padding: 40px 32px;
}

/* Form Styles */
.scenario-form {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.label-icon {
  color: #667eea;
}

.form-input {
  width: 100%;
}

.form-input :deep(.q-field__control) {
  border-radius: 12px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.form-input :deep(.q-field__control:hover) {
  border-color: #667eea;
  background: #ffffff;
}

.form-input :deep(.q-field--focused .q-field__control) {
  border-color: #667eea;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid #e2e8f0;
}

.cancel-btn {
  padding: 16px 32px;
  border-radius: 12px;
  font-weight: 600;
  color: #6b7280;
}

.create-btn {
  padding: 16px 32px;
  border-radius: 12px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
}

/* Dialog Styles */
.success-dialog, .error-dialog {
  border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90vw;
}

.dialog-content {
  text-align: center;
  padding: 40px 32px 24px;
}

.success-icon, .error-icon {
  margin-bottom: 24px;
}

.success-title, .error-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: #1f2937;
}

.success-message, .error-message {
  font-size: 16px;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
}

.dialog-actions {
  padding: 0 32px 32px;
  justify-content: center;
}

.continue-btn, .retry-btn {
  padding: 16px 32px;
  border-radius: 12px;
  font-weight: 600;
  min-width: 120px;
}

/* Responsive */
@media (max-width: 768px) {
  .main-container {
    padding: 20px 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .header-left {
    flex-direction: column;
    gap: 16px;
  }
  
  .page-title {
    font-size: 28px;
  }
  
  .card-header {
    padding: 24px;
    flex-direction: column;
    text-align: center;
  }
  
  .card-body {
    padding: 24px 20px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .form-card {
    max-width: 100%;
  }
}
</style>