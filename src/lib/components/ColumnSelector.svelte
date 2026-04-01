<script lang="ts">
  import ColumnCard from './ColumnCard.svelte';
  import { getFile } from '../stores/file.svelte.ts';
  import { getSelected, toggleColumn, selectAllIntegers, clearSelection } from '../stores/columns.svelte.ts';

  let { onBack, onNext, onReupload } = $props<{ onBack: () => void; onNext: () => void; onReupload: () => void }>();

  let file = $derived(getFile());
  let intCols = $derived(file.columns.filter(c => c.type === 'int').map(c => c.name));
  let allSelected = $derived(intCols.length > 0 && intCols.every(c => getSelected().has(c)));

  function toggleSelectAll() {
    if (allSelected) clearSelection();
    else selectAllIntegers(intCols);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
</script>

<div class="file-bar">
  <div class="meta">
    <div class="file-name">{file.fileName}</div>
    <div class="file-meta">{file.rowCount.toLocaleString()} rows &middot; {file.columns.length} cols &middot; {formatSize(file.fileSize)}</div>
  </div>
  <button class="file-x" onclick={onReupload} aria-label="Remove file and start over">&times;</button>
</div>

<div class="label">Preview <span style="opacity:0.4;font-weight:400;">— {file.columns.length} columns</span></div>
<div class="preview-wrap">
  <table class="preview-table" style="min-width:{Math.max(file.columns.length * 140, 600)}px;">
    <colgroup>
      {#each file.columns as col}
        <col style="width:{col.type === 'int' ? '100px' : '180px'}; min-width:{col.type === 'int' ? '80px' : '120px'};">
      {/each}
    </colgroup>
    <thead>
      <tr>
        {#each file.columns as col}
          <th title={col.name}>{col.name} <span class="badge" class:badge-int={col.type === 'int'} class:badge-str={col.type === 'str'}>{col.type}</span></th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each file.sampleRows as row}
        <tr>
          {#each file.columns as col}
            <td class:num={col.type === 'int'} title={String(row[col.name] ?? '')}>{row[col.name] ?? ''}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<div class="label">
  Select columns <span style="opacity:0.5">— {intCols.length} integer{intCols.length !== 1 ? 's' : ''} of {file.columns.length}</span>
  <button class="sel-all-btn" onclick={toggleSelectAll}>
    {allSelected ? 'clear selection' : 'select all integers'}
  </button>
</div>
<div class="col-grid" role="group" aria-label="Column selection">
  {#each file.columns as col}
    <ColumnCard
      name={col.name}
      type={col.type}
      samples={col.samples}
      selected={getSelected().has(col.name)}
      disabled={col.type !== 'int'}
      onToggle={() => toggleColumn(col.name)}
    />
  {/each}
</div>

<div class="nav-row">
  <button class="btn btn-ghost" onclick={onBack}>&larr; Back</button>
  <button class="btn btn-go" onclick={onNext} disabled={getSelected().size === 0}>Configure &rarr;</button>
</div>
