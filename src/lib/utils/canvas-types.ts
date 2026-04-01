/**
 * Shared types and layout constants for the canvas visualization.
 */

/** Recognized bit-row labels in the Explore visualization. */
export type RowLabel = 'input' | 'key' | 'result' | 'decoded';

export const ROW_Y: Record<RowLabel, number> = { input: 75, key: 170, result: 285, decoded: 400 };

export const BITS = 16;

/** Layout constants for bit-node grid positioning. */
export const LAYOUT = {
  padLeft: 76,
  padRight: 24,
  totalSlots: 16 + 3,
  maxRadius: 12,
  radiusFraction: 0.36,
  nibbleGapScale: 0.7,
} as const;

export interface AmbientDot {
  x: number; y: number; r: number;
  vx: number; vy: number; ph: number;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; color: number[] | readonly number[];
  r: number;
}

export interface BitNode {
  x: number; y: number; r: number;
  bit: boolean;
  color: number[] | readonly number[];
  label: RowLabel;
  idx: number; globalIdx: number;
  ck: boolean; fl: number;
  hover: number; pulse: number;
  ox: number; oy: number;
  glow: number; glowVel: number;
  scale: number; scaleVel: number;
  zapTime: number; trH: number;
}
