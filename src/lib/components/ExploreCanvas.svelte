<script lang="ts">
  import { onMount } from 'svelte';
  import { prefersReducedMotion } from '../utils/motion.ts';
  import { toBinary } from '../utils/xor.ts';
  import {
    COLORS,
    type BitNode, type AmbientDot, type Particle,
    createAmbientDots, createBurst, buildBitNodes,
    tickNodePhysics, findClickedKeyBit, findTraceIdx,
    drawAmbientDots, drawFlowLines, drawSeparatorsAndLabels,
    drawNode, drawParticles,
  } from '../utils/canvas-engine.ts';

  let { value = 342, key = $bindable(255), showDecode = false, traceIdx = $bindable(-1), onKeyChange = (_k: number) => {} } = $props();

  let k16 = $derived(key & 0xFFFF);
  let result = $derived(value ^ k16);
  let a11yDescription = $derived(
    `Input: ${value} (${toBinary(value, 16)}). ` +
    `Key: ${k16} (${toBinary(k16, 16)}). ` +
    `Result: ${result} (${toBinary(result, 16)}).` +
    (showDecode ? ` Decoded: ${result ^ k16} (${toBinary(result ^ k16, 16)}).` : '')
  );

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let W = 0, H = 0, dpr = 1, mx = -999, my = -999;
  let time = 0, animId: number | null = null, vizActive = false;
  let particles: Particle[] = [];
  let bitNodes: BitNode[] = [];
  let ambientDots: AmbientDot[] = [];
  let vigG: CanvasGradient | null = null;
  let localTraceIdx = -1;
  let keyboardTraceIdx = -1;

  /** Currently focused key-bit index for keyboard navigation (-1 = none). */
  let focusedBitIdx = $state(-1);

  function sizeCanvas() {
    if (!canvas) return;
    const cont = canvas.parentElement;
    if (!cont) return;
    const r = cont.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = r.width;
    if (W < 10) return;
    const minH = showDecode ? 530 : 390;
    H = Math.max(minH, Math.min(r.height || minH, 700));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = W / 2, cy = H / 2, oR = Math.sqrt(cx * cx + cy * cy);
    vigG = ctx.createRadialGradient(cx, cy, oR * 0.4, cx, cy, oR);
    vigG.addColorStop(0, 'rgba(17,15,26,0)');
    vigG.addColorStop(1, 'rgba(17,15,26,0.35)');
  }

  function rebuildNodes() {
    bitNodes = buildBitNodes(value, key, showDecode, W, bitNodes);
  }

  function burst(x: number, y: number, c: number[] | readonly number[]) {
    if (prefersReducedMotion()) return;
    particles.push(...createBurst(x, y, c));
  }

  function draw() {
    if (!vizActive) return;
    animId = requestAnimationFrame(draw);
    if (!W || !H || !ctx) return;
    time += 0.016;
    ctx.clearRect(0, 0, W, H);
    const reducedMotion = prefersReducedMotion();

    drawAmbientDots(ctx, ambientDots, W, H, time, reducedMotion);

    // Trace detection: keyboard trace takes priority over mouse hover
    const mouseTrace = findTraceIdx(bitNodes, mx, my);
    if (mouseTrace >= 0) keyboardTraceIdx = -1;
    localTraceIdx = keyboardTraceIdx >= 0 ? keyboardTraceIdx : mouseTrace;
    traceIdx = localTraceIdx;

    drawFlowLines(ctx, bitNodes, showDecode, localTraceIdx, time, reducedMotion);
    drawSeparatorsAndLabels(ctx, value, key, showDecode, W);

    // Bit nodes: physics + render
    let hC = false;
    for (const n of bitNodes) {
      if (isNaN(n.x) || !n.r) continue;

      tickNodePhysics(n, mx, my, localTraceIdx, reducedMotion);

      const hD = Math.sqrt((mx - (n.x + n.ox)) ** 2 + (my - (n.y + n.oy)) ** 2);
      const br = reducedMotion ? 0 : Math.sin(time * 1.1 + n.pulse); // NODE_BREATHE_SPEED
      const pr = Math.max(0.5, (n.r + (n.glow > 0.1 ? br * 0.1 : 0)) * n.scale);
      n.hover += ((hD < pr + 8 ? 1 : 0) - n.hover) * 0.1;
      if (n.ck && n.hover > 0.3) hC = true;

      drawNode(ctx, n, time, reducedMotion);
    }

    canvas.style.cursor = hC ? 'pointer' : 'crosshair';
    ctx.textBaseline = 'alphabetic';

    if (!reducedMotion) {
      particles = drawParticles(ctx, particles);
    }

    if (vigG) { ctx.fillStyle = vigG; ctx.fillRect(0, 0, W, H); }
  }

  function handleClick(e: MouseEvent) {
    const r = canvas.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    const hit = findClickedKeyBit(bitNodes, cx, cy);
    if (!hit) return;

    const bx = hit.x + hit.ox, by = hit.y + hit.oy;
    const oldResult = bitNodes.find(b => b.label === 'result' && b.idx === hit.idx);
    const oldBit = oldResult ? oldResult.bit : null;

    const newKey = key ^ (1 << hit.globalIdx);
    key = newKey;
    onKeyChange(newKey);
    rebuildNodes();

    const newResult = bitNodes.find(b => b.label === 'result' && b.idx === hit.idx);
    if (oldBit !== null && newResult && oldBit !== newResult.bit) {
      burst(newResult.x, newResult.y, newResult.bit ? COLORS.peach : COLORS.dim);
    }
    burst(bx, by, COLORS.mauve);
  }

  function handleTouchStart(e: TouchEvent) {
    const t = e.touches[0], r = canvas.getBoundingClientRect();
    mx = t.clientX - r.left; my = t.clientY - r.top;
    const hit = findClickedKeyBit(bitNodes, mx, my, 12);
    if (!hit) return;

    const bx = hit.x + hit.ox, by = hit.y + hit.oy;
    const newKey = key ^ (1 << hit.globalIdx);
    key = newKey;
    onKeyChange(newKey);
    rebuildNodes();
    burst(bx, by, COLORS.mauve);
  }

  function handleTouchMove(e: TouchEvent) {
    const t = e.touches[0], r = canvas.getBoundingClientRect();
    mx = t.clientX - r.left; my = t.clientY - r.top;
  }

  function handleTouchEnd() {
    mx = my = -999;
    localTraceIdx = -1;
    traceIdx = -1;
  }

  function handleCanvasKeydown(e: KeyboardEvent) {
    const BITS_COUNT = 16;
    if (e.key === 'Tab') {
      // Let Tab move focus away from the canvas naturally
      focusedBitIdx = -1;
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (focusedBitIdx === -1) {
        focusedBitIdx = 0;
      } else {
        focusedBitIdx = e.key === 'ArrowLeft'
          ? (focusedBitIdx - 1 + BITS_COUNT) % BITS_COUNT
          : (focusedBitIdx + 1) % BITS_COUNT;
      }
      // Move mouse pointer to focused key bit for visual feedback
      const node = bitNodes.find(b => b.label === 'key' && b.idx === focusedBitIdx);
      if (node) { mx = node.x + node.ox; my = node.y + node.oy; }
      // Clear trace when navigating
      keyboardTraceIdx = -1;
      announceA11y();
      return;
    }

    if ((e.key === 'Enter' || e.key === ' ') && focusedBitIdx >= 0) {
      e.preventDefault();
      const node = bitNodes.find(b => b.label === 'key' && b.idx === focusedBitIdx);
      if (!node) return;
      const globalIdx = BITS_COUNT - 1 - focusedBitIdx;
      const newKey = key ^ (1 << globalIdx);
      key = newKey;
      onKeyChange(newKey);
      rebuildNodes();
      burst(node.x + node.ox, node.y + node.oy, COLORS.mauve);
      announceA11y();
      return;
    }

    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      if (focusedBitIdx === -1) {
        focusedBitIdx = 0;
      }
      keyboardTraceIdx = focusedBitIdx;
      announceA11y();
      return;
    }

    if (e.key === 'Escape') {
      focusedBitIdx = -1;
      keyboardTraceIdx = -1;
      traceIdx = -1;
      mx = my = -999;
    }
  }

  let a11yLive = $state('');
  function announceA11y() {
    if (focusedBitIdx < 0) return;
    const globalIdx = 16 - 1 - focusedBitIdx;
    const keyBit = (k16 >> globalIdx) & 1;
    const inputBit = (value >> globalIdx) & 1;
    const resultBit = inputBit ^ keyBit;
    a11yLive = `Bit ${focusedBitIdx}: key=${keyBit}, input=${inputBit}, result=${resultBit}`;
  }

  function startViz() {
    vizActive = true;
    sizeCanvas();
    ambientDots = createAmbientDots(W, H);
    rebuildNodes();
    draw();
  }

  function stopViz() {
    vizActive = false;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  onMount(() => {
    const maybeCtx = canvas.getContext('2d');
    if (!maybeCtx) {
      console.error('Canvas 2D context not available');
      return;
    }
    ctx = maybeCtx;
    startViz();

    const resizeObs = new ResizeObserver(() => {
      if (vizActive) {
        sizeCanvas();
        ambientDots = createAmbientDots(W, H);
        rebuildNodes();
      }
    });
    resizeObs.observe(canvas.parentElement!);

    return () => {
      stopViz();
      resizeObs.disconnect();
    };
  });

  $effect(() => {
    const _v = value; const _k = key; const _sd = showDecode;
    if (vizActive) {
      sizeCanvas();
      rebuildNodes();
    }
  });
</script>

<div style="position:relative;">
  <canvas
    bind:this={canvas}
    tabindex="0"
    style="display:block;width:100%;cursor:crosshair"
    aria-label="Interactive XOR bit-level visualization. Use arrow keys to navigate key bits, Enter or Space to toggle, T to trace."
    aria-describedby="canvas-a11y-desc"
    onmousemove={(e) => { const r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }}
    onmouseleave={() => { mx = my = -999; localTraceIdx = -1; traceIdx = -1; }}
    onclick={handleClick}
    onkeydown={handleCanvasKeydown}
    onfocus={() => { if (focusedBitIdx === -1) focusedBitIdx = 0; announceA11y(); }}
    onblur={() => { focusedBitIdx = -1; }}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
  ></canvas>
  <div id="canvas-a11y-desc" class="sr-only" aria-live="polite">{a11yDescription}</div>
  <div class="sr-only" aria-live="assertive">{a11yLive}</div>
</div>
