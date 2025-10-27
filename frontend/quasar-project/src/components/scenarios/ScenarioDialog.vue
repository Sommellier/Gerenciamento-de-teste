<template>
  <q-dialog v-model="show" persistent max-width="600px">
    <q-card class="modern-scenario-dialog">
      <!-- Header -->
      <q-card-section class="dialog-header">
        <div class="header-content">
          <div class="header-icon">
            <q-icon name="add_task" size="32px" />
          </div>
          <div class="header-text">
            <h3 class="dialog-title">{{ isEditing ? 'Editar Cenário' : 'Criar Cenário de Teste' }}</h3>
            <p class="dialog-subtitle">Preencha os dados essenciais para o cenário</p>
          </div>
        </div>
        <q-btn
          flat
          round
          icon="close"
          @click="closeDialog"
          class="close-btn"
        />
      </q-card-section>

      <!-- Form Content -->
      <q-card-section class="dialog-body">
        <q-form @submit="onSubmit" class="scenario-form">
          <!-- Scenario Name -->
          <div class="form-group">
            <label class="form-label">
              <q-icon name="title" class="label-icon" />
              Nome do Cenário de Teste
            </label>
            <q-input
              v-model="formData.name"
              placeholder="Digite o nome do cenário de teste"
              outlined
              :rules="nameRules"
              class="form-input"
              hint="Ex: Login com credenciais válidas"
            />
          </div>

          <!-- Scenario Description -->
          <div class="form-group">
            <label class="form-label">
              <q-icon name="description" class="label-icon" />
              Descrição do Cenário
            </label>
            <q-input
              v-model="formData.description"
              placeholder="Descreva o objetivo e contexto do cenário"
              outlined
              type="textarea"
              rows="3"
              class="form-input"
              hint="Opcional - Adicione detalhes sobre o cenário"
            />
          </div>

          <!-- Testador Responsável -->
          <div class="form-group">
            <label class="form-label">
              <q-icon name="person" class="label-icon" />
              Testador Responsável
            </label>
            <q-select
              v-model="formData.tester"
              :options="testerOptions"
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
              v-model="formData.type"
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
              v-model="formData.priority"
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
              v-model="formData.approver"
              :options="approverOptions"
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
        </q-form>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions class="dialog-actions">
        <q-btn
          flat
          label="Cancelar"
          @click="closeDialog"
          class="cancel-btn"
        />
        <q-btn
          color="primary"
          :label="isEditing ? 'Atualizar' : 'Criar Cenário'"
          @click="onSubmit"
          :loading="loading"
          class="create-btn"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Notify } from 'quasar'
import { scenarioService, type TestScenario } from '../../services/scenario.service'
import { getProjectMembers, type ProjectMember } from '../../services/project.service'
import { packageService } from '../../services/package.service'
import { useRoute } from 'vue-router'

