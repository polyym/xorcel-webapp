<script lang="ts">
  let { traceIdx = -1, value = 0, key = 0 } = $props();

  const rows = [
    { a: 0, b: 0, r: 0 },
    { a: 0, b: 1, r: 1 },
    { a: 1, b: 0, r: 1 },
    { a: 1, b: 1, r: 0 },
  ];

  function isHighlighted(row: { a: number; b: number; r: number }): boolean {
    if (traceIdx < 0) return false;
    const k16 = key & 0xFFFF;
    const inputBit = (value >> (15 - traceIdx)) & 1;
    const keyBit = (k16 >> (15 - traceIdx)) & 1;
    return row.a === inputBit && row.b === keyBit;
  }
</script>

<table class="xor-table">
  <thead>
    <tr><td class="h">A</td><td class="h">B</td><td class="h">A&oplus;B</td></tr>
  </thead>
  <tbody>
    {#each rows as row}
      <tr class="tt-row" class:tt-highlight={isHighlighted(row)}>
        <td>{row.a}</td>
        <td>{row.b}</td>
        <td class="r">{row.r}</td>
      </tr>
    {/each}
  </tbody>
</table>
