/* jshint esversion:6 */
const path = require('path');
const fs = require('fs');

const gulp = require('gulp');
const through = require('through2');
const Vinyl = require("vinyl");
const merge = require('merge-stream');
const mergeSequential = require('./merge-sequential.js');
const rename = require("gulp-rename");
const concat = require('gulp-concat');
const esbuild = require('esbuild');
const buffer = require("vinyl-buffer");
const source = require('vinyl-source-stream');
const argv = require('minimist')(process.argv.slice(2));
const gulpif = require('gulp-if');
const colors = require('ansi-colors');
const log = require('fancy-log');

/*
 * gulp 5 reads files as UTF-8 TEXT by default (vinyl-fs 4, `encoding:
 * "utf8"`): every image, sound, wasm or network file copied through
 * gulp.src()/gulp.dest() comes out silently corrupted - 1851 files of dist/
 * on the first try, with a build that reports success. gulp 4 read Buffers
 * untouched; `encoding: false` restores exactly that, for every source.
 */
function readSrc(globs, options) {
	return gulp.src(globs, Object.assign({ encoding: false }, options));
}

/*
 * Source maps of the development build (not --prod), without gulp-sourcemaps:
 * unmaintained, it pulls css/source-map-resolve/decode-uri-component (and
 * postcss in its 3.x) that npm audit flags. mapInit() starts an identity map
 * the way sourcemaps.init() did; esbuild and concat extend it as they
 * go; gulp.dest() writes it next to the file - DEST_MAPS below - with the
 * same `//# sourceMappingURL=` comment.
 */
function mapInit() {
	return through.obj(function (file, enc, next) {
		if (file.isBuffer() && !file.sourceMap) {
			var name = file.relative.split(path.sep).join("/");
			file.sourceMap = {
				version: 3,
				file: name,
				names: [],
				mappings: "",
				sources: [name],
				sourcesContent: [file.contents.toString()],
			};
		}
		next(null, file);
	});
}
// concat keeps the map of its first input, named after that input: name it
// after the output, as sourcemaps.write() did
function mapName() {
	return through.obj(function (file, enc, next) {
		if (file.sourceMap) {
			file.sourceMap.file = path.basename(file.relative);
			// gulp.dest() appends its //# sourceMappingURL= comment right
			// after the last byte: give it a line of its own
			if (file.isBuffer() && file.contents[file.contents.length - 1] !== 10)
				file.contents = Buffer.concat([file.contents, Buffer.from("\n")]);
		}
		next(null, file);
	});
}
/*
 * esbuild in place of Babel (down-levelling) and terser (minification): one
 * tool, already used here for the bundles, much faster, and no dependency
 * tree of its own.
 *
 *   target  - syntax newer than ES2020 is rewritten. Browsers older than
 *             that (Safari 14, Chrome 80, Firefox 80) are not worth more:
 *             Babel 8's "defaults" had already left ES5 behind. A list of
 *             browser versions is not used: esbuild then refuses code it
 *             cannot lower for a known engine bug (destructured arrow
 *             parameters, in jocly.core.js). null: leave the syntax alone.
 *   minify  - --prod only. Top-level names of these plain scripts are NOT
 *             renamed (esbuild never does for non-module code, as terser
 *             did not by default): the games and the loader find each other
 *             through them.
 *
 * In the development build the file's map is handed in as an inline
 * sourceMappingURL, which esbuild composes with its own - what gulp-babel did
 * through vinyl-sourcemaps-apply.
 */
