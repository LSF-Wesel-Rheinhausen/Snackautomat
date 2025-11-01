import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { SnackItem } from '@/types/models';
import { useApi, ApiError } from '@/composables/useApi';

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

  const isLoaded = computed(() => items.value.length > 0);
  const categories = computed(() => {
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
      return;
    }
    try {
      const { data } = await api.get<SnackItem[]>('/catalog/items');
      setItems(data);
    } catch (error) {
      if (error instanceof ApiError) {
        console.warn('Katalog konnte nicht geladen werden, verwende Fallback', error);
      }
      setItems(FALLBACK_ITEMS);
    }
  }

  function updateStock(slot: string, stock: number) {
    const item = items.value.find((entry) => entry.slot === slot);
    if (item) {
      item.stock = stock;
    }
  }

  function findById(id: string) {
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
