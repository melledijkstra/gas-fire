<script lang="ts">
  import { StepIndicator, Button } from 'flowbite-svelte';
  import Application from '../Application.svelte';
  import ImportForm from '../components/ImportForm.svelte';
  import { importState } from '../states/import.svelte';
  import DataTable from '../components/DataTable.svelte';
  import PreviewStep from '../components/PreviewStep.svelte';
  import ImportStep from './ImportStep.svelte';

  let currentStep = $state(2);

  function nextStep() {
    if (currentStep < 3) {
      currentStep += 1;
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep -= 1;
    }
  }
</script>

<Application>
  <StepIndicator steps={[
    '1. Upload File',
    '2. Generate Preview',
    '3. Import',
  ]} bind:currentStep clickable={false} class="mb-4" />

  {#if currentStep === 1}
    <ImportForm onSubmit={nextStep} />
    {#if importState.rawImportData}
      <DataTable table={importState.rawImportData} selectable tableClass="mt-4" />
    {/if}
  {:else if currentStep === 2}
    <Button disabled={importState.isProcessing} onclick={prevStep}>←</Button>
    <Button disabled={importState.isProcessing} onclick={nextStep}>Skip / Next</Button>
    <PreviewStep />
  {:else if currentStep === 3}
    <Button disabled={importState.isProcessing} onclick={prevStep}>←</Button>
    <ImportStep />
  {/if}
</Application>
