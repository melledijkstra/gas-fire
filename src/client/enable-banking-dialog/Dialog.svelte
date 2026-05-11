<script lang="ts">
  import { Alert, Button, Input, Label, Modal, Select } from 'flowbite-svelte';
  import { onMount } from 'svelte';
  import type { EnableBankingConnection } from '../../server/enable-banking/rpc';
  import Application from '../Application.svelte';
  import { serverFunctions } from '../utils/serverFunctions';

  let connections = $state<EnableBankingConnection[]>([]);
  
  let isSyncing = $state(false);
  let syncMessage = $state('');

  let triggerEnabled = $state(false);
  let triggerFreqType = $state<'hours' | 'days'>('days');
  let triggerFreqVal = $state(1);

  let aspsps = $state<{name: string, country: string, logo?: string, connected?: boolean}[]>([]);
  let searchAspsp = $state('');
  let filteredAspsps = $derived(
    aspsps.filter(a => a.name.toLowerCase().includes(searchAspsp.toLowerCase()))
  )
  let showAddModal = $state(false);
  let isFetchingBanks = $state(false);
  let isStartingAuth = $state(false);

  let showAuthCodeModal = $state(false);
  let authCode = $state('');
  let pendingBankName = $state('');

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    const connRes = await serverFunctions.RPCgetEnableBankingConnections();
    if (connRes.success) {
      connections = connRes.data;
    }

    const triggerStatusResult = await serverFunctions.RPCgetEnableBankingTriggerStatus();
    if (triggerStatusResult.success) {
      triggerEnabled = triggerStatusResult.data.enabled;
      triggerFreqType = triggerStatusResult.data.frequencyType;
      triggerFreqVal = triggerStatusResult.data.frequencyValue;
    }
  }

  async function removeConnection(sessionId: string) {
    const res = await serverFunctions.removeEnableBankingConnection(sessionId);
    if (res.success) {
      connections = connections.filter(c => c.sessionId !== sessionId);
    } else {
      alert('Error removing: ' + res.error);
    }
  }

  async function triggerSync() {
    isSyncing = true;
    syncMessage = 'Syncing...';
    const res = await serverFunctions.triggerEnableBankingSync();
    if (res.success) {
      syncMessage = res.message || 'Sync complete!';
    } else {
      syncMessage = 'Sync failed: ' + res.error;
    }
    isSyncing = false;
    setTimeout(() => syncMessage = '', 5000);
  }

  async function saveTrigger() {
    const res = await serverFunctions.setEnableBankingTrigger(triggerEnabled, triggerFreqType, triggerFreqVal);
    if (res.success) {
      alert('Trigger settings saved!');
    } else {
      alert('Error saving trigger: ' + res.error);
    }
  }

  async function openAddModal() {
    isFetchingBanks = true;
    const res = await serverFunctions.getEnableBankingAspsps();
    isFetchingBanks = false;
    if (res.success) {
      aspsps = res.data;
      showAddModal = true;
    } else {
      alert('Failed to load banks: ' + res.error);
    }
  }

  async function startAuth(aspsp: {name: string, country: string}) {
    pendingBankName = aspsp.name;
    isStartingAuth = true;
    const res = await serverFunctions.startEnableBankingAuthorization(aspsp);
    isStartingAuth = false;
    if (res.success) {
      showAddModal = false;
      // Open in new tab
      window.open(res.data, '_blank');
      showAuthCodeModal = true;
    } else {
      pendingBankName = '';
      alert('Failed to start auth: ' + res.error);
    }
  }

  async function completeAuth() {
    if (!authCode) return;
    const res = await serverFunctions.completeEnableBankingAuthorization(authCode, pendingBankName);
    if (res.success) {
      alert(`Success! Mapped ${res.data} accounts.`);
      showAuthCodeModal = false;
      authCode = '';
      await loadData();
    } else {
      alert('Authorization failed: ' + res.error);
    }
  }
</script>

