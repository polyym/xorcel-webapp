/** Max key value: 2^64 - 1 */
export const MAX_KEY = (1n << 64n) - 1n;

/** XOR two values, return as number (safe for display). */
export function xorValue(value: bigint | number, key: bigint | number): number {
  return Number(BigInt(value) ^ BigInt(key));
}

/** Effective bit width of a value (minimum 16). */
export function bitWidth(n: bigint | number): number {
  const v = typeof n === 'bigint' ? n : BigInt(n);
  if (v <= 0n) return 16;
  const bits = v.toString(2).length;
  // Round up to nearest standard width
  if (bits <= 16) return 16;
  if (bits <= 32) return 32;
  return 64;
}

/** Binary string padded to the given width. */
export function toBinary(n: bigint | number, bits?: number): string {
  const v = typeof n === 'bigint' ? n : BigInt(Math.max(0, n));
  const w = bits ?? bitWidth(v);
  const raw = v.toString(2);
  return raw.length >= w ? raw.slice(-w) : raw.padStart(w, '0');
}

/** Formatted binary with 0b prefix and nibble grouping. */
export function formatBinary(n: bigint | number, bits?: number): string {
  const bin = toBinary(n, bits);
  return '0b ' + bin.match(/.{4}/g)!.join(' ');
}

/** Binary string grouped into nibbles: "0000 1111 0000 1111" */
export function toBinaryGrouped(n: bigint | number, bits?: number): string {
  const bin = toBinary(n, bits);
  return bin.match(/.{4}/g)!.join(' ');
}

/** Count set bits (popcount). */
export function popcount(n: bigint | number): number {
  let v = typeof n === 'bigint' ? n : BigInt(n);
  if (v < 0n) v = -v;
  let count = 0;
  while (v > 0n) {
    count += Number(v & 1n);
    v >>= 1n;
  }
  return count;
}

/** Diff intensity for heatmap coloring (0 to 1). Uses log scale to handle both small and large values. */
export function diffIntensity(original: bigint | number, encoded: bigint | number): number {
  const diff = Math.abs(Number(encoded) - Number(original));
  if (diff === 0) return 0;
  // Log scale: maps diff from [1, Infinity) to (0, 1] with good spread across magnitudes
  return Math.min(1, Math.log1p(diff) / Math.log1p(1e9));
}

/** Compute XOR result, handling any bit width. */
export function computeXorResult(value: bigint | number, key: bigint | number): bigint {
  return BigInt(value) ^ BigInt(key);
}
