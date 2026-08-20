/*
 * Janggi (Korean chess) model tests - pure Node, no build step:
 *   node tests/chessbase/janggi.test.js
 *
 * The model files are plain scripts assigning to a global `Model`, so they can
 * be evaluated directly here, without a browser and without dist/. What is
 * exercised is the real engine: InitGame / InitialPosition / GenerateMoves /
 * ApplyMove, not a reimplementation of the rules.
 *
 * The last section re-runs Xiangqi and Tenjiku Shogi perft, because the Janggi
 * cannon needed two additions to the SHARED base-model.js (FLAG_SCREEN_MOVE,
 * and the split between `ranking` and `flying`) and those two games are the
 * ones that use the mechanisms touched.
 */

const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '..', '..', 'src', 'games', 'chessbase') + path.sep;

// --- minimal JocGame stub: only what the model files touch ---
function MersenneStub(seed) {
    let s = seed >>> 0;
    this.genrand_int32 = function () {
        s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
        return s;
    };
}
global.JocGame = {
    DRAW: 0,
    Twister: 0,
    LetsTwist: function (seed) {
        if (!JocGame.Twister) JocGame.Twister = new MersenneStub(seed);
        return JocGame.Twister;
    },
    // legacy scheme, only used by games declaring zobrist:"old" (Xiangqi)
    Zobrist: function () {
        this.update = function (z, name, v, i) {
            return (z ^ (('' + name + v + i).split('').reduce((a, ch) => ((a * 31 + ch.charCodeAt(0)) | 0), 7))) | 0;
        };
    },
};

function loadGame(scripts, setup) {
    global.Model = { Game: {}, Board: {}, Move: {} };
    scripts.forEach(f => eval.call(null, fs.readFileSync(BASE + f, 'utf8')));
    const g = Object.create(Model.Game);
    g.g = {};
    if (setup) setup(g);
    g.GetRepeatOccurence = () => 0;
    g.CreateMove = function (m) { const mv = Object.create(Model.Move); Object.assign(mv, m); return mv; };
    g.InitGame();
    return g;
}

const aGame = loadGame(['base-model.js', 'grid-geo-model.js', 'famous/janggi-model.js']);
const Board = Model.Board;
const geo = aGame.cbVar.geometry;
const N = p => geo.PosName(p);

function newBoard() {
    const b = Object.create(Board);
    b.Init(aGame);
    b.InitialPosition(aGame);
    return b;
}
function fromPieces(list, who) {  // list: ["K:1:e2", ...]
    aGame.mInitial = {
        turn: who,
        pieces: list.map(s => {
            const [ab, side, sq] = s.split(':');
            let t = null;
            for (const k in aGame.cbVar.pieceTypes) {
                const pt = aGame.cbVar.pieceTypes[k];
                if ((pt.abbrev || pt.fenAbbrev) === ab && (t === null || (+side < 0 && pt.name.endsWith('-b')))) {
                    if (t === null || pt.name.endsWith('-b')) t = parseInt(k);
                }
            }
            return { s: parseInt(side), t: t, p: geo.PosByName(sq), m: true, r: aGame.g.pTypes[t].ranking };
        }),
    };
    const b = Object.create(Board);
    b.Init(aGame); b.InitialPosition(aGame);
    aGame.mInitial = null;
    return b;
}
function movesOf(board, sq) {
    board.GenerateMoves(aGame);
    const f = geo.PosByName(sq);
    return board.mMoves.filter(m => m.f === f && !m.pass)
        .map(m => (m.c != null ? 'x' : '') + N(m.t)).sort().join(' ');
}

function play(proto, game, board, from, to) {   // apply a legal move, return the new board
    board.GenerateMoves(game);
    const mv = board.mMoves.find(m => m.f === geo.PosByName(from) && m.t === geo.PosByName(to));
    if (!mv) throw new Error('no legal move ' + from + to);
    const next = Object.create(proto);
    next.Init(game); next.CopyFrom(board); next.ApplyMove(game, mv); next.mWho = -board.mWho;
    next.GenerateMoves(game);
    return next;
}

let failures = 0;
function check(label, got, expected) {
    const ok = got === expected;
    if (!ok) failures++;
    console.log((ok ? '  ok   ' : '  FAIL ') + label + ' -> ' + JSON.stringify(got) +
        (ok ? '' : '   expected ' + JSON.stringify(expected)));
}

