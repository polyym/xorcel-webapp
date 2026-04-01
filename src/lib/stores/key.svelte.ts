import { MAX_KEY } from '../utils/xor.ts';

export type ClampReason = null | 'max' | 'negative';

let keyValue = $state(255n);
let clampReason: ClampReason = $state(null);

export function getKey(): bigint {
  return keyValue;
}

export function getClampReason(): ClampReason {
  return clampReason;
}

export function clearClamped(): void {
  clampReason = null;
}

export function setKey(k: bigint | number): void {
  const v = typeof k === 'bigint' ? k : BigInt(Math.max(0, Math.round(k) || 0));
  let reason: ClampReason = null;
  let result = v;
  if (result < 0n) { result = 0n; reason = 'negative'; }
  if (result > MAX_KEY) { result = MAX_KEY; reason = 'max'; }
  clampReason = reason;
  keyValue = result;
}
