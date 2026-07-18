# Fairy-Stockfish (WebAssembly build)

This directory contains the pre-compiled WebAssembly/Emscripten build of
[Fairy-Stockfish](https://github.com/ianfab/Fairy-Stockfish), a chess variant
engine by Fabian Fichter derived from Stockfish, with NNUE support.

Files in this directory are taken verbatim from the npm package
[`fairy-stockfish-nnue.wasm`](https://www.npmjs.com/package/fairy-stockfish-nnue.wasm)
(version 1.1.11), published from the
[fairy-stockfish/fairy-stockfish.wasm](https://github.com/fairy-stockfish/fairy-stockfish.wasm)
repository:

- `stockfish.js` — Emscripten-generated loader/module (UCI protocol over
  `postMessage()` / `addMessageListener()`)
- `stockfish.wasm` — compiled engine binary (built with `largeboards=yes`,
  includes NNUE evaluation and support for all Fairy-Stockfish variants)
- `stockfish.worker.js` — internal Emscripten pthread worker, loaded
  automatically by `stockfish.js` when needed; not meant to be used directly

These files are **not** modified and are kept as a separate, easily
updatable unit, distinct from Jocly's own source code.

## License

Fairy-Stockfish is licensed under the **GNU General Public License v3.0**
(GPL-3.0), like the Stockfish project it derives from. See
https://github.com/ianfab/Fairy-Stockfish/blob/master/Copying.txt for the
full license text.

Jocly itself is licensed under the GNU Affero General Public License v3.0
(AGPL-3.0). Combining GPL-3.0 code with AGPL-3.0 code in the same work is
permitted by both licenses; the combined work is distributed under
AGPL-3.0, and this notice preserves the attribution and license terms of
the original Fairy-Stockfish authors as required by the GPL.

## Updating

To update to a newer Fairy-Stockfish release, replace the three files above
with the matching files from a newer version of the `fairy-stockfish-nnue.wasm`
npm package, keeping the same file names so that
`src/core/jocly.fairy.js` / `src/browser/jocly.fairyworker.js` keep working
unmodified.

## Browser requirements: SharedArrayBuffer / cross-origin isolation

This wasm build is **multi-threaded** (Emscripten pthreads — that is what
`stockfish.worker.js` is for), and pthreads hard-require
`SharedArrayBuffer`. Browsers only expose `SharedArrayBuffer` — in the page
and in all of its workers — when the top-level document is
**cross-origin isolated**, i.e. served with both HTTP headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without them, the engine fails at load with
`ReferenceError: Can't find variable: SharedArrayBuffer` (Safari wording;
Chrome/Firefox word it differently). Jocly detects this
(`jocly.fairyworker.js`'s preflight), logs an actionable message, and
**automatically falls back to the strongest native AI level** so the game
keeps playing — but to actually get Fairy-Stockfish, the headers must be
configured on the server.

On Apache, add this to the **site root** `.htaccess` (or the vhost config)
— note it must apply to the **HTML page**; a `.htaccess` in this directory
next to the wasm files has no effect on document policies:

```apache
<IfModule mod_headers.c>
	Header set Cross-Origin-Opener-Policy "same-origin"
	Header set Cross-Origin-Embedder-Policy "require-corp"
</IfModule>
```

Caveats:

- `COEP: require-corp` blocks cross-origin subresources (images, scripts,
  iframes from other domains) unless they opt in via CORS/CORP. If that
  breaks something on your pages, try
  `Header set Cross-Origin-Embedder-Policy "credentialless"` instead
  (supported by Chrome/Firefox; Safari support is more recent).
- Safari supports `SharedArrayBuffer` (with the headers) from 15.2 on.
- The headers are required even on `localhost`.
