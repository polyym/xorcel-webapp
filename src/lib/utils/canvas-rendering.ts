/**
 * Canvas rendering — draw calls for ambient dots, flow lines, nodes, particles, and labels.
 */

import type { AmbientDot, BitNode, Particle, RowLabel } from './canvas-types.ts';
import { BITS, ROW_Y } from './canvas-types.ts';
import { COLORS, rgba, lerpColor } from './canvas-colors.ts';
import { toBinaryGrouped } from './xor.ts';

// ── Constants ────────────────────────────────────────────────

/** Per-frame velocity damping for particles (5% loss per frame). */
const PARTICLE_VELOCITY_DAMPING = 0.95;
/** Per-frame life decay for particles (~33 frames until dead). */
const PARTICLE_LIFE_DECAY = 0.03;
/** Minimum life threshold below which particles are culled. */
const PARTICLE_LIFE_THRESHOLD = 0.01;

/** Base pulsation speed (radians/frame) for ambient dot opacity. */
const AMBIENT_PULSE_SPEED = 0.7;
/** Base ambient dot opacity. */
const AMBIENT_BASE_OPACITY = 0.03;
/** Amplitude of ambient dot opacity oscillation. */
const AMBIENT_PULSE_AMPLITUDE = 0.02;

/** Speed multiplier for the traveling dot along flow-line bezier curves. */
const FLOW_DOT_BASE_SPEED = 0.28;
/** Per-pair speed offset reduction for flow dots so pairs animate at different rates. */
const FLOW_DOT_PAIR_SPEED_OFFSET = 0.04;

/** Pulsation speed for the node breathing effect (radians per frame-time). */
const NODE_BREATHE_SPEED = 1.1;

/** Pulsation speed for the flipped-bit ring glow. */
const FLIPPED_RING_PULSE_SPEED = 1.8;

// ── Helpers ───────────────────────────────────────────────────

function bezierPoint(
  x0: number, y0: number,
  cx0: number, cy0: number,
  cx1: number, cy1: number,
  x1: number, y1: number,
  t: number,
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * u * x0 + 3 * u * u * t * cx0 + 3 * u * t * t * cx1 + t * t * t * x1,
    y: u * u * u * y0 + 3 * u * u * t * cy0 + 3 * u * t * t * cy1 + t * t * t * y1,
  };
}

// ── Ambient dots ──────────────────────────────────────────────

export function createAmbientDots(W: number, H: number, count = 25): AmbientDot[] {
  const dots: AmbientDot[] = [];
  for (let i = 0; i < count; i++) {
    dots.push({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 0.8 + 0.2,
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
      ph: Math.random() * Math.PI * 2,
    });
  }
  return dots;
}

export function drawAmbientDots(
  ctx: CanvasRenderingContext2D,
  dots: AmbientDot[],
  W: number, H: number,
  time: number,
  reducedMotion: boolean,
): void {
  for (const d of dots) {
    if (!reducedMotion) { d.x += d.vx; d.y += d.vy; }
    if (d.x < 0 || d.x > W) d.vx *= -1;
    if (d.y < 0 || d.y > H) d.vy *= -1;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(COLORS.cream, AMBIENT_BASE_OPACITY + AMBIENT_PULSE_AMPLITUDE * Math.sin(time * AMBIENT_PULSE_SPEED + d.ph));
    ctx.fill();
  }
}

// ── Particles ─────────────────────────────────────────────────

export function createBurst(x: number, y: number, c: number[] | readonly number[], count = 10): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.PI * 2 * i / count + Math.random() * 0.3;
    const s = 1 + Math.random() * 1.5;
    particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 1, color: c,
      r: 1 + Math.random(),
    });
  }
  return particles;
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
): Particle[] {
  const alive = particles.filter(p => p.life > PARTICLE_LIFE_THRESHOLD);
  for (const p of alive) {
    p.x += p.vx; p.y += p.vy;
    p.vx *= PARTICLE_VELOCITY_DAMPING; p.vy *= PARTICLE_VELOCITY_DAMPING; p.life -= PARTICLE_LIFE_DECAY;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.1, p.r * p.life), 0, Math.PI * 2);
    ctx.fillStyle = rgba(p.color, p.life * 0.4);
    ctx.fill();
  }
  return alive;
}

// ── Flow lines ────────────────────────────────────────────────

