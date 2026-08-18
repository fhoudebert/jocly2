# Tests

Run any file directly with node; each prints its own tally and exits non-zero
on failure.

    node tests/fairy/khans/rules.test.js

Most suites read the sources under `src/` and need no build. The ones that
drive a real match - `tests/core/*.mjs`, `tests/core/fairy-fallback.js`,
`tests/fairy/khans/game.test.js`, `tests/shogi/kotaishi*.js` - load
`dist/node/jocly.core.js` and want `npx gulp build` first. They say so and skip
rather than fail when the build is missing.

## The folders

| folder | what is in it |
|---|---|
| `core/` | the engine rather than a game: position loading, move history, rollback, FEN and move numbering, the manifest and its snapshot, the promotion popup, and the Fairy-Stockfish integration |
| `fairy/` | the large chess variants - Cazaux's games, Gigachess, Grand Chess, Grant Acedrex, Heavy Chess, Makromachy, Timurid, Zanzibar-S, Janggi, and Khan's Chess in `fairy/khans/` |
| `shogi/` | Chu Shogi, Kotaishi Shogi, Tenjiku Shogi |
| `baroque/` | the Ultima family - `baroque/ultima/`, `baroque/rococo/`, `baroque/rocaille/`, plus the Ghost that is shared |
| `cubic/` | 3D Cubic Chess |
| `3dchess/`, `space-spartan/` | one game each |

## Harnesses

Four files are not tests but the scaffolding the tests share, and each carries
its own loader for the game family it serves:

- `fairy/khans/harness.js` - loads a chessbase model into a sandbox, builds
  boards from a `{ square: "wK" }` map, and is used by every suite under
  `fairy/`, by `shogi/chu-shogi.test.js` and by two suites in `core/`
- `baroque/rococo/harness.js`, `baroque/ultima/harness.js`
- `space-spartan/harness.js`, also used by `3dchess/fifty.test.js`
- `cubic/harness.js`

A suite that needs a family it does not belong to reaches across rather than
gaining a second harness: `shogi/chu-shogi.test.js` uses the khans one because
Chu Shogi is a chessbase model like the rest.

## Two suites that fail for reasons of their own

`cubic/*` looks for `src/games/chessbase/cubic-model.js`, which is not where
that model lives. `shogi/tenjiku.js` reports "Game tenjiku-shogi not found":
the manifest declares the game but `src/games/chessbase/index.js` never lists
it, so it is absent from the module. Both predate the move into folders and
are unrelated to it.