const JS_TARGET = "es2020";
function esbuildJS(options) {
	return through.obj(function (file, enc, next) {
		if (file.isNull())
			return next(null, file);
		var withMap = !!file.sourceMap;
		var code = file.contents.toString();
		if (withMap)
			code += "\n//# sourceMappingURL=data:application/json;base64," +
				Buffer.from(JSON.stringify(file.sourceMap)).toString("base64");
		var name = file.relative.split(path.sep).join("/");
		esbuild.transform(code, {
			loader: "js",
			sourcefile: name,
			target: options.target || "esnext",
			minify: !!options.minify,
			charset: "utf8",
			legalComments: "inline",
			sourcemap: withMap ? "external" : false,
			logLevel: "silent",
		}).then(function (result) {
			file.contents = Buffer.from(result.code);
			if (withMap && result.map) {
				var map = JSON.parse(result.map);
				map.file = name;
				file.sourceMap = map;
			}
			next(null, file);
		}, function (err) {
			// the located messages, not just "Transform failed with 2 errors"
			var detail = (err.errors || []).map(function (e) {
				return (e.location ? name + ":" + e.location.line + ":" + e.location.column + ": " : name + ": ") + e.text;
			}).join("\n");
			next(new Error(detail || name + ": " + err.message));
		});
	});
}
const DEST_MAPS = { sourcemaps: argv.prod ? false : "." };

const modulifyHeaders = {
	model:
	`exports.model = Model = {
    Game: {},
    Board: {},
    Move: {}
};
`,
	view:
	`exports.view = View = {
    Game: {},
    Board: {},
    Move: {}
};
`
};

const allGames = {};

// Lightweight replacement for the unmaintained gulp-add: pushes a virtual
// Vinyl file with the given contents before the rest of the stream (and even
// if the stream turns out to be empty), mirroring gulp-add's behavior.
function prependVirtualFile(name, contents) {
	var pending = new Vinyl({
		path: name,
		contents: Buffer.isBuffer(contents) ? contents : Buffer.from(contents)
	});
	return through.obj(
		function (file, enc, next) {
			if (pending) {
				this.push(pending);
				pending = null;
			}
			next(null, file);
		},
		function (next) {
			if (pending) {
				this.push(pending);
				pending = null;
			}
			next();
		}
	);
}

var moduleDirs = [];
var modulesMap = {};
var exclusiveGames = null;

if (typeof argv['default-games'] == "undefined" || argv['default-games'])
	moduleDirs = fs.readdirSync("src/games").map((dir) => {
		return path.join("src/games", dir);
	});
if (argv.modules)
	moduleDirs = moduleDirs.concat(argv.modules.split(":"));
moduleDirs.forEach((dir) => {
	modulesMap[path.basename(dir)] = dir;
});

if (argv.games) {
	exclusiveGames = {};
	argv.games.split(":").forEach((game) => {
		exclusiveGames[game] = true;
	});
}

