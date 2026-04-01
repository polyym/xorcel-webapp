/**
 * Shared color palette and color helpers for canvas rendering.
 */

// ── Color palette ──────────────────────────────────────────────

export const COLORS = {
  sage: [124, 174, 128],
  mauve: [196, 126, 170],
  peach: [212, 151, 122],
  glow: [196, 184, 232],
  cream: [216, 210, 196],
  dim: [58, 56, 50],
} as const;

export function rgba(c: number[] | readonly number[], a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

export function lerpColor(a: number[] | readonly number[], b: number[] | readonly number[], t: number): number[] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}
