/*
 * The leading semicolon is load-bearing, and belongs to this file rather than
 * to the one before it.
 *
 * The gulpfile concatenates a game's scripts into a single bundle, and
 * go-model.js ends with a top-level assignment closed by a bare "}".
 * Automatic semicolon insertion does not apply when the next token is "(", so
 * a file wrapped in the "(function(){...})()" used throughout would be read as
 * the ARGUMENT of a call to whatever that "}" closed - running at load time
 * with `this` undefined, and failing with a stack pointing into a concatenated
 * file whose line numbers match no source. Appending a file is what triggers
 * it, so the guard belongs to the file being appended.
 * tests/core/model-bundles.test.js is the only place a seam between two files
 * is visible.
 */
;

/*
 * A prelude for the Go module: which rule set, chosen before the first stone.
 *
 * Modelled on checkers/prelude-model.js, which is itself the chessbase
 * prelude's shape with the piece-rewriting removed. Same contract, so that a
 * transcript and a player behave the same way across the three modules:
 *
 *   - the choice is a MOVE, written "#0" or "#1", so it is recorded in the
 *     game record, replayed on load and undone like any other;
 *   - a dialog declares `labels` (the captions) and `rules` (what each does),
 *     both plain data, because the gulpfile serialises a manifest with
 *     JSON.stringify and a gameOption cannot carry a function;
 *   - `persistent: true` remembers the last choice for the next game.
 *
 * WHAT IS DIFFERENT HERE, and it is a simplification. checkers has to restore
 * 21 rule flags before applying a set, because its dialogs disagree about
 * which flags they name and German after English would inherit English's
 * canCaptureBackward. A Go rule set is ONE NAME. The dialog writes it into
 * mOptions.rules and calls goSetRules(), which is the same method InitGame
 * uses - so the table that turns a name into behaviour stays in go-model.js,
 * where the move generator reads it, and there is nothing here to keep in step
 * with it.
 *
 * WHY THE PRELUDE IS ASKED EVEN FOR A LOADED GAME: a rule choice moves no
 * stone. Nothing in a position says which rules it was played under - unlike
 * Capablanca, whose arrangement is readable from the board - so there is no
 * goPreludeFromBoard to write. That is the same conclusion checkers and
 * Kotaishi Shogi reach.
 */

