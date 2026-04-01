<script lang="ts">
  let { originalValues = [], encodedValues = [], width = 80, height = 16 } = $props();

  let maxV = $derived(Math.max(...originalValues, ...encodedValues) || 1);
  let bw = $derived(width / (originalValues.length * 2 + 1));
</script>

<svg class="sparkline" {width} {height} viewBox="0 0 {width} {height}" role="img" aria-label="Sparkline comparing original and encoded values">
  {#each originalValues as v, i}
    {@const x = i * (bw * 2 + bw * 0.5)}
    {@const oh = Math.max(1, (v / maxV) * (height - 2))}
    {@const eh = Math.max(1, ((encodedValues[i] || 0) / maxV) * (height - 2))}
    <rect x={x} y={height - oh} width={bw} height={oh} rx="0.5" fill="rgba(139,126,200,0.4)" />
    <rect x={x + bw + 1} y={height - eh} width={bw} height={eh} rx="0.5" fill="rgba(212,151,122,0.5)" />
  {/each}
</svg>
