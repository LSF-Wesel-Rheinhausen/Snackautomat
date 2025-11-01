<template>
  <Card :class="['snack-card', { disabled }]">
    <template #title>
      <div class="title-row">
        <span class="name">{{ item.name }}</span>
        <Tag
          v-if="showStock"
          :value="stockLabel"
          :severity="stockSeverity"
          rounded
        />
      </div>
    </template>
    <template #subtitle>
      <span class="category">Slot {{ item.slot }} · {{ item.category }}</span>
    </template>
    <template #content>
      <div class="price">
        {{ priceLabel }}
      </div>
      <!-- Show allergy list so users can check at a glance. -->
      <ul v-if="item.allergens?.length" class="allergens">
        <li v-for="allergen in item.allergens" :key="allergen">
          {{ allergen }}
        </li>
      </ul>
    </template>
    <template #footer>
      <Button
        label="Hinzufügen"
        icon="pi pi-plus"
        class="touch-button"
        :disabled="disabled || isOutOfStock"
        @click="emit('add', item)"
      />
    </template>
  </Card>
</template>

<script setup lang="ts">
// Kiosk product tile. Keep logic here presentation-only; inventory lives in Pinia stores.
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import { computed } from 'vue';
import type { SnackItem } from '@/types/models';

const props = defineProps({
  item: { type: Object as () => SnackItem, required: true },
  disabled: { type: Boolean, default: false },
  showStock: { type: Boolean, default: false }
});

const emit = defineEmits<{
  (e: 'add', item: SnackItem): void;
}>();

// True if stock metadata marks the item as depleted.
const isOutOfStock = computed(() => props.item.stock <= 0);
// Friendly stock label for staff to quickly glance at.
const stockLabel = computed(() => (props.item.stock <= 0 ? 'Leer' : `${props.item.stock}x`));
const stockSeverity = computed(() => {
  if (props.item.stock <= 0) return 'danger';
  if (props.item.stock < 3) return 'warning';
  return 'success';
});
// Price label uses currency provided by backend.
const priceLabel = computed(() => props.item.price.toFixed(2) + ' ' + props.item.currency);
</script>

<style scoped>
.snack-card {
  border-radius: 24px;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  background: color-mix(in srgb, var(--surface-card) 94%, transparent);
}

.snack-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 48px -36px rgba(16, 24, 40, 0.5);
}

.snack-card.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.title-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
}

.name {
  font-size: 1.2rem;
  font-weight: 600;
}

.category {
  color: var(--text-color-secondary);
}

.price {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.allergens {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0;
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

.allergens li {
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
  padding: 0.3rem 0.6rem;
  border-radius: 12px;
}
</style>
