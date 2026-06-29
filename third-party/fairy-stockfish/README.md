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
