<template>
  <section class="status-panel" aria-label="Systemstatus">
    <div :class="['status-tile', isHealthy ? 'status-tile--ok' : 'status-tile--warn']">
      <i :class="['pi', isHealthy ? 'pi-check-circle' : 'pi-exclamation-circle']" aria-hidden="true"></i>
      <div>
        <span class="label">API Status</span>
        <span class="value">{{ isHealthy ? 'Online' : 'Störung' }}</span>
      </div>
    </div>
    <div class="status-tile status-tile--info">
      <i class="pi pi-comment" aria-hidden="true"></i>
      <div>
        <span class="label">Rückmeldung</span>
        <span class="value">{{ statusMessage }}</span>
      </div>
    </div>
    <div class="status-tile status-tile--neutral">
      <i class="pi pi-clock" aria-hidden="true"></i>
      <div>
        <span class="label">Letzte Prüfung</span>
        <span class="value">{{ lastCheckDisplay }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Lightweight status readout used in kiosk header.
import { computed } from 'vue';
import { useMachineStatus } from '@/composables/useMachineStatus';

const { healthy, statusMessage, lastCheck } = useMachineStatus(true);

const isHealthy = computed(() => healthy.value !== false);

const lastCheckDisplay = computed(() => {
  if (!lastCheck.value) {
    return '–';
  }
  const date = new Date(lastCheck.value);
  if (Number.isNaN(date.getTime())) {
    return '–';
  }
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
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

.status-tile--ok {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(16, 185, 129, 0.08));
}

.status-tile--warn {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.18), rgba(248, 113, 113, 0.08));
}

.status-tile--info {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(59, 130, 246, 0.08));
}

.status-tile--neutral {
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.18), rgba(148, 163, 184, 0.08));
}

@media (max-width: 1024px) {
  .status-panel {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.5rem;
  }

  .status-tile {
    padding: 0.65rem 0.85rem;
  }

  .status-tile .pi {
    font-size: 1.5rem;
  }
}
</style>
