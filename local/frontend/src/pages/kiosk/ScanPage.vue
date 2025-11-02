<template>
  <section class="scan-screen">
    <div class="scan-card">
      <div class="scan-icon" aria-hidden="true">
        <i class="pi pi-id-card"></i>
      </div>
      <h2>NFC Karte scannen</h2>
      <p>{{ message }}</p>
      <div class="spinner">
        <ProgressSpinner style="width: 4rem; height: 4rem" strokeWidth="5" />
      </div>
      <p class="hint">
        Halten Sie die Karte ruhig an das Lesegerät. Nach dem Scan können Sie sofort einkaufen.
      </p>
      <div class="actions">
        <!-- Users can cancel back to landing if they change their mind -->
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
// NFC login screen – keep watchers in sync with session store transitions.
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
  // Begin listening for NFC events immediately and warm up catalog data.
  await nfc.start();
  await itemsStore.fetchItems();
});

onBeforeUnmount(() => {
  // Free the EventSource when leaving the page.
  nfc.stop();
});

watch(
  () => isAuthenticated.value,
  (authenticated) => {
    if (authenticated) {
      // Once session exists, move visitor to the product catalog automatically.
      router.replace({ name: 'kiosk-catalog' });
    }
  }
);

function cancel() {
  // Ending the session ensures any partial state is discarded safely.
  sessionStore.endSession();
  router.push({ name: 'kiosk-landing' });
}

async function simulate() {
  // Development helper to test flow without actual hardware.
  await nfc.simulateScan();
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
  padding: 2rem 2.4rem;
  border-radius: 28px;
  max-width: 520px;
  display: grid;
  gap: 1.25rem;
  border: 1px solid var(--surface-border);
  box-shadow: 0 26px 52px -36px rgba(16, 24, 40, 0.55);
}

.scan-card h2 {
  margin: 0;
  font-size: 2rem;
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
