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

## Known deviations / open points

* A jumping general may **capture** royalty through a screen (it cannot *jump
  over* it). Muller's preferred reading forbids the jump-capture of royalty;
  the engine's screen-capture path has no king filter, so this would need a
  change in `base-model.js` (generation *and* threat graph) to enforce.
* Check detection for the area moves and for the Demon burn zone is done in a
  `cbGetAttackers` hook, and only when the tested square holds a royal. The
  static exchange evaluation therefore ignores Demon burns.
* Repetition is handled by the shared `preventRepeat` option (draw), not by the
  historic "the checker must deviate" rule.
* The game entry currently reuses `res/rules/shogi/chu-shogi-thumb.png` as its
  thumbnail and points at `res/visuals/tenjiku-600x600-2d.png` for the visual.
