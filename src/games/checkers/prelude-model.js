/*
 * The leading semicolon is load-bearing, and belongs to this file rather than
 * to the one before it.
 *
 * The gulpfile concatenates a game's scripts into a single bundle. Eleven
 * files in this module end with a top-level assignment closed by a bare "}" -
 * "View.Game.xdInitExtra = function() { ... }" and the like - and automatic
 * semicolon insertion does not apply when the next token is "(". A file
 * wrapped in the "(function(){...})()" used everywhere here is then read as
 * the ARGUMENT of a call to the function just assigned, which runs at load
 * time with `this` undefined. That is how the first version of this game died
 * on "this.mOptions.width", and then on "this.mViewOptions.fullPath", with
 * stacks pointing into a concatenated file whose line numbers match no source.
 *
 * Appending a file is what triggers it, so the guard goes on the file being
 * appended: it then holds whatever it is placed after.
 * tests/core/model-bundles.test.js builds both bundles the way gulp does and
 * evaluates them, which is the only place a seam between two files is visible.
 */
;

/*
 * A prelude for the checkers module: one button per rule set, chosen before
 * the first move.
 *
 * The chessbase module has had a prelude since Capablanca Chess, but that one
 * cannot be reused here. Its state lives in `lastMove.f == -2`, and a checkers
 * board has no lastMove at all; it reads `aGame.cbVar`, which is a chessbase
 * notion; and the bulk of its ApplyMove rewrites piece types through
 * cbPlacePieces, AdjustPromoChoice and a castling table - all of it dead
 * weight for a prelude that only picks a RULE and rewrites nothing. Scripts
 * are also resolved inside the game's own module directory (see the gulpfile),
 * so a checkers game could not name that file even if the rest fitted.
 *
 * What IS reused is its shape, so that the two behave the same way for a
 * player and for a transcript reader:
 *
 *   - the choice is a MOVE, written "#0", "#1"... so it is recorded, replayed
 *     and undone like any other;
 *   - a dialog declares `labels` (the button captions) and `custom` (what the
 *     choice does), the same fields Kotaishi Shogi uses for its own
 *     rule-only prelude;
 *   - `persistent: true` remembers the last choice for the next game.
 *
 * The one real difference is where the choice is written. checkersbase-model's
 * InitGame lays 21 named rule flags into `aGame.g` and then overwrites them
 * from mOptions.variant; a dialog here does the second half again with a
 * different set. That is game-level state, not board-level: it is not in
 * GetSignature, so a rule chosen in one game must not be read back through a
 * transposition table kept from another - which is why ResetRules() below
 * restores every flag from the defaults rather than patching the ones that
 * differ.
 */