console.log('cbMaxScreenRanking =', aGame.cbMaxScreenRanking,
    '| cbUseScreenCapture =', aGame.cbUseScreenCapture,
    '| cbPawnTypes =', aGame.cbPawnTypes, '| pieces =', aGame.cbPiecesCount);

console.log('\n=== initial position ===');
let b = newBoard();
b.GenerateMoves(aGame);
console.log('FEN:', geo.ExportBoardState(b, aGame.cbVar, 0));
check('legal moves', b.mMoves.length, 31);
check('cannon b3 blocked', movesOf(b, 'b3'), '');
check('cannon h3 blocked', movesOf(b, 'h3'), '');
check('general e2', movesOf(b, 'e2'), 'd2 d3 e1 e3 f2 f3');
check('guard d1', movesOf(b, 'd1'), 'd2 e1');
check('horse b1', movesOf(b, 'b1'), 'a3 c3');
check('elephant c1 (a4/e4 own soldiers, d1 blocks f3)', movesOf(b, 'c1'), '');
check('chariot a1', movesOf(b, 'a1'), 'a2 a3');
check('soldier c4', movesOf(b, 'c4'), 'b4 c5 d4');

console.log('\n=== palace diagonals: chariot ===');
// NOTE: every test position keeps the two Generals on different files.
// Otherwise bikjang makes the position illegal and the side to move has no
// legal move at all - which is correct, but tests nothing.
b = fromPieces(['R:1:d1', 'K:1:d2', 'K:-1:f9'], 1);
check('R d1, centre free', movesOf(b, 'd1'), 'a1 b1 c1 e1 e2 f1 f3 g1 h1 i1');
b = fromPieces(['R:1:d1', 'A:1:e2', 'K:1:d2', 'K:-1:f9'], 1);
check('R d1, centre occupied by a friend', movesOf(b, 'd1'), 'a1 b1 c1 e1 f1 g1 h1 i1');
b = fromPieces(['R:1:e2', 'K:1:d2', 'K:-1:f9'], 1);
check('R e2 from the centre', movesOf(b, 'e2'),
    'd1 d3 e1 e10 e3 e4 e5 e6 e7 e8 e9 f1 f2 f3 g2 h2 i2');
b = fromPieces(['R:1:d1', 'P:-1:e2', 'K:1:d3', 'K:-1:f10'], 1);
check('R d1, enemy soldier on the centre', movesOf(b, 'd1'), 'a1 b1 c1 d2 e1 f1 g1 h1 i1 xe2');

console.log('\n=== palace diagonals: cannon ===');
b = fromPieces(['C:1:d10', 'A:-1:e9', 'K:-1:e8', 'K:1:d2'], 1);
// d1 too: the General on d2 is a screen on the d-file
check('C d10 hopping the guard on e9', movesOf(b, 'd10'), 'd1 f8');
b = fromPieces(['C:1:d10', 'C:-1:e9', 'K:-1:e8', 'K:1:d2'], 1);
check('C d10 over another cannon (only the d-file hop is left)', movesOf(b, 'd10'), 'd1');

console.log('\n=== cannon: screen required to move ===');
b = fromPieces(['C:1:e5', 'P:1:e6', 'K:1:d2', 'K:-1:f9'], 1);
check('C e5 over own soldier', movesOf(b, 'e5'), 'e10 e7 e8 e9');
b = fromPieces(['C:1:e5', 'P:1:e6', 'C:-1:e8', 'K:1:d2', 'K:-1:f9'], 1);
check('C e5, cannon on e8: no capture, no jump', movesOf(b, 'e5'), 'e7');
b = fromPieces(['C:1:e5', 'C:-1:e6', 'K:1:d2', 'K:-1:f9'], 1);
check('C e5, cannon as screen', movesOf(b, 'e5'), '');
b = fromPieces(['C:1:e5', 'P:1:e6', 'P:-1:e8', 'K:1:d2', 'K:-1:f9'], 1);
check('C e5, soldier on e8', movesOf(b, 'e5'), 'e7 xe8');

console.log('\n=== elephant ===');
b = fromPieces(['E:1:e5', 'K:1:d2', 'K:-1:f9'], 1);
check('E e5 free', movesOf(b, 'e5'), 'b3 b7 c2 c8 g2 g8 h3 h7');
b = fromPieces(['E:1:e5', 'P:1:e6', 'K:1:d2', 'K:-1:f9'], 1);
check('E e5, blocked on the orthogonal step', movesOf(b, 'e5'), 'b3 b7 c2 g2 h3 h7');
b = fromPieces(['E:1:e5', 'P:1:d7', 'K:1:d2', 'K:-1:f9'], 1);
check('E e5, blocked on the 2nd step', movesOf(b, 'e5'), 'b3 b7 c2 g2 g8 h3 h7');