function HandleModuleGames(modelOnly) {

	return through.obj(function (file, enc, next) {
		// this is executed for every game module
		var push = this.push.bind(this);
		var moduleName = path.basename(file.path);
		// The manifest has to be read afresh: `gulp watch` runs this task
		// again in the SAME node process, where require() would hand back the
		// copy it cached on the first build. Edits to a module's index.js -
		// a new game, a new skin, a changed level - would then be watched,
		// trigger a rebuild, and be written out stale.
		//
		// The whole module directory, not just its index.js: a manifest split
		// across several files (chessbase/manifest/*.js) would otherwise keep
		// serving the cached halves, and an edit to a shared block would be
		// silently ignored - the same bug, harder to spot.
		var manifestPath = require.resolve(file.path);
		var moduleRoot = path.dirname(manifestPath) + path.sep;
		Object.keys(require.cache)
			.filter((cached) => cached.startsWith(moduleRoot))
			.forEach((cached) => delete require.cache[cached]);
		var moduleManifest = require(manifestPath);
		var streams = [];
		moduleManifest.games.forEach((game) => {
			// this is executed for every game in the game module

			if (exclusiveGames && !exclusiveGames[game.name])
				return;
			if (typeof argv.obsolete != "undefined" && !argv.obsolete && game.config.model.obsolete)
				return;

			// same some game data so we can list all games later
			allGames[game.name] = {
				/*
				 * The title as the manifest declares it: a plain string, or an
				 * object indexed by locale, exactly like `summary` already is.
				 *
				 *     "title-en": "10x8 Chess variants"
				 *     "title": { "en": "10x8 Chess variants",
				 *                "fr": "Echecs en 10x8" }
				 *
				 * Both forms travel to the index untouched, and it is the
				 * CLIENT that picks a language - the index is built once and
				 * read by pages in every locale, so it cannot choose for them.
				 * That is the arrangement `summary` has always used; the title
				 * simply joins it. See Localized() in
				 * examples/browser/js/control.js for the reference reading.
				 *
				 * "title-en" stays supported and stays the fallback: three
				 * hundred manifests declare it, and a title is not worth a
				 * flag day.
				 */
				title: game.config.model.title || game.config.model["title-en"],
				summary: game.config.model.summary,
				thumbnail: game.config.model.thumbnail,
				module: moduleName,
				obsolete: game.config.model.obsolete
			};

			// create the game config file
			push(new Vinyl({
				path: moduleName + "/" + game.name + "-config.js",
				contents: Buffer.from('exports.config = ' + JSON.stringify(game.config))
			}));

			// create some specified resources
			if (!modelOnly) {
				var resources = {
					model: ["thumbnail", "rules", "description", "credits"],
					view: ["css"]
				};
				["model", "view"].forEach((modelView) => {
					resources[modelView].forEach((field) => {
						var files = [];
						switch (typeof game.config[modelView][field]) {
							case "string":
								files.push(game.config[modelView][field]);
								break;
							case "object":
								for (var f in game.config[modelView][field])
									files.push(game.config[modelView][field][f]);
								break;
						}
						files = files.map((file) => {
							return path.join(modulesMap[moduleName], file);
						});
            if(files.length>0) {
              var stream = readSrc(files, {"allowEmpty": true})
                .pipe(rename(function (path) {
                  path.dirname = moduleName;
                }))
                .pipe(through.obj(function (file, enc, next) {
                  push(file);
                  next();
                }))
                ;
              streams.push(stream);
            }
					});
				});
			}

			// create model and view script files
			function Scripts(which) {
				var scripts = game[which + "Scripts"].map((script) => {
					return path.join(modulesMap[moduleName], script);
				});
				var fileName = moduleName + "/" + game.name + "-" + which + ".js";
				var stream = readSrc(scripts)
					.pipe(gulpif(!argv.prod, mapInit()))
					.pipe(prependVirtualFile('_', modulifyHeaders[which]))
					.pipe(concat(fileName))
					.pipe(gulpif(!argv.prod, mapName()))
					.pipe(gulpif(argv.prod, esbuildJS({ minify: true })))
					.pipe(through.obj(function (file, enc, next) {
						push(file);
						next();
					}));
				streams.push(stream);
			}
			if (modelOnly)
				Scripts("model");
			else
				["model", "view"].forEach(Scripts);
		});

		// create module common resources
		if (!modelOnly) {
			var stream = readSrc(modulesMap[moduleName] + "/res/**/*")
				.pipe(rename(function (path) {
					path.dirname = moduleName + "/res/" + path.dirname;
				}))
				.pipe(through.obj(function (file, enc, next) {
					push(file);
					next();
				}))
				;
			streams.push(stream);
		}

		if (streams.length === 0) {
			next();
			return;
		}

		merge(streams)
			.on("finish", function () {
				next();
			});

	});
}

gulp.task("build-node-games", function () {
	return readSrc(moduleDirs)
		.pipe(HandleModuleGames(true))
		.pipe(gulp.dest("dist/node/games", DEST_MAPS));
});

function ProcessJS(stream, concatName, skipTranspile) {
	if (!argv.prod && concatName)
		stream = stream.pipe(mapInit());
	// skipTranspile: third-party code copied as it is written, minified only
	if (!skipTranspile || argv.prod)
		stream = stream.pipe(esbuildJS({
			target: skipTranspile ? null : JS_TARGET,
			minify: !!argv.prod,
		}));
	if (concatName)
		stream = stream.pipe(concat(concatName));
	if (!argv.prod && concatName)
		stream = stream.pipe(mapName());
	return stream;
}