(function() {

	// Where the prelude keeps its stage. A Go board has no lastMove to borrow
	// - the chessbase prelude hides its state in `lastMove.f == -2` - so this
	// is a field of its own, and one CopyFrom has to carry or a search loses
	// it on the first copy.
	var STAGE = "preludeStage";

	function Dialogs(aGame) {
		return aGame.mOptions.prelude;
	}

	function InPrelude(board) {
		return board[STAGE] !== undefined && board[STAGE] >= 0;
	}

	/*
	 * Apply a chosen set: write the options it names, then let go-model.js
	 * read them back.
	 *
	 * The indirection is the point. `rules` here is a plain object out of the
	 * manifest, `{ "rules": "tromp-taylor" }`, and goSetRules is what
	 * validates the name and sets g.rules and g.suicideOk. Writing those two
	 * fields directly from here would duplicate go-model's table in a file
	 * that has no reason to know it.
	 */
	function ApplyRules(aGame, rules) {
		for(var k in rules)
			if(rules.hasOwnProperty(k))
				aGame.mOptions[k] = rules[k];
		aGame.goSetRules();
	}

	var SuperInitGameExtra = Model.Game.InitGameExtra;
	Model.Game.InitGameExtra = function() {
		SuperInitGameExtra.apply(this, arguments);
		/*
		 * The rule set a manifest declares is the one in force until a choice
		 * is made, and it is what the board plays under if the prelude is
		 * answered by nobody - a position set up in a test, say. Remembered so
		 * a game reopened after a previous choice does not inherit it: the
		 * dialog's `persistent` field is what carries a choice forward, and it
		 * does so as a preselected BUTTON, not as a silent change of rules.
		 */
		this.g.goPreludeDefault = this.mOptions.rules;
	}

	var SuperInitialPosition = Model.Board.InitialPosition;
	Model.Board.InitialPosition = function(aGame) {
		SuperInitialPosition.apply(this, arguments);
		if(Dialogs(aGame)) {
			aGame.mOptions.rules = aGame.g.goPreludeDefault;
			aGame.goSetRules();
		}
		this[STAGE] = Dialogs(aGame) ? 0 : -1;
	}

	// go-model.js spells CopyFrom out field by field, so a stage left out here
	// is a stage lost on the first board copy - and a search would then play
	// the opening move into the prelude's move list.
	var SuperCopyFrom = Model.Board.CopyFrom;
	Model.Board.CopyFrom = function(aBoard) {
		SuperCopyFrom.apply(this, arguments);
		this[STAGE] = aBoard[STAGE];
	}

	/*
	 * The signature has to say which stage this is.
	 *
	 * go-model.js hashes the STONES alone - that is what positional superko
	 * compares - and during the prelude there are none: the board before the
	 * choice and the board after it both hash to zero. Anything keyed on the
	 * signature would treat them as the same position, which is exactly the
	 * kind of bug that shows up as a game that will not start rather than as
	 * an error.
	 */
	var SuperGetSignature = Model.Board.GetSignature;
	Model.Board.GetSignature = function() {
		if(!InPrelude(this))
			return SuperGetSignature.apply(this, arguments);
		return "prelude" + this[STAGE];
	}

	var SuperGenerateMoves = Model.Board.GenerateMoves;
	Model.Board.GenerateMoves = function(aGame) {
		if(!InPrelude(this))
			return SuperGenerateMoves.apply(this, arguments);
		var dialog = Dialogs(aGame)[this[STAGE]];
		if(!dialog) {
			this.mMoves = [{ p: -1 }];   // a turn pass
			return;
		}
		if(dialog.persistent !== undefined && dialog.persistent !== true) {
			this.mMoves = [{ p: -1, setup: dialog.persistent }];
			return;
		}
		this.mMoves = [];
		for(var i = 0; i < dialog.labels.length; i++)
			this.mMoves.push({ p: -1, setup: i });
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
			if(dialog.persistent !== undefined)
				dialog.persistent = move.setup;   // remembered for the next game
		}
		/*
		 * NOT the super: a prelude move must not touch passes, lastPlayed or
		 * the position history. Carried on `p: -1` because a Go move needs a
		 * point and -1 is the only value that is not one, but it is not a
		 * pass - counting it as one would end the game two prelude stages in.
		 */
		if(++this[STAGE] == dialogs.length)
			this[STAGE] = -1;   // done: play begins
	}

	// No evaluation of a position the prelude has not settled yet.
	var SuperEvaluate = Model.Board.Evaluate;
	Model.Board.Evaluate = function(aGame, aFinishOnly, aTopLevel) {
		if(InPrelude(this))
			return;
		return SuperEvaluate.apply(this, arguments);
	}

	/*
	 * The machine answers the prelude itself rather than searching it.
	 *
	 * Go's own StaticGenerateMoves returns null - it exists to stop the native
	 * AI passing by accident - so this replaces it during the prelude only.
	 *
	 * It must return an ARRAY: JocGame.StartMachine tests
	 * `moves && moves.length > 0` to decide whether to short-circuit, and a
	 * bare object there sent a prelude stage to a real engine instead (see the
	 * same note in chessbase/prelude-model.js).
	 */
	var SuperStaticGenerateMoves = Model.Board.StaticGenerateMoves;
	Model.Board.StaticGenerateMoves = function(aGame) {
		if(!InPrelude(this))
			return SuperStaticGenerateMoves.apply(this, arguments);
		var dialog = Dialogs(aGame)[this[STAGE]];
		if(!dialog)
			return [aGame.CreateMove({ p: -1 })];
		var p = dialog.persistent;
		if(p !== undefined && p !== true)
			return [aGame.CreateMove({ p: -1, setup: p })];
		return [aGame.CreateMove({ p: -1,
			setup: Math.floor(Math.random() * dialog.labels.length) })];
	}

	/*
	 * All four Move methods, or none.
	 *
	 * go-model.js defines Init, CopyFrom, Equals and ToString, and every one
	 * of them handles exactly `p` and `c`. A {setup:1} handed to CreateMove
	 * would be dropped by the first two and ignored by the third - which is
	 * how the checkers prelude first came out with every button choosing the
	 * same rule set, since Equals compared only the point and both moves carry
	 * p: -1.
	 */
	var SuperMoveInit = Model.Move.Init;
	Model.Move.Init = function(args) {
		SuperMoveInit.apply(this, arguments);
		if(args && args.setup !== undefined)
			this.setup = args.setup;
	}

	var SuperMoveCopyFrom = Model.Move.CopyFrom;
	Model.Move.CopyFrom = function(aMove) {
		SuperMoveCopyFrom.apply(this, arguments);
		if(aMove.setup !== undefined)
			this.setup = aMove.setup;
		else
			delete this.setup;
	}

	var SuperMoveEquals = Model.Move.Equals;
	Model.Move.Equals = function(move) {
		if(this.setup !== undefined || move.setup !== undefined)
			return this.setup === move.setup;
		return SuperMoveEquals.apply(this, arguments);
	}

	// "#0", "#1" in the record - the notation the checkers and chessbase
	// preludes already write, and which Tabulon's loader already skips over
	// when it replays a saved game.
	var SuperMoveToString = Model.Move.ToString;
	Model.Move.ToString = function() {
		if(this.setup !== undefined)
			return "#" + this.setup;
		return SuperMoveToString.apply(this, arguments);
	}

})();
