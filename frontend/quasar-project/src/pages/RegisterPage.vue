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
          <div class="text-h5 text-center q-mb-lg">Sign up</div>

          <q-form @submit.prevent="handleRegister">
            <q-input v-model="name" label="Full Name" type="text" filled dense rounded color="primary"
              class="q-mb-md" />

            <q-input v-model="email" label="Email" type="email" filled dense rounded color="primary" class="q-mb-md" />

            <q-input v-model="password" label="Password" :type="showPassword ? 'text' : 'password'" filled dense rounded
              color="primary" class="q-mb-md">
              <template v-slot:append>
                <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" @click="showPassword = !showPassword"
                  class="cursor-pointer" />
              </template>
            </q-input>

            <q-btn type="submit" label="Create Account" color="primary" class="full-width q-mb-md" unelevated rounded
              no-caps size="lg" />

            <q-separator />

            <div class="text-center q-mt-md text-caption">
              Already have an account?
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

const name = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)

const router = useRouter()

function handleRegister() {
  console.log('Cadastro:', name.value, email.value, password.value)
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
