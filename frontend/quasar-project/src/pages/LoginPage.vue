<template>
  <q-page class="q-pa-none">
    <div class="row full-height">
      <!-- Lado da imagem -->
      <div class="col-12 col-md-6 q-pa-none hidden-sm-down">
        <q-img
          src="https://images.unsplash.com/photo-1519389950473-47ba0277781c"
          style="height: 100vh"
          fit="cover"
        />
      </div>

      <!-- Formulário de login -->
      <div class="col-12 col-md-6 flex flex-center bg-white">
        <q-card
          flat
          class="q-pa-xl q-mx-auto q-mt-xl bg-white"
          style="width: 100%; max-width: 360px; border-radius: 16px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);"
        >
          <div class="text-h5 text-center q-mb-lg">Log in</div>

          <q-form @submit.prevent="handleLogin">
            <q-input
              v-model="email"
              label="Email"
              type="email"
              filled
              dense
              rounded
              color="primary"
              class="q-mb-md"
              :rules="[val => !!val || 'Email é obrigatório']"
            />

            <q-input
              v-model="password"
              label="Password"
              :type="showPassword ? 'text' : 'password'"
              filled
              dense
              rounded
              color="primary"
              class="q-mb-md"
              :rules="[val => !!val || 'Senha é obrigatória']"
            >
              <template v-slot:append>
                <q-icon
                  :name="showPassword ? 'visibility_off' : 'visibility'"
                  @click="showPassword = !showPassword"
                  class="cursor-pointer"
                />
              </template>
            </q-input>

            <q-checkbox
              v-model="rememberMe"
              label="Remember me"
              dense
              class="q-mb-lg"
              color="primary"
            />

            <q-btn
              type="submit"
              label="Log in"
              color="primary"
              class="full-width q-mb-md"
              unelevated
              rounded
              no-caps
              size="lg"
            />

            <div class="text-center q-mb-md">
              <q-btn
                flat
                label="Forgot Password?"
                color="primary"
                class="q-pa-none"
                @click="forgotPassword"
              />
            </div>

            <q-separator />

            <div class="text-center q-mt-md text-caption">
              Don’t have an account?
              <q-btn
                flat
                label="Sign up"
                color="primary"
                class="q-pa-none"
                @click="signUp"
              />
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
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)

const router = useRouter()

interface LoginResponse {
  token: string
  user: any
}

async function handleLogin() {
  try {
    const response = await api.post<LoginResponse>('/login', {
      email: email.value,
      password: password.value
    })

    const { token, user } = response.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))

    await router.push('/dashboard')
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erro ao fazer login')
  }
}

async function forgotPassword() {
  await router.push('/forgot-password')
}

async function signUp() {
  await router.push('/register')
}
</script>

<style scoped>
.text-caption {
  font-size: 0.875rem;
  color: #666;
}
</style>
