/*
 * Seirawan++ : le panneau d'entrée APRÈS UN ROQUE.
 *
 *   node tests/chessbase/seirawan-castle-panel.test.js
 *
 * Après le premier déplacement d'une pièce de la rangée arrière, un panneau
 * propose : la pièce seule, l'une ou l'autre des pièces en attente, et une
 * croix pour annuler le coup, sur fond blanc. Au roque, rien de tout cela :
 * les vignettes des pièces en attente flottaient sur le plateau assombri,
 * sans fond, sans croix, et sans le roi -- le choix « roquer sans faire
 * entrer de pièce ».
 *
 * La cause était dans le socle (base-view.js) : il remplace l'`execute` de
 * l'étape d'arrivée d'un roque par une simple animation, là où celle d'un
 * coup ordinaire ouvre le panneau. Ce test fait tourner la VRAIE machine de
 * saisie -- base-view.js puis seirawan-view.js, chargés dans un bac à sable,
 * sur les vrais coups du modèle -- et regarde ce qu'elle affiche.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const DIST = path.join(ROOT, "dist", "node", "jocly.core.js");
if(!fs.existsSync(DIST)) {
	console.log("SKIP - no build yet: run npx gulp build first");
	process.exit(0);
}
const Jocly = require(DIST);
const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();

/* ---- la vue, dans un bac à sable ---- */

function extend() {
	let deep = false, i = 0;
	if(typeof arguments[0] === "boolean") { deep = arguments[0]; i = 1; }
	const target = arguments[i] || {};
	for(let k = i + 1; k < arguments.length; k++) {
		const src = arguments[k];
		if(!src) continue;
		for(const key in src) {
			const v = src[key];
			if(deep && v && typeof v === "object" && !Array.isArray(v))
				target[key] = extend(true, target[key] && typeof target[key] === "object" ? target[key] : {}, v);
			else if(v !== undefined) target[key] = v;
		}
	}
	return target;
}

const sandbox = { console, Math, JSON, Object, Array, View: { Game: {}, Board: {} }, $: { extend } };
vm.createContext(sandbox);
for(const file of ["base-view.js", "famous/seirawan-view.js"])
	vm.runInContext(fs.readFileSync(path.join(ROOT, "src", "games", "chessbase", file), "utf8"),
		sandbox, { filename: file });
const View = sandbox.View;

/* ---- ce que la vue affiche : le dernier état de chaque gadget ---- */

function recorder() {
	const gadgets = {};
	return {
		gadgets,
		updateGadget(id, spec) {
			const now = gadgets[id] || (gadgets[id] = {});
			for(const layer in spec) now[layer] = Object.assign(now[layer] || {}, spec[layer]);
		},
		visible(id) { return !!(gadgets[id] && gadgets[id].base && gadgets[id].base.visible); },
	};
}

/* ---- une position où le roque peut faire entrer une pièce ---- */

