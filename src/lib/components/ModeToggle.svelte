<script lang="ts">
  import { getMode, setMode } from '../stores/mode.svelte.ts';
</script>

<div class="mode-toggle" role="group" aria-label="Operation mode">
  <button class="mode-opt" class:active={getMode() === 'encode'} onclick={() => setMode('encode')} aria-pressed={getMode() === 'encode'}>Encode</button>
  <button class="mode-opt" class:active={getMode() === 'decode'} onclick={() => setMode('decode')} aria-pressed={getMode() === 'decode'}>Decode</button>
</div>
<div class="mode-hint">XOR is its own inverse — same operation either way</div>
