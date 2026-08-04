
Jocly is a library and set of tools to integrate boards games into Web environments.
It comes with a large collection of abstract strategy games, 2D and 3D user interface,
artificial intelligence to play against.

This fork was initiated following the discontinuation of Jocly, in order to revitalize contributions.

Demos
-----
You will find many board games (spargo, four in a row, annexation …), and in particular variations of chess and shogi.
[Controlled interface](https://fhoudebert.github.io/jocly/examples/browser/control.html) for playing Chess.
Click _**Other Jocly games**_ to switch to other games.

Simple human vs computer: [Classic chess](https://fhoudebert.github.io/jocly/examples/browser/simple.html?game=classic-chess),
[Circular chess](https://fhoudebert.github.io/jocly/examples/browser/simple.html?game=circular-chess),
[Multi layers chess](https://fhoudebert.github.io/jocly/examples/browser/simple.html?game=raumschach),
[Hexagonal chess](https://fhoudebert.github.io/jocly/examples/browser/simple.html?game=glinski-chess),
[Chinese chess](https://fhoudebert.github.io/jocly/examples/browser/simple.html?game=xiangqi),
[Middle-age chess](https://fhoudebert.github.io/jocly/examples/browser/simple.html?game=courier-chess),
[Shogi](https://fhoudebert.github.io/jocly/examples/browser/control.html?game=shogi),
[Chu Shogi](https://fhoudebert.github.io/jocly/examples/browser/control.html?game=chu-shogi),
[Draughts](https://fhoudebert.github.io/jocly/examples/browser/control.html?game=draughts),
[Kyoto Shogi](https://fhoudebert.github.io/jocly/examples/browser/control.html?game=kyoto-shogi),
[Metamachy](https://fhoudebert.github.io/jocly/examples/browser/control.html?game=metamachy-chess),
[Spartan chess](https://fhoudebert.github.io/jocly/examples/browser/control.html?game=spartan-chess),
[Minjiku Shogi](https://fhoudebert.github.io/jocly/examples/browser/control.html?game=minjiku-shogi),
[Ultima](https://fhoudebert.github.io/jocly/examples/browser/control.html?game=ultima),
[Rococo](https://fhoudebert.github.io/jocly/examples/browser/control.html?game=rococo)

Or see and try [all available games](https://fhoudebert.github.io/jocly/examples/browser/multiple.html)

Use joclymatch [to play remotly againt a human from a desktop](https://www.biscandine.fr/variantes/)

Use mogichex [to play remotly againt a human from a mobile device](https://www.biscandine.fr/variantes/mogichex)

Install
-------
````
npm install jocly
````

Using Jocly in a Web page
-------------------------

Insert this line to your HTML source code:
````
<script src="node_modules/jocly/dist/browser/jocly.js"></script>
````

You are now ready to use the Jocly API through the `Jocly` global object.

Using Jocly in a node.js application
------------------------------------

````Javascript
const Jocly = require("jocly");
````

You are now ready to use the Jocly API through the `Jocly` entry point.

Building
--------

- install the *node.js* environment (using [nvm](https://github.com/creationix/nvm) is probably a good idea)
- install *gulp*: `npm install -g gulp`
- install [git](https://git-scm.com/downloads)
- clone Jocly from *github*: `git clone https://github.com/aclap-dev/jocly.git`
- enter the `jocly` directory
- download required modules: `npm install`
- build: `gulp build`
- `dist/browser` contains the javascript library to build web applications, `dist/node` is the module to be used for node.js applications

Notes:
- using `gulp build watch` instead of `gulp build` makes *gulp* start watching files after the build. Whenever a file is changed, a build is automatically generated
- you can use `--no-default-games` to prevent including the game modules from directory, and `--modules <colon-separated-directories>` to specify additional game modules to include. For instance, `gulp --no-default-games --modules src/games/chessbase:src/games/checkers build` will only generate distribution for Chess and checkers games
- you can specify the games to be built in the distribution with the `--games` option. For instance, `gulp --no-default-games --modules src/games/chessbase --games xiangqi:classic-chess build` only generates Jocly for Classic Chess and XiangQi
- using the `no-obsolete` option filters out the games marked as obsolete

API Documentation
-----------------

Jocly offers two distinct APIs:
- the [Application API](https://github.com/aclap-dev/jocly/wiki/Application-API) to make Web applications
- the [Game API](https://github.com/aclap-dev/jocly/wiki/Game-API) to create games to run with Jocly features

## Credits

**Jocly**, was created by M. Gutierrez / J. Choain, with contribution of HG Muller.
The original project is no longer maintained; it lives on as **[jocly2](https://github.com/fhoudebert/jocly2)**.

The Expert level uses [Fairy-Stockfish](https://github.com/fairy-stockfish/Fairy-Stockfish) by Fabian Fichter, derived from Stockfish. 
The Champion level for draughts use [Scan](https://hjetten.home.xs4all.nl/scan/scan.html) maintained by Fabien Letouzey

Game artwork under `chessbase/res` is **CC BY-SA 3.0**.
