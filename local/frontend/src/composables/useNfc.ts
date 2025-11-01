/**
 * Handles NFC login stream via Server-Sent Events.
 * Keeps reconnection logic local so components remain slim.
 */
import { computed, onBeforeUnmount, ref } from 'vue';
import { useSessionStore } from '@/stores/session';
import { ApiError, resolveApiUrl, useApi } from './useApi';
import type { NfcUser } from '@/types/models';

interface NfcEventPayload {
  user: NfcUser;
  syncedAt: string;
}

const STREAM_ENDPOINT = '/nfc/stream';
const MOCK_ENDPOINT = '/nfc/mock-scan';

export function useNfc() {
  const sessionStore = useSessionStore();
  const { post, error, loading } = useApi();

  const eventSource = ref<EventSource | null>(null);
  const isListening = ref(false);
  const lastHeartbeat = ref<Date | null>(null);
  const message = ref('Bitte halten Sie Ihren Ausweis vor den Leser.');

  function attachEventSource() {
    if (eventSource.value || typeof EventSource === 'undefined') {
      return;
    }

    // Build the absolute streaming endpoint informed by `VITE_API_BASE_URL`.
    const url = resolveApiUrl(STREAM_ENDPOINT);
    const source = new EventSource(url);

    source.onopen = () => {
      isListening.value = true;
      message.value = 'Bereit. Bitte NFC-Karte auflegen.';
    };

    source.onerror = (event) => {
      console.error('NFC stream error', event);
      message.value = 'Keine Verbindung zum Kartenleser. Erneuter Versuch ...';
      isListening.value = false;
      disconnect();
      // Retry after a short delay to avoid spamming the backend.
      setTimeout(() => {
        attachEventSource();
      }, 2_000);
    };

    source.addEventListener('heartbeat', () => {
      // Heartbeats confirm the backend reader service is alive.
      lastHeartbeat.value = new Date();
    });

    source.addEventListener('card', (evt) => {
      try {
        const payload: NfcEventPayload = JSON.parse((evt as MessageEvent).data);
        sessionStore.startSession(payload.user);
        message.value = `Willkommen ${payload.user.name}!`;
      } catch (err) {
        console.warn('Failed to parse NFC event', err);
      }
    });

    eventSource.value = source;
  }

  function disconnect() {
    eventSource.value?.close();
    eventSource.value = null;
    isListening.value = false;
  }

  async function simulateScan(userId: string) {
    try {
      await post<NfcEventPayload>(MOCK_ENDPOINT, { userId });
    } catch (err) {
      if (err instanceof ApiError) {
        message.value = 'Simulierter Scan fehlgeschlagen.';
        // Allow front-end-only testing by seeding a demo user when backend call fails.
        sessionStore.startSession({
          id: userId,
          name: 'Demo Nutzer',
          balance: 25,
          isAdmin: true
        });
        return;
      }
    }
  }

  onBeforeUnmount(() => {
    // Ensure stream is closed when component using this composable unmounts.
    disconnect();
  });

  return {
    isListening: computed(() => isListening.value),
    loading,
    error,
    message: computed(() => message.value),
    lastHeartbeat: computed(() => lastHeartbeat.value),
    start: () => {
      sessionStore.setAwaitingNfc(true);
      attachEventSource();
    },
    stop: () => {
      sessionStore.setAwaitingNfc(false);
      disconnect();
    },
    simulateScan
  };
}
