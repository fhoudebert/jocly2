/*
 * Game manifest of the chessbase module: the one list gulp reads when it builds
 * it (HandleModuleGames requires this directory), and the one every game in the
 * module is exposed through.
 *
 * Nothing is declared here any more. The shared building blocks - script lists,
 * level sets, game options, skins, cameras, worlds - are in manifest/shared.js,
 * and the game entries themselves in manifest/<family>.js, one file per family
 * of variants, named after the sub-directory their model and view scripts live
 * in. What is left is the running order, which is part of what callers see:
 * examples/browser/js/multiple.js and examples/node/list-games.js both walk the
 * list as it comes.
 *
 * tests/chessbase/manifest-split.test.js is what keeps that safe: it checks the
 * serialisation of every entry against a snapshot, which is exactly what gulp
 * writes into games/chessbase/<game>-config.js.
 */

const boards3d = require("./manifest/3d.js").games;
const amazon = require("./manifest/amazon.js").games;
const asymmetric = require("./manifest/asymmetric.js").games;
const capa10x8 = require("./manifest/capa10x8.js").games;
const cazaux = require("./manifest/cazaux.js").games;
const circular = require("./manifest/circular.js").games;
const decimal = require("./manifest/decimal.js").games;
const duodecimal = require("./manifest/duodecimal.js").games;
const famous = require("./manifest/famous.js").games;
const hex = require("./manifest/hex.js").games;
const historical = require("./manifest/historical.js").games;
const knighted = require("./manifest/knighted.js").games;
const locust = require("./manifest/locust.js").games;
const mini = require("./manifest/mini.js").games;
const misc = require("./manifest/misc.js").games;
const shogi = require("./manifest/shogi.js").games;
const standard = require("./manifest/standard.js").games;
const tressau = require("./manifest/tressau.js").games;
const ultima = require("./manifest/ultima.js").games;

exports.games = [
	famous["classic-chess"],
	standard["losing-chess"],
	famous["xiangqi"],
	famous["janggi"],
	mini["gardner-chess"],
	mini["mini4x4-chess"],
	mini["mini4x5-chess"],
	mini["micro4x5-chess"],
	mini["baby-chess"],
	mini["malett-chess"],
	mini["los-alamos-chess"],
	mini["attack-chess"],
	historical["courier-chess"],
	famous["makruk"],
	cazaux["shako-chess"],
	famous["shatranj-chess"],
	standard["knightmate-chess"],
	boards3d["raumschach"],
	hex["glinski-chess"],
	hex["brusky-chess"],
	hex["devasa-chess"],
	hex["mccooey-chess"],
	hex["shafran-chess"],
	circular["circular-chess"],
	circular["byzantine-chess"],
	boards3d["3dchess"],
	boards3d["space-spartan"],
	circular["cylinder-chess"],
	boards3d["cubic-chess"],
	cazaux["rollerball-chess"],
	famous["chess960"],
	cazaux["metamachy-chess"],
	capa10x8["capablanca-chess"],
	decimal["grand-chess"],
	decimal["hectochess"],
	decimal["heavychess"],
	knighted["modern-chess"],
	knighted["chancellor-chess"],
	decimal["wildebeest-chess"],
	misc["smess"],
	standard["demi-chess"],
	standard["romanchenko-chess"],
	amazon["amazon-chess"],
	historical["dukerutland-chess"],
	amazon["gustav3-chess"],
	decimal["hyderabad-chess"],
	tressau["kaisergame-chess"],
	tressau["sultangame-chess"],
	duodecimal["reformed-courier-chess"],
	amazon["tutti-frutti-chess"],
	standard["sweet16-chess"],
	cazaux["tera-chess"],
	cazaux["giga-chess"],
	duodecimal["leychessalpha-chess"],
	cazaux["fantasticXIII-chess"],
	cazaux["bigorra-chess"],
	cazaux["wild-tamerlane-chess"],
	cazaux["pemba-chess"],
	cazaux["giga-chessII"],
	duodecimal["gross-chess"],
	duodecimal["timurid-chess"],
	cazaux["zanzibar-s-chess"],
	misc["team-mate-chess"],
	ultima["ultima"],
	ultima["rococo"],
	ultima["rocaille"],
	locust["werewolf-chess"],
	locust["elven-chess"],
	asymmetric["spartan-chess"],
	asymmetric["khans-chess"],
	decimal["scirocco-chess"],
	shogi["shogi"],
	shogi["kotaishi-shogi"],
	shogi["seireigi"],
	shogi["chu-seireigi"],
	shogi["mini-shogi"],
	shogi["kyoto-shogi"],
	shogi["tori-shogi"],
	shogi["chu-shogi"],
	locust["makromachy"],
	locust["minjiku-shogi"],
	historical["acedrex-chess"],
];
