<script lang="ts">
  import { getKey, setKey, getClampReason, clearClamped, type ClampReason } from '../stores/key.svelte.ts';
  import { getMode } from '../stores/mode.svelte.ts';
  import { formatBinary, bitWidth, MAX_KEY } from '../utils/xor.ts';
  import BitstreamStrip from './BitstreamStrip.svelte';

  let { onChange } = $props<{ onChange?: () => void }>();
  let clampedMessage: string = $state('');
  let clampedVisible = $state(false);
  let clampedTimeoutId: ReturnType<typeof setTimeout> | undefined;

  const CLAMP_MESSAGES: Record<NonNullable<ClampReason>, string> = {
    max: 'Value exceeded 64-bit limit — clamped to 2\u2076\u2074 \u2212 1',
    negative: 'Negative values not supported — set to 0',
  };

  function handleInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '');
    if (!raw) { setKey(0n); onChange?.(); return; }
    try {
      let v = BigInt(raw);
      if (v < 0n) v = 0n;
      if (v > MAX_KEY) v = MAX_KEY;
      setKey(v);
      const reason = getClampReason();
      if (reason) {
        clampedMessage = CLAMP_MESSAGES[reason];
        clampedVisible = true;
        if (clampedTimeoutId) clearTimeout(clampedTimeoutId);
        clampedTimeoutId = setTimeout(() => { clampedVisible = false; clearClamped(); }, 3000);
      }
      onChange?.();
    } catch {
      // Ignore invalid input
    }
  }

  let key = $derived(getKey());
  let bits = $derived(bitWidth(key));
  let hint = $derived(
    getMode() === 'encode'
      ? `0\u2013${bits}-bit \u00B7 same key decodes`
      : 'enter the key used to encode'
  );
</script>

<div class="enc-key-row">
  <span class="enc-key-label">XOR key</span>
  <input class="enc-key-input" type="text" inputmode="numeric" value={key.toString()} oninput={handleInput} aria-label="XOR key value">
  <span class="enc-key-bin">{formatBinary(key, bits)}</span>
  <span class="key-hint">{hint}</span>
  {#if clampedVisible}
    <span class="key-clamped" role="alert">{clampedMessage}</span>
  {/if}
</div>
<BitstreamStrip value={key} />
