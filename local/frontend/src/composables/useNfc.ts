/**
 * Handles NFC login via Chromium Web NFC.
 * Requests tag reads directly from the browser and resolves user identities
 * through the backend `/get_user_info` endpoint.
 */
import { computed, onBeforeUnmount, ref } from 'vue';
import { useSessionStore } from '@/stores/session';
import { ApiError, useApi } from './useApi';
import type { NfcUser } from '@/types/models';

const USER_INFO_ENDPOINT = '/get_user_info';

const NFC_SUPPORTED =
  typeof window !== 'undefined' && typeof (window as { NDEFReader?: unknown }).NDEFReader !== 'undefined';

export function useNfc() {
  const sessionStore = useSessionStore();
  const { post, error, loading } = useApi();

  const reader = ref<any | null>(null);
  const abortController = ref<AbortController | null>(null);

  const isListening = ref(false);
  const lastTokenId = ref<string | null>(null);
  const message = ref(
    NFC_SUPPORTED
      ? 'Bitte halten Sie Ihren Ausweis vor den Leser.'
      : 'Web NFC wird von diesem Gerät oder Browser nicht unterstützt.'
  );

  let readingHandler: ((event: Event) => void) | null = null;
  let readingErrorHandler: ((event: Event) => void) | null = null;

  async function fetchUser(tokenId: string): Promise<boolean> {
    try {
      const { data } = await post<NfcUser>(USER_INFO_ENDPOINT, { tokenId });
      sessionStore.startSession(data);
      sessionStore.setAwaitingNfc(false);
      lastTokenId.value = tokenId;
      message.value = `Willkommen ${data.name}!`;
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.payload && typeof err.payload === 'object' && 'message' in err.payload) {
          message.value = String((err.payload as { message: string }).message);
        } else {
          message.value = 'Karte konnte nicht verifiziert werden.';
        }
      } else {
        message.value = 'Unerwarteter Fehler beim Abrufen der Benutzerdaten.';
      }
      return false;
    }
  }

  function decodeTextRecord(record: any): string | null {
    if (!record || record.recordType !== 'text' || !record.data) {
      return null;
    }
    const decoder = new TextDecoder(record.encoding ?? 'utf-8');
    const bytes = new Uint8Array(record.data.buffer, record.data.byteOffset, record.data.byteLength);
    return decoder.decode(bytes);
  }

  function registerEventListeners(currentReader: any) {
    readingHandler = async (event: Event) => {
      const readingEvent = event as {
        serialNumber?: string;
        message?: { records: Array<any> };
      };
      let tokenId = readingEvent.serialNumber ?? null;
      if (!tokenId && readingEvent.message?.records?.length) {
        const textRecord = readingEvent.message.records.find(
          (record: any) => record.recordType === 'text'
        );
        tokenId = decodeTextRecord(textRecord);
        if (!tokenId) {
          const firstRecord = readingEvent.message.records[0];
          if (firstRecord?.data) {
            const bytes = new Uint8Array(
              firstRecord.data.buffer,
              firstRecord.data.byteOffset,
              firstRecord.data.byteLength
            );
            tokenId = Array.from(bytes)
              .map((byte) => byte.toString(16).padStart(2, '0'))
              .join('');
          }
        }
      }

      if (!tokenId) {
        message.value = 'Karte konnte nicht gelesen werden. Bitte erneut auflegen.';
        return;
      }

      await fetchUser(tokenId);
    };

    readingErrorHandler = () => {
      message.value = 'Karte konnte nicht gelesen werden. Bitte erneut versuchen.';
    };

    currentReader.addEventListener('reading', readingHandler as EventListener);
    currentReader.addEventListener('readingerror', readingErrorHandler as EventListener);
  }

  function unregisterEventListeners() {
    if (!reader.value) return;
    if (readingHandler) {
      reader.value.removeEventListener('reading', readingHandler as EventListener);
    }
    if (readingErrorHandler) {
      reader.value.removeEventListener('readingerror', readingErrorHandler as EventListener);
    }
    readingHandler = null;
    readingErrorHandler = null;
  }

  async function start() {
    if (!NFC_SUPPORTED) {
      return;
    }

    if (isListening.value) {
      return;
    }

    sessionStore.setAwaitingNfc(true);

    try {
      const ReaderClass = (window as any).NDEFReader;
      const nfcReader = new ReaderClass();
      const controller = new AbortController();

      await nfcReader.scan({ signal: controller.signal });

      reader.value = nfcReader;
      abortController.value = controller;
      isListening.value = true;
      message.value = 'Bereit. Bitte NFC-Karte auflegen.';

      registerEventListeners(nfcReader);
    } catch (err) {
      sessionStore.setAwaitingNfc(false);
      const domError = err as DOMException;
      if (domError?.name === 'NotAllowedError') {
        message.value = 'Zugriff auf NFC verweigert. Bitte Berechtigung erteilen.';
      } else if (domError?.name === 'NotSupportedError') {
        message.value = 'Dieses Gerät unterstützt Web NFC nicht.';
      } else {
        message.value = 'NFC konnte nicht initialisiert werden.';
      }
    }
  }

  function stop() {
    sessionStore.setAwaitingNfc(false);
    if (abortController.value) {
      abortController.value.abort();
      abortController.value = null;
    }
    unregisterEventListeners();
    reader.value = null;
    isListening.value = false;
    if (NFC_SUPPORTED) {
      message.value = 'Bitte halten Sie Ihren Ausweis vor den Leser.';
    }
  }

  async function simulateScan(tokenId: string) {
    if (!tokenId) return;
    sessionStore.setAwaitingNfc(true);
    const success = await fetchUser(tokenId);
    if (!success && import.meta.env.DEV) {
      sessionStore.startSession({
        id: tokenId,
        name: 'Demo Nutzer',
        balance: 25,
        isAdmin: true
      });
      sessionStore.setAwaitingNfc(false);
      message.value = 'Demo Simulation aktiv – Nutzer angemeldet.';
    }
  }

  onBeforeUnmount(() => {
    stop();
  });

  return {
    isSupported: NFC_SUPPORTED,
    isListening: computed(() => isListening.value),
    lastTokenId: computed(() => lastTokenId.value),
    loading,
    error,
    message: computed(() => message.value),
    start,
    stop,
    simulateScan
  };
}
