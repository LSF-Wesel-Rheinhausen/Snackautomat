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
      if (item.category && item.category.trim().length > 0) {
        unique.set(item.category, (unique.get(item.category) ?? 0) + 1);
      }
    });
    return Array.from(unique.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  const featuredItems = computed(() => items.value.slice(0, 4));

  function normalizeProduct(raw: any, fallbackId?: string): SnackItem | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const priceEntry = Array.isArray(raw.prices)
      ? raw.prices.find((entry: unknown) => entry && typeof entry === 'object')
      : undefined;

    const id = String(
      raw.id ??
        raw.itemid ??
        raw.itemId ??
        raw.productId ??
        raw.row ??
        raw.slot ??
        raw.articleid ??
        raw.articleId ??
        fallbackId ??
        ''
    ).trim();

    if (!id) {
      return null;
    }

    const slotCandidate = raw.row ?? raw.slot ?? raw.articleid ?? raw.articleId ?? fallbackId ?? id;
    const slot = typeof slotCandidate === 'string' ? slotCandidate.trim() : String(slotCandidate ?? '').trim();

    const designation =
      typeof raw.designation === 'string' && raw.designation.trim()
        ? raw.designation.trim()
        : undefined;
    const nameSource =
      raw.name ??
      raw.title ??
      raw.product_name ??
      raw.productName ??
      raw.label ??
      raw.articleName;
    const fallbackName =
      typeof nameSource === 'string' && nameSource.trim() ? nameSource.trim() : undefined;
    const name = designation ?? fallbackName ?? '';

    const toNumber = (value: unknown) => {
      if (typeof value === 'string') {
        const sanitized = value.replace(/\s/g, '').replace(',', '.');
        const normalized = Number(sanitized);
        return Number.isFinite(normalized) ? normalized : 0;
      }
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    };

    const priceCandidates = [
      raw.price,
      raw.cost,
      raw.unitPrice,
      raw.value,
      raw.unitprice,
      priceEntry && (priceEntry.unitPrice ?? priceEntry.unitprice ?? priceEntry.price ?? priceEntry.value)
    ].filter((entry) => entry !== undefined && entry !== null);

    const stockCandidates = [
      raw.stock,
      raw.quantity,
      raw.amount,
      raw.available,
      raw.stockarticle,
      raw.stockArticle
    ].filter((entry) => entry !== undefined && entry !== null);

    const rawPrice = toNumber(priceCandidates.length ? priceCandidates[0] : 0);
    const rawStock = toNumber(stockCandidates.length ? stockCandidates[0] : 0);
    const price = rawPrice >= 0 ? rawPrice : 0;
    const stock = rawStock >= 0 ? rawStock : 0;

    const currencySource =
      raw.currency ??
      raw.currencyCode ??
      raw.currencycode ??
      (priceEntry && (priceEntry.currency ?? priceEntry.currencyCode));

    const currency =
      typeof currencySource === 'string' && currencySource.trim()
        ? currencySource.trim()
        : '';

    const categorySource =
      raw.category ?? raw.type ?? raw.group ?? raw.articleCategory;
    const category =
      typeof categorySource === 'string' && categorySource.trim()
        ? categorySource.trim()
        : '';

    const allergens = Array.isArray(raw.allergens)
      ? raw.allergens.filter((entry: unknown) => typeof entry === 'string')
      : undefined;
    const validitySource = raw.validto ?? raw.validTo;
    let isWithinValidity = true;
    if (validitySource) {
      const end = new Date(validitySource);
      if (Number.isFinite(end.getTime())) {
        isWithinValidity = end >= new Date();
      }
    }
    const activeFlag = raw.isActive ?? raw.active;
    const isActive = (activeFlag ?? true) !== false && isWithinValidity;

    return {
      id,
      slot,
      name,
      designation,
      price,
      currency,
      stock,
      category,
      allergens,
      isActive
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
        const records: Array<{ raw: unknown; sourceKey?: string }> = [];
        const seenArrays = new Set<unknown>();
        const appendRecord = (raw: unknown, sourceKey?: string) => {
          if (raw && typeof raw === 'object') {
            records.push({ raw, sourceKey });
          }
        };

        const maybeArrayProps = ['results', 'items', 'products'];
        maybeArrayProps.forEach((key) => {
          const value = (data as Record<string, unknown>)[key];
          if (Array.isArray(value) && !seenArrays.has(value)) {
            value.forEach((item) => appendRecord(item));
            seenArrays.add(value);
          }
        });

        if (!records.length) {
          Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
            if (Array.isArray(value) && !seenArrays.has(value)) {
              value.forEach((item) => appendRecord(item));
              seenArrays.add(value);
            } else {
              appendRecord(value, key);
            }
          });
        }

        normalized = records
          .map(({ raw, sourceKey }, index) => {
            const normalizedEntry = normalizeProduct(raw, sourceKey);
            if (!normalizedEntry) {
              logger.warn(`[ItemsStore] Invalid product record ${index}`, raw);
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
