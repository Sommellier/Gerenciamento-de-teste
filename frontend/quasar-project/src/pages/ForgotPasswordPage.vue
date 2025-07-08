<template>
  <q-page class="q-pa-none">
    <div class="row full-height">

      <div class="col-12 col-md-6 q-pa-none hidden-sm-down">
        <q-img
          src="https://images.unsplash.com/photo-1519389950473-47ba0277781c"
          style="height: 100vh"
          fit="cover"
        />
      </div>

      <div class="col-12 col-md-6 flex flex-center bg-white">
        <q-card
          flat
          class="q-pa-xl q-mx-auto q-mt-xl bg-white"
          style="width: 100%; max-width: 360px; border-radius: 16px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);"
        >
          <div class="text-h5 text-center q-mb-lg">Forgot Password</div>

          <q-form @submit.prevent="handleReset">
            <q-input
              v-model="email"
              label="Enter your email"
              type="email"
              filled
              dense
              rounded
              color="primary"
              class="q-mb-lg"
            />

            <q-btn
              type="submit"
              label="Send Recovery Link"
              color="primary"
              class="full-width q-mb-md"
              unelevated
              rounded
              no-caps
              size="lg"
            />

            <!-- Mensagem de resposta -->
            <q-banner
              v-if="message"
              :class="isError ? 'bg-red-1 text-negative' : 'bg-green-1 text-positive'"
              dense
              class="q-mt-sm"
              rounded
            >
              {{ message }}
            </q-banner>

            <q-separator class="q-mt-md" />

            <div class="text-center q-mt-md text-caption">
              Remembered your password?
              <q-btn flat label="Log in" color="primary" class="q-pa-none" @click="goToLogin" />
            </div>
          </q-form>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from 'src/services/api'

const email = ref('')
const message = ref('')
const isError = ref(false)

const router = useRouter()

async function handleReset() {
  message.value = ''
  isError.value = false

  try {
    await api.post('/request-password-reset', { email: email.value })
    message.value = 'Verifique seu e-mail para redefinir sua senha.'
    isError.value = false
  } catch (error: unknown) {
    isError.value = true
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: string } } }
      message.value = axiosError.response?.data?.error || 'Erro ao solicitar redefinição de senha'
    } else {
      message.value = 'Erro desconhecido'
    }
  }
}

async function goToLogin() {
  await router.push('/login')
}
</script>

<style scoped>
.text-caption {
  font-size: 0.875rem;
  color: #666;
}
</style>
