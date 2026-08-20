# Tenjiku Shogi - tests and implementation notes

```
node tests/tenjiku.js        # rules (83 assertions)
node tests/tenjiku-view.js   # model <-> sprite sheet wiring (15 assertions)
```

Both run against the built library (`npx gulp build` first).

## Rules implemented

Everything Chu Shogi does is inherited from the same engine pieces
(`base-model.js` + `locust-move-model.js`), so Lion double moves, Falcon/Eagle
stings, optional promotion and the royal Crown Prince behave exactly as in
`shogi/chu-shogi-model.js`. Specific to Tenjiku:

* **Jumping generals** - Bishop/Rook General (rank 1), Vice General (rank 3),
  Great General (rank 5), King and Crown Prince (rank 7). A general jumps over
  any number of pieces of *strictly lower* rank, friend or foe, and may capture
  what it cannot jump over. Nothing jumps over royalty.
* **Fire Demon** - slides as a Free Boar (diagonals + sideways), plus an area
  move of up to 3 King steps. It burns every adjacent enemy after moving, and
  a piece that moves next to a Demon burns instead (the stationary Demon wins,
  and does not burn anything on that turn). A Water Buffalo promoting to Fire
  Demon burns immediately.
* **Area moves** - Fire Demon and Vice General: up to 3 King steps in freely
  chosen directions through empty squares, stopping at the first capture.
* **Heavenly Tetrarch** - ski slider (ignores the first square) unlimited
  vertically and diagonally, at most 3 squares sideways, plus igui.
* Promotion zone = last 5 ranks, optional, also allowed when starting inside
  the zone and capturing. Pawn/Lance/Iron General/Knight promote by force when
  they would otherwise be stuck on the far edge.
* Stalemate loses (`cbOnStaleMate = -1`), 50 moves without capture is a draw.

## Jump-captures and check

A jumping general may **capture** royalty through a screen (it can never *jump
over* it, royalty holding the highest rank). Nothing can be interposed against
such an attack, so it is a check like any other and the engine reports it as
one - `base-model.js` needed a threat-graph fix for that, see below.

The opening consequence is the historical one: 1. j5-j6 (clearing the diagonal)
threatens 2. VGi4-o10 mating through m12/l13/k14/j15, so Black must defend the
landing square, typically with SEl13-n11. `tests/tenjiku.js` plays both lines.

## Known deviations / open points

* Check detection for the area moves and for the Demon burn zone is done in a
  `cbGetAttackers` hook, and only when the tested square holds a royal. The
  static exchange evaluation therefore ignores Demon burns.
* Repetition is handled by the shared `preventRepeat` option (draw), not by the
  historic "the checker must deviate" rule.
* The threat graph used to emit two items per square for a piece that both
  captures and screen-captures (the jumping generals here, the jumpers of
  Minjiku Shogi). The screen-capture path then started on the attacked square
  itself, which counted as the first screen: with royalty holding the highest
  rank, that hid every screen-capture check. Fixed in `cbGetThreatGraph` by
  emitting one item per square carrying both roles.

## Playing strength

Tenjiku is unusually sharp: a check by a jumping general can be answered only
by taking the checking piece or by moving the King, since nothing can be
interposed. From the start `1. j5-j6` (clearing the i4-o10 diagonal) already
threatens `2. VGi4-o10#`, so a search that does not weigh checks properly walks
straight into it.

The game therefore has its own `gameOptions.levelOptions` instead of the shared
ones: `checkFactor` goes from 0.2 to 5, which is what actually makes the search
answer that threat (`SEl13-n11`, `o12-o11`, ... all defend the landing square).
Levels are also its own: positions have 70+ legal moves, so the node budgets are
larger than the Chu Shogi ones - "Strong" is 200000 nodes / 120 s, and with them
the reported loss is gone.

The model side was profiled and made cheaper along the way: the Fire
Demon / Vice General lookups keep a list of the few relevant pieces instead of
scanning all 156 on every attacker query, the walk of a Demon is skipped
entirely when it is more than 4 squares away (`distGraph`), and the duplicate
filter compares an integer key first. What dominates the remaining time is the
UCT core itself (`Model.Board.CopyFrom` and the garbage it produces), which is
shared by every game and was left alone.

### Where the time goes (measured, initial position)

| | before | after |
|---|---|---|
| `cbGetAttackers` on a royal square | 96.6 µs | 45.8 µs |
| `GenerateMoves` (74 legal moves) | 19.9 ms | 13.5 ms |
| 20000 UCT nodes | 13.1 s | 10.0 s |

Per child of an expanded node: `CopyFrom` 8 µs, `ApplyMove` 16 µs,
`Evaluate` 101 µs, `GetSignature` 0.4 µs. So the UCT core itself (board copies,
node bookkeeping) is *not* what costs - `GenerateMoves` and `Evaluate` are, and
inside `GenerateMoves` it is the legality test, i.e. `cbGetAttackers`.

