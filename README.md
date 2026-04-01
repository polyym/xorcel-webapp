# XORcel

A browser-native CSV XOR obfuscator with interactive bit-level visualisation. Built with Svelte 5, DuckDB-WASM, and Tailwind CSS — all processing runs entirely in your browser.

Upload a CSV, select integer columns, pick a key (up to 64-bit), and download the transformed file. No data leaves your machine.

## Features

- **Transform tab** — Upload CSV, select columns, preview encode/decode with heatmaps and bit breakdowns, download result
- **Explore tab** — Interactive bit-level canvas (16-bit interactive view, overflow mode for larger keys) with spring physics, click-to-toggle key bits, trace-back highlighting, and a XOR truth table
- **DuckDB-WASM** — Full SQL engine in the browser for fast CSV processing (lazy-loaded on first file drop)
- **Reversible** — XOR is its own inverse; applying the same key twice restores the original values
- **Keyboard accessible** — Arrow keys to navigate key bits, Enter/Space to toggle, T to trace, 1/2 to switch tabs — full screen reader support via ARIA live regions
- **URL routing** — Hash-based routing (`#transform`, `#explore`) with browser back/forward support
- **Open source** — Free to use and contribute to

## Tech stack

- Svelte 5, Vite, TypeScript
- Tailwind CSS v4
- DuckDB-WASM (CSV parsing and XOR processing)
- Canvas 2D (Explore tab visualization)

## Development

Requires **Node.js 22.22.2+** (LTS).

```bash
npm install
npm run dev
```

Requires COOP/COEP headers for SharedArrayBuffer (configured in `vite.config.js` for dev, `netlify.toml` for production).

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Deploy

Configured for Netlify via `netlify.toml`. Connect the repo and it will build and deploy automatically with the required cross-origin isolation headers.

## Project structure

```
src/lib/
├── pages/          Transform.svelte, Explore.svelte
├── components/     UI components (Dropzone, EncodeTable, ExploreCanvas, KeyInput, etc.)
├── stores/         Svelte 5 rune-based state (file, key, columns, mode, tab)
└── utils/
    ├── duckdb.ts            CSV import/export via DuckDB-WASM
    ├── encoding.ts          Preview values, heatmap colors, download
    ├── xor.ts               Pure XOR math and binary formatting
    ├── canvas-types.ts      Shared types and layout constants
    ├── canvas-colors.ts     Color palette and helpers
    ├── canvas-physics.ts    Spring dynamics and node construction
    ├── canvas-rendering.ts  All canvas draw calls
    ├── canvas-hit-detection.ts  Click and trace hit testing
    ├── canvas-engine.ts     Barrel re-export of canvas modules
    └── motion.ts            Reduced-motion preference
```

## Browser compatibility

XORcel requires **SharedArrayBuffer** and **WebAssembly** support for DuckDB-WASM.

| Browser         | Minimum Version | Notes                                    |
|-----------------|-----------------|------------------------------------------|
| Chrome / Edge   | 91+             | Full support                             |
| Firefox         | 79+             | Full support                             |
| Safari          | 15.2+           | Requires COOP/COEP headers               |
| Opera           | 77+             | Chromium-based, same as Chrome           |

## Limitations

- XOR is obfuscation, not encryption. The key can be recovered through frequency analysis or known plaintext.
- Integer columns only, keys up to 64-bit
- Max 25 columns per file, max 50 MB file size; files over 500k rows display a memory warning
- NULL values in CSV integer columns are treated as 0 — decoding restores 0, not the original NULL
- JavaScript `Number` is precise up to 2^53 for preview values; the actual export uses DuckDB natively and retains full 64-bit precision
