let selected = $state(new Set<string>());

export function getSelected(): Set<string> {
  return selected;
}

export function toggleColumn(name: string): void {
  const next = new Set(selected);
  if (next.has(name)) next.delete(name);
  else next.add(name);
  selected = next;
}

export function selectAllIntegers(intCols: string[]): void {
  selected = new Set(intCols);
}

export function clearSelection(): void {
  selected = new Set();
}

export function resetColumns(): void {
  selected = new Set();
}
