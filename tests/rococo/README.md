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
    node tests/rococo/anim.test.js          # capture animation for the family's move kinds
    node tests/rococo/input.test.js         # entering a suicide from the board

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

## Animation

The base chessbase view animates the moving piece and the single piece it
displaces (`move.c`). `ultima/ultima-capture-view.js`, listed in the view
scripts of both Ultima and Rococo, extends it for the move kinds this family
adds: the extra victims of a multi-piece capture fade where they stand, the
swapped piece travels into the square the Swapper leaves, a Swapper destroying
itself fades once it has arrived, and a piece removing itself fades without
travelling. Without it those pieces just blink out when the board is
redisplayed - the position was always right, only the transition was missing.

## Choosing between trading places and going down together

A Swapper standing next to an enemy can do two things to it: trade places, or
destroy them both. Both moves name that neighbour's square, and the board input
tells moves apart only by where they land - so it cannot separate the two on
its own. The view took the pair for a promotion, read a piece type off each,
found none, threw inside the animation callback, and left an empty panel with
nothing bound to close it. That was the empty popup. A suicide runs into the
same wall for a different reason: its destination is the square the piece
already occupies, which is also the square that means "click the piece again to
cancel" - and jocly binds that cancel last, so it wins.

`rococo-view.js` overrides `xdInput` and asks the question where the player is
already looking. Picking up the Swapper raises nothing. Clicking a neighbour
that offers both moves stays an ordinary board click, but instead of playing a
move nobody has chosen it brings up the panel the view uses for promotions,
with one picture per choice - what that square is about to hold:

* the **Swapper's own picture** - it ends up standing there: trade places;
* the **neighbour's picture** - it is what leaves: destroy them both.

A suicide, having nothing to target, is offered on the panel under the picture
of the piece itself. A neighbour that only allows a swap (no adjacent enemy to
destroy, or the swap-back ban forbidding it) stays a single click with no
panel; but when the only thing left against a neighbour is the mutual
destruction, the panel still opens, so it is never played without a confirming
click.

The panel carries its own pictures (`roc-choice-0..7`), not the promotion ones.
Those are indexed by piece type - one slot per type - so a Swapper facing an
enemy Swapper would have had a single slot for both of its choices, the very
position where the choice matters most. Its own pictures can show any piece,
side included, so that case reads as the white Swapper (trade places) beside
the black one (destroy both).

## The promotion panel

Promotion here is optional, so the "stay a Cannon Pawn" move shares its
destination with the real promotions. The view builds the panel from the `pr`
of every move reaching the square and threw on the one that had none, leaving
the panel stuck open. That move now carries `pr = PAWN`, which names the type
the piece already is - a no-op on the board and the natural "do not promote"
entry in the panel. In `base-view.js`, the piece pictures were never made
visible when the panel opened, and never hidden when it closed; both are fixed
there, for every game.

## Known limits

The perft anchors (25, 625) are produced by this implementation, not
cross-checked against another Rococo program. There is no 3D view.