export function drawFlowLines(
  ctx: CanvasRenderingContext2D,
  nodes: BitNode[],
  showDecode: boolean,
  localTraceIdx: number,
  time: number,
  reducedMotion: boolean,
): void {
  const byL: Partial<Record<RowLabel, BitNode[]>> = {};
  for (const n of nodes) { (byL[n.label] = byL[n.label] || [])[n.idx] = n; }
  const inp = byL['input'] || [], ky = byL['key'] || [], res = byL['result'] || [], dec = byL['decoded'] || [];

  for (let i = 0; i < BITS; i++) {
    if (!inp[i] || !ky[i] || !res[i]) continue;
    const n1 = inp[i], n2 = ky[i], n3 = res[i];
    if (isNaN(n1.x)) continue;
    const tr = localTraceIdx === i;
    const pairs: [BitNode, BitNode, readonly number[]][] = [[n1, n2, COLORS.sage], [n2, n3, COLORS.peach]];
    if (showDecode && dec[i]) pairs.push([n3, dec[i], COLORS.sage]);

    let pi = 0;
    for (const [a, b, col] of pairs) {
      const xs = a.x + a.ox, ys = a.y + a.oy + a.r + 3;
      const xe = b.x + b.ox, ye = b.y + b.oy - b.r - 3;
      const cp = (a.y + b.y) / 2;
      const act = a.glow > 0.3 || b.glow > 0.3;
      ctx.beginPath();
      ctx.moveTo(xs, ys);
      ctx.bezierCurveTo(xs, cp, xe, cp, xe, ye);
      ctx.strokeStyle = tr ? rgba(COLORS.glow, 0.32) : rgba(act ? col : COLORS.dim, act ? 0.12 : 0.03);
      ctx.lineWidth = tr ? 1.5 : (act ? 0.8 : 0.3);
      ctx.stroke();

      if ((act || tr) && !reducedMotion) {
        const t = (time * (FLOW_DOT_BASE_SPEED - pi * FLOW_DOT_PAIR_SPEED_OFFSET) + i * 0.05 + pi * 0.3) % 1;
        const d = bezierPoint(xs, ys, xs, cp, xe, cp, xe, ye, t);
        ctx.beginPath();
        ctx.arc(d.x, d.y, tr ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = rgba(tr ? COLORS.glow : col, tr ? 0.5 : 0.3);
        ctx.fill();
      }
      pi++;
    }
  }
}

// ── Separators & labels ───────────────────────────────────────

export function drawSeparatorsAndLabels(
  ctx: CanvasRenderingContext2D,
  value: number,
  key: number,
  showDecode: boolean,
  W: number,
): void {
  const k16 = key & 0xFFFF;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '500 10px "JetBrains Mono",monospace';
  ctx.fillStyle = rgba(COLORS.dim, 0.28);
  ctx.fillText('\u2295', 36, (ROW_Y.input + ROW_Y.key) / 2 + 3);
  ctx.fillStyle = rgba(COLORS.dim, 0.08);
  ctx.fillRect(16, 228, W - 32, 1);

  if (showDecode) {
    ctx.fillStyle = rgba(COLORS.dim, 0.28);
    ctx.fillText('\u2295', 36, (ROW_Y.result + ROW_Y.decoded) / 2 + 3);
    ctx.fillStyle = rgba(COLORS.dim, 0.08);
    ctx.fillRect(16, 348, W - 32, 1);
  }

  const rM = [
    { l: 'in', y: ROW_Y.input, v: value, c: COLORS.sage },
    { l: 'key', y: ROW_Y.key, v: k16, c: COLORS.mauve },
    { l: 'out', y: ROW_Y.result, v: value ^ k16, c: COLORS.peach },
  ];
  if (showDecode) rM.push({ l: 'dec', y: ROW_Y.decoded, v: value, c: COLORS.sage });

  for (const rm of rM) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 9px "Manrope",sans-serif';
    ctx.fillStyle = rgba(rm.c, 0.5);
    ctx.fillText(rm.l, 58, rm.y - 12);
    ctx.font = '500 14px "JetBrains Mono",monospace';
    ctx.fillStyle = rgba(rm.c, 0.8);
    ctx.fillText(String(rm.v), 58, rm.y + 4);
    ctx.textAlign = 'left';
    ctx.font = '400 8px "JetBrains Mono",monospace';
    ctx.fillStyle = rgba(rm.c, 0.22);
    ctx.fillText(toBinaryGrouped(rm.v), 74, rm.y + 20);
  }
}

// ── Zap sparks (internal) ─────────────────────────────────────

