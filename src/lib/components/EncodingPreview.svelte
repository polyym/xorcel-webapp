<script lang="ts">
  import KeyInput from './KeyInput.svelte';
  import ModeToggle from './ModeToggle.svelte';
  import EncodeTable from './EncodeTable.svelte';
  import { getFile } from '../stores/file.svelte.ts';
  import { getSelected } from '../stores/columns.svelte.ts';
  import { getKey } from '../stores/key.svelte.ts';
  import { getMode, setMode } from '../stores/mode.svelte.ts';
  import { setTab } from '../stores/tab.svelte.ts';
  import { xorValue } from '../utils/xor.ts';
  import { processXor } from '../utils/duckdb.ts';
  import {
    computeDisplayValues,
    makeOutputFilename,
    downloadCsv,
    toInt,
  } from '../utils/encoding.ts';

  let { onBack, onReupload } = $props<{ onBack: () => void; onReupload: () => void }>();

  let file = $derived(getFile());
  let selectedCols = $derived(getSelected());
  let key = $derived(getKey());
  let mode = $derived(getMode());
  let intCols: string[] = $derived(file.columns.filter((c) => c.type === 'int').map((c) => c.name));
  let allIntCols = $derived(file.columns.filter((c) => c.type === 'int'));

  let displayVals: Record<string, number> = $state({});
  let downloadState: 'ready' | 'processing' | 'success' | 'error' = $state('ready');
  let downloadError: string = $state('');

  let outputFilename: string = $derived(makeOutputFilename(file.fileName, mode));

  const MAX_PREVIEW_COLS = 6;

  let visibleIntCols = $derived(allIntCols.slice(0, MAX_PREVIEW_COLS));
  let encOverflowCount: number = $derived(Math.max(0, allIntCols.length - MAX_PREVIEW_COLS));

  let visibleDecodeCols = $derived(file.columns.slice(0, MAX_PREVIEW_COLS));
  let decOverflowCount: number = $derived(Math.max(0, file.columns.length - MAX_PREVIEW_COLS));

  function onKeyChange() {
    displayVals = computeDisplayValues(file.sampleRows, intCols, selectedCols, key);
  }

  async function handleDownload() {
    downloadState = 'processing';
    try {
      const csv = await processXor(selectedCols, key);
      downloadCsv(csv, outputFilename);
      downloadState = 'success';
    } catch (e: unknown) {
      console.error('Download error:', e);
      downloadError = e instanceof Error ? e.message : 'Unknown error';
      downloadState = 'error';
    }
  }

  function resetAll() {
    downloadState = 'ready';
    setMode('encode');
    onReupload();
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return;
    if (e.key === 'd' && downloadState === 'ready') {
      e.preventDefault();
      handleDownload();
    }
  }

  // Initial snap — use getters directly to avoid Svelte state_referenced_locally warning
  displayVals = computeDisplayValues(getFile().sampleRows, getFile().columns.filter((c) => c.type === 'int').map((c) => c.name), getSelected(), getKey());
</script>

<div class="enc-layout">
  <div>
    <div class="enc-card">
      <div class="enc-card-top">
        <div class="enc-card-title">{mode === 'encode' ? 'Encoding preview' : 'Decoding preview'}</div>
        {#if mode === 'encode'}
          <div style="font-size:10px;color:var(--text-3);font-family:var(--mono);">{file.sampleRows.length} of {file.rowCount.toLocaleString()} rows</div>
        {/if}
      </div>

      <KeyInput onChange={onKeyChange} />

      {#if mode === 'encode'}
        <EncodeTable
          sampleRows={file.sampleRows}
          {visibleIntCols}
          {selectedCols}
          {key}
          {displayVals}
        />
        {#if encOverflowCount > 0}
          <div class="enc-overflow">+ {encOverflowCount} more column{encOverflowCount > 1 ? 's' : ''} not shown</div>
        {/if}
      {:else}
        <div class="decode-preview-wrap">
          <table class="decode-preview-table">
            <thead>
              <tr>
                {#each visibleDecodeCols as col}
                  <th title={col.name}>{col.name}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each file.sampleRows.slice(0, 3) as row}
                <tr>
                  {#each visibleDecodeCols as col}
                    {@const val = selectedCols.has(col.name) ? xorValue(toInt(row[col.name]), key) : (row[col.name] ?? '')}
                    <td title={String(val)}>{val}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
          {#if decOverflowCount > 0}
            <div class="enc-overflow">+ {decOverflowCount} more column{decOverflowCount > 1 ? 's' : ''} not shown</div>
          {/if}
        </div>
        <div class="decode-unverified">
          ⚠ unverified — these values may not be correct. Only you know if the key matches.<br>
          <button class="cross-link" onclick={() => setTab('explore')} style="margin-top:4px;">→ Try a value in Explore first</button>
        </div>
      {/if}
    </div>
    <div class="nav-row">
      <button class="btn btn-ghost" onclick={onBack}>← Columns</button>
    </div>
  </div>

  <div>
    <ModeToggle />

    <div class="side">
      <div class="side-title">Summary</div>
      <div class="stat"><span class="stat-k">File</span><span class="stat-v">{file.fileName}</span></div>
      <div class="stat"><span class="stat-k">Rows</span><span class="stat-v hi">{file.rowCount.toLocaleString()}</span></div>
      <div class="stat"><span class="stat-k">Columns</span><span class="stat-v hi">{selectedCols.size}</span></div>
      <div style="margin:6px 0;">
        <span class="stat-k" style="font-size:12px;">{mode === 'encode' ? 'Encoding' : 'Decoding'}</span>
        <div class="pills">
          {#each Array.from(selectedCols) as col}
            <span class="pill">{col}</span>
          {:else}
            <span style="color:var(--text-3)">—</span>
          {/each}
        </div>
      </div>
      <div class="stat"><span class="stat-k">Key</span><span class="stat-v hi">{key}</span></div>
      <div class="stat"><span class="stat-k">Reversible</span><span class="stat-v" style="color:var(--sage);">yes</span></div>
    </div>

    {#if downloadState === 'ready' || downloadState === 'processing'}
      <button class="enc-btn" onclick={handleDownload} disabled={downloadState === 'processing'}>
        {#if downloadState === 'processing'}
          <span class="enc-spinner"></span> <span>Processing…</span>
        {:else}
          ↓ <span>{mode === 'encode' ? 'Encode' : 'Decode'} &amp; download</span>
        {/if}
      </button>
      <div class="enc-note">
        saves {outputFilename}<br>nothing leaves your browser
      </div>
    {:else if downloadState === 'error'}
      <div style="text-align:center;padding:12px 0;">
        <div style="color:var(--mauve);font-weight:600;font-size:13px;margin-bottom:4px;">Processing failed</div>
        <small style="color:var(--text-3);font-family:var(--mono);font-size:10px;">{downloadError}</small>
      </div>
      <button class="enc-btn" onclick={() => { downloadState = 'ready'; downloadError = ''; }}>
        ↻ <span>Try again</span>
      </button>
    {:else}
      <div class="success-state">
        <div class="success-check">✓</div>
        <p>Download started</p>
        <small>{outputFilename}</small>
      </div>
      <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:8px;" onclick={resetAll}>Transform another file</button>
    {/if}

    <div style="margin-top:10px;font-size:9px;color:var(--text-3);text-align:center;line-height:1.5;font-family:var(--mono);">
      ⚠ XOR is obfuscation, not encryption.<br>Not suitable for sensitive data.
    </div>
  </div>
</div>

<svelte:window onkeydown={handleKeydown} />
