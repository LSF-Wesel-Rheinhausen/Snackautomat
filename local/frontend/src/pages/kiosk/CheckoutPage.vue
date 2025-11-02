<template>
  <section class="checkout">
    <div class="checkout-main">
      <h2>Warenkorb</h2>
      <div v-if="!cartItems.length" class="empty">
        <i class="pi pi-shopping-cart" aria-hidden="true"></i>
        <p>Der Warenkorb ist leer.</p>
        <Button label="Zurück zur Auswahl" class="touch-button" @click="goToCatalog" />
      </div>
      <div v-else class="cart-list" role="list">
        <div v-for="item in cartItems" :key="item.id" class="cart-item" role="listitem">
          <div class="info">
            <h3>{{ productLabel(item) }}</h3>
            <p>
              <template v-if="item.slot">{{ item.slot }}</template>
              <template v-if="item.slot && item.category"> · </template>
              <template v-if="item.category">{{ item.category }}</template>
            </p>
          </div>
          <div class="price">{{ formatPrice(item.price) }}</div>
          <div class="quantity-control">
            <!-- Quantity selector clamps within available stock -->
            <InputNumber
              v-model="quantities[item.id]"
              :min="0"
              :max="item.stock"
              :step="1"
              showButtons
              buttonLayout="horizontal"
              decrementButtonClass="p-button-rounded p-button-text"
              incrementButtonClass="p-button-rounded p-button-text"
              incrementButtonIcon="pi pi-plus"
              decrementButtonIcon="pi pi-minus"
              aria-label="Anzahl für {{ productLabel(item) }}"
              @update:modelValue="(value) => updateQuantity(item.id, value)"
             />
          </div>
          <div class="line-total">{{ formatPrice(item.quantity * item.price) }}</div>
          <!-- Remove button lets user drop items quickly -->
          <Button icon="pi pi-times" rounded text severity="danger" @click="remove(item.id)" />
        </div>
      </div>
    </div>
    <aside class="checkout-summary" aria-label="Zusammenfassung">
      <!-- Summary card keeps admin-friendly numbers visible during checkout -->
      <h2>Zusammenfassung</h2>
      <ul>
        <!-- Totals update reactively as quantities change -->
        <li>
          <span>Zwischensumme</span>
          <span>{{ formatPrice(totalPrice) }}</span>
        </li>
        <li>
          <span>Verantwortlicher</span>
          <span>{{ sessionStore.user?.name ?? 'Unbekannt' }}</span>
        </li>
      </ul>
      <Message v-if="!cartItems.length" severity="info">Bitte fügen Sie Produkte hinzu.</Message>
      <Message v-else severity="info">Buchung wird automatisch über Vereinsflieger abgerechnet.</Message>
      <Button
        label="Kauf abschließen"
        icon="pi pi-check"
        class="touch-button"
        :disabled="cartItems.length === 0 || loading"
        :loading="loading"
        @click="checkout"
      />
      <Button
        label="Weitere Snacks auswählen"
        text
        class="touch-button"
        @click="goToCatalog"
      />
    </aside>
  </section>
</template>

<script setup lang="ts">
// Checkout stage handles final validation; backend remains source of truth for balances.
import { computed, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useSessionStore } from '@/stores/session';
import { useApi } from '@/composables/useApi';
import { API_ENDPOINTS } from '@/config/api';
import type { PurchaseReceipt, SnackItem } from '@/types/models';

const router = useRouter();
const toast = useToast();
const sessionStore = useSessionStore();
const { post, loading } = useApi();

const cartItems = computed(() => sessionStore.cart);
const totalPrice = computed(() => sessionStore.totalPrice);
const balance = computed(() => null);
const currency = computed(() => sessionStore.currency);
const quantities = reactive<Record<string, number>>({});
const productLabel = (item: SnackItem) => item.designation ?? item.name;

onMounted(() => {
  if (!cartItems.value.length) {
    // Redirect to catalog when checkout was reached without any cart data.
    router.replace({ name: 'kiosk-catalog' });
    return;
  }
  cartItems.value.forEach((item) => {
    // Mirror quantities in a local reactive map for the PrimeVue InputNumber binding.
    quantities[item.id] = item.quantity;
  });
});