gulp.task("build-node-core", function () {

	var joclyCoreStream =
		ProcessJS(readSrc([
			"src/core/jocly.core.js",
		]));

	var joclyBaseStream =
		ProcessJS(readSrc([
			"src/core/jocly.util.js",
			"src/core/jocly.uct.js",
			"src/core/jocly.fairy.js",
			// Node build only: drives a native Fairy-Stockfish binary over
			// stdio for hosts with no Worker (Tabulon, Electron). It uses
			// require("child_process"), so it must stay out of the browser
			// bundle below.
			"src/core/jocly.fairynative.js",
			// jocly.game.js requires it OUTRIGHT on the node path -
			// require("./jocly.kata.js"), not the guarded `typeof
			// JoclyScan != "undefined"` that lets Scan be absent - so
			// leaving it out did not disable Go in node, it made
			// require("jocly.core.js") throw and took the whole node dist
			// down with it. The file is node-safe: it exports for node and
			// only reaches for a Worker when a kata level is played.
			"src/core/jocly.scan.js",
			"src/core/jocly.kata.js",
			"src/core/jocly.game.js"
		]));

	var allGamesStream = source('jocly-allgames.js');
	allGamesStream.end('exports.games = ' + JSON.stringify(allGames));
	allGamesStream = ProcessJS(allGamesStream.pipe(buffer()));

	return merge(joclyCoreStream, allGamesStream, joclyBaseStream)
    .pipe(through.obj(function (file, enc, next) {
      next(null, new Vinyl(file));
    }))
		.pipe(gulp.dest("dist/node", DEST_MAPS));

});

function CopyLicense(target) {
	return readSrc(["COPYING.md", "CONTRIBUTING.md", "AGPL-3.0.txt"])
		.pipe(gulp.dest(target, DEST_MAPS));
}

gulp.task("copy-browser-license", function () {
	return CopyLicense("dist/browser");
});

gulp.task("copy-node-license", function () {
	return CopyLicense("dist/node");
});

gulp.task("build-node", 
  gulp.series("build-node-games", 
  gulp.parallel("build-node-core", "copy-node-license")));

gulp.task("build-browser-games", function () {
	return readSrc(moduleDirs)
		.pipe(HandleModuleGames(false))
		.pipe(gulp.dest("dist/browser/games", DEST_MAPS));
});