async function started(setup) {
	const m = await Jocly.createMatch("seirawan-chess");
	for(let ply = 0; ply < 2; ply++) {
		const list = await m.getPossibleMoves();
		const said = await m.getMoveString(list);
		if(!said.every((n) => /^(#\d+|--)$/.test(n))) break;
		const wanted = said.indexOf("#" + setup);
		await m.playMove(list[wanted >= 0 ? wanted : 0]);
	}
	return m;
}

(async function () {

// la paire du Spartan : tour couronnée et machine, celle des captures d'écran
const match = await started(5);
for(const want of ["Ng1-f3", "Ng8-f6", "e2-e3", "e7-e6", "Bf1-e2", "Bf8-e7"]) {
	const list = await match.getPossibleMoves();
	const said = await match.getMoveString(list);
	await match.playMove(list[said.indexOf(want)]);
}
const game = match.game, board = game.mBoard;
const types = game.cbVar.pieceTypes;
const geo = game.cbVar.geometry;
const E1 = geo.PosByName("e1");

board.mMoves = [];
board.GenerateMoves(game);
const fromKing = board.mMoves.filter((m) => m.f === E1).map((m) => game.CreateMove(m));
const castles = fromKing.filter((m) => m.cg !== undefined);
t.check("le petit roque existe en cinq variantes (seul, deux pièces x deux cases)", castles.length, 5);

const KING = +Object.keys(types).filter((k) => types[k].name === "king")[0];
const entering = [...new Set(castles.filter((m) => m.en !== undefined).map((m) => m.ei))].sort();
t.check("les deux pièces qui peuvent entrer sont celles du Spartan",
	entering.map((k) => types[k].name), ["crowned-rook", "machine"]);

/* ---- la machine de saisie, sur ces coups ---- */

const xdv = recorder();
const aGame = Object.create(View.Game);
Object.assign(aGame, {
	cbVar: game.cbVar,
	g: { pTypes: Object.keys(types).map((k) => types[k]) },
	mShowMoves: true,
	CreateMove: (m) => game.CreateMove(m),
	// l'habillage des vignettes n'est pas ce qu'on teste ici
	cbPromoSpec: () => ({ file: "sprite.png" }),
	// ni le placement des pièces à l'annulation
	cbMakeDisplaySpecForPiece: () => ({}),
});
const vBoard = Object.create(View.Board);
Object.assign(vBoard, {
	board: board.board, pieces: board.pieces, mWho: board.mWho,
	cbAnimate: (xdv_, aGame_, move, callback) => { vBoard.animated = move; callback(); },
});

const spec = View.Board.xdInput.call(vBoard, xdv, aGame);
const arrival = spec.getActions.call(vBoard, fromKing, Object.assign({}, spec.initial, { f: E1 }));

// l'action du petit roque : celle qui porte ses cinq variantes
const castleAction = Object.values(arrival).filter((a) => a.moves.some((m) => m.cg !== undefined))[0];
t.ok("l'étape d'arrivée propose le roque", !!castleAction);
t.check("et y range ses cinq variantes", castleAction.moves.length, 5);

let done = false;
castleAction.execute.call(vBoard, () => { done = true; });
t.ok("l'arrivée du roque rend la main", done);
t.check("l'animation est celle du roque seul, sans pièce qui entre",
	vBoard.animated && vBoard.animated.en, undefined);

/* ---- le panneau ---- */

t.ok("le fond blanc du panneau est affiché", xdv.visible("promo-board"));
t.ok("la croix d'annulation est affichée", xdv.visible("promo-cancel"));
t.ok("le roi est proposé (roquer sans faire entrer de pièce)", xdv.visible("promo#" + KING));
entering.forEach((k) => t.ok(types[k].name + " est proposée", xdv.visible("promo#" + k)));

// trois vignettes à trois places distinctes : une vignette par pièce
const places = [KING].concat(entering).map((k) => xdv.gadgets["promo#" + k].base.x + "," + xdv.gadgets["promo#" + k].base.y);
t.check("trois vignettes, trois places", new Set(places).size, 3);
t.check("le fond est dimensionné pour trois choix et la croix",
	xdv.gadgets["promo-board"].base.width, 4 * aGame.cbPromoSize);

/* ---- l'étape suivante : choisir, ou annuler ---- */

const chosen = castleAction.moves;
const choice = spec.getActions.call(vBoard, chosen,
	Object.assign({}, spec.initial, { f: E1, t: castleAction.t, cg: castles[0].cg }));
t.check("l'étape de choix : le roi et les deux pièces",
	Object.keys(choice).map(Number).sort((a, b) => a - b), [KING].concat(entering).sort((a, b) => a - b));
t.ok("chaque choix s'annule par la croix",
	Object.values(choice).every((a) => a.cancel && a.cancel[0] === "promo-cancel"));
t.ok("chaque choix est une vignette cliquable du panneau",
	Object.keys(choice).every((k) => choice[k].click[0] === "promo#" + k));

// annuler l'arrivée referme le panneau
castleAction.unexecute && castleAction.unexecute.call(vBoard);
t.ok("annuler l'arrivée referme le panneau",
	!xdv.visible("promo-board") && !xdv.visible("promo-cancel") && !xdv.visible("promo#" + KING));

/* ---- et le coup ordinaire n'a pas changé ---- */

const B1 = geo.PosByName("b1");
const fromKnight = board.mMoves.filter((m) => m.f === B1).map((m) => game.CreateMove(m));
const xdv2 = recorder();
const spec2 = View.Board.xdInput.call(vBoard, xdv2, aGame);
const arrival2 = spec2.getActions.call(vBoard, fromKnight, Object.assign({}, spec2.initial, { f: B1 }));
const toC3 = arrival2[geo.PosByName("c3")];
toC3.execute.call(vBoard, () => {});
const KNIGHT = +Object.keys(types).filter((k) => types[k].name === "knight")[0];
t.ok("Nb1-c3 : même panneau, le cavalier à la place du roi",
	xdv2.visible("promo-board") && xdv2.visible("promo-cancel") && xdv2.visible("promo#" + KNIGHT)
	&& entering.every((k) => xdv2.visible("promo#" + k)));

t.done("Seirawan++ : panneau du roque");
})().catch((err) => { console.log("CRASH " + (err && err.stack || err)); process.exit(1); });
