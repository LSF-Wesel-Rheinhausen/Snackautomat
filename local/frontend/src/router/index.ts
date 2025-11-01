/**
 * Central route map for kiosk and admin flows.
 * Keep route meta flags (`requiresSession`, `requiresAdmin`, etc.) in sync
 * with guard logic below to avoid desynchronised access control.
 */
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAdminStore } from '@/stores/admin';
import { useSessionStore } from '@/stores/session';

// Route tree combines kiosk customer journey and admin maintenance area.
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

// Global guards manage kiosk session and admin auth state transitions.
router.beforeEach((to, from, next) => {
  const adminStore = useAdminStore();
  if (to.meta.requiresAdmin && !adminStore.isAuthenticated) {
    // Redirect non-admins attempting to hit admin-only routes back to the PIN login.
    next({ name: 'admin-login', query: { redirect: to.fullPath } });
    return;
  }

  if (to.meta.requiresNoAdmin && adminStore.isAuthenticated) {
    // Prevent logged-in admins from seeing the PIN entry again.
    next({ name: 'admin-dashboard' });
    return;
  }

  const sessionStore = useSessionStore();
  if (to.meta.requiresSession && !sessionStore.isAuthenticated) {
    // Enforce that catalog/checkout steps only work once NFC authentication happened.
    next({ name: 'kiosk-scan' });
    return;
  }

  if (from.name === 'kiosk-checkout' && to.name === 'kiosk-catalog') {
    // Reset ephemeral checkout state when the user navigates back after completing purchase.
    sessionStore.resetCheckoutState();
  }

  next();
});

export default router;
