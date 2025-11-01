<template>
  <div id="app-shell">
    <Toast position="bottom-center" />
    <router-view v-slot="{ Component, route }">
      <Transition :name="String(route.meta.transition ?? 'fade')" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
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
