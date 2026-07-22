#!/usr/bin/env python3
"""
Regenerates src/games/chessbase/res/rules/ultima/ultima-rules.html.

The generated page is committed, so this script only needs to be run when a
diagram or the wording changes:  python3 tests/ultima/make-rules.py

The page has no images of its own: every piece in every diagram is a <span>
showing one cell of res/ultima/ultima-picto-sprites.png, positioned in
percentages, so the rules page follows the sprite sheet automatically as its
cells are filled in.

Diagram squares are given as rows of tokens, top row first:
    "."      empty square
    "wP"     a piece: w/b + P C L W X I K
    "...:m"  markers appended after a colon:
                o  origin of the move        m  square passed through
                t  destination               x  captured piece
                f  frozen piece
"""

import os

PIECES = {
    "P": ("pawn", 0), "C": ("coordinator", 1), "L": ("leaper", 2),
    "W": ("withdrawer", 3), "X": ("chameleon", 4), "I": ("immobilizer", 5),
    "K": ("king", 6),
}
NCOLS = len(PIECES)


def cell(token, row, col):
    parts = token.split(":")
    piece, marks = parts[0], (parts[1] if len(parts) > 1 else "")
    classes = ["u-sq", "u-light" if (row + col) % 2 else "u-dark"]
    if "o" in marks:
        classes.append("u-from")
    if "t" in marks:
        classes.append("u-to")
    html = '<span class="%s">' % " ".join(classes)
    if piece != ".":
        side, letter = piece[0], piece[1]
        name, column = PIECES[letter]
        html += '<span class="u-p u-p-%s u-%s"></span>' % (name, "white" if side == "w" else "black")
    if "m" in marks:
        html += '<span class="u-dot"></span>'
    if "x" in marks:
        html += '<span class="u-x">&#10006;</span>'
    if "f" in marks:
        html += '<span class="u-f">&#8709;</span>'
    html += "</span>"
    return html


def symbol(letter):
    name, _ = PIECES[letter]
    return ('<span class="u-p u-p-%s u-white u-inline"></span>'
            '<span class="u-p u-p-%s u-black u-inline"></span>') % (name, name)


E = "."

setup = [
    ["bC", "bL", "bX", "bW", "bK", "bX", "bL", "bI"],
    ["bP"] * 8,
    [E] * 8, [E] * 8, [E] * 8, [E] * 8,
    ["wP"] * 8,
    ["wI", "wL", "wX", "wK", "wW", "wX", "wL", "wC"],
]

pincer = [
    [E, E, E, E, E],
    [E, ".:t", "bP:x", "wP", E],
    [E, ".:m", E, E, E],
    [E, ".:m", E, E, E],
    [E, "wP:o", E, E, E],
]

withdrawer = [
    [E, E, E, E, E],
    [E, E, "bL:x", E, E],
    [E, E, "wW:o", E, E],
    [E, E, ".:m", E, E],
    [E, E, ".:t", E, E],
]

coordinator = [
    [E, E, E, E, E],
    ["bP:x", E, E, ".:t", E],
    [E, E, "wC:o", E, E],
    [E, E, E, E, E],
    ["wK", E, E, "bP:x", E],
]

leaper = [
    [E, E, E, E, E],
    [E, E, E, E, E],
    ["wL:o", "bP:x", ".:m", "bW:x", ".:t"],
    [E, E, E, E, E],
    [E, E, E, E, E],
]

immobilizer = [
    ["bL", E, E, E, E],
    [E, E, "bP:f", E, E],
    [E, "bX:f", "wI", "bC:f", E],
    [E, E, "bP:f", E, E],
    [E, E, E, E, E],
]

chameleon = [
    [E, E, E, E, E],
    [E, E, ".:t", E, E],
    [E, E, ".:m", E, E],
    [E, E, "wX:o", E, E],
    [E, E, "bW:x", E, E],
]

king = [
    [E, E, E, E, E],
    [E, E, E, E, E],
    [E, E, "bP:x", E, E],
    [E, E, "wK:o", E, E],
    [E, E, E, E, E],
]