(function() {

	// Where the prelude keeps its stage. A checkers board has no lastMove to
	// borrow, so this is a field of its own - and one that CopyFrom has to
	// carry, or the search loses it on the first copy.
	var STAGE = "preludeStage";

	function Dialogs(aGame) {
		return aGame.mOptions.prelude;
	}

	function InPrelude(board) {
		return board[STAGE] !== undefined && board[STAGE] >= 0;
	}

	/*
	 * Put every rule flag back to what InitGame would have made it, then
	 * apply the chosen set over the top.
	 *
	 * Restoring first is not caution, it is required: the dialogs disagree
	 * about which flags they mention. English names canCaptureBackward,
	 * German does not - and German after English would silently inherit
	 * English's `false` and play a game that is neither.
	 */
	function ApplyRules(aGame, rules) {
		var defaults = aGame.g.preludeDefaults;
		for(var k in defaults)
			aGame.g[k] = defaults[k];
		for(var k in rules)
			if(rules.hasOwnProperty(k))
				aGame.g[k] = rules[k];
		// `invertNotation` is not a `g` flag: checkersbase reads it once into
		// a closure variable, so it takes a setter to move it afterwards. It
		// still travels through `rules` like everything else, so a dialog
		// stays a plain object a manifest can carry.
		if(aGame.checkersSetInvertNotation)
			aGame.checkersSetInvertNotation(aGame.g.invertNotation);
	}

	/*
	 * Snapshot the flags any dialog can touch, as InitGame left them, so
	 * ApplyRules has something to restore to. Runs from InitGame itself
	 * rather than from a game file: the gulpfile serialises a manifest with
	 * JSON.stringify, so gameOptions cannot carry a function and a game whose
	 * whole definition is its manifest has nowhere to put this call.
	 */
	var SuperInitGame = Model.Game.InitGame;
	Model.Game.InitGame = function() {
		SuperInitGame.apply(this, arguments);
		if(this.mOptions.prelude)
			this.checkersPreludeInit();
	}

	Model.Game.checkersPreludeInit = function() {
		var defaults = {};
		var dialogs = Dialogs(this) || [];
		dialogs.forEach(function(dialog) {
			if(!dialog || !dialog.rules) return;
			dialog.rules.forEach(function(rules) {
				for(var k in rules)
					if(rules.hasOwnProperty(k) && defaults[k] === undefined)
						defaults[k] = this.g[k];
			}, this);
		}, this);
		defaults.invertNotation = this.g.invertNotation;
		this.g.preludeDefaults = defaults;
	}

	var SuperInitialPosition = Model.Board.InitialPosition;
	Model.Board.InitialPosition = function(aGame) {
		SuperInitialPosition.apply(this, arguments);
		/*
		 * A position handed to us has already been played from some rule set,
		 * and nothing in it says which - a rule choice rewrites no piece. So
		 * unlike Capablanca, whose arrangement IS readable from the board,
		 * this prelude must still be asked even when a game is loaded. That
		 * is the case prelude-model.js describes for Kotaishi Shogi, and the
		 * reason there is no cbPreludeFromBoard here.
		 */
		this[STAGE] = Dialogs(aGame) ? 0 : -1;
	}

	var SuperCopyFrom = Model.Board.CopyFrom;
	Model.Board.CopyFrom = function(aBoard) {
		SuperCopyFrom.apply(this, arguments);
		this[STAGE] = aBoard[STAGE];
	}

	var SuperGenerateMoves = Model.Board.GenerateMoves;
	Model.Board.GenerateMoves = function(aGame) {
		if(!InPrelude(this))
			return SuperGenerateMoves.apply(this, arguments);
		var dialog = Dialogs(aGame)[this[STAGE]];
		if(!dialog) {
			this.mMoves = [{ pos: [], capt: [] }];   // a turn pass
			return;
		}
		if(dialog.persistent !== undefined && dialog.persistent !== true) {
			this.mMoves = [{ pos: [], capt: [], setup: dialog.persistent }];
			return;
		}
		this.mMoves = [];
		for(var i = 0; i < dialog.labels.length; i++)
			this.mMoves.push({ pos: [], capt: [], setup: i });
	}

	var SuperApplyMove = Model.Board.ApplyMove;
	Model.Board.ApplyMove = function(aGame, move) {
		if(!InPrelude(this))
			return SuperApplyMove.apply(this, arguments);
		var dialogs = Dialogs(aGame);
		var dialog = dialogs[this[STAGE]];
		if(dialog && move.setup !== undefined) {
			if(dialog.rules)
				ApplyRules(aGame, dialog.rules[move.setup]);
			if(dialog.custom)
				dialog.custom(move.setup, this, aGame);
			if(dialog.persistent !== undefined)
				dialog.persistent = move.setup;   // remembered for the next game
		}
		if(++this[STAGE] == dialogs.length)
			this[STAGE] = -1;   // done: play begins
	}

	// No evaluation of a position the prelude has not set up yet.
	var SuperEvaluate = Model.Board.Evaluate;
	Model.Board.Evaluate = function(aGame, aFinishOnly, aTopLevel) {
		if(InPrelude(this))
			return;
		return SuperEvaluate.apply(this, arguments);
	}

	/*
	 * The machine answers the prelude itself rather than searching it.
	 *
	 * JocGame.StartMachine checks `moves && moves.length>0` to decide whether
	 * to short-circuit, so this must return an ARRAY - see the note on the
	 * same method in chessbase/prelude-model.js, where returning a bare object
	 * sent the turn-pass stage to a real engine instead.
	 */
	Model.Board.StaticGenerateMoves = function(aGame) {
		if(!InPrelude(this))
			return null;
		var dialog = Dialogs(aGame)[this[STAGE]];
		if(!dialog)
			return [aGame.CreateMove({ pos: [], capt: [] })];
		var p = dialog.persistent;
		if(p !== undefined && p !== true)
			return [aGame.CreateMove({ pos: [], capt: [], setup: p })];
		return [aGame.CreateMove({ pos: [], capt: [],
			setup: Math.floor(Math.random() * dialog.labels.length) })];
	}

	/*
	 * checkersbase-model's Move.Init builds `pos` and `capt` and copies
	 * nothing else, so a {setup:2} handed to CreateMove came back as a move
	 * with no setup at all - every button then chose the first rule set.
	 */
	var SuperMoveInit = Model.Move.Init;
	Model.Move.Init = function(args) {
		SuperMoveInit.apply(this, arguments);
		if(args && args.setup !== undefined)
			this.setup = args.setup;
	}

	/*
	 * ...and with no Equals defined, checkersbase compares moves by JSON, so
	 * two setups differ only as long as the field survives Init. Being
	 * explicit here means a change to either half cannot quietly make all the
	 * buttons equal again.
	 */
	Model.Move.Equals = function(move) {
		if(this.setup !== undefined || move.setup !== undefined)
			return this.setup === move.setup;
		if(this.pos.length != move.pos.length)
			return false;
		for(var i = 0; i < this.pos.length; i++)
			if(this.pos[i] != move.pos[i])
				return false;
		return true;
	}

	var SuperMoveToString = Model.Move.ToString;
	Model.Move.ToString = function(format) {
		if(this.setup !== undefined)
			return "#" + this.setup;
		if(this.pos.length === 0)
			return "--";
		return SuperMoveToString.apply(this, arguments);
	}

})();
