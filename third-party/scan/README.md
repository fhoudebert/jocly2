# Scan (WebAssembly build)

This directory contains a WebAssembly/Emscripten build of
[Scan](https://hjetten.home.xs4all.nl/scan/scan.html), Fabien Letouzey's
international (10x10) draughts engine - winner of the 18th-20th Computer
Olympiad 10x10 draughts competitions.

Files in this directory:

- `scan.js` — Emscripten-generated loader/module (`-s MODULARIZE=1
  -s EXPORT_NAME=ScanModule`), exposing the C API declared in
  `wasm_api.cpp` (`scan_init`, `scan_go`, ...) via `ccall`/`cwrap` - NOT
  Scan's native stdin/stdout "Hub" protocol (see `wasm_api.cpp`'s header
  comment for why: Scan's own background stdin-listening thread has no
  access to stdin once ported to wasm, and a request/response `ccall` is a
  better fit for a Web Worker than a text pipe would be anyway).
- `scan.wasm` — compiled engine binary (single-threaded build: `threads` is
  forced to 1 in `wasm_api.cpp`'s `scan_init()`, since a wasm Worker has no
  further sub-workers to parallelize search onto here; bitbases are not
  embedded, `bb-size` is forced to 0 - Scan remains extremely strong from
  search + evaluation + opening book alone).
- `data/eval` — Scan's evaluation weights (required).
- `data/book` — Scan's opening book (optional but recommended: loaded by
  `jocly.scanworker.js` on a best-effort basis).
- `wasm_api.cpp` (kept here as documentation/reference; the actual source
  lives with the rest of Scan's own sources when rebuilding, see below) —
  the small (~200 line) API layer added on top of Scan's unmodified engine
  sources, replacing `main.cpp`'s stdin/stdout command loop with plain
  exported C functions.

These files are built from Fabien Letouzey's own unmodified Scan sources
(GPLv3), plus the one added `wasm_api.cpp` file, compiled with Emscripten.
They are **not** Jocly source and are kept as a separate, rebuildable unit.

## License

Scan is licensed under the **GNU General Public License v3.0** (GPL-3.0).
See https://hjetten.home.xs4all.nl/scan/scan.html and Scan's own
`license.txt` for the full license text and attribution
(Copyright (C) Fabien Letouzey).

Jocly itself is licensed under the GNU Affero General Public License v3.0
(AGPL-3.0). Combining GPL-3.0 code with AGPL-3.0 code in the same work is
permitted by both licenses; the combined work is distributed under
AGPL-3.0, and this notice preserves the attribution and license terms of
the original Scan author as required by the GPL.

## Rebuilding

1. Get Scan's sources (e.g. `git clone https://github.com/rhalbersma/scan.git`).
2. Drop this directory's `wasm_api.cpp` into Scan's `src/` directory.
3. Compile with Emscripten (tested with emcc 3.1.6):

   ```
   em++ -std=c++14 -fno-rtti -O2 -DNDEBUG -fexceptions \
     -s DISABLE_EXCEPTION_CATCHING=0 \
     -s ENVIRONMENT=node,web,worker -s MODULARIZE=1 -s EXPORT_NAME=ScanModule \
     -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=33554432 \
     -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","FS"]' \
     -s EXPORTED_FUNCTIONS='["_scan_init","_scan_new_game","_scan_set_position_fen","_scan_get_position_fen","_scan_legal_moves","_scan_play_move","_scan_is_game_over","_scan_turn","_scan_go","_scan_set_param","_malloc","_free"]' \
     bb_base.cpp bb_comp.cpp bb_index.cpp bit.cpp book.cpp common.cpp dxp.cpp eval.cpp \
     fen.cpp game.cpp gen.cpp hash.cpp hub.cpp libmy.cpp list.cpp wasm_api.cpp move.cpp pos.cpp \
     score.cpp search.cpp socket.cpp sort.cpp thread.cpp tt.cpp util.cpp var.cpp \
     -o scan.js
   ```

   **`-fexceptions -s DISABLE_EXCEPTION_CATCHING=0` is not optional.**
   Emscripten disables proper C++ exception unwinding by default; without
   this flag the engine loads and even answers from its opening book, but
   crashes as soon as it runs a real (non-book) search, with an
   unhelpful raw-number "error" instead of a catchable JS exception.

4. Copy `scan.js`, `scan.wasm`, and Scan's own `data/eval` / `data/book`
   into this directory, keeping the same file names/layout so that
   `src/core/jocly.scan.js` / `src/browser/jocly.scanworker.js` keep working
   unmodified.
