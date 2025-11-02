/**
 * Catalog store caches snack metadata for kiosk usage.
 * Uses backend data when available, otherwise falls back to a mock set so
 * kiosk UI stays usable during maintenance or offline scenarios.
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { SnackItem } from '@/types/models';
import { useApi, ApiError } from '@/composables/useApi';
import { API_ENDPOINTS } from '@/config/api';

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
  const logger = console;
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

  function normalizeProduct(raw: any): SnackItem | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const id = String(
      raw.id ?? raw.itemid ?? raw.itemId ?? raw.productId ?? raw.row ?? raw.slot ?? ''
    ).trim();

    if (!id) {
      return null;
    }

    const slot = String(raw.row ?? raw.slot ?? id).trim();
    const nameSource =
      raw.name ?? raw.title ?? raw.product_name ?? raw.productName ?? raw.label ?? 'Produkt';
    const name = typeof nameSource === 'string' && nameSource.trim() ? nameSource.trim() : 'Produkt';

    const priceValue = Number(raw.price ?? raw.cost ?? raw.unitPrice ?? raw.value ?? 0);
    const stockValue = Number(raw.stock ?? raw.quantity ?? raw.amount ?? raw.available ?? 0);
    const currency = String(raw.currency ?? raw.currencyCode ?? 'EUR');
    const categorySource = raw.category ?? raw.type ?? raw.group ?? 'Allgemein';
    const category = typeof categorySource === 'string' && categorySource.trim()
      ? categorySource.trim()
      : 'Allgemein';

    const allergens = Array.isArray(raw.allergens)
      ? raw.allergens.filter((entry: unknown) => typeof entry === 'string')
      : undefined;

    return {
      id,
      slot,
      name,
      price: Number.isFinite(priceValue) && priceValue >= 0 ? priceValue : 0,
      currency,
      stock: Number.isFinite(stockValue) && stockValue >= 0 ? stockValue : 0,
      category,
      allergens,
      isActive: raw.isActive !== false && raw.active !== false
    };
  }

  function setItems(payload: SnackItem[]) {
    items.value = payload.filter((item) => item.isActive !== false);
    lastUpdated.value = new Date().toISOString();
  }

  async function fetchItems(force = false) {
    if (isLoaded.value && !force) {
      // Avoid re-fetching when data already exists unless explicitly forced.
      return;
    }
    try {
      logger.groupCollapsed("[ItemsStore] fetchItems");
      logger.log("force", force);
      const { data } = await api.get<unknown>(API_ENDPOINTS.productList);
      logger.log("payload", data);

      let normalized: SnackItem[] = [];
      if (Array.isArray(data)) {
        normalized = data
          .map((entry, index) => {
            const normalizedEntry = normalizeProduct(entry);
            if (!normalizedEntry) {
              logger.warn(`[ItemsStore] Invalid product entry at index ${index}`, entry);
            }
            return normalizedEntry;
          })
          .filter((entry): entry is SnackItem => Boolean(entry));
      } else if (data && typeof data === 'object') {
        const records: unknown[] = [];
        const seenArrays = new Set<unknown>();

        const maybeArrayProps = ['results', 'items', 'products'];
        maybeArrayProps.forEach((key) => {
          const value = (data as Record<string, unknown>)[key];
          if (Array.isArray(value) && !seenArrays.has(value)) {
            records.push(...value);
            seenArrays.add(value);
          }
        });

        if (!records.length) {
          Object.values(data as Record<string, unknown>).forEach((value) => {
            if (Array.isArray(value) && !seenArrays.has(value)) {
              records.push(...value);
              seenArrays.add(value);
            } else {
              records.push(value);
            }
          });
        }

        normalized = records
          .map((entry, index) => {
            const normalizedEntry = normalizeProduct(entry);
            if (!normalizedEntry) {
              logger.warn(`[ItemsStore] Invalid product record ${index}`, entry);
            }
            return normalizedEntry;
          })
          .filter((entry): entry is SnackItem => Boolean(entry));
      }

      if (!normalized.length) {
        items.value = [];
        lastUpdated.value = new Date().toISOString();
        logger.warn('[ItemsStore] No products returned from API.');
        logger.groupEnd();
        return;
      }

      setItems(normalized);
    } catch (error) {
      items.value = [];
      lastUpdated.value = new Date().toISOString();
      logger.error('[ItemsStore] Failed to fetch products', error);
    } finally {
      logger.groupEnd();
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
