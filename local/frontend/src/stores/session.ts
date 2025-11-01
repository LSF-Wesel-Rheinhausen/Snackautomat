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

  const isAuthenticated = computed(() => Boolean(user.value));
  const totalItems = computed(() =>
    cart.value.reduce((sum, item) => sum + item.quantity, 0)
  );
  const totalPrice = computed(() =>
    cart.value.reduce((sum, item) => sum + item.quantity * item.price, 0)
  );
  const currency = computed(() => cart.value[0]?.currency ?? 'EUR');

  function startSession(nfcUser: NfcUser) {
    user.value = nfcUser;
    cart.value = [];
    awaitingNfcScan.value = false;
    kioskMessage.value = `Willkommen ${nfcUser.name}!`;
  }

  function endSession() {
    user.value = null;
    cart.value = [];
    lastReceipt.value = null;
    kioskMessage.value = null;
  }

  function setKioskMessage(message: string | null) {
    kioskMessage.value = message;
  }

  function setAwaitingNfc(active: boolean) {
    awaitingNfcScan.value = active;
  }

  function addToCart(item: SnackItem, quantity = 1) {
    if (quantity <= 0) return;
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
      cart.value = cart.value.filter((item) => item.id !== itemId);
    }
  }

  function removeItem(itemId: string) {
    cart.value = cart.value.filter((item) => item.id !== itemId);
  }

  function clearCart() {
    cart.value = [];
  }

  function saveReceipt(receipt: PurchaseReceipt) {
    lastReceipt.value = receipt;
  }

  function resetCheckoutState() {
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