console.log('\n=== soldier ===');
b = fromPieces(['P:1:d8', 'K:1:e2', 'K:-1:d10'], 1);
check('P d8 (corner of the enemy palace)', movesOf(b, 'd8'), 'c8 d9 e8 e9');
b = fromPieces(['P:1:e9', 'K:1:e2', 'K:-1:a10'], 1);
check('P e9 (centre)', movesOf(b, 'e9'), 'd10 d9 e10 f10 f9');
b = fromPieces(['P:1:d2', 'K:1:a1', 'K:-1:e9'], 1);
check('P d2 (own palace: no backward diagonal)', movesOf(b, 'd2'), 'c2 d3 e2');

console.log('\n=== bikjang: facing Generals, traditional rule ===');
// Cho on d2, Han on e9, each with a spare move: a Soldier for Han, one for Cho.
// Han also has a Chariot that can interpose on the e-file.
const BIK = ['K:1:d2', 'P:1:a4', 'K:-1:e9', 'P:-1:a7', 'R:-1:a5'];
b = fromPieces(BIK, 1);
check('the General may step onto the open file of the other', movesOf(b, 'd2'), 'd1 d3 e2');

let offer = play(Board, aGame, fromPieces(BIK, 1), 'd2', 'e2');   // Cho offers
check('the offer itself is not the draw', !!offer.mFinished, false);
check('bikjang seen, but only on this ply', [offer.bikjang, offer.bikjangPrev].join(), 'true,false');

let answer = play(Board, aGame, offer, 'e9', 'd9');               // Han steps aside
check('answered by moving the General: play goes on', !!answer.mFinished, false);
answer = play(Board, aGame, offer, 'a5', 'e5');                   // Han interposes
check('answered by interposing: play goes on', !!answer.mFinished, false);
answer = play(Board, aGame, offer, 'a7', 'a6');                   // Han ignores it
check('unanswered: the game is drawn', !!answer.mFinished, true);
check('...and it is a draw, not a win', answer.mWinner, 0);

// the two-ply window must survive the copy the search makes of every node
const copy = Object.create(Board);
copy.Init(aGame); copy.CopyFrom(answer);
check('CopyFrom carries the bikjang state', [copy.bikjang, copy.bikjangPrev].join(), 'true,true');
check('so does the signature', copy.GetSignature() != fromPieces(
    ['K:1:e2', 'P:1:a4', 'K:-1:e9', 'P:-1:a6', 'R:-1:a5'], 1).GetSignature(), true);

console.log('\n=== check detection ===');
b = fromPieces(['K:1:e2', 'K:-1:a10', 'C:-1:e7', 'P:-1:e5'], 1);
check('cannon e7 checks the general e2 over the soldier e5',
    b.cbGetAttackers(aGame, geo.PosByName('e2'), 1, 100).length, 1);
b = fromPieces(['K:1:e2', 'K:-1:a10', 'C:-1:e7', 'C:-1:e5'], 1);
check('...but not over another cannon',
    b.cbGetAttackers(aGame, geo.PosByName('e2'), 1, 100).length, 0);
b = fromPieces(['K:1:e2', 'K:-1:a10', 'C:-1:e7', 'P:-1:e5', 'P:-1:e4'], 1);
check('...nor over two screens',
    b.cbGetAttackers(aGame, geo.PosByName('e2'), 1, 100).length, 0);
b = fromPieces(['K:1:e2', 'K:-1:a10', 'R:-1:e7', 'C:1:e5', 'P:1:e4'], 1);
check('a cannon does not shield its own general from a chariot',
    b.cbGetAttackers(aGame, geo.PosByName('e2'), 1, 100).length, 0);
b = fromPieces(['K:1:e2', 'K:-1:e9'], 1);
check('a General does not check the other one',
    b.cbGetAttackers(aGame, geo.PosByName('e2'), 1, 100).length, 0);

