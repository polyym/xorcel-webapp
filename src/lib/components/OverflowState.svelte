<script lang="ts">
  let { value = 0, key = 0n, result = 0n } = $props<{ value: number; key: bigint | number; result: bigint | number }>();

  function getBits(): Array<{ on: boolean; delay: string }> {
    const bin = BigInt(result).toString(2);
    const bits = [];
    for (let i = 0; i < bin.length; i++) {
      bits.push({ on: bin[i] === '1', delay: (Math.random() * 2.5).toFixed(2) });
    }
    const pad = Math.max(0, 128 - bin.length);
    for (let j = 0; j < pad; j++) {
      bits.push({ on: false, delay: (Math.random() * 2.5).toFixed(2) });
    }
    return bits;
  }
</script>

<div class="viz-overflow" style="display:flex;">
  <div class="overflow-bits">
    {#each getBits() as bit}
      <div class="obit" class:obit-on={bit.on} class:obit-off={!bit.on} style="animation-delay:{bit.delay}s"></div>
    {/each}
  </div>
  <div class="overflow-result">
    <div class="overflow-row">
      <span class="overflow-label" style="color:var(--sage);">input</span>
      <span class="overflow-val">{value.toLocaleString()}</span>
    </div>
    <div class="overflow-op">&oplus;</div>
    <div class="overflow-row">
      <span class="overflow-label" style="color:var(--mauve);">key</span>
      <span class="overflow-val">{key.toLocaleString()}</span>
    </div>
    <div class="overflow-sep"></div>
    <div class="overflow-row">
      <span class="overflow-label" style="color:var(--peach);">result</span>
      <span class="overflow-val overflow-val-result">{Number(result).toLocaleString()}</span>
    </div>
  </div>
  <div class="overflow-msg">
    This value exceeds 16 bits — too many bits to visualise interactively.<br>
    The XOR result above is correct. Use values under 65536 to explore bit-by-bit.
  </div>
</div>
