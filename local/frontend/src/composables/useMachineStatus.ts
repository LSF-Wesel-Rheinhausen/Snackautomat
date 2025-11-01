/**
 * Polls machine environment/sync status for both kiosk and admin surfaces.
 * Centralising the polling makes it easier to tune intervals for Pi hardware.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { MachineEnvironment, SyncStatus } from '@/types/models';
import { useApi, ApiError } from './useApi';

interface MachineStatusSummary {
  environment: MachineEnvironment;
  sync: SyncStatus;
}

const POLL_INTERVAL = 15_000;

export function useMachineStatus(fetchOnMount = true) {
  const { get, error, loading } = useApi();
  const status = ref<MachineStatusSummary | null>(null);
  const lastUpdated = ref<string | null>(null);
  let timer: ReturnType<typeof setInterval> | null = null;

async function loadStatus() {
    try {
      const { data } = await get<MachineStatusSummary>('/machine/status');
      status.value = data;
      lastUpdated.value = new Date().toISOString();
    } catch (err) {
    if (err instanceof ApiError) {
      console.warn('Status konnte nicht geladen werden', err);
    }
  }
}

function startPolling() {
  if (timer) {
    return;
  }
  // Poll gently to balance freshness with Pi CPU constraints.
  timer = setInterval(loadStatus, POLL_INTERVAL);
}

function stopPolling() {
  if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  onMounted(() => {
    if (fetchOnMount) {
      // Immediate poll gives the UI fresh status without waiting for first interval tick.
      loadStatus();
      startPolling();
    }
  });

  onBeforeUnmount(() => stopPolling());

  return {
    status,
    loading,
    error,
    lastUpdated: computed(() => lastUpdated.value),
    environment: computed(() => status.value?.environment),
    sync: computed(() => status.value?.sync),
    loadStatus,
    startPolling,
    stopPolling
  };
}
