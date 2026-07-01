/* jshint esversion:6 */
const path = require('path');
const fs = require('fs');

const gulp = require('gulp');
const debug = require('gulp-debug');
const del = require("del");
const through = require('through2');
const Vinyl = require("vinyl");
const merge = require('merge-stream');
const mergeSequential = require('./merge-sequential.js');
const rename = require("gulp-rename");
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const terser = require('gulp-terser');
const babel = require('gulp-babel');
const browserify = require('browserify');
const buffer = require("vinyl-buffer");
const source = require('vinyl-source-stream');
const argv = require('minimist')(process.argv.slice(2));
const gulpif = require('gulp-if');
const colors = require('ansi-colors');
const log = require('fancy-log');

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
		var moduleManifest = require(file.path);
		var streams = [];
		moduleManifest.games.forEach((game) => {
			// this is executed for every game in the game module

			if (exclusiveGames && !exclusiveGames[game.name])
				return;
			if (typeof argv.obsolete != "undefined" && !argv.obsolete && game.config.model.obsolete)
				return;

			// same some game data so we can list all games later
			allGames[game.name] = {
				title: game.config.model["title-en"],
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
              var stream = gulp.src(files, {"allowEmpty": true})
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
				var stream = gulp.src(scripts)
					.pipe(gulpif(!argv.prod, sourcemaps.init()))
					.pipe(prependVirtualFile('_', modulifyHeaders[which]))
					.pipe(concat(fileName))
					.pipe(gulpif(argv.prod, terser()))
					.on('error', function (err) { log(colors.red('[Error]'), err.toString()); })
					.pipe(gulpif(!argv.prod, sourcemaps.write('.')))
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
			var stream = gulp.src(modulesMap[moduleName] + "/res/**/*")
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
	return gulp.src(moduleDirs)
		.pipe(HandleModuleGames(true))
		.pipe(gulp.dest("dist/node/games"));
});

function ProcessJS(stream, concatName, skipBabel) {
	if (!argv.prod && concatName)
		stream = stream.pipe(sourcemaps.init());
	if (!skipBabel)
		stream = stream.pipe(babel({
			presets: ["@babel/preset-env"],
			compact: !!argv.prod
		}));
	if (argv.prod)
		stream = stream.pipe(terser())
			.on('error', function (err) {
				log(colors.red('[Error]'), err.toString());
				this.emit('end');
			});
	if (concatName)
		stream = stream.pipe(concat(concatName));
	if (!argv.prod && concatName)
		stream = stream.pipe(sourcemaps.write("."));
	return stream;
}

gulp.task("build-node-core", function () {

	var joclyCoreStream =
		ProcessJS(gulp.src([
			"src/core/jocly.core.js",
		]));

	var joclyBaseStream =
		ProcessJS(gulp.src([
			"src/core/jocly.util.js",
			"src/core/jocly.uct.js",
			"src/core/jocly.fairy.js",
			"src/core/jocly.game.js"
		]));

	var allGamesStream = source('jocly-allgames.js');
	allGamesStream.end('exports.games = ' + JSON.stringify(allGames));
	allGamesStream = ProcessJS(allGamesStream.pipe(buffer()));

	return merge(joclyCoreStream, allGamesStream, joclyBaseStream)
    .pipe(through.obj(function (file, enc, next) {
      next(null, new Vinyl(file));
    }))
		.pipe(gulp.dest("dist/node"));

});

function CopyLicense(target) {
	return gulp.src(["COPYING.md", "CONTRIBUTING.md", "AGPL-3.0.txt"])
		.pipe(gulp.dest(target));
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
	return gulp.src(moduleDirs)
		.pipe(HandleModuleGames(false))
		.pipe(gulp.dest("dist/browser/games"));
});

