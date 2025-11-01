<template>
  <div class="pinpad" role="group" :aria-label="ariaLabel">
    <div class="display" aria-live="polite">
      <span v-for="i in length" :key="i" class="dot" :class="{ filled: i <= pin.length }" />
    </div>
    <div class="grid">
      <Button
        v-for="digit in digits"
        :key="digit"
        :label="digit"
        class="touch-button"
        @click="append(digit)"
      />
      <Button label="←" severity="secondary" class="touch-button" @click="erase" />
      <Button label="0" class="touch-button" @click="append('0')" />
      <Button label="OK" severity="success" class="touch-button" @click="submit" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Simple reusable PIN pad – emit events only, no security logic here.
import { computed } from 'vue';
import Button from 'primevue/button';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    length?: number;
    ariaLabel?: string;
  }>(),
  {
    length: 4,
    ariaLabel: 'PIN Eingabe'
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'submit', value: string): void;
}>();

const digits = computed(() => ['1', '2', '3', '4', '5', '6', '7', '8', '9']);

const pin = computed(() => props.modelValue ?? '');

function append(value: string) {
  // Respect the configured PIN length so admins can change requirement later.
  if (pin.value.length >= props.length) return;
  emit('update:modelValue', `${pin.value}${value}`);
}

function erase() {
  // Remove the last entered digit; UI shows this instantly via display dots.
  emit('update:modelValue', pin.value.slice(0, -1));
}

function submit() {
  // Only emit submit when enough digits are provided; avoids half PIN calls.
  if (pin.value.length === props.length) {
    emit('submit', pin.value);
  }
}
</script>

<style scoped>
.pinpad {
  display: grid;
  gap: 1.5rem;
  max-width: 320px;
}

.display {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--primary-color) 40%, var(--surface-500));
  transition: background 0.2s ease;
}

.dot.filled {
  background: var(--primary-color);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.grid :deep(.p-button) {
  font-size: 1.4rem;
  min-height: 72px;
}
</style>
