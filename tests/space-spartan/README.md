# Space Spartan - model status

Spartan Chess (Steven Streetman, 2010) transposed onto the 3D board of this
module: three 6x8 planes, 144 squares, `pos = plane*48 + row*6 + col`. The
Persians field the FIDE army, the Spartans an army of leapers - and two kings.

Model: `src/games/chessbase/3d/space-spartan-model.js`, view:
`src/games/chessbase/3d/space-spartan-view.js`, rules pages (English and
French) and diagrams: `src/games/chessbase/res/rules/3dchess/space-spartan-*`.
Registered in the manifest as `space-spartan`.

## Running the tests

No build needed - the tests load the model in a sandbox and drive
`Model.Board` directly:

    node tests/space-spartan/royal.test.js    # the two kings: single check, duple check, mate, promotion
    node tests/space-spartan/rules.test.js    # the pieces, the evaluation terms, the 50-move counter

## The two kings

This is the whole point of the variant: the Spartan army is lighter (60.4
against 61 in declared values, and about 15% less board control), and what pays
for it is a second king.

The engine files royals under `kings[side * isKing]`, so the two Spartan kings
have to be **two distinct types**: type 0 is `isKing:1`, type 4 is `isKing:2`.
They were one and the same type before, which left the Spartans with a single
royal slot - the second king was not royal at all, it could be taken for free
without ending the game, and royalty jumped to whichever king had moved last.

`base-model.js` supports several royals natively (`cbMaxRoyalRank`,
`cbInLosingCheck`, written for the shogi crown prince), but its rule is "a side
holding two royals is never in check". Sparta is stricter, so the model
replaces `cbInLosingCheck` with: **in check when every surviving royal is
attacked**. That gives, in one line, the three cases of the variant:

  - two kings, one attacked -> not in check, the Spartans may ignore it and
    even let that king be captured;
  - two kings, both attacked -> duple check, it must be answered, and no move
    may walk into one;
  - one king left -> ordinary check and mate; none left -> lost.

A hoplite reaching the last rank may take an empty royal slot, so a fallen king
can be raised, but never a third one.

Both kings print as `K`; in FEN the second one is `E`, otherwise the two would
fight over the letter `k` when a position is read back.

## Known and deliberate

  - The 50-move counter is reset here by the real pawn types (6..9). The
    generic detection in `base-model.js` assumes pawns are declared first and
    stops at the first differing abbrev; in this family type 0 is the king, so
    it was the KING that reset the counter and pawn moves that did not.
    `3dchess` has the same issue and is left as it is.
  - The castle table lost its two Spartan entries: no Spartan piece is
    `castle:true`, so they could never fire, and one of them would have put a
    king on the other king's square.
  - `SPARE_KING_VALUE` (4.5, as in the 2D `spartan-model.js`) is the value the
    evaluation gives the second king. A piece with `isKing` is excluded from
    `pieceValue`, so without it the AI gives its spare king away for nothing.
    It is the first knob to turn when tuning the balance.
  - Piece values are the ones inherited from the 2D game and have NOT been
    recalibrated for three planes. Measured geometric mobility, averaged over
    the 144 squares: queen 32.8, rook 14.0, bishop 13.5, knight 10.9 against
    hippagretai 24.4 (valued 7), polemarchoi 20.3 (7), skiritai 11.8 (4),
    homoioi 8.3 (3.1). The homoioi is valued above the knight while moving
    less, and every Spartan piece is a leaper, which is worth more than the
    table says on a crowded board.
