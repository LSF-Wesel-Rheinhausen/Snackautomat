/**
 * Handles NFC login by triggering the backend scanner.
 * When started, performs a GET request against `/get_user_info` and waits
 * for the backend to respond with user data or an error message.
 */
import { computed, ref } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useApi, ApiError } from './useApi';
import type { NfcUser } from '@/types/models';

const USER_INFO_ENDPOINT = '/get_user_info';

interface UserInfoErrorPayload {
  error?: string;
}

export function useNfc() {
  const sessionStore = useSessionStore();
  const { get, error, loading } = useApi();

  const isWaiting = ref(false);
  const message = ref('Bitte halten Sie Ihren Ausweis vor den Leser.');
  const lastTokenId = ref<string | null>(null);

  async function requestUserInfo(): Promise<boolean> {
    try {
      const { data } = await get<NfcUser>(USER_INFO_ENDPOINT);
      sessionStore.startSession(data);
      lastTokenId.value = data.id;
      message.value = `Willkommen ${data.name}!`;
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        const backendMessage =
          typeof err.payload === 'object' && err.payload
            ? (err.payload as UserInfoErrorPayload).error
            : null;
        message.value = backendMessage ?? 'Karte konnte nicht verifiziert werden.';
      } else {
        message.value = 'Unerwarteter Fehler beim Abrufen der Benutzerdaten.';
      }
      return false;
    }
  }

  async function start() {
    if (isWaiting.value) {
      return;
    }
    sessionStore.setAwaitingNfc(true);
    message.value = 'Scanner aktiv. Bitte Karte jetzt auflegen.';
    isWaiting.value = true;

    const success = await requestUserInfo();

    if (!success && import.meta.env.DEV) {
      // Development fallback to simulate a user when backend is unavailable.
      const demoUser: NfcUser = {
        id: 'demo-user',
        name: 'Demo Nutzer',
        balance: 25,
        isAdmin: true
      };
      sessionStore.startSession(demoUser);
      message.value = 'Demo Session aktiviert.';
    }

    sessionStore.setAwaitingNfc(false);
    isWaiting.value = false;
    return success;
  }

  function stop() {
    // Nothing to abort, but reset messaging for UI consistency.
    sessionStore.setAwaitingNfc(false);
    isWaiting.value = false;
    message.value = 'Bitte halten Sie Ihren Ausweis vor den Leser.';
  }

  async function simulateScan() {
    sessionStore.setAwaitingNfc(true);
    const success = await requestUserInfo();
    sessionStore.setAwaitingNfc(false);
    return success;
  }

  return {
    loading,
    error,
    isWaiting: computed(() => isWaiting.value),
    lastTokenId: computed(() => lastTokenId.value),
    message: computed(() => message.value),
    start,
    stop,
    simulateScan
  };
}
