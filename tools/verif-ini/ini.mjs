import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const targets = JSON.parse(fs.readFileSync('/tmp/ini-targets.json','utf8'));
const label = process.argv[2] || '';
const from = +(process.argv[3]||0), to = +(process.argv[4]||999);
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('http://127.0.0.1:8778/ini.html');
await p.waitForFunction(() => window.ready && window.Jocly);
const results = [];
for (const [game, setup, variant] of targets.slice(from, to)) {
  const t0 = Date.now();
  const r = await p.evaluate(([g,s]) => window.run(g, s, 16, 50), [game, setup]);
  results.push({ game, setup, variant, ms: Date.now()-t0, ...r });
}
const file='/tmp/ini-results-' + label + '.json'; const prev = fs.existsSync(file) && from>0 ? JSON.parse(fs.readFileSync(file,'utf8')) : [];
fs.writeFileSync(file, JSON.stringify(prev.concat(results), null, 1));
const bad = results.filter(r => r.stale || r.error || r.fallback || r.played < 8);
console.log(label, results.length, 'combinaisons', '| avec reponses perimees:', results.filter(r=>r.stale).length,
  '| total perimees:', results.reduce((n,r)=>n+(r.stale||0),0), '| erreurs/replis/parties courtes:', bad.filter(r=>!r.stale).length);
for (const r of bad) console.log('  ', JSON.stringify(r));
await b.close();
