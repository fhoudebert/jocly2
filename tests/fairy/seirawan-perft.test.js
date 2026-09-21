/*
 * Seirawan++ : le niveau Expert, confronté au moteur embarqué.
 *
 *   node tests/fairy/seirawan-perft.test.js
 *
 * Trois choses doivent tenir pour que Fairy-Stockfish joue CE jeu et non un
 * voisin, et chacune a déjà été fausse pendant la mise au point :
 *
 *   1. LES RÈGLES. Pour chacune des dix paires, des parties aléatoires sont
 *      jouées côté Jocly et, à chaque position, la liste des coups du modèle
 *      est comparée COUP PAR COUP à celle du moteur (« go perft 1 » détaille
 *      chaque coup). Le hasard est orienté vers les entrées et les roques, et
 *      les parties sont assez longues pour aller jusqu'aux promotions. C'est
 *      ce qui a trouvé le griffon qui sortait de l'échiquier par les colonnes
 *      d'attente, la case restée ouverte après une prise, et le « h » du champ
 *      de roque que le moteur prenait pour un droit de roque.
 *
 *   2. LA POSITION : ExportFairyFen(), c'est-à-dire ce que jocly.fairy.js
 *      envoie vraiment. La comparaison du point 1 passe par elle.
 *
 *   3. LA NOTATION : Move.ToString("engine"), avec laquelle ResolveMove()
 *      cherche une correspondance EXACTE au coup du moteur. Chaque clé de la
 *      comparaison du point 1 est une notation Jocly : un coup qui ne s'écrit
 *      pas comme le moteur l'écrit apparaît des deux côtés comme orphelin.
 *
 * Puis le chemin complet : le niveau « expert » du manifeste, lancé par
 * match.machineSearch() à travers jocly.fairy.js, avec un fournisseur de
 * moteur qui parle au wasm dans ce processus (Node n'a pas de Worker). Le
 * coup rendu doit être un coup légal, sans repli sur l'IA native.
 *
 * Les ini viennent du manifeste, pas d'ici : c'est eux qu'on vérifie.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const FAIRY = path.join(ROOT, "third-party", "fairy-stockfish");
const DIST = path.join(ROOT, "dist", "node", "jocly.core.js");
const CUSTOM_VARIANT_PATH = "/jocly-custom-variants.ini";

if(!fs.existsSync(DIST)) {
	console.log("SKIP - no build yet: run npx gulp build first");
	process.exit(0);
}

const Jocly = require(DIST);
const JoclyFairy = require(path.join(ROOT, "dist", "node", "jocly.fairy.js")).JoclyFairy;
const t = require("./harness.js").runner();

const GAME = "seirawan-chess";
/*
 * CE QUE COUTE CETTE SUITE, ET CE QUI EST MESURE.
 *
 * C'est la plus lente du depot. Deux postes :
 *
 *   - la comparaison coup par coup (points 1-3), environ 5 s. Six parties par
 *     paire ne sont pas un chiffre rond : a trois, la paire 4 ne voit aucun
 *     roque (199 / 0 / 84), et « zero divergence » n'y dit plus rien. Les
 *     compteurs affiches a chaque paire sont la pour ca ;
 *   - le chemin complet (point 4), manifeste -> jocly.fairy.js -> moteur ->
 *     ResolveMove, sur trois paires : la native, puis deux ini maison aux
 *     pieces coudees. Vingt coups chacune, parce qu'a dix le moteur ne fait
 *     presque rien entrer, et que l'entree est ce que la derniere
 *     verification cherche.
 *
 * LE TEMPS DE REFLEXION EST DE 50 ms, contre 150 auparavant. On verifie que le
 * coup rendu est LEGAL et qu'il se retrouve, pas qu'il est bon, et 50 ms
 * suffisent sur trois executions -- zero reponse perimee, trois a sept
 * entrees jouees par le moteur.
 *
 * Ce qui paraissait exiger du temps n'en exigeait pas : les reponses perimees
 * qu'on voyait en dessous de 150 ms -- et parfois a 150 ms -- venaient d'une
 * ligne « bestmove » collee a la sortie suivante du moteur, pas de sa hate.
 * Voir la barriere isready du fournisseur, et jocly.fairyworker.js qui a le
 * meme correctif.
 */
const GAMES_PER_PAIR = +(process.env.SEIRAWAN_GAMES || 6);
const PLIES = +(process.env.SEIRAWAN_PLIES || 80);
const AI_PAIRS = [0, 1, 6];
const AI_PLIES = +(process.env.SEIRAWAN_AI_PLIES || 20);
const AI_MOVETIME = +(process.env.SEIRAWAN_AI_MOVETIME || 50);

