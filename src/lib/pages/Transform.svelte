<script lang="ts">
  import Dropzone from '../components/Dropzone.svelte';
  import SkeletonLoader from '../components/SkeletonLoader.svelte';
  import StepIndicator from '../components/StepIndicator.svelte';
  import ColumnSelector from '../components/ColumnSelector.svelte';
  import EncodingPreview from '../components/EncodingPreview.svelte';
  import { getFile, setFile, resetFile } from '../stores/file.svelte.ts';
  import { resetColumns, getSelected } from '../stores/columns.svelte.ts';
  import { setMode } from '../stores/mode.svelte.ts';
  import { loadCsv, isDbReady, ensureDb } from '../utils/duckdb.ts';

  const MAX_COLUMNS = 25;

  let currentStep = $state(1);
  let loading = $state(false);
  let loadingPhase: 'engine' | 'csv' = $state('csv');
  let loadingFileSize = $state(0);
  let error = $state('');
  let warning = $state('');

  function gotoStep(n: number) {
    if (n === 3 && getSelected().size === 0) {
      currentStep = 3;
      return;
    }
    currentStep = n;
  }

  async function handleFile(file: File) {
    loading = true;
    loadingFileSize = file.size;
    error = '';
    warning = '';
    currentStep = 1;

    try {
      if (!isDbReady()) {
        loadingPhase = 'engine';
        await ensureDb();
      }
      loadingPhase = 'csv';
      const result = await loadCsv(file);
      setFile(result);

      // Check for too many columns
      if (result.columns.length > MAX_COLUMNS) {
        error = 'too-many-columns';
        loading = false;
        currentStep = 2;
        return;
      }

      // Check for no integer columns
      const intCols = result.columns.filter(c => c.type === 'int');
      if (intCols.length === 0) {
        error = 'no-integers';
        loading = false;
        currentStep = 2;
        return;
      }

      if (result.warning) {
        warning = result.warning;
      }

      loading = false;
      currentStep = 2;
    } catch (e: unknown) {
      console.error('CSV parse error:', e);
      error = 'Failed to parse CSV: ' + (e instanceof Error ? e.message : 'Unknown error');
      loading = false;
      currentStep = 1;
    }
  }

  function handleReupload() {
    resetFile();
    resetColumns();
    setMode('encode');
    error = '';
    currentStep = 1;
  }

  export function jumpToStep3(): void {
    if (getFile().loaded) {
      currentStep = 3;
    }
  }
</script>

<StepIndicator step={currentStep} maxStep={getFile().loaded ? (getSelected().size > 0 ? 3 : 2) : 1} onGoto={gotoStep} />

{#if currentStep === 1 && !loading}
  <div class="section active">
    <Dropzone onFile={handleFile} />
    {#if error && error !== 'too-many-columns' && error !== 'no-integers'}
      <div class="empty-state" style="margin-top:16px;">
        <p style="color:var(--mauve);font-size:13px;font-weight:600;">Something went wrong</p>
        <small>{error}</small>
        <br>
        <button class="btn btn-ghost" style="margin-top:12px" onclick={() => { error = ''; }}>Dismiss</button>
      </div>
    {/if}
  </div>
{/if}

{#if loading}
  <div class="section active">
    <SkeletonLoader fileName={getFile().fileName || 'Parsing CSV...'} fileSize={loadingFileSize} phase={loadingPhase} />
  </div>
{/if}

{#if currentStep === 2 && !loading}
  <div class="section active">
    {#if error === 'too-many-columns'}
      <div class="file-bar">
        <div class="meta">
          <div class="file-name">{getFile().fileName}</div>
          <div class="file-meta" style="color:var(--mauve);">Too many columns ({getFile().columns.length})</div>
        </div>
      </div>
      <div class="empty-state">
        <p>Too many columns</p>
        <small>XORcel supports up to {MAX_COLUMNS} columns. Your file has {getFile().columns.length}. Please reduce the number of columns and try again.</small>
        <br>
        <button class="btn btn-ghost" style="margin-top:12px" onclick={handleReupload}>Upload a different file</button>
      </div>
    {:else if error === 'no-integers'}
      <div class="file-bar">
        <div class="meta">
          <div class="file-name">{getFile().fileName}</div>
          <div class="file-meta" style="color:var(--mauve);">No integer columns found</div>
        </div>
      </div>
      <div class="empty-state">
        <p>No integer columns found</p>
        <small>XORcel can only encode integer values. Upload a CSV with integer columns.</small>
        <br>
        <button class="btn btn-ghost" style="margin-top:12px" onclick={handleReupload}>Upload a different file</button>
      </div>
    {:else}
      {#if warning}
        <div class="empty-state" style="margin-bottom:12px;padding:10px 14px;border-left:3px solid var(--mauve);">
          <small style="color:var(--text-2);">{warning}</small>
          <button class="btn btn-ghost" style="margin-left:8px;font-size:11px;padding:2px 8px;" onclick={() => { warning = ''; }}>Dismiss</button>
        </div>
      {/if}
      <ColumnSelector onBack={() => gotoStep(1)} onNext={() => gotoStep(3)} onReupload={handleReupload} />
    {/if}
  </div>
{/if}

{#if currentStep === 3 && !loading}
  <div class="section active">
    {#if getSelected().size === 0}
      <div class="empty-state">
        <p>No columns selected</p>
        <small>Go back and select at least one integer column to encode.</small>
        <br>
        <button class="btn btn-ghost" style="margin-top:12px" onclick={() => gotoStep(2)}>&larr; Select columns</button>
      </div>
    {:else}
      <EncodingPreview onBack={() => gotoStep(2)} onReupload={handleReupload} />
    {/if}
  </div>
{/if}