<Application>
  <div class="p-6 max-w-4xl mx-auto space-y-8">
    <div>
      <h2 class="text-2xl font-semibold mb-4">Enable Banking Connections</h2>
      {#if connections.length === 0}
        <p class="text-gray-500 mb-4">No connections configured yet.</p>
      {:else}
        <ul class="space-y-4 mb-4">
          {#each connections as conn}
            <li class="p-4 border rounded shadow-sm flex justify-between items-center">
              <div>
                <p class="font-bold">{conn.bankName}</p>
                <p class="text-sm text-gray-600">Mapped accounts: {conn.accounts.map(a => a.slug).join(', ')}</p>
                <p class="text-xs text-gray-400">Added: {new Date(conn.createdAt).toLocaleString()}</p>
              </div>
              <Button color="red" size="sm" onclick={() => removeConnection(conn.sessionId)}>Remove</Button>
            </li>
          {/each}
        </ul>
      {/if}
      <div class="flex gap-2">
        <Button onclick={openAddModal} disabled={isFetchingBanks}>
          {isFetchingBanks ? 'Loading...' : 'Add Connection'}
        </Button>
        <Button color="green" onclick={triggerSync} disabled={isSyncing}>
          {isSyncing ? 'Syncing...' : 'Run Sync Now'}
        </Button>
      </div>
      {#if syncMessage}
        <Alert class="mt-4" color={syncMessage.includes('failed') ? 'red' : 'green'}>{syncMessage}</Alert>
      {/if}
    </div>

    <div class="border-t pt-6">
      <h2 class="text-xl font-semibold mb-4">Automated Sync Settings</h2>
      <div class="flex flex-col gap-4 max-w-sm">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" bind:checked={triggerEnabled} class="form-checkbox" />
          <span>Enable Background Sync</span>
        </label>

        {#if triggerEnabled}
          <div>
            <Label class="mb-2">Frequency</Label>
            <div class="flex gap-2">
              <Input type="number" min="1" bind:value={triggerFreqVal} />
              <Select bind:value={triggerFreqType}>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </Select>
            </div>
            {#if triggerFreqType === 'days'}
              <p class="text-xs text-gray-500 mt-1">Daily syncs happen around 2 AM.</p>
            {/if}
          </div>
        {/if}

        <Button color="blue" onclick={saveTrigger}>Save Settings</Button>
      </div>
    </div>
  </div>

  <Modal title="Add Bank Connection" bind:open={showAddModal} autoclose={false} size="lg">
    <div class="space-y-4">
      <Input placeholder="Search bank..." bind:value={searchAspsp} />
      <div class="max-h-96 overflow-y-auto">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {#each filteredAspsps as aspsp}
            <div class="flex flex-col items-center p-4 border rounded-lg hover:shadow-md transition-shadow relative {aspsp.connected ? 'bg-green-50 border-green-200' : 'bg-white'}">
              {#if aspsp.connected}
                <div class="absolute top-2 right-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                  Connected
                </div>
              {/if}
              {#if aspsp.logo}
                <img src={aspsp.logo} alt={aspsp.name} class="h-12 w-auto mb-3 object-contain" />
              {:else}
                <div class="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <span class="text-gray-400 font-bold text-xl">{aspsp.name.charAt(0)}</span>
                </div>
              {/if}
              <span class="text-sm font-medium text-center mb-1 line-clamp-2" title={aspsp.name}>{aspsp.name}</span>
              <span class="text-xs text-gray-500 mb-3">{aspsp.country}</span>
              <Button size="xs" color={aspsp.connected ? "alternative" : "primary"} class="mt-auto w-full" onclick={() => startAuth(aspsp)} disabled={isStartingAuth}>
                {isStartingAuth && pendingBankName === aspsp.name ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </Modal>

  <Modal title="Enter Authorization Code" bind:open={showAuthCodeModal} autoclose={false}>
    <div class="space-y-4">
      <p class="text-sm">After logging in to the bank, you will be redirected to an error or blank page. Copy the "code=" parameter from the URL address bar and paste it below.</p>
      <Input placeholder="Paste code here" bind:value={authCode} />
      <Button onclick={completeAuth} disabled={!authCode}>Complete Setup</Button>
    </div>
  </Modal>
</Application>
