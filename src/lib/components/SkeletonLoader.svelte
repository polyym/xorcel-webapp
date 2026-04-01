<script lang="ts">
  let { fileName = 'Parsing CSV...', fileSize = 0, phase = 'csv' } = $props<{ fileName?: string; fileSize?: number; phase?: 'engine' | 'csv' }>();
  let isLargeFile = $derived(fileSize > 10 * 1024 * 1024);
</script>

{#if phase === 'engine'}
<div class="file-bar">
  <div class="meta">
    <div class="file-name">Loading processing engine…</div>
    <div class="file-meta" style="color:var(--indigo);">downloading WebAssembly module — this only happens once</div>
  </div>
</div>
{:else}
<div class="file-bar">
  <div class="meta">
    <div class="file-name">{fileName}</div>
    <div class="file-meta" style="color:var(--indigo);">inferring column types{#if isLargeFile} — large file, this may take a moment{/if}</div>
  </div>
</div>
{/if}
<div class="label">Preview</div>
<div class="preview-wrap" style="padding:12px;">
  {#each [1,2,3] as _}
    <div class="skeleton-row">
      {#each [1,2,3,4,5] as _2}
        <div class="skeleton skeleton-block"></div>
      {/each}
    </div>
  {/each}
</div>
<div class="label">Columns</div>
<div class="col-grid">
  {#each [1,2,3,4] as _}
    <div class="skeleton skeleton-block" style="height:52px;"></div>
  {/each}
</div>
