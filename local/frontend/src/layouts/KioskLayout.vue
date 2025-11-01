<template>
  <div class="kiosk-layout">
    <header class="kiosk-header">
      <div class="brand">
        <img src="/logo.svg" alt="" aria-hidden="true" class="brand-logo" />
        <div>
          <p class="brand-title">Snackautomat</p>
          <p class="brand-subtitle">LSF Wesel-Rheinhausen</p>
        </div>
      </div>
      <HomeStatusPanel />
      <div class="user-area" v-if="user">
        <span class="user-name">Hallo {{ user.name }}!</span>
        <span class="user-balance">
          Guthaben:
          <strong>{{ userBalance }} €</strong>
        </span>
      </div>
    </header>

    <main class="kiosk-content" role="main">
      <RouterView />
    </main>

    <footer class="kiosk-footer" aria-label="Bedienhinweise">
      <div class="footer-info">
        <i class="pi pi-info-circle" aria-hidden="true"></i>
        <span>Berühren Sie die Fläche, um fortzufahren. Die Bedienung ist vollständig touchoptimiert.</span>
      </div>
      <Button
        label="Admin"
        icon="pi pi-lock"
        severity="secondary"
        rounded
        class="touch-button"
        @click="goToAdmin"
      />
    </footer>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import HomeStatusPanel from '@/components/HomeStatusPanel.vue';
import { useRouter } from 'vue-router';
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useSessionStore } from '@/stores/session';

const router = useRouter();
const sessionStore = useSessionStore();
const { user } = storeToRefs(sessionStore);
const userBalance = computed(() => (user.value ? user.value.balance.toFixed(2) : '0.00'));

function goToAdmin() {
  router.push({ name: 'admin-login' });
}
</script>

<style scoped>
.kiosk-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 1.5rem;
  gap: 1.5rem;
  background: radial-gradient(circle at 20% 20%, rgba(0, 140, 255, 0.08), transparent 55%),
    radial-gradient(circle at 80% 0%, rgba(255, 200, 55, 0.08), transparent 40%),
    var(--surface-ground);
}

.kiosk-header {
  display: grid;
  gap: 1.5rem;
  align-items: center;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.brand {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  background: color-mix(in srgb, var(--surface-card) 92%, transparent);
  padding: 1rem 1.25rem;
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
  font-size: 1.3rem;
  color: var(--text-color);
}

.brand-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-color-secondary);
}

.user-area {
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: color-mix(in srgb, var(--primary-color) 10%, var(--surface-card));
  padding: 1rem 1.25rem;
  border-radius: 20px;
  color: var(--surface-0);
  min-height: 110px;
  box-shadow: 0 1.5rem 3rem -2.5rem rgba(64, 120, 255, 0.5);
}

.user-name {
  font-size: 1.1rem;
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

.kiosk-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: color-mix(in srgb, var(--surface-card) 94%, transparent);
  border-radius: 20px;
  padding: 1rem 1.5rem;
  box-shadow: 0 1.5rem 3rem -2.5rem rgba(16, 24, 40, 0.45);
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
}

.footer-info .pi {
  font-size: 1.4rem;
  color: var(--primary-color);
}

@media (max-width: 960px) {
  .kiosk-layout {
    padding: 1rem;
  }

  .kiosk-footer {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
