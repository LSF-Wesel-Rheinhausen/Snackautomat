export interface SnackItem {
  id: string;
  name: string;
  price: number;
  currency: string;
  image?: string;
  slot: string;
  stock: number;
  category: string;
  allergens?: string[];
  isActive: boolean;
}

export interface CartItem extends SnackItem {
  quantity: number;
}

export interface AdminProfile {
  id: string;
  name: string;
  lastLoginAt: string | null;
  role: 'admin' | 'maintainer';
}

export interface NfcUser {
  id: string;
  name: string;
  balance: number;
  isAdmin: boolean;
}

export interface PurchaseReceipt {
  saleId: string;
  total: number;
  currency: string;
  completedAt: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface SlotStatus {
  slot: string;
  productName: string;
  stock: number;
  capacity: number;
  requiresAttention: boolean;
}

export interface MachineEnvironment {
  temperatureC: number;
  humidity: number;
  doorOpen: boolean;
  isLocked: boolean;
}

export interface NetworkProfile {
  ssid: string;
  signal: number;
  active: boolean;
  mac?: string;
  isConfigured?: boolean;
}

export interface NetworkSettingsPayload {
  ssid: string;
  password: string;
}

export interface SyncStatus {
  lastSync: string | null;
  pendingJobs: number;
  backendOnline: boolean;
}

export interface OtaStatus {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  updating: boolean;
}

export interface MachineStatusResponse {
  environment: MachineEnvironment;
  sync: SyncStatus;
  ota: OtaStatus;
  slots: SlotStatus[];
}

export interface SlotTestResult {
  slot: string;
  successful: boolean;
  message?: string;
}
