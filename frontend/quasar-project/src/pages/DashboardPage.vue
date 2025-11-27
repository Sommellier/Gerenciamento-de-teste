<!-- Dashboard Moderno -->
<template>
  <div class="dashboard-page">
    <!-- Background com gradiente animado -->
    <div class="animated-bg">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <!-- Header com saudação -->
    <header class="dashboard-header">
      <div class="welcome-section">
        <h1 class="welcome-title">Bem-vindo ao QA Manager</h1>
        <p class="welcome-subtitle">Gerencie seus projetos de teste de forma eficiente</p>
      </div>
      <!-- Menu de perfil -->
      <div class="profile-icon-container">
        <q-btn-dropdown
          flat
          round
          no-caps
          class="profile-menu-btn"
          menu-anchor="bottom right"
          menu-self="top right"
          data-cy="btn-profile-menu"
        >
          <template v-slot:label>
            <div class="profile-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </template>
          <q-list dark class="profile-menu-list">
            <q-item clickable v-close-popup @click="goToProfile" class="profile-menu-item" data-cy="btn-menu-go-to-profile">
              <q-item-section avatar>
                <q-icon name="person" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Ver Perfil</q-item-label>
              </q-item-section>
            </q-item>
            <q-separator dark />
            <q-item clickable v-close-popup @click="handleLogout" class="profile-menu-item logout-item" data-cy="btn-menu-logout">
              <q-item-section avatar>
                <q-icon name="logout" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Desconectar-se</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </header>

    <!-- Cards principais -->
    <main class="dashboard-main">
      <div class="cards-grid">
        <!-- Ver Projetos -->
        <div class="modern-card projects-card" @click="goToProjects" data-cy="card-dashboard-projects">
          <div class="card-icon">
            <div class="icon-wrapper projects-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 7V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V7M3 7V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V7M3 7H21M8 11H16M8 15H12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
          <div class="card-content">
            <h3 class="card-title">Ver Projetos</h3>
            <p class="card-description">Liste e gerencie os projetos existentes</p>
          </div>
          <div class="card-arrow">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>

        <!-- Criar Projeto -->
        <div class="modern-card create-card" @click="goToCreate" data-cy="card-dashboard-create-project">
          <div class="card-icon">
            <div class="icon-wrapper create-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
          <div class="card-content">
            <h3 class="card-title">Criar Projeto</h3>
            <p class="card-description">Inicie um novo projeto de testes</p>
          </div>
          <div class="card-arrow">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>

        <!-- Ver Convites -->
        <div class="modern-card invites-card" @click="goToInvites" data-cy="card-dashboard-invites">
          <div class="card-icon">
            <div class="icon-wrapper invites-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M22 6L12 13L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
          <div class="card-content">
            <h3 class="card-title">Ver Convites</h3>
            <p class="card-description">Gerencie convites para projetos</p>
          </div>
          <div class="card-arrow">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()

const goToProjects = () => void router.push('/projects')
const goToCreate = () => void router.push('/create-project')
const goToInvites = () => void router.push('/invites')
const goToProfile = () => void router.push('/profile')

const handleLogout = () => {
  $q.dialog({
    title: 'Confirmar Logout',
    message: 'Tem certeza que deseja desconectar-se?',
    persistent: true,
    ok: {
      label: 'Desconectar',
      color: 'primary'
    },
    cancel: {
      label: 'Cancelar',
      color: 'grey',
      flat: true
    }
  }).onOk(() => {
    // Remover token do sessionStorage
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('refreshToken')
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('csrfToken')
    
    // Redirecionar para login
    void router.push('/login')
    
    // Notificar usuário
    $q.notify({
      type: 'positive',
      message: 'Desconectado com sucesso!',
      position: 'top'
    })
  })
}
</script>

<style scoped>
/* ===== Reset e Base ===== */
* {
  box-sizing: border-box;
}

