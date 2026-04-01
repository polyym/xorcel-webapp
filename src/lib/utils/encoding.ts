/**
 * Encoding preview helpers — pure functions for the Transform tab step 3.
 */

import { xorValue, diffIntensity } from './xor.ts';
import { COLORS, rgba } from './canvas-engine.ts';

const HEATMAP_BASE_OPACITY = 0.03;
const HEATMAP_SCALE_FACTOR = 0.08;

/**
 * Coerce a cell value to a number for XOR processing.
 * NULL / undefined / non-numeric values are treated as 0.
 *
 * NOTE: DuckDB integer columns may contain NULL for missing rows.
 * These are silently converted to 0 before XOR, which means:
 *   - XOR(NULL, key) produces the key value, not NULL
 *   - Decoding will restore 0, not the original NULL
 * This is intentional — XOR operates on integers only.
 */
export function toInt(value: unknown): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Compute snap values for all selected integer columns across sample rows. */
export function computeDisplayValues(
  sampleRows: Record<string, unknown>[],
  intCols: string[],
  selectedCols: Set<string>,
  key: bigint,
): Record<string, number> {
  const vals: Record<string, number> = {};
  for (const [ri, row] of sampleRows.entries()) {
    for (const c of intCols) {
      if (selectedCols.has(c)) {
        vals[`${ri}_${c}`] = xorValue(toInt(row[c]), key);
      }
    }
  }
  return vals;
}

/** Get the display value for a cell, falling back to live XOR if not cached. */
export function getDisplayValue(
  ri: number,
  col: string,
  displayVals: Record<string, number>,
  sampleRows: Record<string, unknown>[],
  key: bigint,
): number {
  const k = `${ri}_${col}`;
  return Math.round(displayVals[k] ?? xorValue(toInt(sampleRows[ri]?.[col]), key));
}

/** Heatmap background color based on XOR diff intensity. */
export function getHeatmapBg(orig: number, enc: number): string {
  const intensity = diffIntensity(orig, enc);
  return rgba(COLORS.peach, HEATMAP_BASE_OPACITY + intensity * HEATMAP_SCALE_FACTOR);
}

/** Generate output filename from original. */
export function makeOutputFilename(originalName: string, mode: 'encode' | 'decode'): string {
  return originalName.replace(/\.csv$/i, '') + '_' + (mode === 'encode' ? 'encoded' : 'decoded') + '.csv';
}

/** Trigger a CSV blob download. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
