<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-xl" style="width: 100%; max-width: 400px">
      <div class="text-h5 text-center q-mb-md">Reset Password</div>

      <q-form @submit.prevent="handleResetPassword">
        <q-input
          v-model="password"
          type="password"
          label="New Password"
          filled
          dense
          class="q-mb-md"
          :rules="[val => !!val || 'Password is required']"
        />
        <q-input
          v-model="confirmPassword"
          type="password"
          label="Confirm Password"
          filled
          dense
          class="q-mb-lg"
          :rules="[val => val === password || 'Passwords must match']"
        />

        <q-btn
          label="Change Password"
          color="primary"
          type="submit"
          unelevated
          class="full-width"
        />
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from 'src/services/api'

const password = ref('')
const confirmPassword = ref('')
const token = ref('')
const router = useRouter()
const route = useRoute()

onMounted(() => {
  token.value = route.query.token as string
  if (!token.value) {
    alert('Token de redefinição inválido.')
    router.push('/login')
  }
})

async function handleResetPassword() {
  try {
    await api.post('/reset-password', {
      token: token.value,
      newPassword: password.value
    })

    alert('Senha redefinida com sucesso!')
    await router.push('/login')
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erro ao redefinir a senha')
  }
}
</script>
