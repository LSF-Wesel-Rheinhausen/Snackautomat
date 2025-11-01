/**
 * Catalog store caches snack metadata for kiosk usage.
 * Uses backend data when available, otherwise falls back to a mock set so
 * kiosk UI stays usable during maintenance or offline scenarios.
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { SnackItem } from '@/types/models';
import { useApi, ApiError } from '@/composables/useApi';

// Local mock data used when backend catalog is unreachable during maintenance.
const FALLBACK_ITEMS: SnackItem[] = [
  {
    id: 'snack-1',
    name: 'Bio Müsli-Riegel Kakao',
    slot: 'A1',
    stock: 6,
    category: 'Energy',
    price: 1.8,
    currency: 'EUR',
    image: undefined,
    allergens: ['Hafer', 'Nüsse'],
    isActive: true
  },
  {
    id: 'snack-2',
    name: 'Protein Shake Vanille',
    slot: 'B2',
    stock: 4,
    category: 'Drinks',
    price: 2.5,
    currency: 'EUR',
    image: undefined,
    isActive: true
  },
  {
    id: 'snack-3',
    name: 'Veggie Wrap',
    slot: 'C1',
    stock: 3,
    category: 'Fresh',
    price: 3.0,
    currency: 'EUR',
    image: undefined,
    isActive: true
  }
];

export const useItemsStore = defineStore('items', () => {
  const api = useApi();
  const items = ref<SnackItem[]>([]);
  const lastUpdated = ref<string | null>(null);

  // Tells the UI when the catalog already has data in memory.
  const isLoaded = computed(() => items.value.length > 0);
  const categories = computed(() => {
    // Build a count map so the kiosk can show the number of products per category tab.
    const unique = new Map<string, number>();
    items.value.forEach((item) => {
      unique.set(item.category, (unique.get(item.category) ?? 0) + 1);
    });
    return Array.from(unique.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

const featuredItems = computed(() => items.value.slice(0, 4));

function setItems(payload: SnackItem[]) {
  items.value = payload.filter((item) => item.isActive);
  lastUpdated.value = new Date().toISOString();
}

async function fetchItems(force = false) {
  if (isLoaded.value && !force) {
    // Avoid re-fetching when data already exists unless explicitly forced.
    return;
  }
  try {
    const { data } = await api.get<SnackItem[]>('/catalog/items');
    setItems(data);
  } catch (error) {
    if (error instanceof ApiError) {
      console.warn('Katalog konnte nicht geladen werden, verwende Fallback', error);
    }
    // Ensure UI keeps functioning by falling back to predefined inventory.
    setItems(FALLBACK_ITEMS);
  }
}

function updateStock(slot: string, stock: number) {
  const item = items.value.find((entry) => entry.slot === slot);
  if (item) {
    // Kiosk keeps track of live stock levels for better UX.
    item.stock = stock;
  }
}

function findById(id: string) {
  // Utility used by checkout when we only have an item identifier.
  return items.value.find((item) => item.id === id);
}

  return {
    ...api,
    items,
    lastUpdated,
    isLoaded,
    categories,
    featuredItems,
    fetchItems,
    updateStock,
    findById
  };
});
