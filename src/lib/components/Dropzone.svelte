<script lang="ts">
  import { onDestroy } from 'svelte';

  let { onFile } = $props<{ onFile: (file: File) => void }>();
  let dragOver = $state(false);
  let errorTitle = $state('');
  let errorDetail = $state('');
  let errorVisible = $state(false);
  let fileInput: HTMLInputElement;
  let errorTimeoutId: ReturnType<typeof setTimeout> | undefined;

  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  function showError(title: string, detail: string) {
    errorTitle = title;
    errorDetail = detail;
    errorVisible = true;
    if (errorTimeoutId) clearTimeout(errorTimeoutId);
    errorTimeoutId = setTimeout(() => { errorVisible = false; }, 8000);
  }

  onDestroy(() => {
    if (errorTimeoutId) clearTimeout(errorTimeoutId);
  });

  function validateAndProcess(file: File | undefined) {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      showError('Invalid file.', `Expected .csv, got .${ext} — please convert to CSV first.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showError('File too large.', `${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the 50 MB limit.`);
      return;
    }
    errorVisible = false;
    onFile(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files[0];
    validateAndProcess(file);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleBrowse(e: MouseEvent) {
    e.stopPropagation();
    fileInput?.click();
  }

  function handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    validateAndProcess(file);
    target.value = '';
  }
</script>

<div
  class="dropzone"
  class:drag-over={dragOver}
  ondrop={handleDrop}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  onclick={() => fileInput?.click()}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput?.click(); } }}
  role="button"
  tabindex="0"
>
  <div class="dz-title">Drop your CSV here</div>
  <div class="dz-sub">or click to browse</div>
  <button class="dz-browse" onclick={handleBrowse}>Browse files</button>
  <div class="dz-note">csv &middot; max 50mb &middot; browser-only</div>
  {#if errorVisible}
    <button class="dz-error visible" type="button" onclick={(e) => { e.stopPropagation(); errorVisible = false; }}><b>{errorTitle}</b> {errorDetail}</button>
  {/if}
  <input bind:this={fileInput} type="file" accept=".csv" style="display:none" onchange={handleInputChange}>
</div>
