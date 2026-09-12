/*
 * L'orientation du plateau, et ce qui la retournait au chargement.
 *
 *   node tests/core/view-as.test.js
 *
 * LE DEFAUT. À l'attachement, jocly.embed.js recopiait les options de vue
 * reçues dans les champs du jeu. Toutes passaient par un `typeof != undefined`
 * — toutes sauf `viewAs` :
 *
 *     if (match.game.mViewOptions.switchable)
 *         match.game.mViewAs = options.viewAs;      // sans garde
 *
 * Or les options relues du stockage local n'en portent pas : le panneau
 * d'options de control.html enregistre l'habillage, la notation, les sons —
 * jamais le côté. `mViewAs` recevait donc `undefined` à chaque attachement.
 *
 * POURQUOI ÇA NE SE VOYAIT QU'À L'ÉCRAN. Les vues ne font que COMPARER cette
 * valeur : `this.mViewAs == 1`, `this.mViewAs * side < 0`. Avec `undefined`,
 * rien n'échoue — les comparaisons sont simplement fausses, et le plateau
 * s'ouvre les blancs en haut. Pas d'exception, pas de console, et le joueur
 * n'avait d'autre recours que de basculer vers l'autre camp puis de revenir :
 * choisir directement le bon côté ne déclenchait aucun `change`, la liste
 * l'affichant déjà.
 *
 * D'où un seul chemin d'écriture, SetViewAs, qui refuse ce qui n'est pas un
 * camp — et garde l'orientation en cours plutôt que d'en prendre une qui
 * n'existe pas.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();

// jocly.game.js se charge seul : il ne dépend que de globals qu'on fournit.
function loadGame() {
	const sandbox = { console, Math, Object, Array, JSON, Date, setTimeout, clearTimeout,
		exports: {}, module: { exports: {} }, require: () => ({}) };
	sandbox.global = sandbox;
	vm.createContext(sandbox);
	vm.runInContext(fs.readFileSync(path.join(ROOT, "src", "core", "jocly.game.js"), "utf8"),
		sandbox, { filename: "jocly.game.js" });
	return sandbox.exports.Game || sandbox.JocGame;
}

const JocGame = loadGame();
t.check("le module se charge", typeof JocGame, "function");

function newGame() {
	const game = Object.create(JocGame.prototype);
	game.mViewAs = JocGame.PLAYER_A;
	game.mOptions = {};
	return game;
}

/* ----------------------------------------------- ce qui est accepte */

{
	const game = newGame();
	t.check("on peut regarder depuis B", [game.SetViewAs(JocGame.PLAYER_B), game.mViewAs],
		[true, JocGame.PLAYER_B]);
	t.check("et revenir sur A", [game.SetViewAs(JocGame.PLAYER_A), game.mViewAs],
		[true, JocGame.PLAYER_A]);
	// Les options du jeu suivent : elles sont relues au prochain attachement,
	// et les laisser en arriere ramenerait l'ancienne orientation.
	t.check("les options du jeu suivent", game.mOptions.viewAs, JocGame.PLAYER_A);
}

/* ------------------------------------------- ce qui est refuse */

{
	/*
	 * LE CAS QUI A CAUSE LE DEFAUT : des options de vue sans `viewAs`.
	 * C'est le cas COURANT, pas un cas limite -- le panneau d'options n'en
	 * enregistre jamais.
	 */
	const game = newGame();
	game.SetViewAs(JocGame.PLAYER_B);
	t.check("une valeur absente ne retourne pas le plateau",
		[game.SetViewAs(undefined), game.mViewAs], [false, JocGame.PLAYER_B]);

	// Et tout ce qui n'est pas un camp : une orientation conservee vaut mieux
	// qu'une orientation qui n'existe pas.
	for (const bad of [null, 0, 2, -2, "player-a", "1", NaN, {}, []])
		t.check("refuse : " + JSON.stringify(bad),
			[game.SetViewAs(bad), game.mViewAs], [false, JocGame.PLAYER_B]);
}

/* ------------------------------------- les deux portes d'ecriture */

/*
 * Le point du correctif n'est pas la fonction, c'est qu'AUCUN autre chemin
 * n'ecrive mViewAs. Il y en a exactement deux : l'attachement (jocly.embed.js)
 * et le changement d'option en cours de partie (jocly.core.js). Un troisieme
 * qui apparaitrait sans garde ramenerait le meme defaut, et de la meme facon :
 * en silence.
 */
{
	const embed = fs.readFileSync(path.join(ROOT, "src", "browser", "jocly.embed.js"), "utf8");
	const core  = fs.readFileSync(path.join(ROOT, "src", "core", "jocly.core.js"), "utf8");
	const game  = fs.readFileSync(path.join(ROOT, "src", "core", "jocly.game.js"), "utf8");

	t.check("l'attachement passe par SetViewAs", /SetViewAs\(options\.viewAs\)/.test(embed), true);
	t.check("le changement d'option aussi", /SetViewAs\(options\.viewAs\)/.test(core), true);

	const direct = [];
	for (const [name, src] of [["jocly.embed.js", embed], ["jocly.core.js", core], ["jocly.game.js", game]])
		for (const line of src.split("\n"))
			if (/\bmViewAs\s*=(?!=)/.test(line) && !/this\.mViewAs = aPlayer/.test(line)
				&& !/this\.mViewAs = JocGame\.PLAYER_A/.test(line))
				direct.push(name + " : " + line.trim());
	t.check("personne n'ecrit mViewAs directement", direct, []);
}

t.done("View as");
