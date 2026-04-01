<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './lib/components/Header.svelte';
  import Footer from './lib/components/Footer.svelte';
  import Transform from './lib/pages/Transform.svelte';
  import Explore from './lib/pages/Explore.svelte';
  import { getTab } from './lib/stores/tab.svelte.ts';
  import { terminateDb } from './lib/utils/duckdb.ts';

  let crashed = $state(false);
  let crashError = $state('');

  function handleError(error: unknown) {
    crashed = true;
    crashError = error instanceof Error ? error.message : String(error);
    console.error('XORcel crashed:', error);
  }

  function handleReload() {
    window.location.reload();
  }

  onMount(() => {
    const cleanup = () => { terminateDb(); };
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      terminateDb();
    };
  });
</script>

<svelte:boundary onerror={handleError}>
  {#if crashed}
    <div class="crash-screen">
      <div class="crash-card">
        <div class="crash-icon">!</div>
        <h2>Something went wrong</h2>
        <p>XORcel encountered an unexpected error. No data was uploaded or lost — all processing is local.</p>
        <pre class="crash-detail">{crashError}</pre>
        <button class="btn btn-go" onclick={handleReload}>Reload XORcel</button>
      </div>
    </div>
  {:else}
    <Header />
    <main class="main">
      {#if getTab() === 'transform'}
        <div class="page active">
          <Transform />
        </div>
      {:else}
        <div class="page active">
          <Explore />
        </div>
      {/if}
    </main>
    <Footer />
  {/if}
</svelte:boundary>
