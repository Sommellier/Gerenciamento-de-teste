<template>
  <q-page class="login-page">
    <div class="row full-height">
      <!-- Lado da imagem com overlay -->
      <div class="col-12 col-md-6 q-pa-none hidden-sm-down">
        <div class="image-container">
          <q-img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c" style="height: 100vh" fit="cover" />
          <div class="image-overlay"></div>
          <div class="welcome-text">
            <h2 class="welcome-title">Bem-vindo de volta!</h2>
            <p class="welcome-subtitle">Gerencie seus testes de qualidade de forma eficiente</p>
          </div>
        </div>
      </div>

      <!-- Formulário de login -->
      <div class="col-12 col-md-6 flex flex-center login-form-container">
        <div class="login-card">
          <div class="login-header">
            <div class="logo-container">
              <q-icon name="bug_report" size="2.5rem" color="primary" />
            </div>
            <h1 class="login-title">Entrar</h1>
            <p class="login-subtitle">Acesse sua conta para continuar</p>
          </div>

          <q-form @submit.prevent="handleLogin" class="login-form" data-cy="form-login">
            <div class="input-group">
              <q-input 
                v-model="email" 
                label="Email" 
                type="email" 
                filled 
                rounded 
                color="primary" 
                class="modern-input"
                data-cy="input-email-login"
                :rules="[val => !!val || 'Email é obrigatório']"
                lazy-rules
              >
                <template v-slot:prepend>
                  <q-icon name="email" color="primary" />
                </template>
              </q-input>
            </div>

            <div class="input-group">
              <q-input 
                v-model="password" 
                label="Senha" 
                :type="showPassword ? 'text' : 'password'" 
                filled 
                rounded 
                color="primary" 
                class="modern-input"
                data-cy="input-password-login"
                :rules="[val => !!val || 'Senha é obrigatória']"
                lazy-rules
              >
                <template v-slot:prepend>
                  <q-icon name="lock" color="primary" />
                </template>
                <template v-slot:append>
                  <q-icon 
                    :name="showPassword ? 'visibility_off' : 'visibility'" 
                    @click="showPassword = !showPassword"
                    class="cursor-pointer password-toggle"
                    data-cy="icon-toggle-password"
                  />
                </template>
              </q-input>
            </div>

            <div class="remember-forgot">
              <q-checkbox 
                v-model="rememberMe" 
                label="Lembrar de mim" 
                color="primary" 
                class="remember-checkbox"
                data-cy="checkbox-remember-me"
              />
              <q-btn 
                flat 
                label="Esqueceu a senha?" 
                color="primary" 
                class="forgot-btn"
                data-cy="btn-forgot-password"
                @click="forgotPassword" 
              />
            </div>

            <q-btn 
              type="submit" 
              label="Entrar" 
              color="primary" 
              class="login-btn"
              data-cy="btn-submit-login"
              unelevated 
              rounded 
              no-caps
              size="lg"
              :loading="isLoading"
            />

            <div class="divider">
              <span class="divider-text">ou</span>
            </div>

            <div class="signup-section">
              <span class="signup-text">Não tem uma conta?</span>
              <q-btn 
                flat 
                label="Criar conta" 
                color="primary" 
                class="signup-btn"
                data-cy="btn-link-register"
                @click="signUp" 
              />
            </div>
          </q-form>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import api from 'src/services/api'

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const isLoading = ref(false)

const router = useRouter()
const $q = useQuasar()

interface User {
  id: number
  name: string
  email: string
  [key: string]: unknown
}

interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: User
}

