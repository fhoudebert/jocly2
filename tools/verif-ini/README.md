# Vérifier l'Expert sur les variantes à ini maison

Quinze jeux décrivent leur variante Fairy-Stockfish par un `customVariantIni`
plutôt que par une variante intégrée au moteur — les mini-échecs, Capablanca,
Timurid, Patchanka, Khan, Seirawan++… Ce sont eux qui ont révélé deux fautes
invisibles à l'œil : une réponse du moteur prise pour celle de la position
précédente, et un roque écrit roi-prend-tour que jocly ne savait pas relire.
Dans les deux cas le coup joué à la place restait légal, la partie continuait,
et seule la console protestait.

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
trois fichiers de ce répertoire le font, à la main :

    npm install -D playwright          # une fois
    npx playwright install chromium    # une fois : télécharge le navigateur
    npx gulp build                     # le dist que la page charge

    ln -s ../dist/browser verif-ini/dist   # la page lit dist/jocly.js
    node verif-ini/serve.js &              # sert ce répertoire avec COOP/COEP
    node verif-ini/ini.mjs apres 0 10      # les variantes 0 à 10
    node verif-ini/ini.mjs apres 10 20     # etc., par tranches de dix

`serve.js` sert le répertoire sur le port 8778 avec les deux en-têtes sans
lesquels le moteur ne démarre pas. `ini.html` porte la fonction `run(jeu,
arrangement, coups, ms)` qu'exécute la page. `ini.mjs` ouvre Chromium, parcourt
une tranche de la liste et écrit le bilan dans
`/tmp/ini-results-<étiquette>.json`. Par tranches, parce qu'une page qui ouvre
quarante moteurs wasm d'affilée devient très lente.

Ce répertoire est un outil de passage : le binaire n'a pas vocation à rester
dans le dépôt.
