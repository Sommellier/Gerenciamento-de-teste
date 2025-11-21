<template>
  <q-dialog v-model="show" persistent max-width="800px" data-cy="dialog-attachments">
    <q-card style="width: 100%; max-width: 800px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          Anexos - {{ scenario?.title }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup data-cy="btn-close-attachments-dialog" />
      </q-card-section>

      <q-card-section>
        <!-- Upload de arquivos -->
        <div class="q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Enviar Evidência</div>
          <q-file
            v-model="selectedFile"
            label="Selecionar arquivo"
            accept="image/*,application/pdf,text/*,video/mp4,video/webm"
            max-file-size="5242880"
            @rejected="onFileRejected"
            filled
            data-cy="input-file-attachment"
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>
          </q-file>
          
          <div class="q-mt-sm text-caption text-grey-6">
            Tipos permitidos: Imagens, PDF, Texto, Vídeos (MP4/WebM)
            <br>
            Tamanho máximo: 5MB
          </div>
          
          <q-btn
            v-if="selectedFile"
            color="primary"
            label="Enviar Arquivo"
            @click="uploadFile"
            :loading="uploading"
            class="q-mt-sm"
            data-cy="btn-upload-attachment"
          />
        </div>

        <!-- Lista de evidências -->
        <div class="q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Evidências Enviadas</div>
          
          <q-list bordered separator v-if="evidences.length > 0" data-cy="list-attachments">
            <q-item
              v-for="evidence in evidences"
              :key="evidence.id"
              class="q-pa-md"
              :data-cy="`attachment-item-${evidence.id}`"
            >
              <q-item-section avatar>
                <q-icon
                  :name="getFileIcon(evidence.mimeType)"
                  :color="getFileColor(evidence.mimeType)"
                  size="2rem"
                />
              </q-item-section>
              
              <q-item-section>
                <q-item-label>{{ evidence.originalName }}</q-item-label>
                <q-item-label caption>
                  {{ formatFileSize(evidence.size) }} • 
                  {{ new Date(evidence.createdAt).toLocaleString() }} • 
                  Enviado por {{ evidence.uploadedByUser.name }}
                </q-item-label>
              </q-item-section>
              
              <q-item-section side>
                <div class="row q-gutter-xs">
                  <q-btn
                    icon="visibility"
                    flat
                    round
                    dense
                    :data-cy="`btn-preview-attachment-${evidence.id}`"
                    @click="previewFile(evidence)"
                  >
                    <q-tooltip>Visualizar</q-tooltip>
                  </q-btn>
                  
                  <q-btn
                    icon="download"
                    flat
                    round
                    dense
                    :data-cy="`btn-download-attachment-${evidence.id}`"
                    @click="downloadFile(evidence)"
                  >
                    <q-tooltip>Download</q-tooltip>
                  </q-btn>
                  
                  <q-btn
                    icon="delete"
                    flat
                    round
                    dense
                    color="negative"
                    :data-cy="`btn-delete-attachment-${evidence.id}`"
                    @click="deleteEvidence(evidence.id)"
                  >
                    <q-tooltip>Excluir</q-tooltip>
                  </q-btn>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
          
          <q-card v-else flat bordered class="q-pa-lg text-center">
            <q-icon name="attach_file" size="3rem" color="grey-5" />
            <div class="text-grey-6 q-mt-sm">
              Nenhuma evidência enviada ainda
            </div>
          </q-card>
        </div>

        <!-- Histórico de execuções com evidências -->
        <div v-if="executionsWithEvidence.length > 0">
          <div class="text-subtitle2 q-mb-sm">Evidências por Execução</div>
          <q-list bordered separator>
            <q-item
              v-for="execution in executionsWithEvidence"
              :key="execution.id"
              class="q-pa-md"
            >
              <q-item-section>
                <q-item-label>
                  Execução #{{ execution.runNumber }} - 
                  <q-chip
                    :color="getExecutionStatusColor(execution.status)"
                    text-color="white"
                    :label="getExecutionStatusLabel(execution.status)"
                    size="sm"
                  />
                </q-item-label>
                <q-item-label caption>
                  {{ new Date(execution.executedAt).toLocaleString() }} • 
                  Executado por {{ execution.user.name }}
                </q-item-label>
                
                <div v-if="execution.evidences && execution.evidences.length > 0" class="q-mt-sm">
                  <div class="text-caption q-mb-xs">Evidências desta execução:</div>
                  <div class="row q-gutter-xs">
                    <q-chip
                      v-for="evidence in execution.evidences"
                      :key="evidence.id"
                      :label="evidence.originalName"
                      size="sm"
                      clickable
                      @click="previewFile(evidence)"
                    />
                  </div>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Fechar" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Notify } from 'quasar'
