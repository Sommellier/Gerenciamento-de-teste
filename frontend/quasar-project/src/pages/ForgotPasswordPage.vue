<template>
  <q-page class="q-pa-none">
    <div class="row full-height">

      <!-- Imagem à esquerda -->
      <div class="col-12 col-md-6 q-pa-none hidden-sm-down">
        <q-img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c" style="height: 100vh" fit="cover" />
      </div>

      <!-- Formulário à direita -->
      <div class="col-12 col-md-6 flex flex-center bg-white">
        <q-card flat class="q-pa-xl q-mx-auto q-mt-xl bg-white"
          style="width: 100%; max-width: 360px; border-radius: 16px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);">
          <div class="text-h5 text-center q-mb-lg">Forgot Password</div>

          <q-form @submit.prevent="handleReset">
            <q-input v-model="email" label="Enter your email" type="email" filled dense rounded color="primary"
              class="q-mb-lg" />

            <q-btn type="submit" label="Send Recovery Link" color="primary" class="full-width q-mb-md" unelevated
              rounded no-caps size="lg" />

            <q-separator />

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

const email = ref('')
const router = useRouter()

import api from 'src/services/api'

async function handleReset() {
  try {
    await api.post('/request-password-reset', { email: email.value })
    alert('Verifique seu e-mail para redefinir sua senha.')
    await router.push('/login')
  } catch (error: unknown) {
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: string } } }
      alert(axiosError.response?.data?.error || 'Erro ao solicitar redefinição de senha')
    } else {
      alert('Erro desconhecido')
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
