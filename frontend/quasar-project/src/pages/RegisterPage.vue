<template>
  <q-page class="register-page">
    <div class="row full-height">
      <!-- Lado da imagem com overlay -->
      <div class="col-12 col-md-6 q-pa-none hidden-sm-down">
        <div class="image-container">
          <q-img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c" style="height: 100vh" fit="cover" />
          <div class="image-overlay"></div>
          <div class="welcome-text">
            <h2 class="welcome-title">Junte-se a nós!</h2>
            <p class="welcome-subtitle">Crie sua conta e comece a gerenciar seus testes de qualidade</p>
          </div>
        </div>
      </div>

      <!-- Formulário de registro -->
      <div class="col-12 col-md-6 flex flex-center register-form-container">
        <div class="register-card">
          <div class="register-header">
            <div class="logo-container">
              <q-icon name="person_add" size="2.5rem" color="primary" />
            </div>
            <h1 class="register-title">Criar Conta</h1>
            <p class="register-subtitle">Preencha os dados abaixo para criar sua conta</p>
          </div>

          <q-form @submit.prevent="handleRegister" class="register-form" data-cy="form-register">
            <div class="input-group">
              <q-input 
                v-model="name" 
                label="Nome completo" 
                type="text" 
                filled 
                rounded 
                color="primary" 
                class="modern-input"
                data-cy="input-name-register"
                :rules="[val => !!val || 'Nome é obrigatório', val => val.length >= 2 || 'Nome deve ter pelo menos 2 caracteres']"
                lazy-rules
              >
                <template v-slot:prepend>
                  <q-icon name="person" color="primary" />
                </template>
              </q-input>
            </div>

            <div class="input-group">
              <q-input 
                v-model="email" 
                label="Email" 
                type="email" 
                filled 
                rounded 
                color="primary" 
                class="modern-input"
                data-cy="input-email-register"
                :rules="[val => !!val || 'Email é obrigatório', val => /.+@.+\..+/.test(val) || 'Email inválido']"
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
                data-cy="input-password-register"
                :rules="[val => !!val || 'Senha é obrigatória', val => val.length >= 6 || 'Senha deve ter pelo menos 6 caracteres']"
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

            <q-btn 
              type="submit" 
              label="Criar Conta" 
              color="primary" 
              class="register-btn"
              data-cy="btn-submit-register"
              unelevated 
              rounded 
              no-caps
              size="lg"
              :loading="isLoading"
            />

            <!-- Mensagem de resposta -->
            <q-banner
              v-if="message"
              :class="isError ? 'error-banner' : 'success-banner'"
              dense
              class="message-banner"
              data-cy="banner-register-message"
              rounded
            >
              <template v-slot:avatar>
                <q-icon :name="isError ? 'error' : 'check_circle'" :color="isError ? 'negative' : 'positive'" />
              </template>
              {{ message }}
            </q-banner>

            <div class="divider">
              <span class="divider-text">ou</span>
            </div>

            <div class="login-section">
              <span class="login-text">Já tem uma conta?</span>
              <q-btn 
                flat 
                label="Fazer login" 
                color="primary" 
                class="login-btn"
                data-cy="btn-link-login"
                @click="goToLogin" 
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

const name = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)

const router = useRouter()
const $q = useQuasar()

async function handleRegister() {
  if (!name.value || !email.value || !password.value) {
    $q.notify({
      type: 'negative',
      message: 'Por favor, preencha todos os campos',
      position: 'top'
    })
    return
  }

  message.value = ''
  isError.value = false
  isLoading.value = true

  try {
    // Garantir que temos um CSRF token antes de fazer o registro
    let csrfToken = sessionStorage.getItem('csrfToken')
    if (!csrfToken) {
      try {
        const response = await api.get<{ csrfToken: string }>('/csrf-token')
        if (response.data && typeof response.data === 'object' && 'csrfToken' in response.data) {
          csrfToken = response.data.csrfToken
          if (csrfToken && typeof csrfToken === 'string') {
            sessionStorage.setItem('csrfToken', csrfToken)
          }
        }
      } catch (csrfError) {
        // Se falhar ao obter CSRF token, continuar mesmo assim
        // O interceptor pode tentar novamente
        console.warn('Não foi possível obter CSRF token:', csrfError)
      }
    }

    await api.post('/register', {
      name: name.value,
      email: email.value,
      password: password.value
    })

    message.value = 'Conta criada com sucesso! Redirecionando para o login...'
    isError.value = false
    
    $q.notify({
      type: 'positive',
      message: 'Conta criada com sucesso!',
      position: 'top'
    })

    // Aguarda um pouco antes de redirecionar
    setTimeout(() => {
      void router.push('/login')
    }, 2000)

  } catch (error: unknown) {
    isError.value = true
    
    // Tratar diferentes tipos de erros
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const err = error as {
        response?: { 
          data?: { message?: string }
          status?: number
        }
        message?: string
      }

      // Verificar status HTTP para mensagens mais específicas
      const status = err.response?.status
      if (status === 403) {
        message.value = 'Erro de segurança. Por favor, recarregue a página e tente novamente.'
      } else if (status === 409) {
        message.value = 'Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.'
      } else if (status === 429) {
        message.value = 'Muitas tentativas. Por favor, aguarde alguns instantes e tente novamente.'
      } else {
        message.value = err.response?.data?.message || err.message || 'Erro ao registrar'
      }
    } else if (error instanceof Error) {
      message.value = error.message || 'Erro ao registrar'
    } else {
      message.value = 'Erro desconhecido ao registrar'
    }
    
    $q.notify({
      type: 'negative',
      message: message.value,
      position: 'top'
    })
  } finally {
    isLoading.value = false
  }
}

async function goToLogin() {
  await router.push('/login')
}
</script>

<style scoped>
.register-page {
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

.register-form-container {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  position: relative;
}

.register-form-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="%23ffffff" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="%23ffffff" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  opacity: 0.3;
}

.register-card {
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

.register-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo-container {
  margin-bottom: 1.5rem;
  animation: bounceIn 0.8s ease-out 0.3s both;
}

.register-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.5rem;
  animation: fadeInUp 0.8s ease-out 0.4s both;
}

.register-subtitle {
  font-size: 1rem;
  color: #718096;
  font-weight: 400;
  animation: fadeInUp 0.8s ease-out 0.5s both;
}

.register-form {
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

.register-btn {
  width: 100%;
  height: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
}

.register-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
}

.register-btn:active {
  transform: translateY(0);
}

.message-banner {
  margin-bottom: 1.5rem;
  animation: slideInDown 0.5s ease-out;
}

.success-banner {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  color: #059669;
}

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #dc2626;
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

.login-section {
  text-align: center;
}

.login-text {
  color: #718096;
  font-size: 0.95rem;
  margin-right: 0.5rem;
}

.login-btn {
  font-weight: 600;
  font-size: 0.95rem;
  transition: color 0.2s ease;
}

.login-btn:hover {
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

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
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
  .register-card {
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
  
  .register-title {
    font-size: 1.75rem;
  }
}

@media (max-width: 480px) {
  .register-card {
    margin: 0.5rem;
    padding: 1.5rem;
  }
  
  .input-group {
    margin-bottom: 1.25rem;
  }
}
</style>
