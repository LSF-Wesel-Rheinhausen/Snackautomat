<template>
  <section class="scan-screen">
    <div class="scan-card">
      <div class="scan-icon" aria-hidden="true">
        <i class="pi pi-id-card"></i>
      </div>
      <h2>NFC Karte scannen</h2>
      <p>{{ message }}</p>
      <div class="spinner">
        <ProgressSpinner style="width: 5rem; height: 5rem" strokeWidth="6" />
      </div>
      <p class="hint">
        Halten Sie die Karte ruhig an das Lesegerät. Nach dem Scan können Sie sofort einkaufen.
      </p>
      <div class="actions">
        <Button
          label="Abbrechen"
          severity="secondary"
          outlined
          class="touch-button"
          @click="cancel"
        />
        <Button
          v-if="showDemoButton"
          label="Scan simulieren"
          icon="pi pi-wifi"
          class="touch-button"
          @click="simulate"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import ProgressSpinner from 'primevue/progressspinner';
import Button from 'primevue/button';
import { storeToRefs } from 'pinia';
import { useNfc } from '@/composables/useNfc';
import { useSessionStore } from '@/stores/session';
import { useItemsStore } from '@/stores/items';

const router = useRouter();
const sessionStore = useSessionStore();
const itemsStore = useItemsStore();
const nfc = useNfc();
const { kioskMessage, isAuthenticated } = storeToRefs(sessionStore);

const message = computed(() => kioskMessage.value ?? nfc.message.value);
const showDemoButton = import.meta.env.DEV;

onMounted(async () => {
  nfc.start();
  await itemsStore.fetchItems();
});

onBeforeUnmount(() => {
  nfc.stop();
});

watch(
  () => isAuthenticated.value,
  (authenticated) => {
    if (authenticated) {
      router.replace({ name: 'kiosk-catalog' });
    }
  }
);

function cancel() {
  sessionStore.endSession();
  router.push({ name: 'kiosk-landing' });
}

function simulate() {
  nfc.simulateScan('demo-user');
}
</script>

<style scoped>
.scan-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-card {
  text-align: center;
  background: color-mix(in srgb, var(--surface-card) 96%, transparent);
  padding: 2.5rem 3rem;
  border-radius: 32px;
  max-width: 540px;
  display: grid;
  gap: 1.5rem;
  box-shadow: 0 30px 60px -40px rgba(16, 24, 40, 0.6);
}

.scan-card h2 {
  margin: 0;
  font-size: 2.2rem;
}

.scan-icon {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin: 0 auto;
  background: radial-gradient(circle at 40% 40%, rgba(12, 126, 255, 0.2), transparent),
    var(--primary-color);
  color: white;
}

.scan-icon .pi {
  font-size: 2.8rem;
}

.spinner {
  display: flex;
  justify-content: center;
}

.hint {
  font-size: 1rem;
  color: var(--text-color-secondary);
  margin: 0;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

@media (max-width: 640px) {
  .scan-card {
    padding: 2rem;
  }

  .actions {
    flex-direction: column;
  }
}
</style>
