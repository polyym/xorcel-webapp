/**
 * Hit testing for canvas interactions — click detection and trace index lookup.
 */

import type { BitNode } from './canvas-types.ts';

export function findClickedKeyBit(
  nodes: BitNode[],
  cx: number,
  cy: number,
  hitRadius = 8,
): BitNode | null {
  for (const n of nodes) {
    if (!n.ck) continue;
    const dx = cx - (n.x + n.ox), dy = cy - (n.y + n.oy);
    if (dx * dx + dy * dy < (n.r + hitRadius) * (n.r + hitRadius)) {
      return n;
    }
  }
  return null;
}

export function findTraceIdx(
  nodes: BitNode[],
  mx: number,
  my: number,
): number {
  for (const n of nodes) {
    if (n.label !== 'result' && n.label !== 'decoded') continue;
    if (isNaN(n.x)) continue;
    const dx = mx - (n.x + n.ox), dy = my - (n.y + n.oy);
    if (dx * dx + dy * dy < (n.r + 10) * (n.r + 10)) return n.idx;
  }
  return -1;
}
