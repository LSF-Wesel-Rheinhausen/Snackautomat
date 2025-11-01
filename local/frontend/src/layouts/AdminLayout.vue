<template>
  <div class="admin-layout">
    <header class="admin-header">
      <div class="title-area">
        <Button
          icon="pi pi-arrow-left"
          rounded
          severity="secondary"
          class="touch-button back-button"
          @click="navigateBack"
          aria-label="Zurück zum Kiosk"
        />
        <div>
          <h1>Adminbereich</h1>
          <p v-if="profile">Angemeldet als {{ profile.name }}</p>
          <p v-else>Bitte PIN eingeben, um fortzufahren.</p>
        </div>
      </div>
      <div class="actions">
        <Button
          v-if="isAuthenticated"
          label="Abmelden"
          icon="pi pi-power-off"
          severity="danger"
          outlined
          class="touch-button"
          @click="logout"
        />
      </div>
    </header>

    <main class="admin-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useAdminStore } from '@/stores/admin';

const router = useRouter();
const adminStore = useAdminStore();
const { profile, isAuthenticated } = storeToRefs(adminStore);

function navigateBack() {
  router.push({ name: 'kiosk-landing' });
}

async function logout() {
  await adminStore.logout();
  router.push({ name: 'kiosk-landing' });
}
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(12, 126, 255, 0.1), rgba(76, 201, 240, 0.08)),
    var(--surface-ground);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.title-area h1 {
  margin: 0;
  font-size: 1.75rem;
}

.title-area p {
  margin: 0;
  color: var(--text-color-secondary);
}

.back-button {
  width: 64px;
  height: 64px;
}

.admin-content {
  flex: 1;
}

@media (max-width: 960px) {
  .admin-layout {
    padding: 1rem;
  }

  .admin-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
