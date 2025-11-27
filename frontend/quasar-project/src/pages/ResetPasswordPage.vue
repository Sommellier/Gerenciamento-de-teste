<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-xl" style="width: 100%; max-width: 400px">
      <div class="text-h5 text-center q-mb-md">Reset Password</div>

      <q-form @submit.prevent="handleResetPassword" data-cy="form-reset-password">
        <q-input
          v-model="password"
          type="password"
          label="New Password"
          filled
          dense
          class="q-mb-md"
          data-cy="input-reset-password"
          :rules="[val => !!val || 'Password is required']"
        />
        <q-input
          v-model="confirmPassword"
          type="password"
          label="Confirm Password"
          filled
          dense
          class="q-mb-lg"
          data-cy="input-reset-password-confirm"
          :rules="[val => val === password || 'Passwords must match']"
        />

        <q-btn
          label="Change Password"
          color="primary"
          type="submit"
          unelevated
          class="full-width"
          data-cy="btn-submit-reset-password"
        />
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import api from 'src/services/api'

const password = ref('')
const confirmPassword = ref('')
const token = ref('')
const router = useRouter()
const $q = useQuasar()

onMounted(() => {
  // Usar hash (#) na URL ao invés de query string para não expor token em logs/referrers
  // O hash não é enviado ao servidor, então é mais seguro
  const hash = window.location.hash
  if (hash && hash.startsWith('#token=')) {
    token.value = hash.substring(7) // Remove '#token='
  }
  
  if (!token.value) {
    $q.notify({
      type: 'negative',
      message: 'Token de redefinição inválido.',
      position: 'top'
    })
    void router.push('/login')
  }
})

async function handleResetPassword() {
  if (!password.value || password.value.length < 8) {
    $q.notify({
      type: 'negative',
      message: 'A senha deve ter pelo menos 8 caracteres',
      position: 'top'
    })
    return
  }

  if (password.value !== confirmPassword.value) {
    $q.notify({
      type: 'negative',
      message: 'As senhas não coincidem',
      position: 'top'
    })
    return
  }

  try {
    await api.post('/reset-password', {
      token: token.value,
      newPassword: password.value
    })

    $q.notify({
      type: 'positive',
      message: 'Senha redefinida com sucesso!',
      position: 'top'
    })
    await router.push('/login')
  } catch (error: unknown) {
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: string } } }
      $q.notify({
        type: 'negative',
        message: axiosError.response?.data?.error || 'Erro ao redefinir a senha',
        position: 'top'
      })
    } else {
      $q.notify({
        type: 'negative',
        message: 'Erro desconhecido',
        position: 'top'
      })
    }
  }
}
</script>
