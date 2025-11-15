<script lang="ts">
  import { A } from 'flowbite-svelte';
  import Application from '../Application.svelte';

  const environment = import.meta.env.DEV ? 'development' : 'production';
</script>

<Application>
  <p class="mb-4">Thank you for using Firesheet</p>
  <p class="mb-4">The code for this Google Apps Script can be found here:</p>
  <A class="mb-4" target="_blank" href="https://github.com/melledijkstra/gas-fire">
    @melledijkstra/gas-fire
  </A>
  <p>
    {`Version: ${__APP_VERSION__}`}
    <br/>
    <small class="text-gray-700">{` (${environment})`}</small>
  </p>
</Application>