STYLE_HEAD = """<style>
	.u-board {
		display: grid;
		grid-template-columns: repeat(var(--u-files, 5), 1fr);
		margin: 12px auto;
		border: 1px solid #555;
	}
	.u-sq { position: relative; }
	.u-sq::before { content: ""; display: block; padding-top: 100%; }
	.u-light { background-color: #DDDDD0; }
	.u-dark  { background-color: #559933; }
	.u-from, .u-to { box-shadow: inset 0 0 0 3px #1a4fa0; }
	.u-p {
		position: absolute;
		top: 4%; left: 4%; width: 92%; height: 92%;
		background-image: url({GAME}/res/ultima/ultima-picto-sprites.png);
		background-repeat: no-repeat;
		background-size: __SHEET_W__% 200%;
	}
	.u-white { background-position-y: 0; }
	.u-black { background-position-y: 100%; }
	.u-dot {
		position: absolute;
		top: 38%; left: 38%; width: 24%; height: 24%;
		border-radius: 50%;
		background-color: rgba(26,79,160,.75);
	}
	.u-x, .u-f {
		position: absolute;
		top: 0; left: 0; right: 0; bottom: 0;
		display: flex; align-items: center; justify-content: center;
		font-size: 150%; font-weight: bold;
	}
	.u-x { color: #c02020; }
	.u-f { color: #202020; }
	.u-inline {
		position: static;
		display: inline-block;
		width: 1.6em; height: 1.6em;
		vertical-align: middle;
	}
	table.u-symbols { border-collapse: collapse; margin: 12px 0; }
	table.u-symbols td, table.u-symbols th {
		border-bottom: 1px solid #ccc;
		padding: 4px 10px 4px 0;
		text-align: left;
		vertical-align: middle;
	}
	.u-legend { font-size: 90%; color: #555; }
	h1, h2, h3 { clear: both; }
"""

STYLE_TAIL = "</style>"


def style():
	"""One background-position-x per piece: column c of n is at c/(n-1) of the sheet."""
	css = [STYLE_HEAD.replace("__SHEET_W__", str(NCOLS * 100))]
	for letter in "PCLWXIK":
		name, column = PIECES[letter]
		css.append("\t.u-p-%s { background-position-x: %.4f%%; }" % (name, 100.0 * column / (NCOLS - 1)))
	css.append(STYLE_TAIL)
	return "\n".join(css)


def board_block(rows, caption):
	files = len(rows[0])
	cells = []
	for r, row in enumerate(rows):
		for c, token in enumerate(row):
			cells.append(cell(token, r, c))
	html = ('<div class="u-board" style="--u-files:%d;max-width:%dpx">\n%s\n</div>'
			% (files, files * 44, "\n".join(cells)))
	return '%s\n<p class="u-legend">%s</p>' % (html, caption)


