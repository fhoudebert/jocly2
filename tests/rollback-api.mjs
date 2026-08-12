// Semantique de rollback()/undo(), copie de getPossibleMoves(), et refus d'un
// coup produit pour une AUTRE position.
const Jocly = await import('../dist/node/jocly.core.js');
let P=0,F=0; const ok=(c,m)=>{c?(P++,console.log('  \u2713',m)):(F++,console.log('  \u2717 ECHEC:',m));};

const FEN = '5K2/pkp1pp2/Pp1pPc2/2l2p2/8/2l5/2X5/2w5 w - - 0 52';
const fresh = async () => {
	const m = await Jocly.createMatch('ultima');
	await m.load({ game:'ultima', initialBoard: FEN, playedMoves: [] });
	return m;
};
const plies = async (m) => (await m.getPlayedMoves()).length;
const play = async (m,n) => { for(let i=0;i<n;i++) await m.playMove((await m.getPossibleMoves())[0]); };

// 1. Sans argument : erreur, plus de retour silencieux au debut de la partie.
{
	const m = await fresh();
	await play(m,3);
	let err = null;
	try { await m.rollback(); } catch(e) { err = e; }
	ok(err instanceof Error, 'rollback() sans argument leve une erreur');
	ok(await plies(m) === 3, 'la partie est intacte apres le refus');
	await m.rollback('2');
	ok(await plies(m) === 2, 'un index numerique en chaine reste accepte');
	let err2 = null;
	try { await m.rollback('deux'); } catch(e) { err2 = e; }
	ok(err2 instanceof Error, 'un index non numerique leve une erreur');
}

// 2. Index negatif : relatif a la POSITION COURANTE, donc utilisable en boucle.
{
	const m = await fresh();
	await play(m,3);
	await m.rollback(-1);
	ok(await plies(m) === 2, 'rollback(-1) defait un coup');
	await m.rollback(-1);
	ok(await plies(m) === 1, 'rollback(-1) enchaine (ne se bloque plus)');
	await m.rollback(-5);
	ok(await plies(m) === 0, 'un index negatif excessif est borne a 0');
}

// 3. undo(n), et la ligne enregistree reste disponible pour re-avancer.
{
	const m = await fresh();
	await play(m,4);
	await m.undo();
	ok(await plies(m) === 3, 'undo() defait un coup');
	await m.undo(2);
	ok(await plies(m) === 1, 'undo(2) en defait deux');
	await m.rollback(4);
	ok(await plies(m) === 4, 'la ligne enregistree permet toujours de re-avancer');
}

// 4. getPossibleMoves() renvoie une copie, pas le tableau interne.
{
	const m = await fresh();
	const a = await m.getPossibleMoves();
	const b = await m.getPossibleMoves();
	ok(a !== b, 'deux appels renvoient deux tableaux distincts');
	ok(a.length === b.length && a.every((x,i) => x.f === b[i].f && x.t === b[i].t),
		'les deux copies decrivent les memes coups');
	a.length = 0;
	ok((await m.getPossibleMoves()).length > 0, 'vider la copie ne touche pas la liste interne');
}

// 5. Un coup produit pour une autre position est refuse avec un message clair.
{
	const m = await fresh();
	const racine = (await m.getPossibleMoves()).slice();
	await m.playMove(racine[0]);
	let err = null;
	try { await m.playMove(racine[0]); } catch(e) { err = e; }
	ok(err instanceof Error, 'rejouer un coup de la position precedente leve une erreur');
	ok(err && /does not belong to the current position/.test(err.message),
		'le message nomme la cause reelle');
	await m.rollback(0);
	await m.playMove(racine[0]);
	ok(await plies(m) === 1, 'le meme coup reste jouable dans sa propre position');
}

console.log(`\nRESULTAT: ${P} OK / ${F} ECHEC`);
process.exit(F?1:0);
