<script lang="ts">
  import Application from '../Application.svelte';
</script>

<Application>
  <p class="mb-4 text-green-400">Thank you for using Firesheet</p>
  <p>The code for this Google Apps Script can be found here:</p>
  <a target="_blank" href="https://github.com/melledijkstra/gas-fire">
    @melledijkstra/gas-fire
  </a>
  <p>{`Version: ${__APP_VERSION__}`}</p>
</Application>
