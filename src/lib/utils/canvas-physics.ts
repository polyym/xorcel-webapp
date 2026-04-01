/**
 * Physics simulation for bit nodes — spring dynamics, mouse repulsion, zap effects.
 * Also handles node construction from values.
 */

import type { BitNode, RowLabel } from './canvas-types.ts';
import { BITS, LAYOUT, ROW_Y } from './canvas-types.ts';
import { COLORS } from './canvas-colors.ts';

/**
 * Spring/physics tuning constants for bit-node animation.
 *
 * Approach factors (0–1) control lerp speed per frame: lower = slower/smoother.
 * Spring values follow a basic spring-damper model: stiffness pulls toward
 * the target, damping prevents oscillation.
 */
const PHYSICS = {
  /** How quickly the zap (electric flicker) effect fades out per frame. ~36 frames to fully decay. */
  zapDecay: 0.028,

  /** Lerp rate for glow intensity when a bit is ON — slow rise for a smooth "power up" feel. */
  glowApproachActive: 0.08,
  /** Lerp rate for glow intensity when a bit is OFF — faster fade-out so inactive bits dim quickly. */
  glowApproachInactive: 0.22,

  /** Spring stiffness pulling inactive-bit scale toward its rest value. */
  scaleSpringStiffness: 0.1,
  /** Damping factor for the scale spring (0 = no damping, 1 = critically damped). */
  scaleSpringDamping: 0.65,
  /** Lerp rate for scale when a bit is ON — gentle approach to full size. */
  scaleApproachActive: 0.07,
  /** Velocity damping applied to active-bit scale each frame (halves residual bounce). */
  scaleVelDampActive: 0.5,
  /** Scale that inactive (0) bits settle at — smaller than active bits to create visual contrast. */
  inactiveRestScale: 0.6,

  /** Pixel radius within which the mouse cursor pushes nodes away. */
  mouseRepulsionRadius: 55,
  /** Force multiplier for mouse repulsion — higher = stronger push. */
  mouseRepulsionStrength: 3.5,
  /** Per-frame damping on positional offset (ox/oy). 0.9 means 10% decay per frame. */
  offsetDamping: 0.9,

  /** Lerp rate for the trace-highlight intensity when hovering a result bit. */
  traceApproach: 0.14,
} as const;

export function tickNodePhysics(
  n: BitNode,
  mx: number,
  my: number,
  localTraceIdx: number,
  reducedMotion: boolean,
): void {
  if (reducedMotion) {
    n.glow = n.bit ? 1 : 0;
    n.scale = n.bit ? 1 : PHYSICS.inactiveRestScale;
    n.trH = 0;
    n.ox = 0;
    n.oy = 0;
    return;
  }

  const gT = n.bit ? 1 : 0;

  if (n.bit && n.zapTime > 0) {
    n.zapTime -= PHYSICS.zapDecay;
    const zp = n.zapTime;
    const flicker = Math.sin(zp * 65) * 0.4 + Math.sin(zp * 97) * 0.25;
    const settle = 1 - zp;
    n.glow = 0.5 + flicker * zp + settle * 0.5;
    n.glow = Math.max(0.15, Math.min(1.1, n.glow));
    const jitter = (Math.sin(zp * 80) * 0.12 + Math.sin(zp * 130) * 0.06) * zp;
    n.scale = 0.4 + settle * 0.6 + jitter;
    n.scale = Math.max(0.25, n.scale);
    if (zp > 0.3) {
      n.ox += (Math.random() - 0.5) * 3 * zp;
      n.oy += (Math.random() - 0.5) * 2.5 * zp;
    }
  } else if (n.bit) {
    n.glow += (gT - n.glow) * PHYSICS.glowApproachActive;
    n.glow = Math.max(0, Math.min(1.1, n.glow));
    n.scaleVel *= PHYSICS.scaleVelDampActive;
    n.scale += (1 - n.scale) * PHYSICS.scaleApproachActive;
    if (n.zapTime > 0) n.zapTime = 0;
  } else {
    n.glow += (gT - n.glow) * PHYSICS.glowApproachInactive;
    n.glow = Math.max(0, Math.min(1.1, n.glow));
    n.scaleVel += (PHYSICS.inactiveRestScale - n.scale) * PHYSICS.scaleSpringStiffness;
    n.scaleVel *= PHYSICS.scaleSpringDamping;
    n.scale += n.scaleVel;
    if (n.zapTime > 0) n.zapTime -= PHYSICS.zapDecay;
  }
  n.scale = Math.max(0.15, n.scale);

  const isT = localTraceIdx === n.idx && (n.label === 'input' || n.label === 'key' || n.label === 'result');
  n.trH += ((isT ? 1 : 0) - n.trH) * PHYSICS.traceApproach;

  const dx = mx - (n.x + n.ox), dy = my - (n.y + n.oy);
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < PHYSICS.mouseRepulsionRadius && dist > 0) {
    const f = (1 - dist / PHYSICS.mouseRepulsionRadius) * PHYSICS.mouseRepulsionStrength;
    n.ox -= (dx / dist) * f * 0.25;
    n.oy -= (dy / dist) * f * 0.25;
  }
  n.ox *= PHYSICS.offsetDamping;
  n.oy *= PHYSICS.offsetDamping;
}

