import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAdminStore } from '@/stores/admin';
import { useSessionStore } from '@/stores/session';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/KioskLayout.vue'),
    meta: { transition: 'slide-up' },
    children: [
      {
        path: '',
        name: 'kiosk-landing',
        component: () => import('@/pages/kiosk/LandingPage.vue'),
        meta: { transition: 'fade' }
      },
      {
        path: 'scan',
        name: 'kiosk-scan',
        component: () => import('@/pages/kiosk/ScanPage.vue'),
        meta: { transition: 'slide-left' }
      },
      {
        path: 'catalog',
        name: 'kiosk-catalog',
        component: () => import('@/pages/kiosk/CatalogPage.vue'),
        meta: { requiresSession: true, transition: 'slide-left' }
      },
      {
        path: 'checkout',
        name: 'kiosk-checkout',
        component: () => import('@/pages/kiosk/CheckoutPage.vue'),
        meta: { requiresSession: true, transition: 'slide-left' }
      },
      {
        path: 'confirmation',
        name: 'kiosk-confirmation',
        component: () => import('@/pages/kiosk/ConfirmationPage.vue'),
        meta: { requiresSession: true, transition: 'fade' }
      }
    ]
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    children: [
      {
        path: '',
        name: 'admin-login',
        component: () => import('@/pages/admin/AdminLoginPage.vue'),
        meta: { transition: 'slide-up', requiresNoAdmin: true }
      },
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('@/pages/admin/AdminDashboardPage.vue'),
        meta: { requiresAdmin: true, transition: 'slide-left' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue')
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ left: 0, top: 0 })
});

router.beforeEach((to, from, next) => {
  const adminStore = useAdminStore();
  if (to.meta.requiresAdmin && !adminStore.isAuthenticated) {
    next({ name: 'admin-login', query: { redirect: to.fullPath } });
    return;
  }

  if (to.meta.requiresNoAdmin && adminStore.isAuthenticated) {
    next({ name: 'admin-dashboard' });
    return;
  }

  const sessionStore = useSessionStore();
  if (to.meta.requiresSession && !sessionStore.isAuthenticated) {
    next({ name: 'kiosk-scan' });
    return;
  }

  if (from.name === 'kiosk-checkout' && to.name === 'kiosk-catalog') {
    sessionStore.resetCheckoutState();
  }

  next();
});

export default router;
