<template>
  <!-- Shared kiosk chrome: header with status + footer hint -->
  <div class="kiosk-layout">
    <header class="kiosk-header">
      <div class="brand">
        <img src="/logo.svg" alt="" aria-hidden="true" class="brand-logo" />
        <div>
          <p class="brand-title">Snackautomat</p>
          <p class="brand-subtitle">LSF Wesel-Rheinhausen</p>
        </div>
      </div>
      <!-- Machine status indicators render here -->
      <HomeStatusPanel />
      <!-- User information is optional (pre-scan view should not break) -->
      <div class="user-area" v-if="user">
        <span class="user-name">Hallo {{ user.name }}!</span>
      </div>
    </header>

    <main class="kiosk-content" role="main">
      <RouterView />
    </main>

    <footer class="kiosk-footer" aria-label="Bedienhinweise">
      <div style="flex:1"></div>
      <Button label="Admin" icon="pi pi-lock" severity="secondary" rounded class="touch-button" @click="goToAdmin" />
    </footer>
  </div>
</template>

<script setup lang="ts">
// Layout only handles navigation affordances and leaves business logic to child pages.
import Button from 'primevue/button';
import HomeStatusPanel from '@/components/HomeStatusPanel.vue';
import { useRouter } from 'vue-router';
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useSessionStore } from '@/stores/session';

const router = useRouter();
const sessionStore = useSessionStore();
const { user } = storeToRefs(sessionStore);
function goToAdmin() {
  router.push({ name: 'admin-login' });
}
</script>

<style scoped>
.kiosk-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 1.25rem;
  gap: 1.2rem;
  background: radial-gradient(circle at 20% 20%, rgba(0, 140, 255, 0.08), transparent 55%),
    radial-gradient(circle at 80% 0%, rgba(255, 200, 55, 0.08), transparent 40%),
    var(--surface-ground);
}

.kiosk-header {
  display: grid;
  gap: 1rem;
  align-items: stretch;
  grid-template-columns: minmax(240px, 1fr) minmax(220px, 1fr) minmax(220px, 1fr);
}

.brand {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  background: color-mix(in srgb, var(--surface-card) 92%, transparent);
  padding: 0.85rem 1rem;
  border-radius: 20px;
  box-shadow: 0 1.5rem 3rem -2.5rem rgba(16, 24, 40, 0.5);
}

.brand-logo {
  width: 58px;
  height: 58px;
}

.brand-title {
  margin: 0;
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--text-color);
}

.brand-subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

.user-area {
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: color-mix(in srgb, var(--primary-color) 10%, var(--surface-card));
  padding: 0.85rem 1rem;
  border-radius: 20px;
  color: var(--surface-0);
  min-height: 90px;
  box-shadow: 0 1.5rem 3rem -2.5rem rgba(64, 120, 255, 0.5);
}

.user-name {
  font-size: 1rem;
  font-weight: 600;
}

.user-balance {
  font-size: 1rem;
  color: var(--surface-100);
}

.kiosk-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

@media (max-width: 960px) {
  .kiosk-layout {
    padding: 1rem;
  }

  .kiosk-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .kiosk-header {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}

.kiosk-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.8rem;
  background: color-mix(in srgb, var(--surface-card) 94%, transparent);
  border-radius: 18px;
  padding: 0.85rem 1.25rem;
  box-shadow: 0 1.5rem 3rem -2.5rem rgba(16, 24, 40, 0.45);
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.95rem;
}

.footer-info .pi {
  font-size: 1.3rem;
  color: var(--primary-color);
}
</style>