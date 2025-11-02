/**
 * Handles NFC login by triggering the backend scanner.
 * When started, performs a GET request against `/get_user_info` and waits
 * for the backend to respond with user data or an error message.
 */
import { computed, ref } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useApi, ApiError } from './useApi';
import type { NfcUser } from '@/types/models';
import { useToast } from 'primevue/usetoast';
import { API_ENDPOINTS } from '@/config/api';

interface UserInfoErrorPayload {
  error?: string;
}

export function useNfc() {
  const sessionStore = useSessionStore();
  const { get, error, loading } = useApi();
  const toast = useToast();

  const isWaiting = ref(false);
  const message = ref('Bitte halten Sie Ihren Ausweis vor den Leser.');
  const lastTokenId = ref<string | null>(null);

  function normalizeUser(raw: any): NfcUser {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Ungültige Benutzerdaten');
    }

    const memberIdCandidate =
      raw.memberid ??
      raw.memberId ??
      raw.member_id ??
      raw.memberID ??
      raw.id ??
      raw.rfid_id ??
      raw.rfid ??
      null;

    const firstNameRaw =
      raw.firstname ?? raw.first_name ?? raw.first ?? raw.name ?? raw.fullName ?? raw.full_name ?? '';
    const lastNameRaw = raw.lastname ?? raw.last_name ?? raw.last ?? '';
    const combined = [firstNameRaw, lastNameRaw]
      .map((part: string) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean)
      .join(' ');

    const displayName =
      combined ||
      (typeof firstNameRaw === 'string' && firstNameRaw.trim() ? firstNameRaw.trim() : 'Mitglied');

    const fallbackId =
      raw.id ??
      (typeof globalThis !== 'undefined' && globalThis.crypto && 'randomUUID' in globalThis.crypto
        ? (globalThis.crypto as Crypto).randomUUID()
        : `user-${Date.now()}`);

    return {
      id: memberIdCandidate ? String(memberIdCandidate) : String(fallbackId),
      memberId: memberIdCandidate ? String(memberIdCandidate) : undefined,
      name: displayName,
      firstName: typeof firstNameRaw === 'string' && firstNameRaw.trim() ? firstNameRaw.trim() : undefined,
      lastName: typeof lastNameRaw === 'string' && lastNameRaw.trim() ? lastNameRaw.trim() : undefined,
      raw
    };
  }

  async function requestUserInfo(): Promise<boolean> {
    try {
      const { data } = await get<Record<string, unknown>>(API_ENDPOINTS.userInfo);
      const normalized = normalizeUser(data);
      sessionStore.startSession(normalized);
      lastTokenId.value = normalized.memberId ?? normalized.id;
      message.value = `Willkommen ${normalized.firstName ?? normalized.name}!`;
      toast.add({
        severity: 'success',
        summary: 'Login erfolgreich',
        detail: `Schön dich zu sehen, ${normalized.firstName ?? normalized.name}!`,
        life: 2500
      });
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
        name: 'Demo Nutzer'
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
