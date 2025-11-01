import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';
import App from './App.vue';
import router from './router';
import pinia from './stores';

import '@/assets/main.css';
import 'primeicons/primeicons.css';

const app = createApp(App);

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
app.use(ToastService);

app.mount('#app');
