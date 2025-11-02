<template>
  <Card :class="['snack-card', { disabled }]">
    <template #title>
      <div class="title-row">
        <div class="titles">
          <span class="designation">{{ primaryLabel }}</span>
          <span v-if="secondaryLabel" class="name">{{ secondaryLabel }}</span>
        </div>
        <Tag v-if="showStock && stockLabel !== null" :value="stockLabel" :severity="stockSeverity" rounded />
      </div>
    </template>
    <template #subtitle>
      <span class="category">
        <template v-if="item.slot">{{ item.slot }}</template>
        <template v-if="item.slot && item.category"> · </template>
        <template v-if="item.category">{{ item.category }}</template>
      </span>
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
      <Button label="Hinzufügen" icon="pi pi-plus" class="touch-button" :disabled="disabled || isOutOfStock"
        @click="emit('add', item)" />
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

const designationLabel = computed(() => {
  const raw = props.item.designation?.trim();
  return raw && raw.length > 0 ? raw : null;
});

const nameLabel = computed(() => {
  const raw = typeof props.item.name === 'string' ? props.item.name.trim() : '';
  return raw.length > 0 ? raw : null;
});

const primaryLabel = computed(() => {
  const label = designationLabel.value ?? nameLabel.value ?? props.item.id?.toString() ?? '';
  return label;
});
const secondaryLabel = computed(() => {
  if (!designationLabel.value || !nameLabel.value) {
    return null;
  }
  return designationLabel.value !== nameLabel.value ? nameLabel.value : null;
});

// True if stock metadata marks the item as depleted.
const isOutOfStock = computed(() => props.item.stock <= 0);
// Friendly stock label for staff to quickly glance at.
const stockLabel = computed(() => {
  const stock = props.item.stock;
  if (stock === undefined || stock === null) {
    return null;
  }
  return String(stock);
});
const stockSeverity = computed(() => {
  if (props.item.stock <= 0) return 'danger';
  if (props.item.stock < 3) return 'warning';
  return 'success';
});
// Price label uses currency provided by backend.
const priceLabel = computed(() => {
  const price = Number.isFinite(props.item.price) ? props.item.price : 0;
  const formatted = price.toFixed(2);
  const currency = typeof props.item.currency === 'string' ? props.item.currency.trim() : '';
  return currency ? `${formatted} ${currency}` : formatted;
});
</script>

<style scoped>
.snack-card {
  border-radius: 24px;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  background: color-mix(in srgb, var(--surface-card) 94%, transparent);
  border: 1px solid var(--surface-border);
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

.titles {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.designation {
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-color);
}

.name {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.category {
  color: var(--text-color-secondary);
}

.price {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--text-color);
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
