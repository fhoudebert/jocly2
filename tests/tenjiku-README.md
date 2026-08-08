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
