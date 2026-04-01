<script lang="ts">
  import { popcount, toBinaryGrouped, bitWidth, computeXorResult } from '../utils/xor.ts';

  let { value = 0, key = 0n, isOverflow = false } = $props<{ value: number; key: bigint | number; isOverflow: boolean }>();
</script>

<div class="stats-bar">
  {#if isOverflow}
    {@const res = computeXorResult(value, key)}
    {@const bits = bitWidth(key > value ? key : value)}
    {@const flipped = popcount(key)}
    {@const pct = Math.round(flipped / bits * 100)}
    result: <b>{Number(res).toLocaleString()}</b> &middot;
    bits flipped: <b>{flipped}/{bits}</b> ({pct}%) &middot;
    <b>{bits}-bit</b>
  {:else}
    {@const res = computeXorResult(value, key)}
    {@const bits = bitWidth(key)}
    {@const flipped = popcount(key)}
    {@const pct = Math.round(flipped / bits * 100)}
    result: <b>{Number(res)}</b> &middot;
    bits flipped: <b>{flipped}/{bits}</b> ({pct}%) &middot;
    binary: <b>{toBinaryGrouped(res, bits)}</b>
  {/if}
</div>