console.log('\n=== pass ===');
// General d1 boxed in: e1/e2 covered by the chariot on the e-file, d2 by the
// horse on b3 - but d1 itself is not attacked, so this is a pass, not a mate.
b = fromPieces(['K:1:d1', 'R:-1:e10', 'H:-1:b3', 'K:-1:f9'], 1);
b.GenerateMoves(aGame);
check('only move is a pass', b.mMoves.map(m => m.pass ? 'PASS' : N(m.f) + '-' + N(m.t)).join(' '), 'PASS');
check('game not finished', !!b.mFinished, false);
const passMove = b.mMoves[0];
const sign0 = b.GetSignature();
const fen0 = geo.ExportBoardState(b, aGame.cbVar, 0).split(' ')[0];
b.ApplyMove(aGame, passMove);
check('pass leaves the board untouched',
    geo.ExportBoardState(b, aGame.cbVar, 0).split(' ')[0], fen0);
check('pass flips the side-to-move key only', b.GetSignature() != sign0, true);
// real mate: same box, but d1 attacked too
b = fromPieces(['K:1:d1', 'R:-1:e10', 'H:-1:b3', 'R:-1:a1', 'K:-1:f9'], 1);
b.GenerateMoves(aGame);
check('mate is still a mate (no pass)', b.mMoves.length, 0);
check('mate finishes the game', !!b.mFinished, true);

console.log('\n=== perft ===');
function perft(game, board, depth) {
    board.GenerateMoves(game);
    if (depth <= 1) return board.mMoves.length;
    let n = 0;
    for (const move of board.mMoves) {
        const next = Object.create(Object.getPrototypeOf(board));
        next.Init(game);
        next.CopyFrom(board);
        next.ApplyMove(game, move);
        next.mWho = -board.mWho;
        n += perft(game, next, depth - 1);
    }
    return n;
}
function perftOf(game, proto, depth) {
    const b = Object.create(proto);
    b.Init(game); b.InitialPosition(game);
    b.mWho = 1;
    return perft(game, b, depth);
}
check('janggi perft(1)', perftOf(aGame, Board, 1), 31);
check('janggi perft(2)', perftOf(aGame, Board, 2), 961);
check('janggi perft(3)', perftOf(aGame, Board, 3), 30353);

console.log('\n=== no regression on the games sharing the patched mechanisms ===');
const xGame = loadGame(['base-model.js', 'grid-geo-model.js', 'famous/xiangqi-model.js']);
check('xiangqi perft(1)', perftOf(xGame, Model.Board, 1), 44);
check('xiangqi perft(2)', perftOf(xGame, Model.Board, 2), 1920);
check('xiangqi perft(3)', perftOf(xGame, Model.Board, 3), 79666);
const tGame = loadGame(['base-model.js', 'grid-geo-model.js', 'locust-move-model.js', 'shogi/tenjiku-shogi-model.js']);
check('tenjiku perft(1)', perftOf(tGame, Model.Board, 1), 74);
/*
 * 5457 until the Lion, the Lion Hawk, the Free Eagle, the Soaring Eagle and
 * the Horned Falcon were given the last item of their Lion power - "stay in
 * place without capturing anything if one of the neighboring squares is
 * empty". The nine extra moves are exactly those passes: none is available at
 * the root, where every stinging square is occupied by a friendly piece, and
 * nine appear once a first move has cleared them. Counted, not assumed - see
 * tests/shogi/tenjiku-lions.test.js.
 */
check('tenjiku perft(2)', perftOf(tGame, Model.Board, 2), 5466);

console.log('\n=== the other reading of bikjang: cbJanggiBikjang = "forbidden" ===');
const fGame = loadGame(['base-model.js', 'grid-geo-model.js', 'famous/janggi-model.js'],
    g => { g.cbJanggiBikjang = 'forbidden'; });
const fBoard = Object.create(Model.Board);
fGame.mInitial = {
    turn: 1,
    pieces: [{ s: 1, t: 7, p: fGame.cbVar.geometry.PosByName('d2'), m: true, r: 0 },
             { s: -1, t: 7, p: fGame.cbVar.geometry.PosByName('e9'), m: true, r: 0 }],
};
fBoard.Init(fGame); fBoard.InitialPosition(fGame); fGame.mInitial = null;
fBoard.GenerateMoves(fGame);
check('the General may NOT step onto the open file',
    fBoard.mMoves.filter(m => m.f == fGame.cbVar.geometry.PosByName('d2'))
        .map(m => fGame.cbVar.geometry.PosName(m.t)).sort().join(' '), 'd1 d3');
check('forbidden perft(2)', perftOf(fGame, Model.Board, 2), 949);

console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'all checks passed'));
process.exit(failures ? 1 : 0);
