<script lang="ts">
  import { onMount } from 'svelte';
  import Application from '../Application.svelte';
  import { Button, Alert, Modal, Input, Label, Select } from 'flowbite-svelte';
  import { serverFunctions } from '../utils/serverFunctions';
  import type { EnableBankingConnection } from '../../server/enable-banking/rpc';

  let connections = $state<EnableBankingConnection[]>([]);
  let aspsps = $state<{name: string, country: string}[]>([]);
  let isSyncing = $state(false);
  let syncMessage = $state('');

  let triggerEnabled = $state(false);
  let triggerFreqType = $state<'hours' | 'days'>('days');
  let triggerFreqVal = $state(1);

  let showAddModal = $state(false);
  let searchAspsp = $state('');

  let showAuthCodeModal = $state(false);
  let authCode = $state('');
  let pendingBankName = $state('');

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    const connRes = await serverFunctions.getEnableBankingConnections();
    if (connRes.success) connections = connRes.data;

    const trigRes = await serverFunctions.getEnableBankingTriggerStatus();
    if (trigRes.success) {
      triggerEnabled = trigRes.data.enabled;
      triggerFreqType = trigRes.data.frequencyType;
      triggerFreqVal = trigRes.data.frequencyValue;
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
    const res = await serverFunctions.getEnableBankingAspsps();
    if (res.success) {
      aspsps = res.data;
      showAddModal = true;
    } else {
      alert('Failed to load banks: ' + res.error);
    }
  }

  async function startAuth(aspsp: {name: string, country: string}) {
    const res = await serverFunctions.startEnableBankingAuthorization(aspsp);
    if (res.success) {
      showAddModal = false;
      pendingBankName = aspsp.name;
      // Open in new tab
      window.open(res.data, '_blank');
      showAuthCodeModal = true;
    } else {
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
        <Button onclick={openAddModal}>Add Connection</Button>
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

  <Modal title="Add Bank Connection" bind:open={showAddModal} autoclose={false}>
    <div class="space-y-4">
      <Input placeholder="Search bank..." bind:value={searchAspsp} />
      <div class="max-h-60 overflow-y-auto space-y-2">
        {#each aspsps.filter(a => a.name.toLowerCase().includes(searchAspsp.toLowerCase())) as aspsp}
          <div class="flex justify-between items-center p-2 hover:bg-gray-50 border-b">
            <span>{aspsp.name} ({aspsp.country})</span>
            <Button size="xs" onclick={() => startAuth(aspsp)}>Connect</Button>
          </div>
        {/each}
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
