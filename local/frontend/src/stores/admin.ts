/**
 * Admin store tracks privileged session data and machine maintenance actions.
 * Token handling is deliberately in-memory; backend is responsible for TTL and revocation.
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type {
  AdminProfile,
  MachineStatusResponse,
  NetworkSettingsPayload,
  SlotTestResult
} from '@/types/models';
import { useApi, ApiError } from '@/composables/useApi';
import { API_ENDPOINTS, API_BUILDERS } from '@/config/api';

interface AuthResponse {
  profile: AdminProfile;
  token: string;
  expiresAt: string;
}

interface LogoutResponse {
  success: boolean;
}

export const useAdminStore = defineStore('admin', () => {
  const api = useApi();

  const profile = ref<AdminProfile | null>(null);
  const authToken = ref<string | null>(null);
  const tokenExpiry = ref<string | null>(null);
  const status = ref<MachineStatusResponse | null>(null);
  const pinAttempts = ref(0);
  const maxPinAttempts = ref(5);
  const lastError = ref<string | null>(null);
  const busyAction = ref<string | null>(null);

  // True once backend-issued token and profile are present.
  const isAuthenticated = computed(() => Boolean(profile.value && authToken.value));
  // Guards against brute force PIN attempts from the kiosk interface.
  const hasReachedPinLimit = computed(() => pinAttempts.value >= maxPinAttempts.value);

  function setAuthPayload(payload: AuthResponse) {
    profile.value = payload.profile;
    authToken.value = payload.token;
    tokenExpiry.value = payload.expiresAt;
    pinAttempts.value = 0;
    lastError.value = null;
  }

  function clearAuth() {
    profile.value = null;
    authToken.value = null;
    tokenExpiry.value = null;
  }

  async function authenticateWithPin(pin: string) {
    if (hasReachedPinLimit.value) {
      lastError.value = 'Maximale Anzahl an PIN-Versuchen erreicht. Bitte warten.';
      throw new ApiError(lastError.value, 423);
    }

    try {
      // Backend validates the PIN and issues a short-lived token for subsequent requests.
      const { data } = await api.post<AuthResponse>(API_ENDPOINTS.adminAuthPin, { pin });
      setAuthPayload(data);
      await fetchStatus();
      return data;
    } catch (error) {
      pinAttempts.value += 1;
      if (error instanceof ApiError) {
        lastError.value = error.payload?.message ?? 'PIN konnte nicht verifiziert werden.';
        throw error;
      }
      lastError.value = 'Unbekannter Fehler bei der Anmeldung.';
      throw error;
    }
  }

  async function logout() {
    try {
      await api.post<LogoutResponse>(API_ENDPOINTS.adminLogout);
    } catch (error) {
      console.warn('Logout fehlgeschlagen', error);
    } finally {
      // Always drop credentials locally even if backend call fails.
      clearAuth();
    }
  }

  async function fetchStatus() {
    if (!isAuthenticated.value) {
      // Skip expensive requests when no admin is logged in.
      return;
    }
    try {
      const { data } = await api.get<MachineStatusResponse>(API_ENDPOINTS.adminStatus);
      status.value = data;
    } catch (error) {
      if (error instanceof ApiError) {
        lastError.value = 'Status konnte nicht geladen werden.';
      }
      throw error;
    }
  }

  async function runSlotTest(slot: string) {
    busyAction.value = `slot:${slot}`;
    try {
      // Slot test instructs backend to rotate/dispense hardware for diagnostics.
      const { data } = await api.post<SlotTestResult>(API_BUILDERS.adminSlotTest(slot));
      await fetchStatus();
      return data;
    } finally {
      // Busy flag must always reset to keep UI buttons responsive.
      busyAction.value = null;
    }
  }

  async function triggerSync() {
    busyAction.value = 'sync';
    try {
      // Asks backend to push pending bookings to Vereinsflieger.
      await api.post(API_ENDPOINTS.adminSync);
      await fetchStatus();
    } finally {
      busyAction.value = null;
    }
  }

  async function triggerOtaUpdate() {
    busyAction.value = 'ota';
    try {
      // Triggers the backend OTA mechanism (Raspberry Pi service).
      await api.post(API_ENDPOINTS.adminOtaStart);
      await fetchStatus();
    } finally {
      busyAction.value = null;
    }
  }

  async function updateNetworkSettings(payload: NetworkSettingsPayload) {
    busyAction.value = 'network';
    try {
      // Delegates Wi-Fi reconfiguration to backend, which updates wpa_supplicant etc.
      await api.post(API_ENDPOINTS.adminNetwork, payload);
      await fetchStatus();
    } finally {
      busyAction.value = null;
    }
  }

  return {
    ...api,
    profile,
    status,
    pinAttempts,
    maxPinAttempts,
    lastError,
    busyAction,
    isAuthenticated,
    hasReachedPinLimit,
    authenticateWithPin,
    logout,
    fetchStatus,
    runSlotTest,
    triggerSync,
    triggerOtaUpdate,
    updateNetworkSettings
  };
});
