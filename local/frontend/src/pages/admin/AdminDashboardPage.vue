<template>
  <section class="dashboard">
    <div class="grid">
      <Card class="panel environment" aria-label="Umgebungsdaten">
        <template #title>Maschinenstatus</template>
        <template #content>
          <div class="stats">
            <div>
              <span class="label">Temperatur</span>
              <strong>{{ environmentDisplay.temperature }}</strong>
            </div>
            <div>
              <span class="label">Luftfeuchtigkeit</span>
              <strong>{{ environmentDisplay.humidity }}</strong>
            </div>
            <div>
              <span class="label">Tür</span>
              <strong>{{ environmentDisplay.door }}</strong>
            </div>
            <div>
              <span class="label">Sperre</span>
              <strong>{{ environmentDisplay.lock }}</strong>
            </div>
          </div>
        </template>
      </Card>

      <Card class="panel sync" aria-label="Synchronisation und OTA">
        <template #title>Synchronisation &amp; Updates</template>
        <template #content>
          <div class="sync-grid">
            <!-- Quick insight into queued jobs and update status -->
            <div>
              <span class="label">Letzte Synchronisation</span>
              <strong>{{ syncDisplay.lastSync }}</strong>
            </div>
            <div>
              <span class="label">Ausstehende Jobs</span>
              <strong>{{ syncDisplay.pending }}</strong>
            </div>
            <div>
              <span class="label">OTA Version</span>
              <strong>{{ otaDisplay.version }}</strong>
            </div>
            <div>
              <span class="label">Status</span>
              <strong>{{ syncDisplay.status }}</strong>
            </div>
          </div>
          <div class="action-buttons">
            <Button
              label="Synchronisieren"
              icon="pi pi-sync"
              class="touch-button"
              :loading="adminStore.busyAction === 'sync'"
              @click="runSync"
            />
            <Button
              label="OTA Update"
              icon="pi pi-upload"
              severity="secondary"
              outlined
              class="touch-button"
              :loading="adminStore.busyAction === 'ota'"
              @click="runOta"
            />
          </div>
        </template>
      </Card>

      <Card class="panel network" aria-label="Netzwerkeinstellungen">
        <template #title>Netzwerk</template>
        <template #content>
          <form class="network-form" @submit.prevent="saveNetwork">
            <!-- Form posts new Wi-Fi credentials to backend service -->
            <div class="field">
              <label for="ssid">SSID</label>
              <InputText id="ssid" v-model="networkForm.ssid" required autocomplete="off" />
            </div>
            <div class="field">
              <label for="password">Passwort</label>
              <Password
                id="password"
                v-model="networkForm.password"
                :feedback="false"
                toggleMask
                autocomplete="new-password"
              />
            </div>
            <Button
              type="submit"
              label="Netzwerk speichern"
              icon="pi pi-save"
              class="touch-button"
              :loading="adminStore.busyAction === 'network'"
            />
          </form>
        </template>
      </Card>
    </div>

    <Card class="panel slots" aria-label="Fachstatus">
      <template #title>Slots &amp; Hardware Tests</template>
      <template #content>
        <DataTable :value="slots" responsiveLayout="scroll" stripedRows>
          <!-- Each row represents a hardware slot; backend supplies stock + health -->
          <Column field="slot" header="Slot" style="width: 8rem" />
          <Column field="productName" header="Produkt" />
          <Column field="stock" header="Bestand" style="width: 10rem" />
          <Column header="Status" style="width: 14rem">
            <template #body="slot">
              <Tag
                :value="slot.data.requiresAttention ? 'Achtung' : 'OK'"
                :severity="slot.data.requiresAttention ? 'warn' : 'success'"
              />
            </template>
          </Column>
          <Column header="Aktion" style="width: 12rem">
            <template #body="slot">
              <Button
                label="Test"
                icon="pi pi-cog"
                rounded
                class="touch-button"
                :loading="adminStore.busyAction === 'slot:' + slot.data.slot"
                @click="runSlotTest(slot.data.slot)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </section>
</template>

