<script lang="ts">
  import { toBinary, bitWidth } from '../utils/xor.ts';

  let { value = 0n } = $props<{ value: bigint | number }>();

  let bits = $derived(bitWidth(value));
  let bin = $derived(toBinary(value, bits));
</script>

<div class="bitstream">
  <span class="bitstream-label">key</span>
  <div class="bstrip">
    {#each Array(bits) as _, i}
      {#if i > 0 && i % 4 === 0}
        <div class="bbit-gap"></div>
      {/if}
      <div class="bbit" class:on={bin[i] === '1'} class:off={bin[i] === '0'}></div>
    {/each}
  </div>
</div>
