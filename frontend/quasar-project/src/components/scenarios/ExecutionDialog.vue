<template>
  <q-dialog v-model="show" persistent max-width="800px">
    <q-card style="width: 100%; max-width: 800px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          Executar Cenário: {{ scenario?.title }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <div class="q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Passos do Cenário</div>
          <q-list bordered separator>
            <q-expansion-item
              v-for="(step, index) in scenario?.steps"
              :key="index"
              :label="`Passo ${step.stepOrder}: ${step.action}`"
              :default-opened="true"
              class="q-mb-sm"
            >
              <q-card flat bordered>
                <q-card-section>
                  <div class="row q-gutter-md">
                    <div class="col-12">
                      <div class="text-weight-bold">Ação:</div>
                      <div class="q-mb-sm">{{ step.action }}</div>
                    </div>
                    
                    <div class="col-12 col-md-6" v-if="step.dataInput">
                      <div class="text-weight-bold">Dados de Entrada:</div>
                      <div class="q-mb-sm">{{ step.dataInput }}</div>
                    </div>
                    
                    <div class="col-12 col-md-6" v-if="step.checkpoint">
                      <div class="text-weight-bold">Checkpoint:</div>
                      <div class="q-mb-sm">{{ step.checkpoint }}</div>
                    </div>
                    
                    <div class="col-12">
                      <div class="text-weight-bold">Resultado Esperado:</div>
                      <div class="q-mb-sm">{{ step.expected }}</div>
                    </div>
                  </div>
                  
                  <!-- Checkbox para marcar passo como executado -->
                  <q-checkbox
                    v-model="stepResults[index]"
                    :label="`Passo ${step.stepOrder} executado com sucesso`"
                    color="green"
                  />
                  
                  <!-- Nota específica do passo -->
                  <q-input
                    v-model="stepNotes[index]"
                    label="Nota do passo (opcional)"
                    type="textarea"
                    rows="2"
                    class="q-mt-sm"
                  />
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </q-list>
        </div>

        <!-- Resultado geral da execução -->
        <div class="q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Resultado da Execução</div>
          <q-select
            v-model="executionResult.status"
            :options="statusOptions"
            label="Status *"
            emit-value
            map-options
            :rules="[val => !!val || 'Status é obrigatório']"
            filled
          />
        </div>

        <!-- Observações gerais -->
        <div class="q-mb-md">
          <q-input
            v-model="executionResult.notes"
            label="Observações Gerais"
            type="textarea"
            rows="4"
            filled
            placeholder="Descreva o resultado da execução, problemas encontrados, etc."
          />
        </div>

        <!-- Resumo da execução -->
        <q-card flat bordered class="q-pa-md">
          <div class="text-subtitle2 q-mb-sm">Resumo da Execução</div>
          <div class="row q-gutter-md">
            <div class="col-12 col-md-4">
              <q-stat
                :value="scenario?.steps.length || 0"
                label="Total de Passos"
                color="primary"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-stat
                :value="stepResults.filter(r => r).length"
                label="Passos Executados"
                color="green"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-stat
                :value="stepResults.filter(r => !r).length"
                label="Passos com Problema"
                color="red"
              />
            </div>
          </div>
        </q-card>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancelar" v-close-popup />
        <q-btn
          color="primary"
          label="Registrar Execução"
          @click="onExecute"
          :loading="loading"
          :disable="!executionResult.status"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Notify } from 'quasar'
import { scenarioService, type TestScenario } from '../../services/scenario.service'

interface Props {
  modelValue: boolean
  scenario?: TestScenario | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'executed'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Estado reativo
const loading = ref(false)
const stepResults = ref<boolean[]>([])
const stepNotes = ref<string[]>([])

const executionResult = ref({
  status: '' as 'PASSED' | 'FAILED' | 'BLOCKED' | '',
  notes: ''
})

// Computed
const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Opções para status
const statusOptions = [
  { label: 'Concluído', value: 'PASSED', color: 'green' },
  { label: 'Falhou', value: 'FAILED', color: 'red' },
  { label: 'Bloqueado', value: 'BLOCKED', color: 'orange' }
]

// Métodos
const resetForm = () => {
  stepResults.value = []
  stepNotes.value = []
  executionResult.value = {
    status: '',
    notes: ''
  }
}

const initializeStepResults = () => {
  if (props.scenario?.steps) {
    stepResults.value = new Array(props.scenario.steps.length).fill(true)
    stepNotes.value = new Array(props.scenario.steps.length).fill('')
  }
}

const onExecute = async () => {
  try {
    loading.value = true

    // Validar se pelo menos um passo foi executado
    const executedSteps = stepResults.value.filter(result => result).length
    if (executedSteps === 0) {
      Notify.create({
        type: 'negative',
        message: 'Marque pelo menos um passo como executado'
      })
      return
    }

    // Preparar notas consolidadas
    let consolidatedNotes = executionResult.value.notes || ''
    
    // Adicionar notas dos passos que falharam
    const failedSteps = stepResults.value
      .map((result, index) => ({ result, index }))
      .filter(item => !item.result)
    
    if (failedSteps.length > 0) {
      consolidatedNotes += '\n\nPassos com problema:\n'
      failedSteps.forEach(({ index }) => {
        const step = props.scenario?.steps[index]
        if (step) {
          consolidatedNotes += `- Passo ${step.stepOrder}: ${step.action}`
          if (stepNotes.value[index]) {
            consolidatedNotes += ` - ${stepNotes.value[index]}`
          }
          consolidatedNotes += '\n'
        }
      })
    }

    // Registrar execução
    await scenarioService.executeScenario(props.scenario!.id, {
      status: executionResult.value.status as 'PASSED' | 'FAILED' | 'BLOCKED',
      notes: consolidatedNotes.trim()
    })

    Notify.create({
      type: 'positive',
      message: 'Execução registrada com sucesso'
    })

    emit('executed')
    show.value = false
  } catch (error) {
    console.error('Erro ao executar cenário:', error)
    Notify.create({
      type: 'negative',
      message: 'Erro ao registrar execução'
    })
  } finally {
    loading.value = false
  }
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetForm()
    initializeStepResults()
  }
})

watch(() => props.scenario, () => {
  if (props.modelValue) {
    resetForm()
    initializeStepResults()
  }
})

// Lifecycle
onMounted(() => {
  if (props.modelValue) {
    resetForm()
    initializeStepResults()
  }
})
</script>

<style scoped>
.q-expansion-item {
  border-radius: 8px;
}

.q-card {
  border-radius: 8px;
}
</style>