/* ---- le niveau, tel que le manifeste le déclare ---- */

const manifest = require(path.join(ROOT, "src", "games", "chessbase", "index.js"))
	.games.filter((g) => g.name === GAME)[0];
const expert = manifest.config.model.levels.filter((l) => l.ai === "fairy-stockfish")[0];

t.ok("le jeu déclare un niveau fairy-stockfish", !!expert);
t.check("une variante par paire du prélude",
	(expert.variants || []).map((v) => v.setup).sort((a, b) => a - b), [0,1,2,3,4,5,6,7,8,9]);

/* ---- le moteur ---- */

function loadEngine() {
	const Stockfish = require(path.join(FAIRY, "stockfish.js"));
	return Stockfish({ wasmBinary: fs.readFileSync(path.join(FAIRY, "stockfish.wasm")) });
}

function uciSession(engine) {
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
		ask: (cmd, done) => new Promise((resolve, reject) => {
			lines = [];
			const timer = setTimeout(() => reject(new Error("engine timeout on: " + cmd)), 60000);
			waiter = { done, resolve: (v) => { clearTimeout(timer); resolve(v); } };
			engine.postMessage(cmd);
		}),
	};
}

/*
 * Un fournisseur de moteur à la forme d'un Worker (voir
 * JoclyFairy.setEngineProvider), qui rejoue ce que fait jocly.fairyworker.js
 * pour un « Search » : ini, variante, compétence, position, go. Réduit au
 * nécessaire - pas d'arrêt en cours de recherche, pas de NNUE.
 */
function wasmProvider(engine) {
	const session = uciSession(engine);
	let ready = session.ask("uci", (l) => l === "uciok");
	return function () {
		const worker = {
			onmessage: null, onerror: null,
			postMessage(message) {
				const reply = (data) => setTimeout(() => worker.onmessage && worker.onmessage({ data }), 0);
				if(message.type === "Init") { ready.then(() => reply({ type: "Ready" })); return; }
				if(message.type !== "Search") return;
				ready = ready.then(async () => {
					if(message.customVariantIni) {
						engine.FS.writeFile(CUSTOM_VARIANT_PATH, message.customVariantIni);
						session.send("setoption name VariantPath value " + CUSTOM_VARIANT_PATH);
					}
					session.send("setoption name UCI_Variant value " + message.variant);
					if(typeof message.skillLevel === "number")
						session.send("setoption name Skill Level value " + message.skillLevel);
					// La meme barriere que jocly.fairyworker.js : la ligne
					// « info string variant » qui suit UCI_Variant arrive
					// parfois collee a un reste de la sortie precedente,
					// « bestmove ... » compris, et serait prise pour la
					// reponse. On la laisse passer avant de chercher.
					await session.ask("isready", (l) => l === "readyok");
					session.send("position fen " + message.fen);
					// Et, comme le worker, une reponse BIEN FORMEE seulement :
					// le reste colle peut aussi s'accrocher apres readyok.
					const wellFormed = (l) => {
						const at = l.lastIndexOf("bestmove ");
						if(at < 0) return false;
						const tail = l.slice(at);
						return /^bestmove\s+\S+(?:\s+ponder\s+\S+)?\s*$/.test(tail) && !/info/.test(tail);
					};
					const out = await session.ask("go movetime " + (message.moveTimeMs || 200), wellFormed);
					worker.lastFen = message.fen;
					worker.lastVariant = message.variant;
					const last = out[out.length - 1];
					reply({ type: "Done", data: { bestMoveUci: last.slice(last.lastIndexOf("bestmove ")).split(/\s+/)[1] } });
				}).catch((err) => reply({ type: "Error", error: String(err) }));
			},
		};
		wasmProvider.last = worker;
		return worker;
	};
}

/* ---- côté Jocly ---- */

