# Tests

    npm test                    everything
    npm test -- fairy           one category
    node tests/run.js shogi core        the same, without npm
    node tests/run.js fairy/khans       a subfolder
    node tests/fairy/khans/rules.test.js    one suite, on its own

`tests/run.js` starts each suite in its own process, reads its verdict and adds
up. A suite counts as failed on a non-zero exit - which every harness here does
- or when its output carries a failure marker anyway, since a few of the older
scripts print "N ECHEC" and still exit 0. Failing suites have their last lines
reprinted at the end, so one command says what broke.

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

- `fairy/harness.js` - loads a chessbase model into a sandbox, builds boards
  from a `{ square: "wK" }` map, and is used by every suite under `fairy/`, by
  `shogi/chu-shogi.test.js` and by two suites in `core/`. It began as the
  harness of Khan's Chess, so `loadModel()` with no argument still loads that
  game; every other caller passes its own script list
- `baroque/rococo/harness.js`, `baroque/ultima/harness.js`
- `space-spartan/harness.js`, also used by `3dchess/fifty.test.js`
- `cubic/harness.js`

A suite that needs a family it does not belong to reaches across rather than
gaining a second harness: `shogi/chu-shogi.test.js` uses the khans one because
Chu Shogi is a chessbase model like the rest.

## Two suites that fail for a reason of their own

`shogi/tenjiku.js` reports "Game tenjiku-shogi not found", and
`shogi/tenjiku-view.js` fails its last check, "the game is in exports.games".
Same cause: `src/games/chessbase/manifest/shogi.js` declares the game but
`src/games/chessbase/index.js` never lists it, so it is absent from the module.
Adding `shogi["tenjiku-shogi"]` to that list is all the two suites are waiting
for - they pass every other check.