function drawZapSparks(
  ctx: CanvasRenderingContext2D,
  n: BitNode,
  px: number, py: number, pr: number,
  time: number,
): void {
  const zp = n.zapTime;
  const sparkCount = Math.ceil(zp * 6);
  const sparkLen = pr * (1.5 + zp * 2.5);
  ctx.lineWidth = 0.8 + zp * 0.7;

  for (let si = 0; si < sparkCount; si++) {
    const angle = (si / sparkCount) * Math.PI * 2 + time * 12 + n.pulse;
    const len = sparkLen * (0.5 + Math.random() * 0.5);
    const segs = 2 + Math.floor(Math.random() * 2);

    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let seg = 1; seg <= segs; seg++) {
      const t = seg / segs;
      const jitterAngle = angle + (Math.random() - 0.5) * 1.2;
      ctx.lineTo(px + Math.cos(jitterAngle) * len * t, py + Math.sin(jitterAngle) * len * t);
    }
    ctx.strokeStyle = rgba([255, 255, 255], zp * (0.3 + Math.random() * 0.35) * 0.7);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let seg = 1; seg <= segs; seg++) {
      const t = seg / segs;
      const jitterAngle = angle + (Math.random() - 0.5) * 1.4;
      ctx.lineTo(px + Math.cos(jitterAngle) * len * t * 0.9, py + Math.sin(jitterAngle) * len * t * 0.9);
    }
    ctx.strokeStyle = rgba(n.color, zp * (0.3 + Math.random() * 0.35));
    ctx.lineWidth = 1.5 + zp;
    ctx.stroke();
  }

  if (zp > 0.6) {
    const ringR = pr + (1 - zp) * 35;
    const ringA = (zp - 0.6) * 1.5;
    ctx.beginPath(); ctx.arc(px, py, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = rgba([255, 255, 255], ringA * 0.25);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// ── Node rendering ────────────────────────────────────────────

export function drawNode(
  ctx: CanvasRenderingContext2D,
  n: BitNode,
  time: number,
  reducedMotion: boolean,
): { px: number; py: number; pr: number; isPointer: boolean } {
  const br = reducedMotion ? 0 : Math.sin(time * NODE_BREATHE_SPEED + n.pulse);
  const px = n.x + n.ox;
  const py = n.y + n.oy + (n.glow > 0.1 ? br : br * 0.2);
  const pr = Math.max(0.5, (n.r + (n.glow > 0.1 ? br * 0.1 : 0)) * n.scale);

  const g = n.glow, tH = n.trH;
  const bc = tH > 0.3 ? lerpColor(n.color, COLORS.glow, tH * 0.35) : n.color;

  // Glow halo
  if (g > 0.05 || tH > 0.05) {
    const gR = Math.max(pr + 1, pr * (1.5 + g * 1.5) + n.hover * 8 + tH * 12);
    const gA = g * 0.15 + n.hover * 0.06 + tH * 0.12;
    const gr = ctx.createRadialGradient(px, py, Math.max(0.1, pr * 0.2), px, py, gR);
    gr.addColorStop(0, rgba(bc, gA));
    gr.addColorStop(1, rgba(bc, 0));
    ctx.beginPath(); ctx.arc(px, py, gR, 0, Math.PI * 2);
    ctx.fillStyle = gr; ctx.fill();
  }

  // Electric zap sparks
  if (n.zapTime > 0 && !reducedMotion) {
    drawZapSparks(ctx, n, px, py, pr, time);
  }

  // Flipped ring
  if (n.fl) {
    ctx.beginPath(); ctx.arc(px, py, pr + 3.5, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(COLORS.glow, 0.35 + 0.15 * Math.sin(time * FLIPPED_RING_PULSE_SPEED + n.pulse) + tH * 0.25);
    ctx.lineWidth = 1.2; ctx.stroke();
  }

  // Trace ring
  if (tH > 0.05) {
    ctx.beginPath(); ctx.arc(px, py, pr + 2.5, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(COLORS.glow, tH * 0.4);
    ctx.lineWidth = 1; ctx.stroke();
  }

  // Node body
  const iR = Math.max(0.1, pr * 0.08);
  const og = ctx.createRadialGradient(px - pr * 0.25, py - pr * 0.25, iR, px, py, pr);
  const bA = 0.04 + g * 0.62 + tH * 0.15;
  og.addColorStop(0, rgba(bc, bA));
  og.addColorStop(0.6, rgba(bc, bA * 0.35));
  og.addColorStop(1, rgba(bc, bA * 0.06));
  ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fillStyle = og; ctx.fill();

  // Node border
  ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(bc, 0.06 + g * 0.25 + n.hover * 0.2 + tH * 0.2);
  ctx.lineWidth = g > 0.3 ? 1 : 0.5; ctx.stroke();

  // Bit text
  ctx.font = `600 ${pr > 9 ? 9 : 7}px "JetBrains Mono",monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(bc, 0.18 + g * 0.75 + tH * 0.2);
  ctx.fillText(n.bit ? '1' : '0', px, py + 0.5);

  return { px, py, pr, isPointer: n.ck && n.hover > 0.3 };
}