// La partie ouverte sur la paire `setup` : les deux demi-coups du prélude.
async function started(setup) {
	const m = await Jocly.createMatch(GAME);
	for(let ply = 0; ply < 2; ply++) {
		const list = await m.getPossibleMoves();
		const said = await m.getMoveString(list);
		if(!said.every((n) => /^(#\d+|--)$/.test(n))) break;
		// le second demi-coup n'offre que « -- », le passage de trait
		const wanted = said.indexOf("#" + setup);
		await m.playMove(list[wanted >= 0 ? wanted : 0]);
	}
	return m;
}

function legal(game, board) {
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.slice();
}

function after(game, board, move) {
	const next = new (game.GetBoardClass())(game);
	next.CopyFrom(board);
	next.mWho = board.mWho;
	next.ApplyMove(game, move);
	next.mWho = -board.mWho;
	next.mMoves = [];
	return next;
}

// setup -> la même chose qu'ResolveLevel() : le niveau, complété par l'entrée
function levelFor(setup) {
	const entry = expert.variants.filter((v) => v.setup === setup)[0];
	return Object.assign({}, expert, entry, { variants: undefined });
}

// Jocly écrit ses lettres, le moteur les siennes : la pieceMap de la paire 0.
function toEngineFen(fen, level) {
	const map = level.pieceMap || {};
	const i = fen.indexOf(" ");
	return fen.slice(0, i).replace(/[A-Za-z]/g, (ch) => {
		const up = map[ch.toUpperCase()];
		return up ? (ch === ch.toUpperCase() ? up : up.toLowerCase()) : ch;
	}) + fen.slice(i);
}
function toJoclyMove(uci, level) {
	const map = level.pieceMap || {};
	const m = /^([a-h]\d[a-h]\d)([a-z])$/.exec(uci);
	if(!m) return uci;
	for(const k in map)
		if(map[k].toLowerCase() === m[2]) return m[1] + k.toLowerCase();
	return uci;
}

(async () => {

const engine = await loadEngine();
const session = uciSession(engine);
await session.ask("uci", (l) => l === "uciok");

/* ------------------------------------------------ la forme, sur un exemple */

{
	const match = await started(0);
	const game = match.game, board = game.mBoard;
	// les deux demi-coups du prélude comptent : d'où le « 2 » final
	t.check("le FEN du S-Chess au départ", board.ExportFairyFen(game),
		"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[CMcm] w KQBCDFGkqbcdfg - 0 2");
	t.check("la notation moteur des coups du cavalier b1",
		legal(game, board).map((mv) => game.CreateMove(mv).ToString("engine"))
			.filter((s) => s.indexOf("b1") === 0).sort(),
		["b1a3", "b1a3c", "b1a3m", "b1c3", "b1c3c", "b1c3m"]);
	t.check("la notation du jeu, elle, ne change pas",
		legal(game, board).map((mv) => game.CreateMove(mv).ToString())
			.filter((s) => /^Nb1-c3/.test(s)).sort(),
		["Nb1-c3", "Nb1-c3/C", "Nb1-c3/M"]);
}

/* ------------------------------------------ 1-3 : le modèle contre le moteur */

let seed = 20260920;
const random = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };

for(let setup = 0; setup < 10; setup++) {
	const level = levelFor(setup);
	if(level.customVariantIni) {
		engine.FS.writeFile(CUSTOM_VARIANT_PATH, level.customVariantIni);
		session.send("setoption name VariantPath value " + CUSTOM_VARIANT_PATH);
	}
	session.send("setoption name UCI_Variant value " + level.variant);
	await session.ask("isready", (l) => l === "readyok");

	const match = await started(setup);
	const game = match.game;
	let positions = 0, gatings = 0, castlings = 0, promotions = 0;
	const mismatches = [];

	// quelques parties de plus si aucune n'a encore mené un pion au bout
	for(let g = 0; (g < GAMES_PER_PAIR || !promotions) && g < 3 * GAMES_PER_PAIR
			&& !mismatches.length; g++) {
		let board = game.mBoard;
		for(let ply = 0; ply < PLIES; ply++) {
			const fen = board.ExportFairyFen(game, level);
			session.send("position fen " + toEngineFen(fen, level));
			const out = await session.ask("go perft 1", (l) => l.indexOf("Nodes searched") === 0);
			const theirs = out.map((l) => /^([a-z]\d+[a-z]\d+[a-z]?):\s*\d+/.exec(l.trim()))
				.filter(Boolean).map((m) => toJoclyMove(m[1], level)).sort();
			const moves = legal(game, board);
			// comme ResolveMove() : un coup du générateur passe par CreateMove()
			const ours = moves.map((mv) => game.CreateMove(mv).ToString("engine").toLowerCase()).sort();
			positions++;
			if(JSON.stringify(ours) !== JSON.stringify(theirs)) {
				mismatches.push({ fen,
					engineOnly: theirs.filter((x) => ours.indexOf(x) < 0),
					joclyOnly: ours.filter((x, i) => theirs.indexOf(x) < 0 || ours.indexOf(x) !== i) });
				break;
			}
			moves.forEach((mv) => {
				if(mv.en !== undefined) gatings++;
				if(mv.cg !== undefined) castlings++;
				// un vrai `pr` de promotion : pas le passage pion initial -> pion
				// (types 0-3), ni celui que porte un coup sans entrée (pn)
				if(mv.pr !== undefined && mv.pr > 3 && mv.en === undefined && mv.pn === undefined) promotions++;
			});
			if(!moves.length) break;
			const special = moves.filter((mv) => mv.en !== undefined || mv.cg !== undefined);
			const move = special.length && random(3) === 0 ? special[random(special.length)]
				: moves[random(moves.length)];
			board = after(game, board, move);
		}
	}

	t.check("paire " + setup + " (" + level.variant + ") : mêmes coups que le moteur sur "
		+ positions + " positions", mismatches.length, 0);
	mismatches.forEach((m) => console.log("    " + m.fen
		+ "\n    moteur seul : " + m.engineOnly.join(" ")
		+ "\n    Jocly seul  : " + m.joclyOnly.join(" ")));
	// qu'on ait bien exercé ce qui compte, sinon « 0 divergence » ne dit rien
	t.ok("paire " + setup + " : entrées, roques et promotions comparés ("
		+ gatings + " / " + castlings + " / " + promotions + ")",
		gatings > 0 && castlings > 0 && promotions > 0);
}

/* ------------------------------ 4 : le chemin complet, par machineSearch() */

/*
 * LE REPLI SILENCIEUX DE ResolveMove.
 *
 * Quand le coup du moteur ne figure pas dans la liste de jocly, jocly.fairy.js
 * joue « le plus proche » et le dit en console -- rien d'autre. Le coup reste
 * legal, donc toutes les verifications de cette partie passaient : un moteur
 * qui regarde un autre echiquier que nous serait resté invisible ici, alors
 * que c'est precisement ce que cette suite cherche. On ecoute donc ce que
 * jocly.fairy.js ecrit en console. C'est ainsi qu'est apparu le defaut de la
 * ligne « bestmove » collee (voir le fournisseur) : jusque-la, dix-huit
 * reponses perimees sur vingt coups passaient pour une partie normale.
 */
const warnings = [];
// console.ERROR, pas console.warn : c'est la que jocly.fairy.js l'ecrit, et
// une garde branchee ailleurs resterait muette.
const realError = console.error;
console.error = function (...args) {
	const text = args.join(" ");
	if(/not among Jocly's legal moves/.test(text)) warnings.push(text.split("\n")[0]);
	realError.apply(console, args);
};

JoclyFairy.setEngineProvider(wasmProvider(engine));
let enteredTotal = 0;
for(const setup of AI_PAIRS) {
	const match = await started(setup);
	const level = Object.assign({}, match.game.config.model.levels
		.filter((l) => l.ai === "fairy-stockfish")[0], { moveTimeMs: AI_MOVETIME });
	let played = 0, fallbacks = 0, entered = 0;
	for(let ply = 0; ply < AI_PLIES; ply++) {
		const result = await match.machineSearch({ level });
		if(result.fairyFallback) { fallbacks++; break; }
		if(!result.move) break;
		const legalNow = await match.getPossibleMoves();
		const said = await match.getMoveString(legalNow);
		const mine = await match.getMoveString([result.move]);
		if(said.indexOf(mine[0]) < 0) break;
		if(/\//.test(mine[0])) entered++;
		await match.playMove(result.move);
		played++;
	}
	t.check("paire " + setup + " : l'Expert joue " + AI_PLIES + " coups légaux, sans repli",
		[played, fallbacks], [AI_PLIES, 0]);
	t.check("paire " + setup + " : le moteur a reçu la variante de la paire",
		wasmProvider.last && wasmProvider.last.lastVariant, levelFor(setup).variant);
	console.log("    (" + entered + " entrée(s) jouée(s) par le moteur)");
	enteredTotal += entered;
}
// Le moteur entre ses pièces tôt ou tard : si AUCUNE entrée ne revient sur
// les trois paires, c'est que la notation ne se retrouve plus. Le compteur
// est affiché paire par paire : s'il tombe à zéro partout, c'est ce qu'il
// faut regarder avant de rallonger les parties.
t.ok("des entrées jouées par le moteur ont été reconnues (" + enteredTotal + ")", enteredTotal > 0);
console.error = realError;
t.check("aucun coup du moteur n'a été rattrapé par « le plus proche »",
	warnings.slice(0, 3), []);
JoclyFairy.setEngineProvider(null);

t.done("Seirawan++ Expert");

})().catch((err) => { console.log("CRASH " + (err && err.stack || err)); process.exit(1); });