export function buildBitNodes(
  value: number,
  key: number,
  showDecode: boolean,
  W: number,
  oldNodes: BitNode[],
): BitNode[] {
  if (!W) return [];

  const k16 = key & 0xFFFF;
  const res = value ^ k16;

  const oM: Record<string, BitNode> = {};
  for (const n of oldNodes) { oM[n.label + ':' + n.idx] = n; }

  const nn: BitNode[] = [];
  const usable = W - LAYOUT.padLeft - LAYOUT.padRight;
  const gap = usable / (LAYOUT.totalSlots - 1);
  const r = Math.min(LAYOUT.maxRadius, gap * LAYOUT.radiusFraction);

  const rows: { label: RowLabel; value: number; color: readonly number[]; y: number; ck?: boolean }[] = [
    { label: 'input', value, color: COLORS.sage, y: ROW_Y.input },
    { label: 'key', value: k16, color: COLORS.mauve, y: ROW_Y.key, ck: true },
    { label: 'result', value: res, color: COLORS.peach, y: ROW_Y.result },
  ];
  if (showDecode) {
    rows.push({ label: 'decoded', value: res ^ k16, color: COLORS.sage, y: ROW_Y.decoded });
  }

  for (const row of rows) {
    const bin = ((row.value & 0xFFFF) >>> 0).toString(2).padStart(BITS, '0');
    for (let i = 0; i < BITS; i++) {
      const nO = Math.floor(i / 4) * gap * LAYOUT.nibbleGapScale;
      const x = LAYOUT.padLeft + i * gap + nO;
      const bit = bin[i] === '1';
      const gI = BITS - 1 - i;
      const fl = row.label === 'result' ? ((k16 >> gI) & 1) : 0;
      const old = oM[row.label + ':' + i];
      const jOn = bit && old && !old.bit;
      const jOff = !bit && old && old.bit;

      nn.push({
        x, y: row.y, r, bit, color: row.color, label: row.label,
        idx: i, globalIdx: gI, ck: row.ck || false, fl,
        hover: 0, pulse: old ? old.pulse : Math.random() * Math.PI * 2,
        ox: old ? old.ox : 0, oy: old ? old.oy : 0,
        glow: jOn ? 0.6 : (old ? old.glow : (bit ? 1 : 0)),
        glowVel: 0,
        scale: jOn ? 0.4 : (old ? old.scale : 1),
        scaleVel: jOff ? 0.15 : (old ? old.scaleVel : 0),
        zapTime: jOn ? 1.0 : (old ? (old.zapTime > 0 ? old.zapTime : 0) : 0),
        trH: 0,
      });
    }
  }

  return nn;
}
