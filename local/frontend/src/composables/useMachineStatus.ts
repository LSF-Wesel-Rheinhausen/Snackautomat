/**
 * Polls the `/health` endpoint to monitor backend availability.
 * The endpoint reports overall broker/API status; this composable normalises the response
 * for UI components such as `HomeStatusPanel`.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useApi, ApiError } from './useApi';

interface HealthResponse {
  status: string;
  message?: string;
}

const POLL_INTERVAL_MS = 20_000;

export function useMachineStatus(fetchOnMount = true) {
  const { get, loading, error } = useApi();
  const lastCheck = ref<string | null>(null);
  const healthy = ref<boolean | null>(null);
  const statusMessage = ref<string>('Warte auf Status…');

  let timer: ReturnType<typeof setInterval> | null = null;

  async function fetchHealth() {
    try {
      const { data } = await get<HealthResponse>('/health');
      healthy.value = data.status?.toLowerCase() === 'ok';
      statusMessage.value = data.message ?? (healthy.value ? 'Broker verbunden' : 'Unbekannter Zustand');
    } catch (err) {
      healthy.value = false;
      if (err instanceof ApiError) {
        statusMessage.value =
          err.payload && typeof err.payload === 'object' && 'message' in err.payload
            ? String((err.payload as { message?: string }).message ?? 'Backend nicht erreichbar')
            : 'Backend nicht erreichbar';
      } else {
        statusMessage.value = 'Verbindung fehlgeschlagen.';
      }
    } finally {
      lastCheck.value = new Date().toISOString();
    }
  }

  function startPolling() {
    if (timer) return;
    timer = setInterval(fetchHealth, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  onMounted(() => {
    if (!fetchOnMount) return;
    fetchHealth();
    startPolling();
  });

  onBeforeUnmount(() => {
    stopPolling();
  });

  return {
    loading,
    error,
    healthy: computed(() => healthy.value),
    statusMessage: computed(() => statusMessage.value),
    lastCheck,
    refresh: fetchHealth,
    startPolling,
    stopPolling
  };
}