gulp.task("build-browser-core", function () {

	var _ProcessJS = function (s) { return s; };

	// Bundles src/browser/jocly.js (plus its one local require,
	// browser-script-loader.js) into a single UMD-ish global "Jocly",
	// the same role browserify's standalone option used to play here.
	// esbuild does this synchronously and hands back the bundled code as
	// a plain string - no need for vinyl-source-stream/vinyl-buffer's
	// stream-to-vinyl dance, which only exists to adapt browserify's own
	// streaming bundle() API. The result is still routed through the
	// same ProcessJS pipeline as every other bundle produced here: this
	// call bundles only, the target and the minification (esbuildJS) are
	// applied there, identically for all.
	var joclyBundleResult = esbuild.buildSync({
		entryPoints: ["src/browser/jocly.js"],
		bundle: true,
		format: "iife",
		globalName: "Jocly",
		write: false,
		logLevel: "silent"
	});
	var joclyBundleStream = through.obj();
	joclyBundleStream.end(new Vinyl({
		path: "jocly.js",
		contents: Buffer.from(joclyBundleResult.outputFiles[0].contents)
	}));

	var joclyBrowserStream = ProcessJS(joclyBundleStream);

	// NOTE: joclyCoreStream and joclyExtraScriptsStream are intentionally
	// combined into a single readSrc()/esbuild pipeline below, rather than
	// kept as separate streams merged afterwards. Running many concurrent
	// babel/browserify streams through merge-stream (5-6 in this task)
	// causes it to occasionally lose files entirely (race in how it counts
	// still-active sources before calling output.end()) — reproduced
	// reliably regardless of merge-stream version. Fewer streams merged in
	// parallel avoids the issue. The remaining merge() call in this task is
	// also replaced with mergeSequential (see merge-sequential.js), which
	// processes each stream to completion before starting the next one,
	// for the same reason.
	var joclyCoreStream = ProcessJS(readSrc([
		"src/core/jocly.core.js",
		"src/browser/jocly.aiworker.js",
		"src/browser/jocly.fairyworker.js",
		"src/browser/jocly.scanworker.js",
		"src/browser/jocly.kataworker.js",
		"src/browser/jocly.embed.js"
	]));

	var joclyBaseStream = ProcessJS(readSrc([
		"src/core/jocly.util.js",
		"src/core/jocly.uct.js",
		"src/core/jocly.fairy.js",
		"src/core/jocly.scan.js",
		"src/core/jocly.kata.js",
		"src/core/jocly.game.js"
	]), "jocly.game.js", true);

	var joclyExtraStream = readSrc([
		"src/browser/jocly.embed.html"
	]);

	// Fairy-Stockfish (third-party/fairy-stockfish): the Emscripten loader
	// and wasm binary are pre-built artifacts, not Jocly source - copy them
	// through untouched (like three.js/jquery in build-browser-xdview below),
	// running stockfish.js through Babel would risk breaking the UMD/IIFE
	// boilerplate Emscripten generates for it.
	var joclyFairyStockfishStream = readSrc([
		"third-party/fairy-stockfish/stockfish.js",
		"third-party/fairy-stockfish/stockfish.wasm",
		"third-party/fairy-stockfish/stockfish.worker.js",
		// see this file's own comment for why it matters (silent wasm
		// failure on Apache hosts without a global .wasm MIME type);
		// {dot: true} is required for gulp.src() to pick up a dotfile.
		"third-party/fairy-stockfish/.htaccess"
	], { dot: true }).pipe(rename(function (path) {
		path.dirname = "fairy-stockfish";
	}));

	// Optional NNUE evaluation networks (third-party/fairy-stockfish/nnue):
	// none are bundled in the repo (see that directory's README.md for how
	// to add them and where to download them) - this is a glob on purpose,
	// so the build works identically whether the directory contains zero,
	// some, or all of the networks referenced by "evalFile" level configs
	// in src/games/chessbase/index.js. A referenced-but-absent network is
	// equally harmless at runtime: jocly.fairyworker.js falls back to the
	// engine's built-in classical evaluation (see MaybeLoadEvalFile()).
	var joclyFairyNnueStream = readSrc([
		"third-party/fairy-stockfish/nnue/README.md",
		"third-party/fairy-stockfish/nnue/*.nnue"
	], { allowEmpty: true }).pipe(rename(function (path) {
		path.dirname = "fairy-stockfish/nnue";
	}));

	// Scan (third-party/scan): same rationale as Fairy-Stockfish above -
	// pre-built Emscripten artifacts, copied through untouched. Two streams
	// to preserve the "scan/data/" subfolder expected by
	// jocly.scanworker.js's LoadEngine() (scanBaseURL + "data/eval" etc.).
	var joclyScanStream = readSrc([
		"third-party/scan/scan.js",
		"third-party/scan/scan.wasm"
	]).pipe(rename(function (path) {
		path.dirname = "scan";
	}));
	var joclyScanDataStream = readSrc([
		"third-party/scan/data/eval",
		"third-party/scan/data/book"
	]).pipe(rename(function (path) {
		path.dirname = "scan/data";
	}));

	// KataGo (third-party/katago): pre-built Emscripten artifacts, copied
	// through untouched for the same reason as Fairy-Stockfish and Scan above.
	//
	// Only the PLAIN build ships. kataeval-mt.* is KataGo's real Search -
	// stronger, with live statistics - but it needs -pthread, a 33-thread
	// pool, 512MB of initial memory and a cross-origin isolated page, and
	// nothing loads it yet: jocly.kataworker.js drives the plain kgeSearch().
	// Adding it here is one line the day that changes.
	var joclyKataStream = readSrc([
		"third-party/katago/kataeval.js",
		"third-party/katago/kataeval.wasm"
	]).pipe(rename(function (path) {
		path.dirname = "katago";
	}));

	// The networks are not in the repo - see that directory's README.md for
	// where to get them. A glob on purpose, exactly like the NNUE one above,
	// so the build works whether the directory holds none, one or all of the
	// nets named by "net" in a "kata" level. A referenced-but-absent net is
	// NOT harmless here, unlike a missing NNUE: KataGo cannot play without
	// one, so jocly.kataworker.js reports it and jocly.kata.js leaves the
	// move to Jocly rather than inventing one.
	var joclyKataNetStream = readSrc([
		"third-party/katago/README.md",
		"third-party/katago/*.bin.gz"
	], { allowEmpty: true }).pipe(rename(function (path) {
		path.dirname = "katago";
	}));

	var joclyResStream = readSrc("src/browser/res/**/*")
		.pipe(rename(function (path) {
			path.dirname = "res/" + path.dirname;
		}));

	var allGamesStream = source('jocly-allgames.js');
	allGamesStream.end('exports.games = ' + JSON.stringify(allGames));
	allGamesStream = ProcessJS(allGamesStream.pipe(buffer()));

	return mergeSequential(joclyBrowserStream, joclyCoreStream, allGamesStream, joclyBaseStream,
		joclyExtraStream, joclyFairyStockfishStream, joclyFairyNnueStream, joclyScanStream, joclyScanDataStream,
		joclyKataStream, joclyKataNetStream, joclyResStream)
    .pipe(through.obj(function (file, enc, next) {
      next(null, new Vinyl(file));
    }))
    .pipe(gulp.dest("dist/browser", DEST_MAPS));

});