import { scenarioService, type TestScenario, type ScenarioEvidence, type ScenarioExecution } from '../../services/scenario.service'
import logger from '../../utils/logger'

interface Props {
  modelValue: boolean
  scenario?: TestScenario | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'uploaded'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Estado reativo
const uploading = ref(false)
const selectedFile = ref<File | null>(null)
const evidences = ref<ScenarioEvidence[]>([])
const executionsWithEvidence = ref<ScenarioExecution[]>([])

// Computed
const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Métodos
const loadEvidences = async () => {
  if (!props.scenario) return
  
  try {
    const response = await scenarioService.getScenarioById(props.scenario.id)
    evidences.value = response.scenario.evidences || []
    executionsWithEvidence.value = (response.scenario.executions || [])
      .filter(exec => exec.evidences && exec.evidences.length > 0)
  } catch (error) {
    logger.error('Erro ao carregar evidências:', error)
  }
}

const uploadFile = async () => {
  if (!selectedFile.value || !props.scenario) return
  
  try {
    uploading.value = true
    await scenarioService.uploadEvidence(props.scenario.id, selectedFile.value)
    
    Notify.create({
      type: 'positive',
      message: 'Arquivo enviado com sucesso'
    })
    
    selectedFile.value = null
    await loadEvidences()
    emit('uploaded')
  } catch (error) {
    logger.error('Erro ao enviar arquivo:', error)
    Notify.create({
      type: 'negative',
      message: 'Erro ao enviar arquivo'
    })
  } finally {
    uploading.value = false
  }
}

interface RejectedEntry {
  failedPropValidation: string
}

const onFileRejected = (rejectedEntries: RejectedEntry[]) => {
  const reasons = rejectedEntries.map(entry => entry.failedPropValidation).join(', ')
  Notify.create({
    type: 'negative',
    message: `Arquivo rejeitado: ${reasons}`
  })
}

const previewFile = (evidence: ScenarioEvidence) => {
  // Abrir arquivo em nova aba
  window.open(evidence.storageUrl, '_blank')
}

const downloadFile = (evidence: ScenarioEvidence) => {
  const link = document.createElement('a')
  link.href = evidence.storageUrl
  link.download = evidence.originalName
  link.click()
}

const deleteEvidence = (evidenceId: number) => {
  void evidenceId
  try {
    // Em produção, implementar endpoint para deletar evidência
    Notify.create({
      type: 'info',
      message: 'Funcionalidade de exclusão será implementada'
    })
  } catch (error) {
    logger.error('Erro ao excluir evidência:', error)
    Notify.create({
      type: 'negative',
      message: 'Erro ao excluir evidência'
    })
  }
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'picture_as_pdf'
  if (mimeType.startsWith('video/')) return 'video_file'
  if (mimeType.startsWith('text/')) return 'description'
  return 'attach_file'
}

const getFileColor = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return 'blue'
  if (mimeType === 'application/pdf') return 'red'
  if (mimeType.startsWith('video/')) return 'purple'
  if (mimeType.startsWith('text/')) return 'green'
  return 'grey'
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getExecutionStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    PASSED: 'green',
    FAILED: 'red',
    BLOCKED: 'orange'
  }
  return colors[status] || 'grey'
}

const getExecutionStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PASSED: 'Concluído',
    FAILED: 'Falhou',
    BLOCKED: 'Bloqueado'
  }
  return labels[status] || status
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    void loadEvidences()
  }
})

watch(() => props.scenario, () => {
  if (props.modelValue) {
    void loadEvidences()
  }
})

// Lifecycle
onMounted(() => {
  if (props.modelValue) {
    void loadEvidences()
  }
})
</script>

<style scoped>
.q-item {
  border-radius: 8px;
  margin-bottom: 8px;
}
</style>
