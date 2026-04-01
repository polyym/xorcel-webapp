export type XorMode = 'encode' | 'decode';

let currentMode: XorMode = $state('encode');

export function getMode(): XorMode {
  return currentMode;
}

export function setMode(m: XorMode): void {
  currentMode = m;
}