gulp.task("build-browser-xdview", function () {
	const lib = "third-party/";
	const src = "src/";
	const srcLib = "src/lib/";
	const nmLib = "node_modules/";

	// three.js and jquery.js are plain UMD bundles already targeting ES5 —
	// they've never needed transpilation. Running them through ProcessJS
	// (Babel, in non-module mode) turns their top-level `this` into
	// `void 0` (Babel correctly treats the file as strict-mode, where
	// top-level `this` is undefined rather than the global object), which
	// breaks the IIFE argument each of them uses to detect whether to
	// attach itself as a CommonJS export or a plain global — they end up
	// calling their factory with `global = void 0` instead of the real
	// global object, crashing on the very first global property access
	// (e.g. "Cannot read properties of undefined (reading 'THREE')").
	// Copy them through untouched instead.
	var libs = readSrc([
		lib + "three.js",
		nmLib + "jquery/dist/jquery.js"
	]);

	var packedLibs = ProcessJS(readSrc([
		lib + "tween.js",
		lib + "tween.fix.js",
		srcLib + "JoclyOrbitControls.js",
		// GLTFLoader, BufferGeometryUtils, FontLoader, TextGeometry: bundled
		// from three/examples/jsm by tools/three/build-three.js
		lib + "three-addons.js",
		lib + "threex.domevent.js",
		lib + "threex.domevent.object3d.js",
		lib + "kalman.js",
		src + "browser/jocly.ar.js",
		src + "browser/jocly.state-machine.js",
		src + "browser/jocly.xd-view.js"
	]), "jocly-xdview.js", true);

	return mergeSequential(libs, packedLibs)
		.pipe(gulp.dest("dist/browser", DEST_MAPS))
		;

});

gulp.task("clean", function () {
	// fs.rmSync rather than the del package (ESM-only since 7)
	if (fs.existsSync("dist"))
		for (const entry of fs.readdirSync("dist"))
			fs.rmSync(path.join("dist", entry), { recursive: true, force: true });
	return Promise.resolve();
});

gulp.task("build-browser", 
  gulp.series("build-browser-games", 
  gulp.parallel("build-browser-core", "build-browser-xdview", "copy-browser-license")));

gulp.task("build", 
  gulp.series("clean", 
  gulp.parallel("build-browser", "build-node")));

gulp.task("watch", function () {
	gulp.watch(moduleDirs.map((dir) => { return dir + "/**/*"; }), gulp.series("build-node-games", "build-browser-games"));
	gulp.watch("src/{browser,core,lib}/**/*", gulp.series("build-browser-core", "build-browser-xdview"));
	gulp.watch("src/{node,core}/**/*", gulp.series("build-node-core"));
});

gulp.task("help", function (cb) {
	var help = `
usage: gulp [<commands>] [<options>]

commands:
    build: generate clean project build
    watch: watch project and build dynamically on changes

options:
    --prod: generate for production
    --no-default-games: do not process game module from default src/games directory
    --modules <modules>: process additional game modules from specified directories (colon separated)
    --games <games>: process exclusively the specified games (colon separated)
    --no-obsolete: do not include games marked as obsolete
`;
	console.log(help);
	cb();
	process.exit(0);
});
