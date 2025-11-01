<template>
  <div class="not-found">
    <i class="pi pi-compass" aria-hidden="true"></i>
    <h2>Seite nicht gefunden</h2>
    <p>Der angeforderte Bereich existiert nicht. Zurück zur Startseite?</p>
    <Button label="Zurück" icon="pi pi-home" class="touch-button" @click="goHome" />
  </div>
</template>

<script setup lang="ts">
// Basic fallback route – keep light to avoid masking real navigation issues.
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

const router = useRouter();

function goHome() {
  // Send visitors back to the kiosk entry point.
  router.push({ name: 'kiosk-landing' });
}
</script>

<style scoped>
.not-found {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;
  color: var(--text-color);
}

.not-found .pi {
  font-size: 3rem;
  color: var(--primary-color);
}
</style>
