/*
 * A prelude for the mills family: the game opens by asking which set of rules
 * to play, and the answer is the first move of the record.
 *
 * Nine and Twelve Men's Morris each shipped twice, once with flying and once
 * without, and the two entries of a pair differed by ONE line of manifest
 * options - they already shared both model files, both view files, the
 * thumbnail and the rules page. There was no duplicated code to remove, only
 * two entries in a list, which is why this file exists rather than a second
 * copy of anything.
 *
 * It is deliberately not the chessbase prelude. That one is built on cbVar,
 * on lastMove.f == -2, and on a panel drawn from chess piece sprites; mills
 * has its own Board - dock, menCount, placing - and its own hit-test state
 * machine. What is shared is the CONVENTION, because that is what the outside
 * world reads: the choice is written "#0", "#1" and the turn pass "--", the
 * same strings a Capablanca or MiniChess record carries, so a transcript
 * reader that already knows how to answer a prelude needs no change.
 *
 * The rules themselves are read live. Both flags are consulted inside move
 * generation - mOptions.canFly when the moving stage begins, mOptions.
 * poundInMill when captures are listed - and never cached at load time, so
 * setting them here takes effect immediately with nothing to re-initialise.
 *
 * Both flags are written on every choice, never merged into what was there
 * before, so replaying the prelude after a rollback lands on the same rules
 * whatever the previous answer was.
 */

;(function() {

	// what each button plays. Fly leaves poundInMill undefined rather than
	// false, and that is not a slip: the check in mills-model.js reads
	// `poundInMill == false`, so the fly entries have always allowed taking a
	// man that stands in a mill, while the plain ones have not. The behaviour
	// is carried over as it was - see the note in the rules page.
	var RULES = [
		{ label: "Standard", canFly: false, poundInMill: false },
		{ label: "Fly", canFly: true, poundInMill: undefined },
	];

	function Dialog(aGame) {
		return aGame.mOptions.prelude ? RULES : null;
	}

	// "which stage are we at", with -1 for "the prelude is behind us". A
	// sentinel rather than a deleted field on purpose: JocBoard.CopyFrom
	// copies the fields it finds and never removes the ones it does not, so a
	// board object that is reused would have kept a stale stage.
	var DONE = -1;

	/*
	 * Model.Move: carrying the setup
	 *
	 * A mills move is {f,t,c} and Init copies exactly those three, so a
	 * `setup` field handed to the constructor would be dropped on the floor -
	 * the move would arrive as a turn pass and the rules would stay at their
	 * defaults.
	 */
	var SuperModelMoveInit = Model.Move.Init;
	Model.Move.Init = function(args) {
		SuperModelMoveInit.apply(this, arguments);
		if(args.setup !== undefined)
			this.setup = args.setup;
	}

	var SuperModelMoveCopyFrom = Model.Move.CopyFrom;
	Model.Move.CopyFrom = function(aMove) {
		SuperModelMoveCopyFrom.apply(this, arguments);
		this.setup = aMove.setup;
	}

	/*
	 * A prelude move has no f, t or c, so the ordinary comparison found every
	 * setup equal to every other and to the turn pass. Anything resolving a
	 * recorded or clicked move against the generated list would then get the
	 * first one whatever it asked for, and a Fly game would reload as
	 * Standard.
	 */
	var SuperModelMoveEquals = Model.Move.Equals;
	Model.Move.Equals = function(move) {
		if(this.setup !== undefined || move.setup !== undefined)
			return this.setup === move.setup;
		return SuperModelMoveEquals.apply(this, arguments);
	}

	var SuperModelMoveToString = Model.Move.ToString;
	Model.Move.ToString = function() {
		if(this.setup !== undefined)
			return "#" + this.setup;
		if(this.t === undefined)
			return "--";           // the turn pass that ends the prelude
		return SuperModelMoveToString.apply(this, arguments);
	}

	/*
	 * Model.Board: the two extra stages
	 *
	 * Stage 0 offers the buttons, stage 1 is an empty pass so that the player
	 * who answers is still the one to place the first man - the same two-stage
	 * shape the chessbase prelude uses, and the reason a record reads
	 * "1. #1 --".
	 */
	var SuperModelBoardInitialPosition = Model.Board.InitialPosition;
	Model.Board.InitialPosition = function(aGame) {
		SuperModelBoardInitialPosition.apply(this, arguments);
		this.preludeStage = Dialog(aGame) ? 0 : DONE;
	}

	var SuperModelBoardGenerateMoves = Model.Board.GenerateMoves;
	Model.Board.GenerateMoves = function(aGame) {
		if(this.preludeStage === undefined || this.preludeStage === DONE)
			return SuperModelBoardGenerateMoves.apply(this, arguments);
		this.mMoves = [];
		if(this.preludeStage === 0) {
			var rules = Dialog(aGame);
			for(var i = 0; i < rules.length; i++)
				this.mMoves.push({ setup: i });
		} else
			this.mMoves.push({});   // the pass
		// and NOT the "no moves left, the game is over" branch the real
		// generator ends with
	}

	var SuperModelBoardApplyMove = Model.Board.ApplyMove;
	Model.Board.ApplyMove = function(aGame, move) {
		if(this.preludeStage === undefined || this.preludeStage === DONE)
			return SuperModelBoardApplyMove.apply(this, arguments);
		if(move.setup !== undefined) {
			var rule = Dialog(aGame)[move.setup];
			aGame.mOptions.canFly = rule.canFly;
			aGame.mOptions.poundInMill = rule.poundInMill;
		}
		if(++this.preludeStage > 1)
			this.preludeStage = DONE;   // play resumes as usual
	}

	/*
	 * StaticGenerateMoves picks the opening man at random on the very first
	 * move of a game, which the prelude now occupies - left alone it answered
	 * the dialog with a board position.
	 */
	var SuperModelBoardStaticGenerateMoves = Model.Board.StaticGenerateMoves;
	Model.Board.StaticGenerateMoves = function(aGame) {
		if(aGame.mFullPlayedMoves.length < 2)
			return null;
		return SuperModelBoardStaticGenerateMoves.apply(this, arguments);
	}

})();
