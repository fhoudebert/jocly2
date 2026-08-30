/*
 * Spartan Chess: Black has TWO Kings, and a FEN writes both as "k".
 *
 * The engine files royals under kings[side * isKing], so the two Kings are two
 * piece types (isKing 1 and isKing 2). Both declare the letter "K", so the FEN
 * letter table mapped both to the FIRST type: the second royal slot stayed
 * empty, kings[-2] was undefined, and `cbGetAttackers` - which tests
 * `kings[-2] < 0`, false for undefined - indexed the threat graph with it and
 * threw. A position loaded from FEN had one King where it should have two.
 *
 * Import now spreads same-letter royals over the successive royal types.
 */
const path = require("path");
const H = require(path.join(__dirname, "../fairy/harness.js"));
const t = H.runner();
const Jocly = require(path.join(__dirname, "../../"));

(async () => {
    // The opening position, written back out as a FEN and read in again.
    const start = "lgkcckwl/hhhhhhhh/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const fresh = await Jocly.createMatch("spartan-chess");
    await fresh.load({ game: "spartan-chess", playedMoves: [] });
    t.check("the FEN is the one the game itself writes",
        (await fresh.getBoardState()), start);

    const loaded = await Jocly.createMatch("spartan-chess");
    await loaded.load({ game: "spartan-chess", initialBoard: start, playedMoves: [] });
    t.check("and it reloads with the same moves available",
        (await loaded.getPossibleMoves()).length,
        (await fresh.getPossibleMoves()).length);

    /*
     * A late position from a real game, one move before the crash: one Black
     * King has been captured, the other is about to move.
     */
    const late = await Jocly.createMatch("spartan-chess");
    await late.load({ game: "spartan-chess",
        initialBoard: "8/h2k4/8/3hkh2/2K1lw2/1P6/PB6/3RR3 b kq - 9 38", playedMoves: [] });
    const moves = await late.getPossibleMoves();
    const names = await late.getMoveString(moves);
    const kingMove = names.indexOf("Kd7-e6");
    t.check("the surviving King can move", kingMove >= 0, true);

    let threw = null;
    try { await late.playMove(moves[kingMove]); } catch (e) { threw = e; }
    t.check("playing it does not throw", threw === null, true);
    t.check("and the game goes on", (await late.getPossibleMoves()).length > 0, true);

    t.done("space-spartan/fen-two-kings");
})();
