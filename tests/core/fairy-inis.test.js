/*
 * Every "fairy-stockfish" level that defines its variant with a
 * customVariantIni, checked against the engine this repository actually
 * ships.
 *
 *   node tests/chessbase/fairy-inis.test.js
 *
 * A custom variant is a contract between two things that version
 * independently: the ini text in manifest/*.js, and whatever Fairy-Stockfish
 * build is behind the UCI socket. When they disagree the failure is quiet -
 * Fairy-Stockfish writes "Invalid option: <key>" to stderr, which the wasm
 * build does not surface through addMessageListener() at all, registers the
 * variant with that line ignored, and then plays a subtly different game.
 * Nothing crashes and no move is refused, so a wrong promotion rank or a
 * missing win condition can sit there for a long time.
 *
 * What is checkable through the UCI channel is the engine's own summary line,
 * "info string variant <name> ... startpos <fen>": the position it resolved
 * for the variant. If a key was dropped, the board dimensions or the start
 * position usually move with it. So each ini is loaded, the variant selected,
 * and the resolved startpos compared with the one the ini declares - then the
 * engine is asked for a move, which is what a level ultimately needs it to do.
 *
 * This says nothing about OTHER builds. Fairy-Stockfish's last tagged release
 * (fairy_sf_14, 2021) predates several of the keys used here, so an
 * application that plugs a v14 binary in place of the bundled build will lose
 * exactly the games this test would keep honest - see the notes in
 * third-party/fairy-stockfish/README.md.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const FAIRY = path.join(ROOT, "third-party", "fairy-stockfish");
const CUSTOM_VARIANT_PATH = "/jocly-custom-variants.ini";

const H = require("../fairy/harness.js");
const t = H.runner();

/* ---- collect every declaration, exactly as jocly.fairy.js would see it ---- */

const games = require(path.join(ROOT, "src", "games", "chessbase", "index.js")).games;
const declarations = [];
games.forEach((game) => {
	const levels = (game.config && game.config.model && game.config.model.levels) || [];
	levels.forEach((level) => {
		if(!level || level.ai !== "fairy-stockfish")
			return;
		// a level either carries its own variant, or one per prelude setup
		[level].concat(level.variants || []).forEach((spec) => {
			if(spec.customVariantIni)
				declarations.push({
					game: game.name,
					variant: spec.variant,
					ini: spec.customVariantIni,
				});
		});
	});
});

/* ---- engine ---- */

function startEngine() {
	const Stockfish = require(path.join(FAIRY, "stockfish.js"));
	return Stockfish({ wasmBinary: fs.readFileSync(path.join(FAIRY, "stockfish.wasm")) })
		.then((engine) => {
			let lines = [], waiter = null;
			engine.addMessageListener((line) => {
				lines.push(line);
				if(waiter && waiter.done(line)) {
					const resolve = waiter.resolve, collected = lines;
					waiter = null; lines = [];
					resolve(collected);
				}
			});
			return {
				send: (cmd) => engine.postMessage(cmd),
				write: (text) => engine.FS.writeFile(CUSTOM_VARIANT_PATH, text),
				ask: (cmd, done) => new Promise((resolve, reject) => {
					lines = [];
					waiter = { done, resolve };
					const timer = setTimeout(() => reject(new Error("engine timeout on: " + cmd)), 30000);
					const original = resolve;
					waiter.resolve = (value) => { clearTimeout(timer); original(value); };
					engine.postMessage(cmd);
				}),
			};
		});
}

// the piece placement and side to move of a FEN - the fields the engine keeps
// verbatim (it normalises castling rights and may drop clocks)
const position = (fen) => fen.trim().split(/\s+/).slice(0, 2).join(" ");

(async () => {
	const engine = await startEngine();

	console.log("\n" + declarations.length + " custom variant definitions, against "
		+ "the bundled engine");

	for(const declaration of declarations) {
		const label = declaration.game + " (" + declaration.variant + ")";
		// the startFen of THIS variant's section, not of the file
		const own = declaration.ini.split(/^\s*\[/m)
			.filter((block) => block.indexOf(declaration.variant) === 0)[0] || "";
		const declared = /^\s*startFen\s*=\s*(.+)$/m.exec(own);

		// One ini may define several variants - the Capablanca preludes share
		// a single multi-section file - so the variant the level names has to
		// be one of the sections, not necessarily the first.
		const sections = (declaration.ini.match(/^\s*\[\s*([A-Za-z0-9_]+)/gm) || [])
			.map((header) => /([A-Za-z0-9_]+)$/.exec(header.trim())[1]);
		if(sections.indexOf(declaration.variant) < 0) {
			t.check(label + " is defined by its own ini",
				sections.join(", ") || "(no section header)", declaration.variant);
			continue;
		}

		engine.write(declaration.ini);
		engine.send("setoption name VariantPath value " + CUSTOM_VARIANT_PATH);
		engine.send("setoption name UCI_Variant value " + declaration.variant);
		// "position startpos" uses the variant's OWN start position, so the
		// board the engine echoes back is proof of what it resolved. The
		// engine also emits an "info string variant ..." summary, but it
		// arrives lazily - "d" always answers, which makes it the reliable
		// synchronisation point as well as the assertion.
		engine.send("position startpos");
		const shown = (await engine.ask("d", (line) => line.indexOf("Fen: ") === 0))
			.find((line) => line.indexOf("Fen: ") === 0).slice(5);

		if(declared)
			t.check(label + " starts from the position its ini declares",
				position(shown), position(declared[1]));

		// and it has to actually play: a variant that parsed but is
		// inconsistent typically dies here rather than at selection time
		engine.send("position startpos");
		const searched = await engine.ask("go depth 4", (line) => line.indexOf("bestmove") === 0);
		const best = searched.find((line) => line.indexOf("bestmove") === 0).split(" ")[1];
		t.ok(label + " plays a move (" + best + ")", !!best && best !== "(none)");
	}

	t.done("custom variant definitions");
	process.exit(t.failed ? 1 : 0);
})().catch((error) => { console.error("ERROR", error); process.exit(2); });
