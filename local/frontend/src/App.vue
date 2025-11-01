<template>
  <div id="app-shell">
    <!-- Top-level shell wraps around routed layouts/pages -->
        <Toast position="bottom-center" /> <!-- Global toast instance -->
    <router-view v-slot="{ Component, route }"> <!-- Render active route component -->
      <Transition :name="String(route.meta.transition ?? 'fade')" mode="out-in"> <!-- Use route meta to select animation -->
        <component :is="Component" />
      </Transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
// App.vue only initializes shared UI primitives like Toast.
import Toast from 'primevue/toast';
</script>

<style scoped>
#app-shell {
  min-height: 100vh;
  background: var(--surface-ground);
  color: var(--text-color);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
