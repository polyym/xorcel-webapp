<script lang="ts">
  let { onSet } = $props<{ onSet: (v: number) => void }>();
</script>

<div class="presets">
  <span class="presets-label">try:</span>
  <button class="preset-btn" onclick={() => onSet(255)}>255</button>
  <button class="preset-btn" onclick={() => onSet(128)}>128</button>
  <button class="preset-btn" onclick={() => onSet(1)}>1</button>
  <button class="preset-btn" onclick={() => onSet(65535)}>65535</button>
  <button class="preset-btn" onclick={() => onSet(43690)}>0xAAAA</button>
  <button class="preset-btn" onclick={() => onSet(Math.floor(Math.random() * 65535))}>random</button>
</div>
