<script lang="ts">
  import BitBreakdown from './BitBreakdown.svelte';
  import Sparkline from './Sparkline.svelte';
  import { xorValue } from '../utils/xor.ts';
  import { getDisplayValue, getHeatmapBg, toInt } from '../utils/encoding.ts';

  let {
    sampleRows,
    visibleIntCols,
    selectedCols,
    key,
    displayVals,
  } = $props<{
    sampleRows: Record<string, unknown>[];
    visibleIntCols: { name: string; type: string }[];
    selectedCols: Set<string>;
    key: bigint;
    displayVals: Record<string, number>;
  }>();

  let expandedCell: string = $state('');

  function toggleBitDetail(ri: number, col: string) {
    const k = `${ri}_${col}`;
    expandedCell = expandedCell === k ? '' : k;
  }
</script>

<div class="enc-table-wrap">
  <table class="enc-table">
    <thead>
      <tr>
        {#each visibleIntCols as col}
          {@const isEnc = selectedCols.has(col.name)}
          <th class:enc-col={isEnc}>
            {col.name}{isEnc ? ' → enc' : ''}
            {#if isEnc}
              <Sparkline
                originalValues={sampleRows.map((r: Record<string, unknown>) => toInt(r[col.name]))}
                encodedValues={sampleRows.map((r: Record<string, unknown>) => xorValue(toInt(r[col.name]), key))}
              />
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each sampleRows as row, ri}
        <tr class="data-row">
          {#each visibleIntCols as col}
            {@const isEnc = selectedCols.has(col.name)}
            {#if isEnc}
              {@const orig = toInt(row[col.name])}
              {@const enc = xorValue(orig, key)}
              <td class="cell-enc"
                style="background:{getHeatmapBg(orig, enc)};cursor:pointer"
                onclick={() => toggleBitDetail(ri, col.name)}>
                <span class="val-orig">{orig}</span>
                <span class="val-arrow">→</span>
                <span class="val-enc">{getDisplayValue(ri, col.name, displayVals, sampleRows, key)}</span>
              </td>
            {:else}
              <td>{row[col.name] || 0}</td>
            {/if}
          {/each}
        </tr>
        {#each visibleIntCols as col}
          {#if expandedCell === `${ri}_${col.name}`}
            <tr class="bit-detail">
              <td colspan={visibleIntCols.length}>
                <BitBreakdown
                  original={toInt(row[col.name])}
                  xorKey={key}
                  encoded={xorValue(toInt(row[col.name]), key)}
                  colName={col.name}
                />
              </td>
            </tr>
          {/if}
        {/each}
      {/each}
    </tbody>
  </table>
</div>
