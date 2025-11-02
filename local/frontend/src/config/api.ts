// Central definition of backend endpoints to keep naming consistent.
export const API_ENDPOINTS = {
  health: '/health',
  userInfo: '/get_user_info',
  productList: '/get_product_list',
  buy: '/buy',
  wifiList: '/wifi/list',
  wifiConnect: '/wifi/connect',
  ota: '/ota',
  adminAuthPin: '/admin/auth/pin',
  adminLogout: '/admin/logout',
  adminStatus: '/admin/status',
  adminSync: '/admin/sync',
  adminOtaStart: '/admin/ota/start',
  adminNetwork: '/admin/network'
} as const;

export type ApiEndpointKey = keyof typeof API_ENDPOINTS;


export const API_BUILDERS = {
  adminSlotTest: (slot: string) => `/admin/slots/${slot}/test`
} as const;
