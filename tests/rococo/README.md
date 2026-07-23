# Rococo - model status

Rococo, by Peter Aronson and David Howe (2002), a game in the Ultima family:
https://www.chessvariants.com/other.dir/rococo.html

Model: `src/games/chessbase/ultima/rococo-model.js`, view:
`src/games/chessbase/ultima/rococo-view.js`, rules pages (English and French)
and thumbnail: `src/games/chessbase/res/rules/rococo/`. The game is registered
in the manifest as `rococo` and is playable.

## Running the tests

No build needed - the tests load the model in a sandbox and drive
`Model.Board` directly:

    node tests/rococo/rules.test.js         # piece rules, from the source diagrams
    node tests/rococo/edge.test.js          # the outer edge-square ring
    node tests/rococo/swapper.test.js       # swap, mutual destruction, swap-back ban
    node tests/rococo/chameleon.test.js     # the Chameleon (mimics its victim)
    node tests/rococo/promote.test.js       # cannon-pawn promotion + suicide
    node tests/rococo/consistency.test.js   # undo integrity, playouts, perft
    node tests/rococo/view.test.js          # sprite columns, 10x10 ring, rules pages

## Board and victory

10x10 board, position = row*10 + col. The inner 8x8 (rows/cols 1..8) is normal
ground and is named a1..h8 in the tests; the 36 squares of the outer ring
(row/col 0 or 9) are edge squares. Victory is by capturing the enemy King -
there is no check or checkmate, the King may move next to the enemy King, and
a side with no legal move (or whose King has just been taken) loses. This lets
the model skip all self-check filtering: pseudo-legal moves are legal.
Three-fold repetition loses for the repeater (`cbOnPerpetual` / `cbMaxRepeats`
in the model, `preventRepeat` in the manifest).

## The edge-square rule

A move may only pass over or end on an edge square when a capture requires it.
It is enforced as a post-filter (`rocFilterEdge`) over the generated moves,
which groups them by (moving piece, set of captured pieces) - the "capturing
move" the source states its rules over. A move touching the ring is kept only
if it captures, only if that same capture cannot be made without touching the
ring, only among the moves crossing the fewest edge squares, and only if it is
then the single shortest such move: on a genuine tie neither move is legal,
which is rule 4 of the source.

The piece-specific restrictions in the source fall out of that general rule
rather than being coded separately, and `edge.test.js` checks they really do:
an Advancer can never enter the ring by its own move (the victim of an approach
would have to sit off the board) but captures along the ring once swapped
there, an Immobilizer never enters it at all since it never captures, and the
King and Cannon Pawn may only enter to take a piece standing there.

## Implemented

All eight piece types - King, Cannon Pawn, Advancer, Withdrawer, Long Leaper,
Swapper, Chameleon, Immobilizer - plus the edge-square rule, cannon-pawn
promotion, suicide of an immobilized piece, and three-fold repetition. The
model is self-contained: it does not load the Ultima model.

Four move kinds have no equivalent in the base model, and all four are handled
in the apply / unapply hooks so that the Zobrist signature, `kings[]` and the
undo stack stay exact:

* `move.kills` - a list of extra victims, for the multi-piece captures.
* `move.swap` - exchange places with the piece whose index it holds. This is
  the first move in jocly that relocates a *second* piece rather than removing
  it. A swap counts as a capture for the edge rule, so it may reach the ring.
* `move.mutual` - remove the Swapper together with the adjacent enemy in
  `move.c`. Both pieces vanish, so `lastMove.c` is cleared afterwards: the base
  `Evaluate` would otherwise dereference the now-empty destination square.
* `move.suicide` - an immobilized piece other than a King removes itself.

`Model.Move.Equals` is extended so that moves sharing from/to squares but
differing in kind stay distinct.

A Chameleon's swap may be combined with its other captures in the same move,
so `move.swap` and `move.kills` can appear together.

Promotion uses the base model's `move.pr`. It is offered only while the side
has fewer pieces of that type on the board than it started with, so promoting
consumes the captured piece it copies: the only captured Withdrawer can be
brought back once, while a side that lost both Long Leapers may promote twice.

The no-immediate-swap-back rule needs one ply of history, kept in
`board.rocLastSwap` as the pair of piece indices that just swapped (or null).
It is set by `ApplyMove`, cleared by any other move, carried across `CopyFrom`
because the search clones boards, and stashed on the undo list for
`cbQuickApply`. It is deliberately *not* part of the Zobrist signature, so two
positions differing only by a pending ban hash alike - the same trade-off the
base model makes for other one-ply state.

## Known limits

The perft anchors (25, 625) are produced by this implementation, not
cross-checked against another Rococo program. There is no 3D view, and a move
removing several pieces at once is not animated piece by piece.
