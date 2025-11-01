/**
 * App bootstrap for the Snackautomat kiosk UI.
 * Centralizes plugin wiring (Pinia, Router, PrimeVue) so maintainers know
 * where to extend global setup (e.g. new services or directives).
 */
import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';
import App from './App.vue';
import router from './router';
import pinia from './stores';

import '@/assets/main.css';
import 'primeicons/primeicons.css';

// Create the root Vue instance that powers the kiosk UI.
const app = createApp(App);

// Pinia + Router first so PrimeVue components can access stores/route data.
app.use(pinia);
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      cssLayer: true
    }
  },
  ripple: true
});
// Toasts are used across kiosk/admin flows for feedback and diagnostics.
app.use(ToastService);

// Finally attach the app to the DOM element provided by index.html.
app.mount('#app');