function formatPrice(amount: number) {
  if (!Number.isFinite(amount)) {
    return '—';
  }
  // Use German locale formatting to match physical kiosk expectations.
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency.value
  }).format(amount);
}

function updateQuantity(itemId: string, quantity: number) {
  // Keep Pinia as single source of truth; `quantity ?? 0` protects against undefined events.
  sessionStore.updateQuantity(itemId, quantity ?? 0);
}

function remove(itemId: string) {
  // Drop the entry from both store and helper dictionary.
  sessionStore.removeItem(itemId);
  delete quantities[itemId];
}

async function checkout() {
  const user = sessionStore.user;
  if (!user) {
    toast.add({ severity: 'warn', summary: 'Anmeldung erforderlich', detail: 'Bitte erneut anmelden.', life: 2500 });
    router.push({ name: 'kiosk-landing' });
    return;
  }

  const memberId = user.memberId ?? user.id;
  if (!memberId) {
    toast.add({ severity: 'error', summary: 'Fehlende ID', detail: 'Die Mitgliedsnummer konnte nicht ermittelt werden.', life: 3000 });
    return;
  }

  try {
    for (const item of cartItems.value) {
      const row = item.slot || item.id;
      if (!row) {
        throw new Error('Produkt enthält keine Slot-ID.');
      }

      for (let count = 0; count < item.quantity; count += 1) {
        await post<{ message: string }>(API_ENDPOINTS.buy, {
          row,
          memberid: memberId
        });
      }
    }

    const receipt: PurchaseReceipt = {
      saleId: `local-${Date.now()}`,
      total: totalPrice.value,
      currency: currency.value,
      completedAt: new Date().toISOString(),
      items: cartItems.value.map((item) => ({
        id: item.id,
        name: productLabel(item),
        quantity: item.quantity,
        price: item.price
      }))
    };

    sessionStore.saveReceipt(receipt);
    sessionStore.clearCart();
    toast.add({ severity: 'success', summary: 'Vielen Dank!', detail: 'Snackausgabe gestartet', life: 2000 });
    router.replace({ name: 'kiosk-confirmation' });
  } catch (error) {
    console.error('Checkout error', error);
    toast.add({ severity: 'error', summary: 'Fehler', detail: 'Checkout nicht möglich', life: 3000 });
  }
}

function goToCatalog() {
  // Allow user to continue shopping without resetting the session.
  router.push({ name: 'kiosk-catalog' });
}
</script>

<style scoped>
.checkout {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: minmax(0, 2.5fr) minmax(300px, 1fr);
  align-items: start;
}

.checkout-main,
.checkout-summary {
  background: color-mix(in srgb, var(--surface-card) 94%, transparent);
  border-radius: 24px;
  padding: 1.6rem;
  box-shadow: 0 24px 48px -32px rgba(16, 24, 40, 0.5);
}

.cart-list {
  display: grid;
  gap: 0.9rem;
}

.cart-item {
  display: grid;
  grid-template-columns: minmax(140px, 2fr) 100px 160px 100px auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface-card) 96%, transparent);
}

.cart-item h3 {
  margin: 0 0 0.25rem;
}

.cart-item p {
  margin: 0;
  color: var(--text-color-secondary);
}

.price,
.line-total {
  font-size: 1.1rem;
  font-weight: 600;
}

.empty {
  text-align: center;
  display: grid;
  gap: 1rem;
  padding: 2rem;
  color: var(--text-color-secondary);
}

.empty .pi {
  font-size: 2.5rem;
}

.checkout-summary ul {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  display: grid;
  gap: 0.75rem;
}

.checkout-summary li {
  display: flex;
  justify-content: space-between;
}

@media (max-width: 1080px) {
  .checkout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .cart-item {
    grid-template-columns: repeat(2, 1fr);
    grid-template-areas:
      'info info'
      'price quantity'
      'line line'
      'remove remove';
  }
}

@media (max-height: 700px) {
  .checkout-main,
  .checkout-summary {
    padding: 1.4rem;
  }

  .cart-item {
    padding: 0.85rem;
  }
}
</style>
