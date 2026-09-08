# KataGo (kataeval) for Jocly

KataGo's evaluation and search compiled to WebAssembly, from
[saigo-online/katago-webgpu](https://github.com/saigo-online/katago-webgpu).
KataGo itself is MIT-licensed, which is compatible with Jocly's AGPL-3.0.

Driven by `src/browser/jocly.kataworker.js`, which is started by
`src/core/jocly.kata.js` when a level declares `"ai": "kata"` — the same shape
as the Fairy-Stockfish and Scan integrations next door.

## Which build is used

| file | what it is | shipped by the build |
|------|------------|----------------------|
| `kataeval.js` / `kataeval.wasm` | the plain build: no threads, one blocking `kgeSearch()` per position | **yes** |
| `kataeval-mt.js` / `kataeval-mt.wasm` | KataGo's real Search: tree reuse, ponder, live statistics | no |
| `kata-worker.js` | upstream's own demo worker, kept as the ABI reference | no |

The plain build is what Jocly asks an engine for: one move for one position.
`kgeSearch(moveLocs, moveCols, numMoves, toPla, komi, maxVisits, maxTimeMs, …)`
runs a batched MCTS to a budget and hands back a point, and blocking is what a
worker is for.

The threaded build is stronger and would give live statistics through
`kgeSearchBegin` / `kgePollAll`, but it needs `-pthread`, a 33-thread pool,
512 MB of initial memory, and a **cross-origin isolated page** (`COOP`/`COEP` —
see `third-party/fairy-stockfish/.htaccess`, which already sets those headers
for the same reason). Moving to it changes only the inside of
`jocly.kataworker.js`; `jocly.kata.js` would gain live progress and lose
nothing.

Until that happens, `kataeval-mt.*` is 2.1 MB in the repository that nothing
loads, and `kata-worker.js` is upstream code Jocly never runs. Both are
rebuildable from the upstream repository, so removing them costs only the
convenience of having the reference to hand.

## Networks

**No network is bundled here**, the way no NNUE is bundled under
`fairy-stockfish/nnue`. The build globs `*.bin.gz`, so it works with none, one
or all of them present.

A missing network is not harmless, though, and this is where KataGo differs
from Fairy-Stockfish: a missing NNUE falls back to a classical evaluation,
whereas KataGo cannot play at all without its net. `jocly.kataworker.js`
reports the failure and `jocly.kata.js` leaves the move to Jocly rather than
inventing one.

Downloadable from the upstream demo (`web/demo/vendor`) or converted from
KataGo's published networks:

The `kata` levels in `src/games/go/index.js` all name **`katago-nnue.bin.gz`**,
so whichever network you choose, drop it here under that name. One name means
switching networks is a file copy rather than a manifest edit, and it keeps the
levels from silently naming a file that no longer exists upstream — which is
what happened to `model-b5c192.bin.gz`.

Upstream publishes these, and any of them can play the part:

| size | notes |
|------|-------|
| ~3.8 MB | the small one (b6c96); fine on 9x9 |
| ~7 MB | the middle one (b5c192); upstream's default |
| ~11 MB | the larger one (b10c128); stronger, noticeably slower on CPU |

Bigger is stronger per visit and slower per visit, so on a CPU fallback the
small one at more visits often plays better than the large one at fewer.

## Backend

The wasm build prefers WebGPU and falls back to Eigen on the CPU
(`kgeSetForceCpu`). The worker reports which it got in its `Ready` message, so
it shows up in the console rather than only as a difference in speed.

`kgeSetGumbel(n)` selects the root move by Gumbel-top-n with sequential halving
rather than plain PUCT. It is stronger at the low visit counts a browser can
afford, which is the regime every level here plays in; `n <= 0` restores PUCT.