interface Props {
  modelValue: boolean
  scenario?: TestScenario | null
  packageId: number
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const route = useRoute()

// Estado reativo
const loading = ref(false)
const members = ref<ProjectMember[]>([])
const packageType = ref<string | null>(null)

// Formulário atualizado - incluindo tipo e prioridade
const formData = ref({
  name: '',
  description: '',
  tester: null as number | null,
  approver: null as number | null,
  type: null as string | null,
  priority: null as string | null
})

// Computed
const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEditing = computed(() => !!props.scenario)

// Membros que podem ser testadores (OWNER, ADMIN, MANAGER, TESTER)
const testerOptions = computed(() => {
  if (!Array.isArray(members.value)) {
    return []
  }
  return members.value
    .filter(member => {
      const role = member.role
      return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER' || role === 'TESTER'
    })
    .map(member => ({
      label: member.name || member.email,
      value: member.id,
      email: member.email
    }))
})

// Membros que podem ser aprovadores (OWNER, ADMIN, MANAGER, APPROVER)
const approverOptions = computed(() => {
  if (!Array.isArray(members.value)) {
    return []
  }
  return members.value
    .filter(member => {
      const role = member.role
      return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER' || role === 'APPROVER'
    })
    .map(member => ({
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

// Métodos
function closeDialog() {
  show.value = false
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

const resetForm = () => {
  formData.value = {
    name: '',
    description: '',
    tester: null,
    approver: null,
    type: null,
    priority: null
  }
}

const loadScenarioData = () => {
  if (props.scenario) {
    formData.value = {
      name: props.scenario.title,
      description: props.scenario.description || '',
      tester: props.scenario.ownerUserId || null,
      approver: null, // Campo não existe no modelo atual
      type: props.scenario.type || null,
      priority: props.scenario.priority || null
    }
  } else {
    resetForm()
  }
}

const loadMembers = async () => {
  try {
    const projectId = Number(route.params.projectId)
    if (projectId) {
      // Buscar membros reais do projeto
      const projectMembers = await getProjectMembers(projectId)
      members.value = projectMembers
    }
  } catch (error) {
    console.error('Erro ao carregar membros:', error)
    Notify.create({
      type: 'negative',
      message: 'Erro ao carregar membros do projeto'
    })
  }
}

const loadPackageType = async () => {
  try {
    const projectId = Number(route.params.projectId)
    if (projectId && props.packageId) {
      // Buscar tipo do pacote para herdar automaticamente
      const packageDetails = await packageService.getPackageDetails(projectId, props.packageId)
      packageType.value = packageDetails.type
      
      // Se não tiver tipo selecionado, herdar do pacote
      if (!formData.value.type) {
        formData.value.type = packageDetails.type
      }
    }
  } catch (error) {
    console.error('Erro ao carregar tipo do pacote:', error)
  }
}

const onSubmit = async () => {
  try {
    loading.value = true
    
    // Validação básica
    if (!formData.value.name || !formData.value.tester || !formData.value.approver || !formData.value.type || !formData.value.priority) {
      Notify.create({
        type: 'negative',
        message: 'Por favor, preencha todos os campos obrigatórios'
      })
      return
    }

    // Verificar se testador e aprovador são diferentes
    if (formData.value.tester === formData.value.approver) {
      Notify.create({
        type: 'negative',
        message: 'O testador e o aprovador devem ser pessoas diferentes'
      })
      return
    }

    const projectId = Number(route.params.projectId)
    
    // Preparar dados para a API
    const scenarioData = {
      title: formData.value.name,
      description: formData.value.description || `Cenário de teste: ${formData.value.name}`,
      type: formData.value.type, // Tipo pode ser herdado do pacote
      priority: formData.value.priority,
      testadorId: formData.value.tester,
      aprovadorId: formData.value.approver,
      projectId: projectId,
      tags: [],
      steps: []
    }

    if (isEditing.value && props.scenario) {
      await scenarioService.updateScenario(props.scenario.id, scenarioData)
      Notify.create({
        type: 'positive',
        message: 'Cenário atualizado com sucesso'
      })
    } else {
      // Usar a rota nova que aceita projectId e packageId
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}/packages/${props.packageId}/scenarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(scenarioData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao criar cenário')
      }

      Notify.create({
        type: 'positive',
        message: 'Cenário criado com sucesso'
      })
    }

    emit('saved')
    show.value = false
  } catch (error) {
    console.error('Erro ao salvar cenário:', error)
    Notify.create({
      type: 'negative',
      message: 'Erro ao salvar cenário'
    })
  } finally {
    loading.value = false
  }
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    loadScenarioData()
    loadMembers()
    loadPackageType()
  }
})

watch(() => props.scenario, () => {
  if (props.modelValue) {
    loadScenarioData()
  }
})

// Lifecycle
onMounted(() => {
  if (props.modelValue) {
    loadScenarioData()
    loadMembers()
    loadPackageType()
  }
})
</script>

<style scoped>
.modern-scenario-dialog {
  border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* Dialog Header */
.dialog-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content {
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

.header-text {
  flex: 1;
}

.dialog-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: white;
}

.dialog-subtitle {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
}

.close-btn {
  color: white;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Dialog Body */
.dialog-body {
  padding: 40px 32px;
  background: #f8fafc;
}

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
  background: white;
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.form-input :deep(.q-field__control:hover) {
  border-color: #667eea;
}

.form-input :deep(.q-field--focused .q-field__control) {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Dialog Actions */
.dialog-actions {
  padding: 0 32px 32px;
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  background: white;
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

/* Responsive */
@media (max-width: 768px) {
  .dialog-header {
    padding: 24px 20px;
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .dialog-body {
    padding: 24px 20px;
  }
  
  .dialog-actions {
    padding: 0 20px 24px;
    flex-direction: column;
  }
  
  .modern-scenario-dialog {
    margin: 16px;
    max-width: calc(100vw - 32px);
  }
}
</style>