.dashboard-page {
  min-height: 100vh;
  position: relative;
  background: linear-gradient(135deg, #0b1220 0%, #0f172a 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow-x: hidden;
}

/* ===== Background Animado ===== */
.animated-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.7;
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(45deg, #ff6b6b, #feca57);
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.orb-2 {
  width: 200px;
  height: 200px;
  background: linear-gradient(45deg, #48dbfb, #0abde3);
  top: 60%;
  right: 20%;
  animation-delay: -7s;
}

.orb-3 {
  width: 250px;
  height: 250px;
  background: linear-gradient(45deg, #ff9ff3, #f368e0);
  bottom: 20%;
  left: 50%;
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  33% {
    transform: translateY(-30px) rotate(120deg);
  }
  66% {
    transform: translateY(30px) rotate(240deg);
  }
}

/* ===== Header ===== */
.dashboard-header {
  position: relative;
  z-index: 10;
  padding: 2rem 1rem;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
}

.welcome-section {
  max-width: 600px;
  margin: 0;
}

/* ===== Menu de Perfil ===== */
.profile-icon-container {
  position: absolute;
  top: 2rem;
  right: 2rem;
  z-index: 100;
}

.profile-menu-btn {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.profile-menu-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.profile-icon-wrapper {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.profile-icon-wrapper svg {
  width: 24px;
  height: 24px;
  color: white;
}

.profile-menu-list {
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 8px;
  min-width: 200px;
}

.profile-menu-item {
  border-radius: 8px;
  padding: 8px 12px;
  margin: 4px 0;
  transition: all 0.2s ease;
}

.profile-menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.logout-item {
  color: #ef4444;
}

.logout-item:hover {
  background: rgba(239, 68, 68, 0.2);
}

.profile-menu-item :deep(.q-item__label) {
  color: white;
  font-weight: 500;
}

.logout-item :deep(.q-item__label) {
  color: #ef4444;
}

.welcome-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 1rem 0;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.welcome-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-weight: 400;
}

/* ===== Main Content ===== */
.dashboard-main {
  position: relative;
  z-index: 10;
  padding: 0 1rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  justify-items: center;
}

/* ===== Cards Modernos ===== */
.modern-card {
  position: relative;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 200px;
}

.modern-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 24px;
}

.modern-card:hover::before {
  opacity: 1;
}

.modern-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
}

/* ===== Ícones dos Cards ===== */
.card-icon {
  display: flex;
  justify-content: center;
  align-items: center;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.icon-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
  border-radius: 20px;
}

.icon-wrapper svg {
  width: 40px;
  height: 40px;
  z-index: 1;
  position: relative;
}

.projects-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.create-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.invites-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}


.modern-card:hover .icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

/* ===== Conteúdo dos Cards ===== */
.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.card-description {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  line-height: 1.5;
}

/* ===== Seta dos Cards ===== */
.card-arrow {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.card-arrow svg {
  width: 16px;
  height: 16px;
  color: white;
}

.modern-card:hover .card-arrow {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(4px);
}

/* ===== Responsividade ===== */
@media (max-width: 768px) {
  .dashboard-header {
    padding: 1.5rem 1rem;
    flex-direction: column;
    gap: 1rem;
  }
  
  .profile-icon-container {
    position: static;
    order: -1;
  }
  
  .welcome-title {
    font-size: 2.5rem;
  }
  
  .welcome-subtitle {
    font-size: 1rem;
  }
  
  .cards-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .modern-card {
    padding: 1.5rem;
    min-height: 180px;
  }
  
  .icon-wrapper {
    width: 60px;
    height: 60px;
  }
  
  .icon-wrapper svg {
    width: 30px;
    height: 30px;
  }
  
  .card-title {
    font-size: 1.25rem;
  }
  
  .card-description {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .dashboard-main {
    padding: 0 0.5rem 1rem;
  }
  
  .modern-card {
    padding: 1.25rem;
  }
  
  .welcome-title {
    font-size: 2rem;
  }
}

/* ===== Animações de Entrada ===== */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modern-card {
  animation: slideInUp 0.6s ease-out forwards;
}

.modern-card:nth-child(1) { animation-delay: 0.1s; }
.modern-card:nth-child(2) { animation-delay: 0.2s; }
.modern-card:nth-child(3) { animation-delay: 0.3s; }

/* ===== Estados de Foco para Acessibilidade ===== */
.modern-card:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.8);
  outline-offset: 2px;
}

/* ===== Scrollbar Personalizada ===== */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