The two remaining candidates, both in `base-model.js` and both shared by every
game, are `Model.Board.Evaluate` (~100 µs, and it allocates a dozen objects,
two typed arrays and one array per piece type present on every call, most of
which no game reads) and the `for(var pos1 in graph)` walk of the threat tree.

### Seeing mate one ply earlier

The UCT search only learned that a move was mate when the mating node was
expanded in its turn, which in a game with 70+ legal moves per position costs a
few thousand nodes per candidate. `Model.Board.HasLegalMove` (early-exit
legality test, royal moves tried first) lets the search settle that as soon as
the mating move is generated - and only for the moves that give check, whose
`ck` flag the model already computes. Answering `1. j5-j6` correctly used to
need 200000 nodes, then 60000 once checks were weighted; it now takes 5000
(3 s), for about 15% more time per node.

### What still escapes the search

`1. j5-j6 SEl13-n11 2. BGk4-i6` is not answered correctly yet. The refutation of
a wrong reply is only three plies long - `3. BGi6xn11+` (the defender of o10
disappears), the recapture is forced (1 or 2 legal moves), then `4. VGi4-o10#` -
and the mate itself is now recognized the moment `VGi4-o10` is generated. What
the search does not do is *look* at `BGi6xn11`: statically it is a losing
capture (a Bishop General, 12, for a Soaring Eagle, 9) and the static exchange
evaluation duly scores it negative, so UCT almost never visits it. Raising
`checkFactor` does not fix it (tried at 15 and 30: same move, and the opening
defence gets worse).

What this pattern needs is a forcing-line extension: when a child gives check,
expand it right away - a check leaves 1 to 4 legal replies here - and test
whether the checking side then has a mate in one. That is a small quiescence
over checks; the cost is one move generation per checking child (~13 ms here),
so it needs a depth cap and probably a limit on the number of checking children
extended per node.

### Forced-line extension (measured)

`1. j5-j6 SEl13-n11 2. BGk4-i6` is the case the plain search kept losing: the
refutation starts with `3. BGi6xn11+`, a capture the static evaluation scores
negative (a Bishop General, 12, for a Soaring Eagle, 9), so UCT never looked at
it - and the mate lands two plies later.

`mateSearch` (a level option, off unless asked for) follows a checking child
while its replies stay forced: generate the replies, and for each of them look
for a new check by the same side, down to mate. `maxReplies` gives up when the
check is not really forcing, `maxDepth` keeps it near the top of the tree.

| | without | with |
|---|---|---|
| 20000 nodes (time) | 10.0 s | 14.4 s |
| answer to `2. BGk4-i6`, 20000 nodes | `SEe13-g11`, loses | `HFm13-m11`, holds |
| answer to `2. BGk4-i6`, 60000 nodes | `SEe13-g11`, loses | `SEn11-n10`, holds |
| answer to `1. j5-j6`, 5000 nodes | `o12-o11`, holds | `o12-o11`, holds |

So it costs about 44% more time per node and it settles the whole family of
"check that removes the defender, forced recapture, mate" combinations. It is
enabled on every Tenjiku level except *Easy*. Two things had to be fixed for it
to work at all: the level option was not being copied into the search
parameters, and a child created as already settled during an expansion never
propagated that fact to its parent.

## Null-move mate threat: measured, and it does not pay

`mateThreat` (a level option, null unless asked for) passes the move at an expanded node and
asks whether the opponent then mates in one. The idea was to catch the pattern the check
extension cannot see: a jumping general takes aim with a *quiet* move (`1... o12-o11
2. VGi4-n9`), and mate follows two plies later on a line nothing can block.

The mechanism works - it fires on 5% of expanded nodes, so it is a sharp signal, not noise -
and it costs about 20% more time per node. But it does not improve the move played, at any
weight tried (0.3, 0.5, 0.6) and with the bias applied either to the static value only or to
every recomputation. Measured on `1. j5-j6`, where the move that holds is `SEl13-n11` (six
plies of normal play afterwards) and `o12-o11` loses (mated within six plies):

| | move played |
|---|---|
| without `mateThreat` | `o12-o11` at 5000, 20000, 60000 and 200000 nodes |
| `mateThreat` 0.3 / 0.5 / 0.6 | `GGi13xa5`, `BGk13xc5`, `g12-g11` - a different move each run |

The reason is in the third measurement: a search of 20000 nodes **expands only 242 positions**
in this game, and 200000 nodes expands about 1700. With 117 legal moves per position that is
barely two plies, and only about a dozen expansions per root move. No leaf heuristic can
decide anything on that: the move played is essentially whatever the static evaluation
happens to favour, which is why three runs give three different moves.

So the option is left in place and off, and the honest conclusion is that what tenjiku needs
is expansions per second - the search does eight of them per second, at about 120 ms each.

