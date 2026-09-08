/*
 * The leading semicolon is load-bearing: the gulpfile concatenates a game's
 * scripts into one bundle, and a file wrapped in "(function(){...})()" placed
 * after one ending in a bare "}" is read as the argument of a call to whatever
 * that "}" closed. See tests/core/model-bundles.test.js.
 */
;

/*
 * A prelude for the mills module: one button per rule set, chosen before the
 * first move.
 *
 * Same shape as the checkers one - the choice is a move, so it is recorded,
 * replayed and undone like any other; "labels" names the buttons, "rules"
 * says what each does, "persistent" remembers the last pick - but it writes
 * its choice somewhere else. checkersbase-model copies its rule flags into
 * aGame.g once, in InitGame; mills reads canFly and poundInMill straight off
 * aGame.mOptions every time it generates moves (mills-model.js:166 and :296).
 * So the dialog writes to mOptions, and takes effect on the next generation
 * with nothing to re-initialise.
 *
 * The view half is a different matter, and is why the first attempt at this
 * did nothing at all when a button was clicked - see prelude-view.js.
 */

(function() {

	var STAGE = "preludeStage";

	function Dialogs(aGame) {
		return aGame.mOptions.prelude;
	}

	function InPrelude(board) {
		return board[STAGE] !== undefined && board[STAGE] >= 0;
	}

	/*
	 * Put every option a dialog can touch back to what the manifest left it
	 * at, then apply the chosen set over the top.
	 *
	 * Restoring first is required, not cautious: the sets disagree about which
	 * options they name. "Fly" names canFly, plain 12 Men's Morris names
	 * poundInMill - so picking plain after fly would otherwise keep canFly and
	 * play a game that is neither.
	 */
	function ApplyRules(aGame, rules) {
		var defaults = aGame.millsPreludeDefaults;
		for(var k in defaults)
			aGame.mOptions[k] = defaults[k];
		for(var k in rules)
			if(rules.hasOwnProperty(k))
				aGame.mOptions[k] = rules[k];
	}

	var SuperInitGame = Model.Game.InitGame;
	Model.Game.InitGame = function() {
		SuperInitGame.apply(this, arguments);
		if(!Dialogs(this))
			return;
		// Snapshot before any choice is made. Done here rather than in a game
		// file because the gulpfile serialises a manifest with JSON.stringify:
		// gameOptions cannot carry a function, and a game whose whole
		// definition is its manifest has nowhere else to put this call.
		var defaults = {};
		var $this = this;
		Dialogs(this).forEach(function(dialog) {
			if(!dialog || !dialog.rules) return;
			dialog.rules.forEach(function(rules) {
				for(var k in rules)
					if(rules.hasOwnProperty(k) && defaults[k] === undefined)
						defaults[k] = $this.mOptions[k];
			});
		});
		this.millsPreludeDefaults = defaults;
	}

	var SuperInitialPosition = Model.Board.InitialPosition;
	Model.Board.InitialPosition = function(aGame) {
		SuperInitialPosition.apply(this, arguments);
		// A position handed to us was played under some rule set and nothing
		// in it says which - a rule choice moves no piece - so the prelude is
		// asked even for a loaded game.
		this[STAGE] = Dialogs(aGame) ? 0 : -1;
	}

	// mills defines no Board.CopyFrom and no Board.GetSignature, so JocBoard's
	// own JSON clone and JSON hash carry and hash the stage without help. That
	// is worth knowing rather than assuming: the checkers prelude had to do
	// both by hand.

	var SuperGenerateMoves = Model.Board.GenerateMoves;
	Model.Board.GenerateMoves = function(aGame) {
		if(!InPrelude(this))
			return SuperGenerateMoves.apply(this, arguments);
		var dialog = Dialogs(aGame)[this[STAGE]];
		if(!dialog) {
			this.mMoves = [{ f: -1, t: -1, c: -1 }];   // a turn pass
			return;
		}
		if(dialog.persistent !== undefined && dialog.persistent !== true) {
			this.mMoves = [{ f: -1, t: -1, c: -1, setup: dialog.persistent }];
			return;
		}
		this.mMoves = [];
		for(var i = 0; i < dialog.labels.length; i++)
			this.mMoves.push({ f: -1, t: -1, c: -1, setup: i });
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

	var SuperEvaluate = Model.Board.Evaluate;
	Model.Board.Evaluate = function(aGame, aFinishOnly, aTopLevel) {
		if(InPrelude(this))
			return;
		return SuperEvaluate.apply(this, arguments);
	}

	/*
	 * The machine answers the prelude rather than searching it. mills already
	 * uses StaticGenerateMoves to pick the opening placement at random, so the
	 * prelude has to run before that rule, not instead of it.
	 */
	var SuperStaticGenerateMoves = Model.Board.StaticGenerateMoves;
	Model.Board.StaticGenerateMoves = function(aGame) {
		if(!InPrelude(this))
			return SuperStaticGenerateMoves.apply(this, arguments);
		var dialog = Dialogs(aGame)[this[STAGE]];
		if(!dialog)
			return [{ f: -1, t: -1, c: -1 }];
		var p = dialog.persistent;
		if(p !== undefined && p !== true)
			return [{ f: -1, t: -1, c: -1, setup: p }];
		return [{ f: -1, t: -1, c: -1,
			setup: Math.floor(Math.random() * dialog.labels.length) }];
	}

	/*
	 * mills spells out all four of Init, CopyFrom, Equals and ToString, and
	 * every one of them handles exactly f, t and c. A setup carried on a move
	 * would be dropped by the first two and ignored by the third, which is how
	 * the checkers version first came out with every button choosing the same
	 * rule set. All four, or none.
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

	var SuperMoveToString = Model.Move.ToString;
	Model.Move.ToString = function() {
		if(this.setup !== undefined)
			return "#" + this.setup;
		if(this.t < 0)
			return "--";
		return SuperMoveToString.apply(this, arguments);
	}

})();
