// Le numero de coup d'un FEN charge doit survivre a l'aller-retour.
const Jocly = await import('../../dist/node/jocly.core.js');
let P=0,F=0; const ok=(c,m)=>{c?(P++,console.log('\u2713',m)):(F++,console.log('\u2717 ECHEC:',m));};

const tail = (fen) => fen.split(' ').slice(4).join(' ');
const load = async (fen) => {
	const m = await Jocly.createMatch('ultima');
	await m.load({ game:'ultima', initialBoard: fen, playedMoves: [] });
	return m;
};
const step = async (m) => { await m.playMove((await m.getPossibleMoves())[0]); };

// Trait aux blancs : le numero change apres le coup des noirs.
{
	const FEN = '5K2/pkp1pp2/Pp1pPc2/2l2p2/8/2l5/2X5/2w5 w - - 0 52';
	const m = await load(FEN);
	ok(tail(await m.getBoardState()) === '0 52', 'FEN charge : le numero de coup est conserve');
	await step(m);
	ok(tail(await m.getBoardState()) === '0 52', 'apres le coup des blancs : toujours 52');
	await step(m);
	ok(tail(await m.getBoardState()) === '0 53', 'apres le coup des noirs : 53');
	await m.rollback(0);
	ok(tail(await m.getBoardState()) === '0 52', 'retour a la position initiale : 52');
	const init = await m.getInitialBoardState();
	ok(tail(init.boardState) === '0 52', 'getInitialBoardState() exporte le numero initial');
}

// Trait aux noirs : le numero change des le premier coup joue.
{
	const FEN = '5K2/pkp1pp2/Pp1pPc2/2l2p2/8/2l5/2X5/2w5 b - - 3 52';
	const m = await load(FEN);
	ok(tail(await m.getBoardState()) === '3 52', 'trait aux noirs : 52, demi-coups conserves');
	await step(m);
	ok(tail(await m.getBoardState()).endsWith(' 53'), 'apres le coup des noirs : 53');
}

// Sans FEN d'entree, une partie normale part de 1.
{
	const m = await Jocly.createMatch('classic-chess');
	ok(tail(await m.getBoardState()) === '0 1', 'partie ordinaire : depart au coup 1');
}

// Un FEN sans numero exploitable ne doit pas casser l'export.
{
	const m = await load('5K2/pkp1pp2/Pp1pPc2/2l2p2/8/2l5/2X5/2w5 w - - 0 -');
	ok(tail(await m.getBoardState()) === '0 1', 'numero absent : repli sur 1');
}

console.log(`\nRESULTAT: ${P} OK / ${F} ECHEC`);
process.exit(F?1:0);
