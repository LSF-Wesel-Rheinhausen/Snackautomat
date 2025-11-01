<template>
  <section class="confirmation" aria-live="polite">
    <div class="card">
      <i class="pi pi-check-circle" aria-hidden="true"></i>
      <h2>Snackausgabe gestartet</h2>
      <p>Bitte entnehmen Sie Ihre Snacks. Vielen Dank für die Nutzung der Packstation!</p>
      <div v-if="receipt" class="receipt">
        <h3>Beleg</h3>
        <ul>
          <li v-for="item in receipt.items" :key="item.id">
            <span>{{ item.quantity }} × {{ item.name }}</span>
            <span>{{ formatPrice(item.price * item.quantity) }}</span>
          </li>
        </ul>
        <div class="total-row">
          <span>Gesamt</span>
          <span>{{ formatPrice(receipt.total) }}</span>
        </div>
      </div>
      <div class="actions">
        <Button label="Neuen Kauf starten" class="touch-button" @click="startNew" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const router = useRouter();
const sessionStore = useSessionStore();

const receipt = computed(() => sessionStore.lastReceipt);
const currency = computed(() => sessionStore.currency);

onMounted(() => {
  if (!receipt.value) {
    router.replace({ name: 'kiosk-landing' });
  } else {
    sessionStore.setKioskMessage('Snackausgabe läuft – bitte entnehmen.');
  }
});

function formatPrice(amount: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency.value
  }).format(amount);
}

function startNew() {
  sessionStore.endSession();
  router.push({ name: 'kiosk-landing' });
}
</script>

<style scoped>
.confirmation {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  max-width: 520px;
  width: 100%;
  background: color-mix(in srgb, var(--surface-card) 95%, transparent);
  padding: 2.5rem 3rem;
  border-radius: 32px;
  text-align: center;
  box-shadow: 0 36px 72px -40px rgba(16, 24, 40, 0.6);
  display: grid;
  gap: 1.5rem;
}

.card .pi {
  font-size: 3.5rem;
  color: var(--primary-color);
}

.receipt {
  text-align: left;
  background: color-mix(in srgb, var(--surface-card) 98%, transparent);
  border-radius: 20px;
  padding: 1.5rem;
  display: grid;
  gap: 0.75rem;
}

.receipt ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}

.receipt li,
.total-row {
  display: flex;
  justify-content: space-between;
}

.total-row {
  font-weight: 700;
  font-size: 1.2rem;
  border-top: 1px solid color-mix(in srgb, var(--text-color) 10%, transparent);
  padding-top: 0.75rem;
}

.actions {
  display: flex;
  justify-content: center;
}
</style>
