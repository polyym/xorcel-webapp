<script lang="ts">
  import { toBinary, bitWidth, xorValue } from '../utils/xor.ts';

  let { original, xorKey, encoded, colName } = $props<{ original: number; xorKey: bigint; encoded: number; colName: string }>();

  let bits = $derived(bitWidth(xorKey));
  let ob = $derived(toBinary(original, bits));
  let kb = $derived(toBinary(xorKey, bits));
  let rb = $derived(toBinary(encoded, bits));
</script>

<div style="padding:4px 0;">
  <!-- Input row -->
  <div class="bit-row-wrap">
    <span class="bit-label">in</span>
    <div class="bit-cells">
      {#each Array(bits) as _, i}
        {#if i > 0 && i % 4 === 0}<div style="width:3px"></div>{/if}
        <div class="bcell" class:b-sage={ob[i] === '1'} class:b-off={ob[i] === '0'}>{ob[i]}</div>
      {/each}
    </div>
  </div>

  <!-- Key row -->
  <div class="bit-row-wrap">
    <span class="bit-label">key</span>
    <div class="bit-cells">
      {#each Array(bits) as _, i}
        {#if i > 0 && i % 4 === 0}<div style="width:3px"></div>{/if}
        <div class="bcell" class:b-terra={kb[i] === '1'} class:b-off={kb[i] === '0'}>{kb[i]}</div>
      {/each}
    </div>
  </div>

  <div class="bit-sep"></div>

  <!-- Result row with flip indicators -->
  <div class="bit-row-wrap">
    <span class="bit-label">out</span>
    <div class="bit-cells">
      {#each Array(bits) as _, i}
        {#if i > 0 && i % 4 === 0}<div style="width:3px"></div>{/if}
        {@const isFlip = kb[i] === '1'}
        <div class="bcell"
          class:b-slate={rb[i] === '1'}
          class:b-off={rb[i] === '0'}
          class:b-flip={isFlip}>{rb[i]}</div>
      {/each}
    </div>
  </div>

  <div style="margin-top:6px;font-size:9px;color:var(--text-3);">
    <b style="color:var(--indigo)">{colName}</b> = {original} &oplus; {xorKey.toString()} = <b style="color:var(--peach)">{encoded}</b>
  </div>
</div>
