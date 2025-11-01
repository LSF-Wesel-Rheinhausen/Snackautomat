<template>
  <section class="landing">
    <div class="hero">
      <h1>Snackzeit!</h1>
      <p>
        Halten Sie Ihre Vereinskarte an den NFC-Leser, wählen Sie Ihre Lieblingssnacks und genießen
        Sie Ihre Pause. Alles in wenigen Sekunden.
      </p>
      <div class="hero-actions">
        <!-- Primary CTA routes to scan workflow -->
        <Button label="Jetzt scannen" icon="pi pi-id-card" size="large" class="touch-button" @click="goToScan" />
        <!-- Secondary CTA shows catalog without logging in -->
        <Button label="Produkte ansehen" icon="pi pi-list" severity="secondary" outlined class="touch-button"
          @click="goToCatalog" />
      </div>
    </div>
    <div class="featured" v-if="featuredItems.length">
      <h2>Beliebte Snacks</h2>
      <div class="featured-grid">
        <SnackCard v-for="item in featuredItems" :key="item.id" :item="item" :disabled="true" show-stock />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Entry screen: only fetches catalog preview, defers logic to subsequent routes.
import Button from 'primevue/button';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import SnackCard from '@/components/SnackCard.vue';
import { useItemsStore } from '@/stores/items';

const router = useRouter();
const itemsStore = useItemsStore();

onMounted(() => {
  // Preload catalog so subsequent navigation feels instant on Raspberry Pi hardware.
  itemsStore.fetchItems();
});

const featuredItems = computed(() => itemsStore.featuredItems);

function goToScan() {
  // Navigate into the NFC scanning route for authentication.
  router.push({ name: 'kiosk-scan' });
}

function goToCatalog() {
  // Let curious visitors browse catalog without logging in.
  router.push({ name: 'kiosk-catalog' });
}
</script>

<style scoped>
.landing {
  display: grid;
  gap: 2rem;
  padding: 1rem 0;
}

.hero {
  background: linear-gradient(135deg, rgba(12, 126, 255, 0.18), rgba(76, 201, 240, 0.18));
  border-radius: 28px;
  padding: 2rem;
  color: #0b101b;
  box-shadow: 0 24px 48px -32px rgba(12, 126, 255, 0.4);
}

.hero h1 {
  margin: 0 0 1rem;
  font-size: 3rem;
  line-height: 1.1;
}

.hero p {
  max-width: 32rem;
  font-size: 1.2rem;
  margin: 0 0 1.5rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.featured {
  background: color-mix(in srgb, var(--surface-card) 95%, transparent);
  border-radius: 28px;
  padding: 1.75rem;
  box-shadow: 0 20px 40px -36px rgba(16, 24, 40, 0.5);
}

.featured h2 {
  margin: 0 0 1rem;
  font-size: 1.5rem;
}

.featured-grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

@media (max-width: 960px) {
  .hero {
    padding: 1.5rem;
  }

  .hero h1 {
    font-size: 2.25rem;
  }
}
</style>
