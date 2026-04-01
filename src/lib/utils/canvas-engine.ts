/**
 * Canvas engine barrel — re-exports from focused sub-modules.
 *
 * Modules:
 *   canvas-types.ts       — shared types and layout constants
 *   canvas-colors.ts      — color palette and helpers
 *   canvas-physics.ts     — spring dynamics, node construction
 *   canvas-rendering.ts   — all draw calls (dots, lines, nodes, particles)
 *   canvas-hit-detection.ts — click and trace hit testing
 */

export { COLORS, rgba } from './canvas-colors.ts';
export type { RowLabel, AmbientDot, Particle, BitNode } from './canvas-types.ts';
export { tickNodePhysics, buildBitNodes } from './canvas-physics.ts';
export {
  createAmbientDots, drawAmbientDots,
  createBurst, drawParticles,
  drawFlowLines, drawSeparatorsAndLabels, drawNode,
} from './canvas-rendering.ts';
export { findClickedKeyBit, findTraceIdx } from './canvas-hit-detection.ts';