<script setup lang="ts">
// Aggregates maintenance actions – keep API endpoints aligned with backend contract.
import { computed, onMounted, reactive } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { useAdminStore } from '@/stores/admin';

const adminStore = useAdminStore();
const toast = useToast();

const status = computed(() => adminStore.status);
// Slots list keeps DataTable reactive to backend updates.
const slots = computed(() => status.value?.slots ?? []);
const environmentDisplay = computed(() => {
  if (!status.value?.environment) {
    return { temperature: '–', humidity: '–', door: 'Unbekannt', lock: 'Unbekannt' };
  }
  const env = status.value.environment;
  return {
    temperature: `${env.temperatureC.toFixed(1)} °C`,
    humidity: `${env.humidity.toFixed(0)} %`,
    door: env.doorOpen ? 'Offen' : 'Geschlossen',
    lock: env.isLocked ? 'Gesperrt' : 'Freigegeben'
  };
});

const syncDisplay = computed(() => {
  if (!status.value?.sync) {
    return { lastSync: 'Nie', pending: '-', status: 'Offline' };
  }
  const sync = status.value.sync;
  return {
    lastSync: sync.lastSync ? new Date(sync.lastSync).toLocaleString('de-DE') : 'Nie',
    pending: sync.pendingJobs,
    status: sync.backendOnline ? 'Verbunden' : 'Offline'
  };
});

const otaDisplay = computed(() => {
  if (!status.value?.ota) {
    return { version: '-', updateAvailable: false };
  }
  const ota = status.value.ota;
  return {
    version: `${ota.currentVersion} → ${ota.latestVersion}`,
    updateAvailable: ota.updateAvailable
  };
});

const networkForm = reactive({
  ssid: '',
  password: ''
});
// Form values stay local until admin confirms changes.

onMounted(async () => {
  // Load machine status immediately after admin logs in.
  await adminStore.fetchStatus();
});

async function runSlotTest(slotId: string) {
  try {
    const result = await adminStore.runSlotTest(slotId);
    toast.add({
      severity: result?.successful ? 'success' : 'warn',
      summary: `Slot ${slotId}`,
      detail: result?.message ?? (result?.successful ? 'Test erfolgreich' : 'Test fehlgeschlagen'),
      life: 2000
    });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Fehler', detail: 'Slottest nicht möglich', life: 2500 });
  }
}

async function runSync() {
  try {
    await adminStore.triggerSync();
    toast.add({ severity: 'success', summary: 'Synchronisiert', life: 2000 });
  } catch (error) {
    // Highlight sync failures so admins know to check backend connectivity.
    toast.add({ severity: 'error', summary: 'Sync fehlgeschlagen', life: 2500 });
  }
}

async function runOta() {
  try {
    await adminStore.triggerOtaUpdate();
    toast.add({ severity: 'success', summary: 'Update gestartet', life: 2000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'OTA nicht möglich', life: 2500 });
  }
}

async function saveNetwork() {
  try {
    await adminStore.updateNetworkSettings({
      ssid: networkForm.ssid,
      password: networkForm.password
    });
    toast.add({ severity: 'success', summary: 'Gespeichert', detail: 'Neues Netzwerk wird verbunden', life: 2500 });
  } catch (error) {
    // Keep error generic because backend already masks sensitive network messages.
    toast.add({ severity: 'error', summary: 'Speichern fehlgeschlagen', life: 2500 });
  }
}
</script>

<style scoped>
.dashboard {
  display: grid;
  gap: 1.5rem;
}

.grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.panel {
  background: color-mix(in srgb, var(--surface-card) 95%, transparent);
  border-radius: 28px;
  box-shadow: 0 24px 48px -30px rgba(16, 24, 40, 0.55);
}

.stats,
.sync-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.label {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

strong {
  font-size: 1.1rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1.25rem;
}

.network-form {
  display: grid;
  gap: 1rem;
}

.field {
  display: grid;
  gap: 0.5rem;
}

.slots :deep(.p-datatable) {
  background: transparent;
}

.slots :deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 0.85rem;
}

.slots :deep(.p-datatable .p-datatable-header) {
  background: transparent;
}
</style>
