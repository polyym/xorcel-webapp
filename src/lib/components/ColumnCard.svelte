<script lang="ts">
  let { name, type, samples = [], selected = false, disabled = false, onToggle } = $props<{ name: string; type: string; samples?: unknown[]; selected?: boolean; disabled?: boolean; onToggle: () => void }>();

  function handleKeydown(e: KeyboardEvent) {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggle();
    }
  }

  function handleClick() {
    if (disabled) return;
    onToggle();
  }

  function formatSamples(): string {
    return samples.slice(0, 3).map((s: unknown) => {
      const str = String(s ?? '');
      return str.length > 20 ? str.slice(0, 20) + '\u2026' : str;
    }).join(', ');
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="col-card"
  class:selected
  class:disabled
  tabindex={disabled ? -1 : 0}
  role="checkbox"
  aria-checked={selected}
  aria-disabled={disabled}
  onclick={handleClick}
  onkeydown={handleKeydown}
>
  <div class="col-name">
    <div class="col-check"></div>
    {name}
    <span class="badge" class:badge-int={type === 'int'} class:badge-str={type === 'str'}>{type}</span>
  </div>
  <div class="col-sample">
    {#if type === 'int'}
      <span>{formatSamples()}</span>
    {:else}
      {formatSamples()}
    {/if}
  </div>
  {#if disabled}
    <div class="col-disabled-hint">string — not selectable</div>
  {/if}
</div>
