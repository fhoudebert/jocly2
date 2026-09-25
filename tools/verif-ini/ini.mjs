// Parcourt une tranche des couples jeu/arrangement a customVariantIni dans un
// vrai Chromium, contre le moteur wasm. Voir README.md.
//
//   node examples/browser/serve.js &          # sert le depot avec COOP/COEP
//   node tools/verif-ini/ini.mjs apres 0 10   # etiquette, debut, fin
//
// Port du serveur : JOCLY_PORT (8422 par defaut, celui de serve.js).
import { chromium } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';
const label = process.argv[2] || '';
const from = +(process.argv[3]||0), to = +(process.argv[4]||999);
const port = process.env.JOCLY_PORT || 8422;
const b = await chromium.launch(); const p = await b.newPage();
await p.goto(`http://127.0.0.1:${port}/tools/verif-ini/ini.html`);
await p.waitForFunction(() => window.ready && window.Jocly);
if (!await p.evaluate(() => self.crossOriginIsolated))
  console.warn('page non cross-origin isolated : le moteur wasm ne demarrera pas (serveur sans COOP/COEP ?)');
const targets = await p.evaluate(() => window.targets());
console.log(targets.length, 'couples jeu/arrangement a customVariantIni ; tranche', from, '->', Math.min(to, targets.length));
const results = [];
for (const [game, setup, variant] of targets.slice(from, to)) {
  const t0 = Date.now();
  const r = await p.evaluate(([g,s]) => window.run(g, s, 16, 50), [game, setup]);
  results.push({ game, setup, variant, ms: Date.now()-t0, ...r });
}
const file = path.join(os.tmpdir(), 'ini-results-' + label + '.json');
const prev = fs.existsSync(file) && from>0 ? JSON.parse(fs.readFileSync(file,'utf8')) : [];
fs.writeFileSync(file, JSON.stringify(prev.concat(results), null, 1));
const bad = results.filter(r => r.stale || r.error || r.fallback || r.played < 8);
console.log(label, results.length, 'combinaisons', '| avec reponses perimees:', results.filter(r=>r.stale).length,
  '| total perimees:', results.reduce((n,r)=>n+(r.stale||0),0), '| erreurs/replis/parties courtes:', bad.filter(r=>!r.stale).length);
for (const r of bad) console.log('  ', JSON.stringify(r));
console.log('bilan :', file);
await b.close();
