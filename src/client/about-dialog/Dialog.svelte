<script lang="ts">
  import { A } from 'flowbite-svelte';
  import Application from '../Application.svelte';
</script>

<Application>
  <p class="mb-4">Thank you for using Firesheet</p>
  <p class="mb-4">The code for this Google Apps Script can be found here:</p>
  <A class="mb-4" target="_blank" href="https://github.com/melledijkstra/gas-fire">
    @melledijkstra/gas-fire
  </A>
  <p>{`Version: ${__APP_VERSION__}`}</p>
</Application>
