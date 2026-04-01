<script lang="ts">
  import ExploreCanvas from '../components/ExploreCanvas.svelte';
  import OverflowState from '../components/OverflowState.svelte';
  import PresetButtons from '../components/PresetButtons.svelte';
  import StatsBar from '../components/StatsBar.svelte';
  import TruthTable from '../components/TruthTable.svelte';
  import { getKey, setKey } from '../stores/key.svelte.ts';
  import { setTab } from '../stores/tab.svelte.ts';
  import { computeXorResult } from '../utils/xor.ts';

  let expVal = $state(342);
  let expKey = $state(Number(getKey()));
  let showDecode = $state(false);
  let traceIdx = $state(-1);

  let isOverflow = $derived(expVal > 65535 || expKey > 65535);

  function setExpVal(v: number) {
    expVal = Math.max(0, Math.round(v) || 0);
  }

  function setExpKey(k: number) {
    expKey = Math.max(0, Math.round(k) || 0);
    setKey(BigInt(expKey));
  }

  function useKeyInTransform() {
    setKey(BigInt(expKey));
    setTab('transform');
  }
</script>

<div class="explore-layout">
  <div>
    <div class="explore-card">
      <div class="explore-top">
        <div class="explore-title">Bit-level view</div>
        <div class="explore-hint" id="exploreHint">
          {isOverflow ? 'values exceed 16-bit range' : 'click key bits \u00B7 hover result to trace'}
        </div>
      </div>

      {#if !isOverflow}
        <ExploreCanvas
          value={expVal}
          bind:key={expKey}
          {showDecode}
          bind:traceIdx
          onKeyChange={setExpKey}
        />
        <div class="viz-legend">
          <div class="l"><div class="d" style="background:var(--sage);"></div>input</div>
          <div class="l"><div class="d" style="background:var(--mauve);"></div>key</div>
          <div class="l"><div class="d" style="background:var(--peach);"></div>result</div>
          <div class="l"><div class="d" style="border:1.5px solid var(--glow);background:none;"></div>flipped</div>
        </div>
        <div class="touch-hint">tap key bits to toggle &middot; tap result bits to trace</div>
      {:else}
        <OverflowState value={expVal} key={expKey} result={computeXorResult(expVal, expKey)} />
      {/if}

      <div class="explore-ctrl">
        <div class="ec-group">
          <span class="ec-label">value</span>
          <input class="ec-input" type="number" value={expVal} min="0"
            oninput={(e) => setExpVal(+(e.target as HTMLInputElement).value)}
            onblur={(e) => (e.target as HTMLInputElement).value = String(expVal)}>
        </div>
        <div class="ec-sep"></div>
        <div class="ec-group">
          <span class="ec-label">key</span>
          <input class="ec-input" type="number" value={expKey} min="0"
            oninput={(e) => setExpKey(+(e.target as HTMLInputElement).value)}
            onblur={(e) => (e.target as HTMLInputElement).value = String(expKey)}>
        </div>
        <button class="dec-tog" class:on={showDecode} onclick={() => showDecode = !showDecode} type="button">
          <div class="dtog"></div>round-trip
        </button>
      </div>

      <PresetButtons onSet={setExpKey} />
      <StatsBar value={expVal} key={expKey} {isOverflow} />
    </div>
  </div>

  <div>
    <div class="explore-side-title">How XOR works</div>
    <div class="explore-info">Each bit of the <b>input</b> is compared with the corresponding bit of the <b>key</b>. Where they differ, the result is <b>1</b>. Where they match, it's <b>0</b>.</div>
    <div class="explore-info">Applying the same key again <b>reverses</b> the operation — toggle round-trip to see it.</div>
    <div class="explore-info" style="color:var(--text-3);font-size:11px;border-left:2px solid var(--border-3);padding-left:8px;margin-bottom:14px;">XOR encoding is <b style="color:var(--text-3)">not secure encryption</b>. It can be broken with frequency analysis or known plaintext. Use it for obfuscation only — never for sensitive data.</div>

    <TruthTable {traceIdx} value={expVal} key={expKey} />

    <div style="margin-top:16px;">
      <div class="explore-side-title">Keyboard shortcuts</div>
      <div class="explore-info" style="font-family:var(--mono);font-size:10px;line-height:2;">
        <b>&uarr;&darr;</b> adjust key by 1<br>
        <b>shift+&uarr;&darr;</b> adjust key by 16<br>
        <b>r</b> random key<br>
        <b>1 2</b> switch tabs<br>
        <span style="color:var(--text-3);margin-top:4px;display:inline-block;"><i>when canvas is focused:</i></span><br>
        <b>&larr;&rarr;</b> navigate key bits<br>
        <b>enter/space</b> toggle bit<br>
        <b>t</b> trace result bit<br>
        <b>esc</b> clear focus
      </div>
    </div>

    <button class="explore-bridge" onclick={useKeyInTransform} type="button">
      <span>&rarr; Use this key in Transform</span>
      <small>carry current key to your CSV workflow</small>
    </button>
  </div>
</div>

<svelte:window onkeydown={(e) => {
  if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return;
  if (e.key === '1') setTab('transform');
  if (e.key === '2') setTab('explore');
  if (e.key === 'r') setExpKey(Math.floor(Math.random() * 65535));
  if (e.key === 'ArrowUp') { e.preventDefault(); setExpKey(expKey + (e.shiftKey ? 16 : 1)); }
  if (e.key === 'ArrowDown') { e.preventDefault(); setExpKey(Math.max(0, expKey - (e.shiftKey ? 16 : 1))); }
}} />
