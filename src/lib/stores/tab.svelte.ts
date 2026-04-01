export type TabName = 'transform' | 'explore';

const validTabs: Set<string> = new Set(['transform', 'explore']);

function tabFromHash(): TabName {
  const hash = window.location.hash.replace('#', '');
  return validTabs.has(hash) ? (hash as TabName) : 'transform';
}

let activeTab: TabName = $state(tabFromHash());

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    activeTab = tabFromHash();
  });
}

export function getTab(): TabName {
  return activeTab;
}

export function setTab(tab: TabName): void {
  activeTab = tab;
  window.location.hash = tab;
}
