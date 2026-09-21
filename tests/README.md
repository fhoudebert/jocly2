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
| `shogi/` | Chu Shogi, Sho Shogi and Kotaishi, Tenjiku Shogi, Minjiku Shogi |
| `xiangqi/` | Janggi and Xiangqi |
| `baroque/` | the Ultima family - `baroque/ultima/`, `baroque/rococo/`, `baroque/rocaille/`, plus the Ghost that is shared |
| `cubic/` | 3D Cubic Chess |
| `3dchess/`, `space-spartan/` | one game each |

## Harnesses

Four files are not tests but the scaffolding the tests share, and each carries
its own loader for the game family it serves:

- `fairy/harness.js` - loads a chessbase model into a sandbox, builds boards
  from a `{ square: "wK" }` map, and wraps a model in a `context()` carrying
  the questions a rules test keeps asking - what a piece reaches, what a Pawn
  promotes to, whether a saved position reloads unchanged - and is used by every suite under `fairy/`, by
  `shogi/chu-shogi.test.js` and by two suites in `core/`. It began as the
  harness of Khan's Chess, so `loadModel()` with no argument still loads that
  game; every other caller passes its own script list
- `baroque/rococo/harness.js`, `baroque/ultima/harness.js`
- `space-spartan/harness.js`, also used by `3dchess/fifty.test.js`
- `cubic/harness.js`

A suite that needs a family it does not belong to reaches across rather than
gaining a second harness: `shogi/chu-shogi.test.js` uses the khans one because
Chu Shogi is a chessbase model like the rest.

## What a suite must do

Two rules, learned from suites that broke them:

- **it must be able to fail.** Six suites under `cubic/` printed what they
  found and exited zero whatever it was - `realmate.js` would have printed
  "winner DRAW" without a word, `play2.js` counted captured Kings and
  published them as a statistic. They counted among the suites that pass.
  Every suite now asserts; the printouts stay, they say where to look when a
  check falls;
- **it must run when `tests/run.js` starts it.**
  `crazyhouse/roundtrip-campaign.js` gated its three campaigns on a
  command-line argument the runner does not pass, so `npm test` ran it and it
  checked nothing. With no argument it now plays all three - 330 positions,
  written and read back, hands included.

A suite that needs `npx gulp build` says `SKIP` and exits zero. That contract
held for six of the eighteen that load the build: the other twelve stopped on
an import trace, and a freshly cloned repository greeted its owner with twelve
failures that were not. They all skip now.

## The manifest snapshot

`core/manifest-split.test.js` guarded the splitting of `index.js` with a
digest per game. That split is done, and a digest cannot tell a regression
from an intended edit: every manifest change failed it, and the only possible
answer was `--update`, which re-blesses what was just written.

It keeps what a digest does not cover: the list of games **in order** (the
examples walk it unsorted, so a game moved or dropped shows on screen and
nowhere else in the tests), the size of the split pieces, and - new - that
**every declared resource exists on disk**. That last one found eleven dead
declarations the digest had compared happily as text: four games shipping no
credits because a `res/rules/` prefix was missing (fixed), and six
declarations of pages that were never written - the credits of losing chess,
the descriptions of four shogi - which were dropped: a game without a
description is a normal case (nineteen others have none), a link to nothing
is not.

`--update` is now needed only when a game is added, removed or moved.
