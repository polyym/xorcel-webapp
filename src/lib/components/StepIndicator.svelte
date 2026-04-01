<script lang="ts">
  let { step = 1, maxStep = 1, onGoto } = $props<{ step?: number; maxStep?: number; onGoto: (n: number) => void }>();

  const steps = [
    { num: 1, label: 'Upload' },
    { num: 2, label: 'Columns' },
    { num: 3, label: 'Transform' }
  ];

  function getClass(s: { num: number; label: string }): string {
    if (s.num < step) return 'step done';
    if (s.num === step) return 'step active';
    if (s.num > maxStep) return 'step disabled';
    return 'step';
  }

  function handleClick(s: { num: number; label: string }): void {
    if (s.num > maxStep) return;
    onGoto(s.num);
  }
</script>

<div class="steps">
  {#each steps as s, i}
    {#if i > 0}
      <div class="step-div"></div>
    {/if}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class={getClass(s)} onclick={() => handleClick(s)}>
      <div class="step-num">{s.num < step ? '' : s.num}</div>
      <span class="step-label">{s.label}</span>
    </div>
  {/each}
</div>
