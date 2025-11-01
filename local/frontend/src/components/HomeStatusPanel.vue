<template>
  <section class="status-panel" aria-label="Systemstatus">
    <!-- Tile shows live temperature from machine sensors -->
    <div class="status-tile">
      <i class="pi pi-thermometer" aria-hidden="true"></i>
      <div>
        <span class="label">Temperatur</span>
        <span class="value">{{ environmentDisplay.temperature }}</span>
      </div>
    </div>
    <!-- Door tile communicates whether the cabinet is open or locked -->
    <div class="status-tile">
      <i
        :class="['pi', environmentDisplay.doorOpen ? 'pi-lock-open' : 'pi-lock']"
        aria-hidden="true"
      ></i>
      <div>
        <span class="label">Tür</span>
        <span class="value">{{ environmentDisplay.doorStatus }}</span>
      </div>
    </div>
    <!-- Sync tile reflects backend connectivity and pending bookings -->
    <div class="status-tile">
      <i class="pi pi-sync" aria-hidden="true"></i>
      <div>
        <span class="label">Sync</span>
        <span class="value">{{ syncStatus }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Lightweight status readout used in kiosk header.
import { computed } from 'vue';
import { useMachineStatus } from '@/composables/useMachineStatus';

const { environment, sync } = useMachineStatus(true);

// Format sensor readings so templates stay clean.
const environmentDisplay = computed(() => {
  if (!environment.value) {
    return {
      temperature: '–',
      doorStatus: 'Unbekannt',
      doorOpen: false
    };
  }
  return {
    temperature: `${environment.value.temperatureC.toFixed(1)} °C`,
    doorStatus: environment.value.doorOpen ? 'Offen' : 'Geschlossen',
    doorOpen: environment.value.doorOpen
  };
});

const syncStatus = computed(() => {
  if (!sync.value) return 'Keine Daten';
  // Display offline indicator when backend heartbeat fails.
  if (!sync.value.backendOnline) return 'Backend offline';
  if (sync.value.pendingJobs > 0) {
    // Show how many sales are still awaiting booking.
    return `${sync.value.pendingJobs} ausstehend`;
  }
  return sync.value.lastSync ? 'Synchron' : 'Bereit';
});
</script>

<style scoped>
.status-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.status-tile {
  display: flex;
  align-items: center;
  background: color-mix(in srgb, var(--surface-card) 92%, var(--surface-ground));
  border-radius: 18px;
  padding: 0.75rem 1rem;
  gap: 0.75rem;
  box-shadow: 0 18px 36px -24px rgba(16, 24, 40, 0.45);
}

.status-tile .pi {
  font-size: 1.75rem;
  color: var(--primary-color);
}

.label {
  font-size: 0.9rem;
  display: block;
  color: var(--text-color-secondary);
}

.value {
  font-size: 1.1rem;
  font-weight: 600;
}
</style>
