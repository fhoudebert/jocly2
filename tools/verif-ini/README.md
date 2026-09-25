# Vérifier l'Expert sur les variantes à ini maison

Quinze jeux décrivent leur variante Fairy-Stockfish par un `customVariantIni`
plutôt que par une variante intégrée au moteur — les mini-échecs, Capablanca,
Timurid, Patchanka, Khan, Seirawan++… 

Deux vérifications, selon le moteur.

## Le moteur natif — sans navigateur

C'est une suite du dépôt : `tests/fairy/native-engine.test.js`. Elle **saute**
tant qu'aucun binaire n'est là, et s'allume dès qu'on en dépose un :

    cp fairy-stockfish tests/fairy/          # construit avec largeboards=yes
    npx gulp build                           # une fois : il lui faut dist/node
    node tests/fairy/native-engine.test.js

Elle joue une partie Expert contre Expert par couple jeu/arrangement (38 au
total), compte les coups « rattrapés » et vérifie qu'aucun processus de moteur
ne survit aux parties. Environ 35 s. Le binaire est cherché dans
`tests/fairy/`, puis dans `$JOCLY_FAIRY_BINARY`, puis dans ce répertoire-ci.

Comme toute suite du dépôt, elle tourne aussi avec `node tests/run.js` — en
sautant, tant que le binaire n'est pas là.

## Le moteur WebAssembly — dans un vrai navigateur

Le chemin du navigateur est un autre code (`src/browser/jocly.fairyworker.js`),
et c'est là que vivait la réponse périmée. Il n'y a pas de suite automatique :
le moteur wasm exige les en-têtes `Cross-Origin-Opener-Policy` et
`Cross-Origin-Embedder-Policy`, donc un vrai serveur et un vrai navigateur. Les
deux fichiers de ce répertoire le font, avec le serveur des exemples, à la main :

    npm install -D playwright          # une fois
    npx playwright install chromium    # une fois : télécharge le navigateur
    npx gulp build                     # le dist que la page charge

    node examples/browser/serve.js &           # sert le dépôt avec COOP/COEP
    node tools/verif-ini/ini.mjs apres 0 10    # les couples 0 à 10
    node tools/verif-ini/ini.mjs apres 10 20   # etc., par tranches de dix

Le serveur est celui de `examples/browser/serve.js` : il sert tout le dépôt
(port 8422 par défaut, `JOCLY_PORT` pour `ini.mjs` si on en change) avec les
deux en-têtes sans lesquels le moteur ne démarre pas. `ini.html` charge donc
directement `/dist/browser/jocly.js`, sans lien symbolique. La page porte la
fonction `run(jeu, arrangement, coups, ms)` et la fonction `targets()`, qui
dresse la liste des couples jeu/arrangement à `customVariantIni` — même
énumération que `tests/fairy/native-engine.test.js`. `ini.mjs` ouvre Chromium,
parcourt une tranche de cette liste et écrit le bilan dans
`<tmp>/ini-results-<étiquette>.json`. Par tranches, parce qu'une page qui
ouvre quarante moteurs wasm d'affilée devient très lente.

Ce répertoire est un outil de passage : le binaire n'a pas vocation à rester
dans le dépôt.