def main():
    p = []
    p.append(style())
    p.append("<h1>Ultima</h1>")
    p.append("""<p>Ultima - also known as Baroque Chess - was invented by Robert Abbott in 1962.
It is played on a normal chessboard, and the object is the same as in chess: checkmate the enemy King.
Everything else is different. Apart from the King, no piece captures by moving onto its victim:
each piece has its own, quite alien, way of removing enemy pieces, and a single move may remove several of them at once.</p>""")

    p.append("<h2>The pieces</h2>")
    p.append('<table class="u-symbols">')
    p.append("<tr><th>Piece</th><th>Move</th><th>Capture</th></tr>")
    for letter, move, capture in [
        ("P", "like a Rook", "pinces an enemy between itself and a friendly piece"),
        ("C", "like a Queen", "on the corners of the rectangle it forms with its own King"),
        ("L", "like a Queen", "by leaping over enemies, as many as the line allows"),
        ("W", "like a Queen", "the adjacent piece it moves directly away from"),
        ("X", "like a Queen", "each enemy by that enemy's own method"),
        ("I", "like a Queen", "never captures - it paralyses instead"),
        ("K", "one square", "by displacement, like a chess King"),
    ]:
        name = {"P": "Pincer Pawn", "C": "Coordinator", "L": "Long Leaper", "W": "Withdrawer",
                "X": "Chameleon", "I": "Immobilizer", "K": "King"}[letter]
        p.append("<tr><td>%s <b>%s</b></td><td>%s</td><td>%s</td></tr>" % (symbol(letter), name, move, capture))
    p.append("</table>")
    p.append("""<p>Every piece except the Pincer Pawn and the King moves exactly like a Queen: any distance along a rank,
a file or a diagonal, over empty squares only. No piece may jump over another - the Long Leaper does, but only to capture.</p>""")

    p.append("<h2>Initial setup</h2>")
    p.append(board_block(setup, "White moves first. The two armies face each other rotated, not mirrored: "
                                "the Immobilizer of one player stands opposite the Coordinator of the other."))

    p.append("<h2>Pincer Pawn</h2>")
    p.append(board_block(pincer, "The Pawn moves up the file and, on arrival, pinces the enemy Pawn "
                                 "against a friendly piece standing right behind it."))
    p.append("""<p>The Pincer Pawn moves like a Rook. When it lands, every enemy piece orthogonally adjacent to it
is captured if a friendly piece stands directly beyond that enemy, on the same rank or file. Up to four pieces can be
taken in one move. Diagonal sandwiches do nothing.</p>
<p>Pawns capture only when they move: a piece that walks <i>between</i> two enemy Pawns of its own accord is safe.</p>""")

    p.append("<h2>Withdrawer</h2>")
    p.append(board_block(withdrawer, "The Withdrawer steps away from the adjacent Long Leaper, along the line "
                                     "joining them, and takes it."))
    p.append("""<p>The Withdrawer captures the piece it is standing next to by moving directly away from it, any distance.
Only one piece can be taken this way per move, and only if it was adjacent before the move.</p>""")

    p.append("<h2>Coordinator</h2>")
    p.append(board_block(coordinator, "Wherever the Coordinator lands, its rank and its King's file - and its file "
                                      "and its King's rank - cross on two squares. Enemies standing there are captured."))
    p.append("""<p>The Coordinator works with its own King. After it moves, look at the rectangle whose opposite corners
are the Coordinator and the King: any enemy piece on either of the two remaining corners is removed. It captures nothing
if those squares are empty or occupied by friendly pieces.</p>""")

    p.append("<h2>Long Leaper</h2>")
    p.append(board_block(leaper, "Two victims in a single move: each leap needs the square right behind the victim to be free."))
    p.append("""<p>The Long Leaper moves like a Queen but may, along the way, jump over an enemy piece and capture it,
provided the square immediately behind that piece is empty. It may then continue in the same direction and jump further
enemies under the same condition, and it may land on any free square beyond. It can never jump over a friendly piece,
nor over two enemy pieces standing next to each other.</p>""")

    p.append("<h2>Immobilizer</h2>")
    p.append(board_block(immobilizer, "Every enemy piece touching the Immobilizer is paralysed. The Long Leaper in "
                                      "the corner is out of reach and moves normally."))
    p.append("""<p>The Immobilizer never captures anything. Instead, every enemy piece on one of the eight squares
around it is frozen: it cannot move at all. A frozen piece is not otherwise affected - it still captures nothing, it
still blocks lines, and it can still be captured.</p>""")

    p.append("<h2>Chameleon</h2>")
    p.append(board_block(chameleon, "Against a Withdrawer, the Chameleon becomes a Withdrawer."))
    p.append("""<p>The Chameleon moves like a Queen and captures each kind of enemy piece by that piece's own method:
it pinces enemy Pincer Pawns, withdraws from enemy Withdrawers, coordinates with its King against enemy Coordinators,
leaps over enemy Long Leapers, and takes an adjacent enemy King by moving onto it. Standing next to an enemy Immobilizer,
it freezes it - and is frozen by it in return, so the two paralyse each other.</p>
<p>Having no capturing power of its own, a Chameleon can never capture another Chameleon.</p>""")

    p.append("<h2>King</h2>")
    p.append(board_block(king, "The King is the only piece that captures by moving onto its victim."))
    p.append("""<p>The King moves one square in any direction and captures like a chess King, by displacement.</p>""")

    p.append("<h2>Ending the game</h2>")
    p.append("""<p>A King is in check when the opponent could remove it next move - by any of the methods above, which is
much harder to see than in chess: a Coordinator far away, a Pawn arriving next to it, a Leaper crossing it. A player who
cannot make a legal move loses, so stalemating the opponent wins the game.</p>""")

    p.append('<p class="u-legend">In the diagrams: a blue frame marks the square a piece leaves and the square it '
             'lands on, blue dots mark the squares it travels through, a red cross marks a captured piece and '
             '&#8709; a frozen one.</p>')

    p.append("<h2>About this implementation</h2>")
    p.append("""<p>Two points of Abbott's rules are simplified here. A Withdrawer that moves away from an adjacent enemy
always takes it, whereas the original rules let the player decline the capture. And a piece frozen by an Immobilizer
cannot remove itself from the board, a "suicide" move that some rule sets allow.</p>""")

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "..", "..", "src", "games", "chessbase", "res", "rules", "ultima",
                       "ultima-rules.html")
    with open(out, "w") as fp:
        fp.write("\n".join(p) + "\n")
    print("written", out)


if __name__ == "__main__":
    main()
