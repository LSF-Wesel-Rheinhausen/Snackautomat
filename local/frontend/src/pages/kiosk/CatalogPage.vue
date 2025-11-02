<template>
  <section class="catalog">
    <header class="catalog-header">
      <div>
        <h2>Produktübersicht</h2>
        <p>Wählen Sie Ihre Snacks. Alle Preise in {{ currency }}.</p>
      </div>
     <div class="toolbar">
        <SelectButton
          v-model="selectedCategory"
          :options="categoryOptions"
          optionLabel="label"
          optionValue="value"
          dataKey="label"
          :allowEmpty="true"
          aria-label="Kategorieauswahl"
        />
        <Button
          label="Zum Warenkorb"
          icon="pi pi-shopping-cart"
          class="touch-button"
          :badge="totalItems > 0 ? String(totalItems) : undefined"
          @click="goToCheckout"
        />
      </div>
    </header>

    <div class="catalog-grid" role="list">
      <SnackCard
        v-for="item in filteredItems"
        :key="item.id"
        :item="item"
        show-stock
        role="listitem"
        @add="addToCart"
      />
    </div>

    <Message
      v-if="!filteredItems.length"
      severity="info"
      icon="pi pi-info-circle"
      class="empty-message"
    >
      Aktuell sind keine Produkte in dieser Kategorie verfügbar.
    </Message>
  </section>
</template>

<script setup lang="ts">
// Product selection view – all inventory mutations delegate to Pinia stores.
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { storeToRefs } from 'pinia';
import SnackCard from '@/components/SnackCard.vue';
import { useItemsStore } from '@/stores/items';
import { useSessionStore } from '@/stores/session';
import type { SnackItem } from '@/types/models';

const router = useRouter();
const toast = useToast();
const itemsStore = useItemsStore();
const sessionStore = useSessionStore();
const { items } = storeToRefs(itemsStore);

const selectedCategory = ref<string | null>(null);

onMounted(() => {
  // Ensure catalog data is available even if the visitor skipped the scan step.
  itemsStore.fetchItems();
});

const currency = computed(() => sessionStore.currency);
const totalItems = computed(() => sessionStore.totalItems);
const categoryOptions = computed(() => [
  { label: 'Alle', value: null },
  ...itemsStore.categories.map((c) => ({
    label: `${c.name} (${c.count})`,
    value: c.name
  }))
]);

const filteredItems = computed(() => {
  if (!selectedCategory.value) {
    // No filter chosen -> return the entire catalog list.
    return items.value;
  }
  // Only show snacks that match the active category filter.
  return items.value.filter((item) => item.category === selectedCategory.value);
});

function addToCart(item: SnackItem) {
  // Delegate the state change to Pinia so other views stay in sync.
  sessionStore.addToCart(item);
  toast.add({
    severity: 'success',
    summary: item.name,
    detail: 'Zum Warenkorb hinzugefügt',
    life: 2000
  });
}

function goToCheckout() {
  // Navigate client to the checkout summary view.
  router.push({ name: 'kiosk-checkout' });
}
</script>

<style scoped>
.catalog {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.catalog-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.catalog-grid {
  display: grid;
  gap: 1.1rem;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.empty-message {
  justify-self: center;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

@media (max-height: 700px) {
  .catalog {
    gap: 1rem;
  }

  .catalog-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.9rem;
  }
}
</style>
