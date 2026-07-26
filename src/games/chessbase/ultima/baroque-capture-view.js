/*
 * Capture animation for the Ultima family (Ultima and Rococo).
 *
 * The base chessbase view animates the moving piece and, if there is one, the
 * single piece it displaces (move.c). The games in this family have three more
 * kinds of move, and without this file those pieces simply blink out when the
 * board is redisplayed after the move:
 *
 *   move.kills   - extra victims of a multi-piece capture: they fade out where
 *                  they stand, like a displaced piece does.
 *   move.swap    - the Swapper (or a Chameleon mimicking one) trades places
 *                  with another piece: that piece travels the other way.
 *   move.suicide - an immobilized piece removes itself: it does not travel at
 *                  all, it just fades.
 *   move.mutual  - the Swapper destroys an adjacent enemy and itself: the base
 *                  animation walks it onto the enemy, then both fade.
 *
 * Nothing here changes the position: the view is redisplayed from the board
 * once the move is applied, so this is purely what the player sees on the way.
 *
 * cbAnimate runs on the board as it was *before* the move, so pieces are found
 * at their starting squares.
 */

(function() {

	var OriginalAnimate = View.Board.cbAnimate;

	// the fade the base view uses for a displaced piece, reused as-is so that
	// every disappearance in these games looks the same
	function vanish(xdv, aGame, piece, speed, callback) {
		var anim3d = { positionEasingUpdate: null };
		switch(aGame.cbView.captureAnim3d || "movedown") {
			case 'movedown': anim3d.z = -2000; break;
			case 'scaledown': anim3d.scale = [0, 0, 0]; break;
		}
		xdv.updateGadget("piece#" + piece.i, {
			"2d": { opacity: 0 },
			"3d": anim3d,
		}, speed, callback);
	}

	View.Board.cbAnimate = function(xdv, aGame, aMove, callback, speed) {
		var $this = this;
		if(speed === undefined || speed === null)
			speed = 600;

		// a piece removing itself does not travel: skip the base animation
		if(aMove.suicide) {
			var self = this.pieces[this.board[aMove.f]];
			if(!self)
				return callback();
			return vanish(xdv, aGame, self, speed, callback);
		}

		var mover = this.pieces[this.board[aMove.f]];
		var pending = 1;

		function done() {
			if(--pending > 0)
				return;
			// mutual destruction: the mover has arrived, now it goes too
			if(aMove.mutual && mover)
				vanish(xdv, aGame, mover, speed, callback);
			else
				callback();
		}

		// extra victims of a multi-piece capture
		if(aMove.kills)
			for(var i = 0; i < aMove.kills.length; i++) {
				var victim = this.pieces[aMove.kills[i]];
				if(!victim || victim.p < 0)
					continue;
				pending++;
				vanish(xdv, aGame, victim, speed, done);
			}

		// the swapped piece travels the other way, into the square being left
		if(aMove.swap != null) {
			var partner = this.pieces[aMove.swap];
			if(partner) {
				pending++;
				xdv.updateGadget("piece#" + partner.i,
					aGame.cbMakeDisplaySpecForPiece(aGame, aMove.f, partner), speed, done);
			}
		}

		OriginalAnimate.call(this, xdv, aGame, aMove, done, speed);
	}

})();
