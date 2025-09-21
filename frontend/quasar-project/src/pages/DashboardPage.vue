<!-- HomeView.vue -->
<template>
  <div class="home-page">
    <!-- BG desfocado (substitua por qualquer imagem do Google) -->
    <div
      class="hero"
      role="img"
      aria-label="Fundo de mesa de madeira desfocado"
    ></div>

    <!-- Cartão de vidro (glassmorphism) -->
    <section class="glass-card" aria-labelledby="brand">
      <h1 id="brand" class="title">QA Manager</h1>

      <div class="options" role="list">
        <!-- Ver Projetos -->
        <button class="option-card" role="listitem" @click="goToProjects">
          <img
            class="option-icon"
            alt="Ícone de pasta"
            src="https://img.icons8.com/fluency/96/folder-invoices.png"
          />
          <div class="option-title">Ver Projetos</div>
          <p class="option-sub">Liste e gerencie os projetos existentes.</p>
          <span class="chevron" aria-hidden="true">›</span>
        </button>

        <!-- Criar Projeto -->
        <button class="option-card" role="listitem" @click="goToCreate">
          <img
            class="option-icon"
            alt="Ícone de adicionar"
            src="https://img.icons8.com/fluency/96/plus-math.png"
          />
          <div class="option-title">Criar Projeto</div>
          <p class="option-sub">Inicie um novo projeto de testes.</p>
          <span class="chevron" aria-hidden="true">›</span>
        </button>

        <!-- Meu Perfil -->
        <button class="option-card" role="listitem" @click="goToProfile">
          <img
            class="option-icon"
            alt="Ícone de perfil"
            src="https://img.icons8.com/fluency/96/user-male-circle.png"
          />
          <div class="option-title">Meu Perfil</div>
          <p class="option-sub">Gerencie suas informações pessoais.</p>
          <span class="chevron" aria-hidden="true">›</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const goToProjects = () => router.push('/projects')
const goToCreate = () => router.push('/create-project')
const goToProfile = () => router.push('/profile')
</script>

<style scoped>
/* ===== Layout base ===== */
.home-page {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #e9eef4;
  overflow: hidden;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji",
    "Segoe UI Emoji";
}

/* ===== Fundo com blur ===== */
.hero {
  position: absolute;
  inset: 0;
  background-image: url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1920&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  filter: blur(6px) saturate(110%);
  transform: scale(1.05);
  z-index: 0;
}

/* ===== Glass container ===== */
.glass-card {
  position: relative;
  z-index: 1;
  width: min(1100px, 92vw);
  padding: 40px 40px 48px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}

.title {
  margin: 0 0 8px;
  text-align: center;
  font-size: 28px;
  font-weight: 600;
  color: #0f172a;
}

/* ===== Cards ===== */
.options {
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(2, minmax(280px, 1fr));
  gap: 28px;
  align-items: stretch;
}

.option-card {
  position: relative;
  text-align: left;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
  padding: 28px 24px 24px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease,
    background 0.2s ease, border-color 0.2s ease;
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 10px;
}

.option-card:hover,
.option-card:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
  background: #ffffff;
  border-color: rgba(14, 165, 233, 0.15);
  outline: none;
}

.option-icon {
  width: 68px;
  height: 68px;
  object-fit: contain;
  margin-bottom: 6px;
  user-select: none;
  pointer-events: none;
}

.option-title {
  font-size: 28px;
  line-height: 32px;
  font-weight: 700;
  color: #0b1220;
}

.option-sub {
  margin: 0;
  font-size: 14.5px;
  color: #4b5563;
  max-width: 36ch;
}

.chevron {
  position: absolute;
  right: 16px;
  bottom: 16px;
  font-size: 26px;
  color: #94a3b8;
  transition: transform 0.2s ease, color 0.2s ease;
}
.option-card:hover .chevron {
  transform: translateX(3px);
  color: #0ea5b7;
}

/* ===== Responsivo ===== */
@media (max-width: 880px) {
  .options {
    grid-template-columns: 1fr;
  }
  .glass-card {
    padding: 28px 18px 26px;
  }
  .option-title {
    font-size: 22px;
  }
  .option-icon {
    width: 56px;
    height: 56px;
  }
}
</style>