async function handleLogin() {
  if (!email.value || !password.value) {
    $q.notify({
      type: 'negative',
      message: 'Por favor, preencha todos os campos',
      position: 'top'
    })
    return
  }

  isLoading.value = true
  
  try {
    const response = await api.post<LoginResponse>('/login', {
      email: email.value,
      password: password.value
    })

    const { accessToken, refreshToken, user } = response.data
    localStorage.setItem('token', accessToken) // Usar accessToken como token principal
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }
    localStorage.setItem('user', JSON.stringify(user))

    $q.notify({
      type: 'positive',
      message: 'Login realizado com sucesso!',
      position: 'top'
    })

    // 👇 pegue o destino da query (?redirect=...)
    const redirect = router.currentRoute.value.query.redirect as string | undefined
    await router.replace(redirect ?? { name: 'dashboard' })

  } catch (error: unknown) {
    const errorMessage = error && typeof error === 'object' && 'response' in error
      ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao fazer login'
      : 'Erro ao fazer login'
    $q.notify({
      type: 'negative',
      message: errorMessage,
      position: 'top'
    })
  } finally {
    isLoading.value = false
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
.login-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.image-container {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%);
  z-index: 1;
}

.welcome-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 2;
  padding: 2rem;
}

.welcome-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  animation: fadeInUp 0.8s ease-out;
}

.welcome-subtitle {
  font-size: 1.2rem;
  font-weight: 300;
  opacity: 0.9;
  line-height: 1.6;
  animation: fadeInUp 0.8s ease-out 0.2s both;
}

.login-form-container {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  position: relative;
}

.login-form-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="%23ffffff" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="%23ffffff" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  opacity: 0.3;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 3rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  animation: slideInRight 0.8s ease-out;
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo-container {
  margin-bottom: 1.5rem;
  animation: bounceIn 0.8s ease-out 0.3s both;
}

.login-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.5rem;
  animation: fadeInUp 0.8s ease-out 0.4s both;
}

.login-subtitle {
  font-size: 1rem;
  color: #718096;
  font-weight: 400;
  animation: fadeInUp 0.8s ease-out 0.5s both;
}

.login-form {
  animation: fadeInUp 0.8s ease-out 0.6s both;
}

.input-group {
  margin-bottom: 1.5rem;
}

.modern-input {
  font-size: 1rem;
}

.modern-input :deep(.q-field__control) {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(102, 126, 234, 0.1);
  transition: all 0.3s ease;
}

.modern-input :deep(.q-field__control:hover) {
  border-color: rgba(102, 126, 234, 0.3);
  background: rgba(255, 255, 255, 0.9);
}

.modern-input :deep(.q-field--focused .q-field__control) {
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.password-toggle {
  transition: color 0.2s ease;
}

.password-toggle:hover {
  color: #667eea !important;
}

.remember-forgot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.remember-checkbox {
  font-size: 0.9rem;
}

.forgot-btn {
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s ease;
}

.forgot-btn:hover {
  color: #667eea !important;
}

.login-btn {
  width: 100%;
  height: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;
  margin-bottom: 2rem;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
}

.login-btn:active {
  transform: translateY(0);
}

.divider {
  position: relative;
  text-align: center;
  margin: 2rem 0;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
}

.divider-text {
  background: rgba(255, 255, 255, 0.95);
  padding: 0 1rem;
  color: #718096;
  font-size: 0.9rem;
  position: relative;
  z-index: 1;
}

.signup-section {
  text-align: center;
}

.signup-text {
  color: #718096;
  font-size: 0.95rem;
  margin-right: 0.5rem;
}

.signup-btn {
  font-weight: 600;
  font-size: 0.95rem;
  transition: color 0.2s ease;
}

.signup-btn:hover {
  color: #667eea !important;
}

/* Animações */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Responsividade */
@media (max-width: 768px) {
  .login-card {
    margin: 1rem;
    padding: 2rem;
    border-radius: 20px;
  }
  
  .welcome-title {
    font-size: 2rem;
  }
  
  .welcome-subtitle {
    font-size: 1rem;
  }
  
  .login-title {
    font-size: 1.75rem;
  }
}

@media (max-width: 480px) {
  .login-card {
    margin: 0.5rem;
    padding: 1.5rem;
  }
  
  .remember-forgot {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
}
</style>