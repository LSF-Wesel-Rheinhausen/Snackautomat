/**
 * Handles the kiosk user session lifecycle and cart state.
 * Note: state is intentionally in-memory to avoid persisting sensitive data.
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { CartItem, NfcUser, PurchaseReceipt, SnackItem } from '@/types/models';

function createCartItem(item: SnackItem, quantity = 1): CartItem {
  return {
    ...item,
    quantity
  };
}

export const useSessionStore = defineStore('session', () => {
  const user = ref<NfcUser | null>(null);
  const cart = ref<CartItem[]>([]);
  const awaitingNfcScan = ref(false);
  const lastReceipt = ref<PurchaseReceipt | null>(null);
  const kioskMessage = ref<string | null>(null);

  // Indicates whether the kiosk currently has an identified user.
  const isAuthenticated = computed(() => Boolean(user.value));
  // Total count of items placed into the cart; used for badges and capacity checks.
  const totalItems = computed(() =>
    cart.value.reduce((sum, item) => sum + item.quantity, 0)
  );
  // Aggregated price based on quantity * unit price so checkout view stays reactive.
  const totalPrice = computed(() =>
    cart.value.reduce((sum, item) => sum + item.quantity * item.price, 0)
  );
  const currency = computed(() => cart.value[0]?.currency ?? 'EUR');

  function startSession(nfcUser: NfcUser) {
    // Store the authenticated user details supplied by the backend.
    const displayName = nfcUser.name?.trim() || 'Mitglied';
    const greetingName = nfcUser.firstName?.trim() || displayName;
    user.value = {
      ...nfcUser,
      name: displayName
    };
    cart.value = [];
    awaitingNfcScan.value = false;
    kioskMessage.value = `Willkommen ${greetingName}!`;
  }

  function endSession() {
    // Reset everything once the user leaves to avoid leaking previous state.
    user.value = null;
    cart.value = [];
    lastReceipt.value = null;
    kioskMessage.value = null;
  }

  function setKioskMessage(message: string | null) {
    // Allow pages to surface contextual instructions or status updates.
    kioskMessage.value = message;
  }

  function setAwaitingNfc(active: boolean) {
    awaitingNfcScan.value = active;
  }

  function addToCart(item: SnackItem, quantity = 1) {
    if (quantity <= 0) return;
    // Prevent overselling by clamping to the slot stock reported by backend.
    const exists = cart.value.find((entry) => entry.id === item.id);
    if (exists) {
      exists.quantity = Math.min(exists.quantity + quantity, item.stock);
    } else {
      cart.value.push(createCartItem(item, quantity));
    }
  }

  function updateQuantity(itemId: string, quantity: number) {
    const entry = cart.value.find((item) => item.id === itemId);
    if (!entry) return;
    entry.quantity = Math.min(entry.stock, Math.max(0, quantity));
    if (entry.quantity === 0) {
      // Drop zero-quantity items entirely so the cart list stays tidy.
      cart.value = cart.value.filter((item) => item.id !== itemId);
    }
  }

  function removeItem(itemId: string) {
    // Hard-remove an item regardless of quantity (used by delete button).
    cart.value = cart.value.filter((item) => item.id !== itemId);
  }

  function clearCart() {
    // Utility for checkout completion and session teardown.
    cart.value = [];
  }

  function saveReceipt(receipt: PurchaseReceipt) {
    lastReceipt.value = receipt;
  }

  function resetCheckoutState() {
    // Keep receipt history minimal to avoid mixing old confirmations.
    lastReceipt.value = null;
  }

  return {
    user,
    cart,
    awaitingNfcScan,
    kioskMessage,
    lastReceipt,
    isAuthenticated,
    totalItems,
    totalPrice,
    currency,
    startSession,
    endSession,
    setKioskMessage,
    setAwaitingNfc,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    saveReceipt,
    resetCheckoutState
  };
});
