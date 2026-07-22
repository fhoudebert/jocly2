# Rococo - model status

Rococo, by Peter Aronson and David Howe (2002), a game in the Ultima family:
https://www.chessvariants.com/other.dir/rococo.html

Model: `src/games/chessbase/rococo-model.js`. This is the model layer only -
the game is not registered in the manifest yet (that needs a 10x10 view and a
sprite sheet, the next step).

## Running the tests

No build needed - the tests load the model in a sandbox and drive
`Model.Board` directly:

    node tests/rococo/rules.test.js         # piece rules, from the source diagrams
    node tests/rococo/edge.test.js          # the outer edge-square ring
    node tests/rococo/swapper.test.js       # the Swapper (swap + mutual destruction)
    node tests/rococo/consistency.test.js   # undo integrity, playouts, perft

## Board and victory

10x10 board, position = row*10 + col. The inner 8x8 (rows/cols 1..8) is normal
ground and is named a1..h8 in the tests; the 36 squares of the outer ring
(row/col 0 or 9) are edge squares. Victory is by capturing the enemy King -
there is no check or checkmate, the King may move next to the enemy King, and
a side with no legal move (or whose King has just been taken) loses. This lets
the model skip all self-check filtering: pseudo-legal moves are legal.

## The edge-square rule

A move may only pass over or end on an edge square when a capture requires it,
crossing the fewest edge squares (and, among those, landing nearest). It is
enforced as a post-filter over the generated moves: a move touching the ring
is kept only if it captures, only if the same capture set cannot be achieved
without touching the ring, and only at the minimal edge-crossing / nearest
landing. **Deviation:** rule 4 of the source (that such a move must be the
*unique* one) is relaxed - on a genuine tie the model keeps the tied moves
rather than forbidding the capture.

## Implemented

King, Advancer, Withdrawer, Long Leaper, Immobilizer, Cannon Pawn, Swapper,
the multi-victim capture plumbing (`move.kills` with hooked ApplyMove /
cbQuickApply / cbQuickUnapply), and the edge-square rule.

The Swapper carries two move kinds the base model has no notion of: `move.swap`
(exchange places with the piece whose index it holds - the first swap in jocly
where a move relocates a *second* piece) and `move.mutual` (remove the Swapper
together with the adjacent enemy in `move.c`). Both are handled in the apply /
unapply hooks, keeping the Zobrist signature, `kings[]` and the undo stack
exact, and `Model.Move.Equals` is extended so a swap and a mutual-destruction
that share from/to squares stay distinct. A swap counts as a capture for the
edge rule, so it may cross onto the ring.

## Not done yet

* **Chameleon** - captures by mimicking its victim (approach, withdraw, leap,
  swap, take an adjacent King), combinable in one move; freezes Immobilizers.
* **Cannon-Pawn promotion** - on reaching the far rank a Pawn promotes to a
  captured friendly piece from a reserve (`drop-model.js` has the reserve
  bookkeeping to build on).
* **Three-fold repetition = loss** (the model only ends the game on King
  capture or having no move).
* The Swapper's **"no immediate swap-back"** rule (against an enemy Swapper or
  Chameleon) is not enforced yet - it needs one ply of history. Mutual
  destruction is currently offered against any adjacent enemy.
* Promotion does not consume the reserve piece it copies (you may promote to
  any type you currently have off the board); this is a modelling choice.

Because the Chameleon generates no moves yet, a full game is not playable
through jocly; the consistency playouts are of a reduced variant and assert
only engine bookkeeping, not game outcomes. The perft anchors (25, 625) are
produced by this implementation, not cross-checked against another Rococo
program.
