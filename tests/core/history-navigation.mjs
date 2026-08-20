// Navigation dans l'historique : reculer PUIS AVANCER doit fonctionner.
const Jocly = await import('../../dist/node/jocly.core.js');
let P=0,F=0; const ok=(c,m)=>{c?(P++,console.log('  \u2713',m)):(F++,console.log('  \u2717 ECHEC:',m));};

const m = await Jocly.createMatch('classic-chess');
const lv = m.game.config.model.levels[0];
for (let i=0;i<6;i++) { const r = await m.machineSearch({level:lv}); await m.playMove(r.move); }
const n = (await m.getPlayedMoves()).length;
ok(n === 6, `6 coups joues (${n})`);

await m.rollback(2);
ok((await m.getPlayedMoves()).length === 2, 'reculer a 2 : OK');

// C'est ICI que l'ancien code echouait : l'index etait borne a 2.
await m.rollback(4);
ok((await m.getPlayedMoves()).length === 4, 'AVANCER a 4 (coup suivant)');
await m.rollback(6);
ok((await m.getPlayedMoves()).length === 6, 'AVANCER a 6 (fin)');
await m.rollback(0);
ok((await m.getPlayedMoves()).length === 0, 'revenir au debut');
await m.rollback(6);
ok((await m.getPlayedMoves()).length === 6, 'du debut a la fin d\'un coup');

// Borne haute : on ne doit pas pouvoir depasser la partie.
await m.rollback(99);
ok((await m.getPlayedMoves()).length === 6, 'index excessif borne a la fin');

// Divergence : jouer un NOUVEAU coup en position reculee doit oublier la suite.
const full2 = (await m.getPlayedMoves())[2];
await m.rollback(2);
// Il faut un coup REELLEMENT different : l'IA etant deterministe, rejouer le
// meme coup laisserait la suite valide -- et jocly a raison de la garder.

const moves = await m.getPossibleMoves();
const strs = await m.getMoveString(moves);
const same = await m.getMoveString([full2]);
const idx = strs.findIndex(s => s !== same[0]);
ok(idx >= 0, 'un coup alternatif existe');
await m.playMove(moves[idx]);
ok((await m.getPlayedMoves()).length === 3, 'nouveau coup en position reculee');
await m.rollback(99);
const after = (await m.getPlayedMoves()).length;
ok(after === 3, `la suite perimee est oubliee (${after}, pas 6)`);

console.log(`\nRESULTAT: ${P} OK / ${F} ECHEC`);
process.exit(F?1:0);