gulp.task("build-browser-core", function () {

	var _ProcessJS = function (s) { return s; };

	var b = browserify({
		entries: "src/browser/jocly.js",
		debug: true,
		standalone: "Jocly"
	});

	var joclyBrowserStream = ProcessJS(b.bundle()
		.pipe(source('jocly.js'))
		.pipe(buffer()));

	// NOTE: joclyCoreStream and joclyExtraScriptsStream are intentionally
	// combined into a single gulp.src()/babel pipeline below, rather than
	// kept as separate streams merged afterwards. Running many concurrent
	// babel/browserify streams through merge-stream (5-6 in this task)
	// causes it to occasionally lose files entirely (race in how it counts
	// still-active sources before calling output.end()) — reproduced
	// reliably regardless of merge-stream version. Fewer streams merged in
	// parallel avoids the issue. The remaining merge() call in this task is
	// also replaced with mergeSequential (see merge-sequential.js), which
	// processes each stream to completion before starting the next one,
	// for the same reason.
	var joclyCoreStream = ProcessJS(gulp.src([
		"src/core/jocly.core.js",
		"src/browser/jocly.aiworker.js",
		"src/browser/jocly.fairyworker.js",
		"src/browser/jocly.scanworker.js",
		"src/browser/jocly.embed.js"
	]));

	var joclyBaseStream = ProcessJS(gulp.src([
		"src/core/jocly.util.js",
		"src/core/jocly.uct.js",
		"src/core/jocly.fairy.js",
		"src/core/jocly.scan.js",
		"src/core/jocly.game.js"
	]), "jocly.game.js", true);

	var joclyExtraStream = gulp.src([
		"src/browser/jocly.embed.html"
	]);

	// Fairy-Stockfish (third-party/fairy-stockfish): the Emscripten loader
	// and wasm binary are pre-built artifacts, not Jocly source - copy them
	// through untouched (like three.js/jquery in build-browser-xdview below),
	// running stockfish.js through Babel would risk breaking the UMD/IIFE
	// boilerplate Emscripten generates for it.
	var joclyFairyStockfishStream = gulp.src([
		"third-party/fairy-stockfish/stockfish.js",
		"third-party/fairy-stockfish/stockfish.wasm",
		"third-party/fairy-stockfish/stockfish.worker.js"
	]).pipe(rename(function (path) {
		path.dirname = "fairy-stockfish";
	}));

	// Scan (third-party/scan): same rationale as Fairy-Stockfish above -
	// pre-built Emscripten artifacts, copied through untouched. Two streams
	// to preserve the "scan/data/" subfolder expected by
	// jocly.scanworker.js's LoadEngine() (scanBaseURL + "data/eval" etc.).
	var joclyScanStream = gulp.src([
		"third-party/scan/scan.js",
		"third-party/scan/scan.wasm"
	]).pipe(rename(function (path) {
		path.dirname = "scan";
	}));
	var joclyScanDataStream = gulp.src([
		"third-party/scan/data/eval",
		"third-party/scan/data/book"
	]).pipe(rename(function (path) {
		path.dirname = "scan/data";
	}));

	var joclyResStream = gulp.src("src/browser/res/**/*")
		.pipe(rename(function (path) {
			path.dirname = "res/" + path.dirname;
		}));

	var allGamesStream = source('jocly-allgames.js');
	allGamesStream.end('exports.games = ' + JSON.stringify(allGames));
	allGamesStream = ProcessJS(allGamesStream.pipe(buffer()));

	return mergeSequential(joclyBrowserStream, joclyCoreStream, allGamesStream, joclyBaseStream,
		joclyExtraStream, joclyFairyStockfishStream, joclyScanStream, joclyScanDataStream, joclyResStream)
    .pipe(through.obj(function (file, enc, next) {
      next(null, new Vinyl(file));
    }))
    .pipe(gulp.dest("dist/browser"));

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
	var libs = gulp.src([
		lib + "three.js",
		nmLib + "jquery/dist/jquery.js"
	]);

	var packedLibs = ProcessJS(gulp.src([
		lib + "tween.js",
		lib + "tween.fix.js",
		srcLib + "JoclyOrbitControls.js",
		lib + "DeviceOrientationControls.js",
		lib + "Projector.js",
		lib + "BufferGeometryUtils.js",
		lib + "GLTFLoader.js",
		lib + "FontLoader.js",
		lib + "TextGeometry.js",
		lib + "threex.domevent.js",
		lib + "threex.domevent.object3d.js",
		lib + "StereoEffect.js",
		lib + "AnaglyphEffect.js",
		srcLib + "VRGamepad.js",
		lib + "VRControls.js",
		lib + "VREffect.js",
		lib + "OBJLoader.js",
		lib + "MTLLoader.js",
		lib + "kalman.js",
		src + "browser/jocly.ar.js",
		src + "browser/jocly.state-machine.js",
		src + "browser/jocly.xd-view.js"
	]), "jocly-xdview.js", true);

	return mergeSequential(libs, packedLibs)
		.pipe(gulp.dest("dist/browser"))
		;

});

gulp.task("clean", function () {
	return del(["dist/*"], { force: true });
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