## Expansions per second

The search was spending its time walking the threat graph with
`for(var pos1 in graph)` - an object traversal, per level, per attacker query, and the
legality test does two queries per legal move. `cbGetThreatGraph` now flattens every level
once into a plain array of `[square, branch, ...]`: `l` for every child, `h` for the children
that can lead to a screen capture, which is all the walk needs once it is behind a piece.

| | before | after |
|---|---|---|
| `cbGetAttackers` on a royal square (Tenjiku) | 65 µs | **7.5 µs** |
| `GenerateMoves`, 74 legal moves (Tenjiku) | 16.3 ms | **4.2 ms** |
| 20000 UCT nodes (Tenjiku) | 10.0 s | **4.9 s** |
| `GenerateMoves` (Chu Shogi) | 1.03 ms | 0.40 ms |
| `GenerateMoves` (Minjiku Shogi) | 4.14 ms | 0.35 ms |
| `GenerateMoves` (classic chess) | 0.37 ms | 0.16 ms |

Every game gains, the ones with ranked jumpers most of all. The node budgets of the Tenjiku
levels were raised accordingly (Strong goes from 200000 to 500000 nodes), so that the time
limit is what stops the search rather than the node count.

It buys about one ply, and it shows in play: in the `1. j5-j6 SEl13-n11 2. BGk4-i6` line the
search now answers `SEn11-n10` at 60000 nodes where it needed a bigger budget before. It does
not change the first move, where `o12-o11` is still preferred to `SEl13-n11` at every budget
up to 500000 nodes (147 s) - that one needs the search to see a quiet general manoeuvre four
plies away, and one ply is not enough.

## Evaluate

`Model.Board.Evaluate` runs on every child of every expanded node - about 117 times per
expansion here - and it was spending its time on things that have nothing to do with chess:
the `{'1':..,'-1':..}` accumulators turned each `x[s]` into a number-to-string conversion plus
a dictionary lookup, roughly a thousand of them per call; the two `Uint8Array` counters were
allocated per call; and the weighting loop rebuilt the `"<name>Factor"` strings every time.

Now: one plain accumulator object per side inside the piece loop (the `{'1':..,'-1':..}`
objects are filled once after it, so nothing downstream changes), the counters live on the
game and are blanked, and the name-to-factor map is built once per set of level options.

| | before | after |
|---|---|---|
| `Evaluate` | 101 µs | **45.8 µs** |
| 20000 UCT nodes (Tenjiku) | 4.9 s | **2.7 s** |

Together with the flattened threat graph, a Tenjiku search is **4.8x** faster than it was
(13.1 s for the same 20000 nodes at the start), and `Strong` now really runs its 500000 nodes
inside the two-minute limit instead of being cut short by it.

## Board copies

Every child of an expanded node was getting a fresh board: a new `Int16Array` and 156 new
piece objects, a hundred and seventeen times per expansion, all of it thrown away as soon as
the child was evaluated. Nothing keeps those boards alive, so `CopyFrom` now reuses the arrays
and the piece objects of the destination whenever they already have the right shape (a fresh
board still allocates as before), and the UCT expansion loop keeps one scratch board for the
whole expansion instead of allocating per child.

| 20000 UCT nodes (Tenjiku) | |
|---|---|
| at the start of this work | 13.1 s |
| flattened threat graph | 4.9 s |
| cheaper `Evaluate` | 2.7 s |
| reused board copies | **1.9 s** |

That is **6.9x** overall. Checked afterwards: the Tenjiku, Kotaishi, Ultima, Rococo and
Rocaille suites, the eight-game move/AI regression, and a 24-ply self-play game.

## Two things that did not work, and one small one that did

**Make/unmake instead of copying** was measured before being written: with the copies now
allocation-free, `CopyFrom` costs about 10 µs of the ~61 µs a child costs, so applying and
undoing the move on a single board would buy roughly 11% - for a change that requires
`cbQuickApply` to also maintain `zSign`, `lastMove`, `check`, `ending` and `noCaptCount`,
every one of which the evaluation reads. Not worth that risk for that number.

**Reusing the `byType` arrays** across evaluations made things *worse*: 37 µs to 41 µs, and
1.9 s to 2.3 s on 20000 nodes. Pushing freshly-read piece references into long-lived arrays
costs a generational write barrier on every push, which is more than the allocation it saves.
The same reuse works on the board copies because there we only write numbers into existing
objects - no pointers, no barrier.

What did work: a game whose `evaluate()` never reads `material.byType` can now say so with
`cbSkipMaterialByType`, and Tenjiku does - it only looks at the move counter. `Evaluate` drops
from 37 µs to **27 µs**. End to end it is inside the measurement noise (1.8-1.9 s for 20000
nodes), which is itself the useful conclusion: the expansion cost is now spread thin enough
that no single line dominates it any more.
