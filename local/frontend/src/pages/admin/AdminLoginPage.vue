<template>
  <section class="login">
    <div class="card">
      <h2>PIN eingeben</h2>
      <p>Der Adminbereich ist geschützt. Bitte geben Sie Ihre vierstellige PIN ein.</p>
      <Message v-if="statusMessage" :severity="statusSeverity">{{ statusMessage }}</Message>
      <PinPad v-model="pin" :length="4" @submit="authenticate" />
      <div class="actions">
        <Button label="Abbrechen" severity="secondary" outlined class="touch-button" @click="cancel" />
        <Button label="Anmelden" icon="pi pi-unlock" class="touch-button" :disabled="pin.length !== 4" @click="authenticate(pin)" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import PinPad from '@/components/PinPad.vue';
import { useAdminStore } from '@/stores/admin';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const adminStore = useAdminStore();

const pin = ref('');

const statusMessage = computed(() => adminStore.lastError);
const statusSeverity = computed(() => (adminStore.hasReachedPinLimit ? 'warn' : 'info'));

watch(
  () => adminStore.isAuthenticated,
  (authenticated) => {
    if (authenticated) {
      toast.add({ severity: 'success', summary: 'Erfolgreich', detail: 'Willkommen im Adminbereich', life: 2000 });
      const redirect = (route.query.redirect as string) ?? '/admin/dashboard';
      router.replace(redirect);
    }
  }
);

async function authenticate(value?: string) {
  const pinValue = value ?? pin.value;
  if (pinValue.length !== 4) return;
  try {
    await adminStore.authenticateWithPin(pinValue);
  } catch (error) {
    toast.add({ severity: 'error', summary: 'PIN falsch', detail: 'Bitte erneut versuchen', life: 2000 });
    pin.value = '';
  }
}

function cancel() {
  router.push({ name: 'kiosk-landing' });
}
</script>

<style scoped>
.login {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  max-width: 520px;
  width: 100%;
  background: color-mix(in srgb, var(--surface-card) 96%, transparent);
  padding: 2.5rem;
  border-radius: 30px;
  box-shadow: 0 24px 48px -30px rgba(16, 24, 40, 0.6);
  display: grid;
  gap: 1.5rem;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

@media (max-width: 640px) {
  .card {
    padding: 2rem;
  }

  .actions {
    flex-direction: column;
  }
}
</style>
