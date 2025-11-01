import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type {
  AdminProfile,
  MachineStatusResponse,
  NetworkSettingsPayload,
  SlotTestResult
} from '@/types/models';
import { useApi, ApiError } from '@/composables/useApi';

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

  const isAuthenticated = computed(() => Boolean(profile.value && authToken.value));
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
      const { data } = await api.post<AuthResponse>('/admin/auth/pin', { pin });
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
      await api.post<LogoutResponse>('/admin/logout');
    } catch (error) {
      console.warn('Logout fehlgeschlagen', error);
    } finally {
      clearAuth();
    }
  }

  async function fetchStatus() {
    if (!isAuthenticated.value) {
      return;
    }
    try {
      const { data } = await api.get<MachineStatusResponse>('/admin/status');
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
      const { data } = await api.post<SlotTestResult>(`/admin/slots/${slot}/test`);
      await fetchStatus();
      return data;
    } finally {
      busyAction.value = null;
    }
  }

  async function triggerSync() {
    busyAction.value = 'sync';
    try {
      await api.post('/admin/sync');
      await fetchStatus();
    } finally {
      busyAction.value = null;
    }
  }

  async function triggerOtaUpdate() {
    busyAction.value = 'ota';
    try {
      await api.post('/admin/ota/start');
      await fetchStatus();
    } finally {
      busyAction.value = null;
    }
  }

  async function updateNetworkSettings(payload: NetworkSettingsPayload) {
    busyAction.value = 'network';
    try {
      await api.post('/admin/network', payload);
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
