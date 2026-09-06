/*
 * Nine and Twelve Men's Morris: the flying rule as a prelude.
 *
 *   node tests/mills/prelude.test.js
 *
 * Each of the two shipped twice, once with flying and once without, and the
 * pair differed by one line of manifest options - they already shared both
 * model files, both view files, the thumbnail and the rules page. So there is
 * no code to compare against here the way the chess merges compared perft
 * against the model they replaced: what has to hold is that the two buttons
 * still produce the two rule sets, exactly.
 *
 * The rules are two flags, and one of them is odd. The fly entries set
 * canFly but did NOT set poundInMill, and mills-model.js tests it as
 * `poundInMill == false` - so with the key absent the restriction is off and
 * the fly variants have always allowed taking a man that stands in a mill.
 * That is carried over unchanged and pinned below, because it is the kind of
 * asymmetry a later tidy-up would "fix" without noticing it changes a game.
 */

const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const H = require(path.join(ROOT, "tests", "fairy", "harness.js"));
const t = H.runner();

const Jocly = require(path.join(ROOT, "dist", "node", "jocly.core.js"));

const EXPECTED = [
	{ label: "#0", name: "Standard", canFly: false, poundInMill: false },
	{ label: "#1", name: "Fly", canFly: true, poundInMill: undefined },
];

(async () => {
	console.log("\nMen's Morris: the flying rule behind a prelude");

	for(const game of ["9-men-morris", "12-men-morris"]) {
		const match = await Jocly.createMatch(game);
		const opening = await match.getPossibleMoves();
		const names = [];
		for(const move of opening)
			names.push(await match.getMoveString(move));
		t.check(game + ": opens on the two rule buttons", names, ["#0", "#1"]);
	}

	for(let setup = 0; setup < EXPECTED.length; setup++) {
		const one = EXPECTED[setup];
		const match = await Jocly.createMatch("9-men-morris");

		/*
		 * Who is on turn matters more than it looks. The first stage belongs
		 * to the player who chooses, the second to the other one - which is
		 * the AI in a game against the machine, and it is asked to play the
		 * single pass. If that stage offered anything else, or if the turn
		 * came back wrong, the machine would start searching a position it is
		 * not meant to play.
		 */
		t.check(one.name + ": the choice belongs to the first player",
			await match.getTurn(), 1);
		let moves = await match.getPossibleMoves();
		await match.playMove(moves[setup]);
		t.check(one.name + ": the pass belongs to the other one",
			await match.getTurn(), -1);

		// the second stage is a turn pass, so the player who chose is still
		// the one to place the first man
		moves = await match.getPossibleMoves();
		const pass = [];
		for(const move of moves)
			pass.push(await match.getMoveString(move));
		t.check(one.name + ": the second stage is a single pass", pass, ["--"]);
		await match.playMove(moves[0]);

		t.check(one.name + ": it is still the first player's turn",
			await match.getTurn(), 1);
		t.check(one.name + ": canFly", match.game.mOptions.canFly, one.canFly);
		// undefined on purpose for Fly - see the header
		t.check(one.name + ": poundInMill", match.game.mOptions.poundInMill, one.poundInMill);
		t.check(one.name + ": the mill restriction applies",
			match.game.mOptions.poundInMill == false, setup === 0);

		// 24 empty points, so 24 ways to place the first man either way
		t.check(one.name + ": play begins on the placing moves",
			(await match.getPossibleMoves()).length, 24);
	}

	/*
	 * The choice is the first move of the record, written the way every other
	 * prelude game writes it, so a transcript reader that already knows how to
	 * answer one needs no change for mills.
	 */
	const played = await Jocly.createMatch("9-men-morris");
	let moves = await played.getPossibleMoves();
	await played.playMove(moves[1]);
	moves = await played.getPossibleMoves();
	await played.playMove(moves[0]);
	const saved = await played.save();
	t.check("the choice is recorded as the first move",
		JSON.stringify(saved.playedMoves.slice(0, 2)), JSON.stringify([{ setup: 1 }, {}]));

	const reloaded = await Jocly.createMatch("9-men-morris");
	await reloaded.load(saved);
	t.check("and reloading the record restores the rule it was played under",
		reloaded.game.mOptions.canFly, true);
	const notation = [];
	for(const move of saved.playedMoves.slice(0, 2))
		notation.push(await reloaded.getMoveString(move));
	t.check("written as the other prelude games write it", notation, ["#1", "--"]);

	/*
	 * A prelude move carries no f, t or c, which is all the mills comparison
	 * looks at - so without the override every setup compared equal to every
	 * other and to the pass. A reader resolving "#1" would have got "#0".
	 */
	const fresh = await Jocly.createMatch("9-men-morris");
	const both = await fresh.getPossibleMoves();
	const MoveClass = fresh.game.GetMoveClass();
	const wanted = new MoveClass({ setup: 1 });
	t.check("asking for the second rule resolves to it",
		JSON.stringify(both.filter((m) => wanted.Equals(m))[0]), JSON.stringify({ setup: 1 }));
	t.check("and the pass is not one of the rules",
		new MoveClass({}).Equals(both[0]), false);

	t.done("Men's Morris prelude");
	process.exit(0);
})().catch((error) => {
	console.error("FAILED: " + (error && (error.stack || error.message || error)));
	process.exit(1);
});
